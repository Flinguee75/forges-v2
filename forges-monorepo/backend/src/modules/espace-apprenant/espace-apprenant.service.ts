import { EspaceApprenantRepository } from './espace-apprenant.repository';
import { AttestationService } from './attestation.service';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { PrismaClient } from '@prisma/client';

export class EspaceApprenantService {
  constructor(
    private readonly espaceRepo: EspaceApprenantRepository,
    private readonly attestationService: AttestationService,
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly email: EmailService
  ) {}

  // UCS11 — Mes dossiers
  async getMesDossiers(apprenant_id: string, filters: { statut?: string } = {}) {
    return this.espaceRepo.findDossiersByApprenant(apprenant_id, filters);
  }

  // UCS11 — Annulation volontaire (RM-27)
  async annulerDossier(dossier_id: string, apprenant_id: string) {
    const dossier = await this.espaceRepo.findDossierById(dossier_id, apprenant_id);
    if (!dossier) throw new Error('DOSSIER_NOT_FOUND');
    if (dossier.apprenant_id !== apprenant_id) throw new Error('FORBIDDEN');

    // RM-27 : annulation autorisée si EN_ATTENTE_VERIFICATION ou PAYE_DIRECTEMENT + paiement EN_ATTENTE
    if (dossier.statut === 'PAYE_DIRECTEMENT') {
      if ((dossier as any).paiement?.statut !== 'EN_ATTENTE') {
        throw new Error('DOSSIER_PAYE_NON_ANNULABLE');
      }
    } else if (dossier.statut !== 'EN_ATTENTE_VERIFICATION') {
      if (dossier.statut === 'RETENU') throw new Error('DOSSIER_RETENU_CONTACT_RESPONSABLE');
      if (dossier.statut === 'PAYE') throw new Error('DOSSIER_PAYE_NON_ANNULABLE');
      throw new Error('ANNULATION_IMPOSSIBLE');
    }

    await this.espaceRepo.annulerDossier(dossier_id);

    // Annuler le paiement associé si présent (PAYE_DIRECTEMENT → paiement EN_ATTENTE)
    if ((dossier as any).paiement?.id) {
      await this.prisma.paiement.update({
        where: { id: (dossier as any).paiement.id },
        data: { statut: 'ANNULE' }
      });
    }

    // Libérer la place en session
    if (dossier.session_id) {
      await this.prisma.session.update({
        where: { id: dossier.session_id },
        data: { places_restantes: { increment: 1 } }
      });
    }

    // Réactiver voucher Organisation si présent (RM-45)
    if (dossier.voucher_code) {
      const voucher = await this.prisma.voucherApporteur.findFirst({
        where: { code: dossier.voucher_code }
      });
      if (voucher) {
        await this.prisma.voucherApporteur.update({
          where: { id: voucher.id },
          data: {
            quota_utilise: { decrement: 1 },
            statut: voucher.statut === 'EPUISE' ? 'ACTIF' : voucher.statut
          }
        });
      }
    }

    await this.audit.info('DOSSIER_ANNULE_VOLONTAIRE', { dossier_id, apprenant_id });

    return { message: 'Dossier annulé avec succès.' };
  }

  // UCS11 — Télécharger attestation (RM-26)
  async getAttestationUrl(dossier_id: string, apprenant_id: string) {
    const url = await this.attestationService.genererLienAttestation(dossier_id, apprenant_id);
    return { url, expires_in: '24h' };
  }

  // UCS11 — Télécharger attestation PDF (RM-26)
  async getAttestationPdf(dossier_id: string, apprenant_id: string) {
    return this.attestationService.genererPdfAttestation(dossier_id, apprenant_id);
  }

  // UCS11 — Lister attestations disponibles (RM-26)
  async getMesAttestations(apprenant_id: string) {
    const dossiers = await this.espaceRepo.findDossiersAvecAttestationDisponible(apprenant_id);

    return dossiers.map((dossier) => ({
      dossier_id: dossier.id,
      formation: dossier.formation.intitule,
      apprenant: `${dossier.apprenant.prenoms} ${dossier.apprenant.nom}`,
      date_debut: dossier.session?.date_debut,
      date_fin: dossier.session?.date_fin,
      url_download: `/api/attestations/${dossier.id}/download`,
    }));
  }

  // UCS14 — Mes formations à la demande (RM-92, RM-93, RM-103)
  async getMesFormationsDemande(apprenant_id: string) {
    const acces = await this.espaceRepo.findAccesFormationsDemande(apprenant_id);
    const now = new Date();

    // MAPPING : intitule → titre pour le frontend
    return acces.map(a => ({
      id: a.id,
      formation: {
        id: a.formation.id,
        titre: a.formation.intitule, // MAPPING ICI
        description: a.formation.description_courte,
        duree: a.formation.duree_jours,
        type_formation: a.formation.type_formation,
        mode_formation: a.formation.mode_formation,
      },
      source_financement: a.source_financement,
      statut: a.statut,
      date_activation: a.date_activation,
      date_expiration: a.date_expiration,
      progression: a.progression,
      last_access_at: a.last_access_at,
      // RM-92 : vérification expiration
      est_expire: a.date_expiration < now,
      // RM-103 : statut disponibilité
      acces_disponible: a.statut === 'ACTIF' && a.date_expiration > now,
    }));
  }

  // UCS14 — Détail d'un accès formation
  async getAccesFormationDemande(acces_id: string, apprenant_id: string) {
    const acces = await this.espaceRepo.findAccesFormationById(acces_id, apprenant_id);

    if (!acces) {
      throw new Error('ACCES_NON_TROUVE');
    }

    const now = new Date();

    // RM-92 : vérifier expiration
    if (acces.date_expiration < now) {
      throw new Error('ACCES_EXPIRE');
    }

    // RM-103 : vérifier suspension
    if (acces.statut === 'SUSPENDU') {
      throw new Error('ACCES_SUSPENDU_ABONNEMENT_INACTIF');
    }

    // Mettre à jour last_access_at
    await this.prisma.accesFormationDemande.update({
      where: { id: acces.id },
      data: { last_access_at: now }
    });

    return {
      id: acces.id,
      formation: {
        ...acces.formation,
        titre: acces.formation.intitule, // MAPPING
      },
      source_financement: acces.source_financement,
      statut: acces.statut,
      progression: acces.progression,
      date_expiration: acces.date_expiration,
      url_contenu: `${process.env.LMS_URL || 'https://lms.forges.com'}/formations/${acces.formation_id}/apprenant/${apprenant_id}`,
    };
  }

  // UCS14 — Mise à jour de progression d'un accès formation à la demande
  async updateProgressionFormationDemande(acces_id: string, apprenant_id: string, progression: number) {
    const acces = await this.espaceRepo.findAccesFormationById(acces_id, apprenant_id);

    if (!acces) {
      throw new Error('ACCES_NON_TROUVE');
    }

    if (acces.apprenant_id !== apprenant_id) {
      throw new Error('FORBIDDEN');
    }

    if (acces.statut !== 'ACTIF') {
      throw new Error('ACCES_NON_MODIFIABLE');
    }

    const progressionNormalisee = Math.min(100, Math.max(0, Number(progression)));
    const updated = await this.espaceRepo.updateProgression(acces_id, progressionNormalisee);

    await this.audit.info('ACCES_FORMATION_DEMANDE_PROGRESSION', {
      acces_id,
      apprenant_id,
      progression: progressionNormalisee
    });

    return updated;
  }

  // RM-103/105 : suspension accès si abonnement inactif
  async suspendreAccesAbonnement(apprenant_id: string) {
    await this.espaceRepo.suspendreAccesByAbonnement(apprenant_id);
    await this.audit.info('ACCES_FORMATION_SUSPENDU', { apprenant_id, raison: 'ABONNEMENT_INACTIF' });
  }

  // RM-103 : réactivation accès si abonnement reactif
  async reactiverAccesAbonnement(apprenant_id: string) {
    await this.espaceRepo.reactiverAccesByAbonnement(apprenant_id);
    await this.audit.info('ACCES_FORMATION_REACTIVE', { apprenant_id });
  }

  // RM-49 : document complémentaire au dossier (facultatif)
  async ajouterDocumentDossier(dossier_id: string, apprenant_id: string, fichierUrl: string) {
    const dossier = await this.espaceRepo.findDossierById(dossier_id, apprenant_id);
    if (!dossier) throw new Error('DOSSIER_NOT_FOUND');
    if (dossier.statut !== 'EN_ATTENTE_VERIFICATION') throw new Error('DOSSIER_NON_MODIFIABLE');

    // TODO: Ajouter document_complementaire_url au schéma Dossier
    // await this.prisma.dossier.update({
    //   where: { id: dossier_id },
    //   data: { document_complementaire_url: fichierUrl }
    // });

    await this.audit.info('DOCUMENT_DOSSIER_AJOUTE', { dossier_id, apprenant_id });
    return { message: 'Document ajouté avec succès (fonctionnalité à implémenter).' };
  }
}
