import { FormationPartenaireRepository } from './formation-partenaire.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { PrismaClient } from '@prisma/client';

export class ValidationFormationService {
  constructor(
    private readonly fpRepo: FormationPartenaireRepository,
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly email: EmailService
  ) {}

  // UCS18 — Valider formation partenaire (RM-127, RM-137)
  async valider(fp_id: string, data: {
    type_formation: 'STANDARD' | 'PREMIUM' | 'SUR_DEVIS';
    pilier_abonnement: 'RETAIL' | 'B2B' | 'INSTITUTIONNEL' | 'TOUS';
    prix_coutant_valide: number;
    responsable_id: string;
  }) {
    const fp = await this.fpRepo.findById(fp_id);
    if (!fp) throw new Error('FP_NOT_FOUND');

    // RM-128 : seul le responsable désigné peut valider
    if (fp.responsable_validateur_id && fp.responsable_validateur_id !== data.responsable_id) {
      throw new Error('RESPONSABLE_NON_DESIGNE');
    }

    if (fp.statut_validation === 'VALIDEE') {
      return { success: true, message: 'Formation déjà validée.' };
    }
    if (fp.statut_validation !== 'EN_ATTENTE' && fp.statut_validation !== 'EN_ATTENTE_VALIDATION') {
      throw new Error('FORMATION_DEJA_TRAITEE');
    }

    // RM-137 : calcul automatique prix catalogue
    // prix_catalogue = prix_coutant / (1 - commission%)
    const commission = fp.partenaire.commission_forges_pct / 100;
    const prix_catalogue = Math.ceil(data.prix_coutant_valide / (1 - commission));

    // RM-102 : calcul inclus_abonnement
    const inclus_abonnement = data.type_formation === 'STANDARD' &&
      ['RETAIL', 'TOUS'].includes(data.pilier_abonnement);

    // Valider FormationPartenaire
    await this.fpRepo.valider(fp_id, {
      responsable_id: data.responsable_id,
      prix_coutant_valide: data.prix_coutant_valide,
      type_formation: data.type_formation,
      pilier_abonnement: data.pilier_abonnement,
    });

    // Mettre à jour la Formation : type assigné + prix calculé + statut ACTIVE
    await this.prisma.formation.update({
      where: { id: fp.formation_id },
      data: {
        type_formation: data.type_formation,    // RM-127 : assigné par FORGES
        pilier_abonnement: data.pilier_abonnement, // RM-127
        cout_catalogue: prix_catalogue,           // RM-137
        inclus_abonnement,                        // RM-102
        statut: 'ACTIVE',
      }
    });

    await this.audit.info('FORMATION_PARTENAIRE_VALIDEE', {
      formation_id: fp.formation_id,
      type_formation: data.type_formation,
      prix_catalogue,
      responsable_id: data.responsable_id
    });

    // RM-100 : notifier Partenaire
    try {
      await this.email.sendFormationValidee(
        fp.partenaire.email_principal,
        fp.formation.intitule,
        'FR'
      );
    } catch (error: any) {
      await this.audit.warning('FORMATION_PARTENAIRE_VALIDEE_EMAIL_FAILED', {
        formation_id: fp.formation_id,
        partenaire_id: fp.partenaire_id,
        error: error.message
      });
    }

    return {
      formation_id: fp.formation_id,
      type_formation: data.type_formation,
      pilier_abonnement: data.pilier_abonnement,
      prix_coutant_valide: data.prix_coutant_valide,
      prix_catalogue,
      inclus_abonnement,
    };
  }

  // UCS18 — Rejeter formation (RM-128 : motif obligatoire)
  async rejeter(fp_id: string, motif: string, corrections: string | undefined, responsable_id: string) {
    const fp = await this.fpRepo.findById(fp_id);
    if (!fp) throw new Error('FP_NOT_FOUND');

    // RM-128 : motif OBLIGATOIRE
    if (!motif || motif.trim().length < 10) throw new Error('MOTIF_OBLIGATOIRE');

    // RM-128 : seul le responsable désigné peut rejeter
    if (fp.responsable_validateur_id && fp.responsable_validateur_id !== responsable_id) {
      throw new Error('RESPONSABLE_NON_DESIGNE');
    }

    await this.fpRepo.rejeter(fp_id, motif, corrections, responsable_id);
    await this.prisma.formation.update({
      where: { id: fp.formation_id },
      data: { statut: 'REJETEE' }
    });

    await this.audit.warning('FORMATION_PARTENAIRE_REJETEE', {
      formation_id: fp.formation_id,
      motif,
      responsable_id
    });

    // RM-100 + RM-128 : notifier Partenaire avec motif + corrections
    try {
      await this.email.sendFormationRejetee(
        fp.partenaire.email_principal,
        fp.formation.intitule,
        `${motif}${corrections ? ` | Corrections: ${corrections}` : ''}`,
        'FR'
      );
    } catch (error: any) {
      await this.audit.warning('FORMATION_PARTENAIRE_REJETEE_EMAIL_FAILED', {
        formation_id: fp.formation_id,
        partenaire_id: fp.partenaire_id,
        error: error.message
      });
    }

    return { message: 'Formation rejetée. Partenaire notifié.' };
  }

  // UCS18 — Détail formation partenaire (RESPONSABLE)
  async getDetail(fp_id: string) {
    const fp = await this.fpRepo.findById(fp_id);
    if (!fp) throw new Error('FP_NOT_FOUND');
    return fp;
  }

  // UCS18 — Suspendre formation active via fp_id (RM-131)
  async suspendreParFp(fp_id: string, motif: string, responsable_id: string) {
    const fp = await this.fpRepo.findById(fp_id);
    if (!fp) throw new Error('FP_NOT_FOUND');
    return this.suspendre(fp.formation_id, motif, responsable_id);
  }

  // UCS18 — Suspendre formation active (RM-131)
  async suspendre(formation_id: string, motif: string, responsable_id: string) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formation_id },
      include: { partenaire: true }
    });
    if (!formation) throw new Error('FORMATION_NOT_FOUND');
    if (formation.statut !== 'ACTIVE') throw new Error('FORMATION_NON_ACTIVE');

    await this.prisma.formation.update({
      where: { id: formation_id },
      data: { statut: 'SUSPENDUE' }
    });

    await this.audit.warning('FORMATION_PARTENAIRE_SUSPENDUE', { formation_id, motif, responsable_id });
    return { message: 'Formation suspendue.' };
  }

  // UCS18 — Réactiver formation suspendue via fp_id (RM-131)
  async reactiverParFp(fp_id: string, responsable_id: string) {
    const fp = await this.fpRepo.findById(fp_id);
    if (!fp) throw new Error('FP_NOT_FOUND');
    return this.reactiver(fp.formation_id, responsable_id);
  }

  // UCS18 — Réactiver formation suspendue (RM-131)
  async reactiver(formation_id: string, responsable_id: string) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formation_id }
    });
    if (!formation) throw new Error('FORMATION_NOT_FOUND');
    if (formation.statut !== 'SUSPENDUE') throw new Error('FORMATION_NON_SUSPENDUE');

    await this.prisma.formation.update({
      where: { id: formation_id },
      data: { statut: 'ACTIVE' }
    });

    await this.audit.info('FORMATION_PARTENAIRE_REACTIVEE', { formation_id, responsable_id });
    return { message: 'Formation réactivée.' };
  }

  // Scheduler — alertes délai validation > 5j (RM-134)
  async alerterFormationsEnRetard() {
    const enRetard = await this.fpRepo.findEnRetard();
    for (const fp of enRetard) {
      await this.audit.warning('FORMATION_VALIDATION_EN_RETARD', {
        formation_id: fp.formation_id,
        partenaire: fp.partenaire.raison_sociale,
        jours: Math.floor((Date.now() - fp.date_soumission.getTime()) / (24 * 3600 * 1000))
      });
    }
    return enRetard.length;
  }

  async getFormationsEnAttente(
    responsable_id: string,
    opts: { statut?: string; search?: string; page?: number; limit?: number } = {}
  ) {
    return this.fpRepo.findByResponsable(responsable_id, opts);
  }
}
