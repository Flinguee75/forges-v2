import { DossierRepository } from './dossier.repository';
import { SessionRepository } from '../sessions/session.repository';
import { FormationRepository } from '../formations/formation.repository';
import { VoucherValidationService } from '../vouchers/voucher-validation.service';
import { AbonnementRetailRepository } from '../abonnements/retail/abonnement-retail.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { PrismaClient } from '@prisma/client';

export class InscriptionService {
  constructor(
    private dossierRepo: DossierRepository,
    private sessionRepo: SessionRepository,
    private formationRepo: FormationRepository,
    private voucherValidation: VoucherValidationService,
    private retailRepo: AbonnementRetailRepository,
    private audit: AuditLogger,
    private email: EmailService,
    private prisma: PrismaClient
  ) {}

  async inscrire(params: any) {
    const session = await this.sessionRepo.findById(params.session_id);
    if (!session) throw new Error('SESSION_NOT_FOUND');

    // RM-01 : Unicité apprenant/session
    const existant = await this.dossierRepo.findActiveByApprenantAndSession(params.apprenantId, params.session_id);
    if (existant) throw new Error('ALREADY_ENROLLED');

    // RM-15 : Unicité apprenant/formation (cross-sessions)
    const inscriptionFormation = await this.prisma.dossier.findFirst({
      where: {
        apprenant_id: params.apprenantId,
        formation_id: session.formation_id,
        statut: { notIn: ['ANNULE', 'REJETE'] }
      }
    });
    if (inscriptionFormation) throw new Error('ALREADY_ENROLLED');

    // RM-72 : Limite 3 formations simultanées pour abonnés Retail
    if (params.source_financement === 'ABONNEMENT') {
      const nbActives = await this.retailRepo.countFormationsActives(params.apprenantId);
      if (nbActives >= 3) {
        throw new Error('FORMATION_LIMIT_REACHED');
      }
    }

    if (params.code_apporteur) {
      await this.voucherValidation.validateApporteur(params.code_apporteur);
      if (params.voucher_code) throw new Error('VOUCHER_CUMUL_INTERDIT');
    }

    // RM-18 : calcul du taux de remplissage pour déterminer le type de fenêtre
    // Compter les dossiers actifs pour cette session (pas annulés ni rejetés)
    const nbDossiersActifs = await this.prisma.dossier.count({
      where: {
        session_id: params.session_id,
        statut: { notIn: ['ANNULE', 'REJETE'] }
      }
    });

    // Calcul du taux : (inscrits actuels + nouvelle inscription) / capacité * 100
    // Arrondir à 2 décimales pour éviter les erreurs d'arrondi flottant
    const taux = Math.round(((nbDossiersActifs + 1) / session.capacite) * 10000) / 100;

    // RM-18 : Déterminer le type de fenêtre selon le dépassement
    // NORMAL : ≤100% | GRIS : 100% < taux ≤ 110% | EXCEPTION : taux > 110%
    let typeFenetre: 'NORMAL' | 'GRIS' | 'EXCEPTION' = 'NORMAL';
    if (taux > 110) {
      typeFenetre = 'EXCEPTION'; // Dépassement >+10%
    } else if (taux > 100) {
      typeFenetre = 'GRIS';      // Dépassement +1% à +10%
    }

    // RM-18 : ACCEPTER les inscriptions GRIS et EXCEPTION (ne pas bloquer)
    // Les dossiers GRIS/EXCEPTION sont marqués pour traitement prioritaire par le Responsable (RM-19)
    // RM-02 vérifie uniquement les places_restantes pour empêcher inscriptions si session fermée
    // Note: Le système accepte les dépassements de capacité (GRIS et EXCEPTION) qui seront validés manuellement

    // Le Responsable traitera les dossiers GRIS/EXCEPTION en priorité via RM-19
    const formation = await this.formationRepo.findById(session.formation_id);
    const estPremiumEtRetail = formation.type_formation === 'PREMIUM' && params.source_financement === 'RETAIL';

    let voucher: any = null;
    let voucherPromo: any = null;

    // Vérifier si le voucher_code est un voucher promo (type PROMOTIONNEL)
    if (params.voucher_code && params.source_financement === 'RETAIL') {
      voucherPromo = await this.prisma.voucherApporteur.findFirst({
        where: {
          code: params.voucher_code,
          statut: 'ACTIF',
          type: 'PROMOTIONNEL',
          formation_id: session.formation_id
        }
      });
    }

    if (params.source_financement === 'VOUCHER' && params.voucher_code) {
      voucher = await this.voucherValidation.validerVoucher(
        params.voucher_code,
        session.formation_id,
        params.apprenantId
      );

      const alreadyUsed = await this.prisma.dossier.findFirst({
        where: {
          apprenant_id: params.apprenantId,
          voucher_code: params.voucher_code,
          statut: { notIn: ['REJETE', 'ANNULE'] },
        },
      });

      if (alreadyUsed) throw new Error('VOUCHER_ALREADY_USED');
    }

    // RM-42 : Calculer montant_total et montant_apres_reduction
    const montant_total = formation.cout_catalogue;
    let montant_reduction = 0;

    // RM-88 : Réduction -15% pour abonnés Premium sur formations Premium
    if (formation.type_formation === 'PREMIUM' && params.source_financement === 'RETAIL') {
      const abonnement = await this.prisma.abonnementRetail.findFirst({
        where: {
          apprenant_id: params.apprenantId,
          offre: 'PREMIUM',
          statut: 'ACTIF',
        },
      });

      if (abonnement) {
        montant_reduction = Math.round(montant_total * 0.15);
      }
    }

    if (voucherPromo) {
      if (voucherPromo.type_valeur === 'POURCENTAGE') {
        montant_reduction = Math.floor((montant_total * voucherPromo.valeur) / 100);
      } else if (voucherPromo.type_valeur === 'MONTANT') {
        montant_reduction = voucherPromo.valeur;
      }
    }

    const montant_apres_reduction = montant_total - montant_reduction;

    const dossierData: any = {
      apprenant_id: params.apprenantId,
      formation_id: session.formation_id,
      session_id: params.session_id,
      source_financement: params.source_financement,
      statut: estPremiumEtRetail ? 'EN_ATTENTE_VERIFICATION' : 'PAYE_DIRECTEMENT',
      type_fenetre: typeFenetre,
      voucher_code: params.voucher_code,
      code_apporteur: params.code_apporteur,
      montant_remise: montant_reduction
    };

    // Assigner le bon champ selon le type de voucher
    if (voucher && voucher.type === 'ORGANISATION') {
      dossierData.voucher_organisation_id = voucher.id;
    }

    const dossier = await this.dossierRepo.create(dossierData);
    await this.audit.info('DOSSIER_CREE', { dossier_id: dossier.id, statut: dossier.statut });
    if (estPremiumEtRetail) await this.email.notifyResponsable('NOUVEAU_DOSSIER_A_VERIFIER', { dossier_id: dossier.id });

    if (voucher) {
      // Déterminer le type de voucher et utiliser la bonne table
      if (voucher.type === 'ORGANISATION') {
        const updatedVoucher = await this.prisma.voucherOrganisation.update({
          where: { id: voucher.id },
          data: { quota_utilise: { increment: 1 } },
        });

        if (updatedVoucher.quota_max && updatedVoucher.quota_utilise >= updatedVoucher.quota_max) {
          await this.prisma.voucherOrganisation.update({
            where: { id: voucher.id },
            data: { statut: 'EPUISE' },
          });
        }
      } else {
        const updatedVoucher = await this.prisma.voucherApporteur.update({
          where: { id: voucher.id },
          data: { quota_utilise: { increment: 1 } },
        });

        if (updatedVoucher.quota_max && updatedVoucher.quota_utilise >= updatedVoucher.quota_max) {
          await this.prisma.voucherApporteur.update({
            where: { id: voucher.id },
            data: { statut: 'EPUISE' },
          });
        }
      }
    }

    // Incrémenter quota voucher promo si utilisé
    if (voucherPromo) {
      const updatedPromo = await this.prisma.voucherApporteur.update({
        where: { id: voucherPromo.id },
        data: { quota_utilise: { increment: 1 } }
      });

      if (updatedPromo.quota_max && updatedPromo.quota_utilise >= updatedPromo.quota_max) {
        await this.prisma.voucherApporteur.update({
          where: { id: voucherPromo.id },
          data: { statut: 'EPUISE' }
        });
      }
    }

    // RM-42 : Enrichir le retour avec montants calculés
    return {
      ...dossier,
      montant_total,
      montant_apres_reduction
    };
  }

  // UCS08 — Rétention dossier Premium (RM-05 : irréversible, RM-140)
  async retenir(dossierId: string, responsableId: string) {
    const dossier = await this.dossierRepo.findById(dossierId);
    if (!dossier) throw new Error('DOSSIER_NOT_FOUND');

    // RM-05 : RETENU irréversible — vérifier statut actuel
    if (dossier.statut !== 'EN_ATTENTE_VERIFICATION') {
      throw new Error('DOSSIER_ALREADY_PROCESSED');
    }

    // Vérifier que c'est bien un dossier Premium+Retail
    const session = await this.sessionRepo.findById(dossier.session_id);
    const formation = await this.formationRepo.findById(session.formation_id);

    if (formation.type_formation !== 'PREMIUM' || dossier.source_financement !== 'RETAIL') {
      throw new Error('NOT_PREMIUM_RETAIL');
    }

    // RM-05 : Transition EN_ATTENTE_VERIFICATION → RETENU (irréversible)
    const updated = await this.dossierRepo.updateStatut(dossierId, 'RETENU');

    // RM-07 : Déclencher délai 72h pour paiement
    await this.dossierRepo.setDelaiPaiement(dossierId, new Date(Date.now() + 72 * 3600 * 1000));

    await this.audit.info('DOSSIER_RETENU', {
      dossier_id: dossierId,
      responsable_id: responsableId,
      delai_expiration: new Date(Date.now() + 72 * 3600 * 1000)
    });

    // Notifier l'apprenant du statut RETENU (RM-100)
    const apprenant = await this.prisma.apprenant.findUnique({
      where: { id: dossier.apprenant_id }
    });

    if (apprenant) {
      const delaiExpiration = new Date(Date.now() + 72 * 3600 * 1000);
      try {
        await this.email.sendDossierRetenu(
          apprenant.email,
          `${apprenant.prenoms} ${apprenant.nom}`,
          formation.intitule,
          session.date_debut.toLocaleDateString('fr-FR'),
          session.date_fin.toLocaleDateString('fr-FR'),
          delaiExpiration.toLocaleString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          `${process.env.FRONTEND_URL || 'https://forges.local'}/apprenant/paiements/${dossierId}`,
          (apprenant.langue_preferee as 'FR' | 'EN' | 'ES' | 'PT') || 'FR'
        );
      } catch (error: any) {
        await this.audit.warning('DOSSIER_RETENU_EMAIL_FAILED', {
          dossier_id: dossierId,
          responsable_id: responsableId,
          error: error?.message || 'UNKNOWN_ERROR'
        });
      }
    }

    return { success: true, message: 'Dossier retenu avec succès. Délai 72h activé pour paiement.' };
  }

  // UCS08 — Rejet dossier Premium (RM-140)
  async rejeter(dossierId: string, responsableId: string, motif_refus: string) {
    const dossier = await this.dossierRepo.findById(dossierId);
    if (!dossier) throw new Error('DOSSIER_NOT_FOUND');

    // Vérifier statut actuel
    if (dossier.statut !== 'EN_ATTENTE_VERIFICATION') {
      throw new Error('DOSSIER_ALREADY_PROCESSED');
    }

    // Vérifier que c'est bien un dossier Premium+Retail
    const session = await this.sessionRepo.findById(dossier.session_id);
    const formation = await this.formationRepo.findById(session.formation_id);

    if (formation.type_formation !== 'PREMIUM' || dossier.source_financement !== 'RETAIL') {
      throw new Error('NOT_PREMIUM_RETAIL');
    }

    // Transition EN_ATTENTE_VERIFICATION → REJETE
    await this.prisma.dossier.update({
      where: { id: dossierId },
      data: {
        statut: 'REJETE',
        motif_refus
      }
    });

    await this.audit.info('DOSSIER_REJETE', {
      dossier_id: dossierId,
      responsable_id: responsableId,
      motif_refus
    });

    // Notifier l'apprenant du rejet (RM-100)
    const apprenant = await this.prisma.apprenant.findUnique({
      where: { id: dossier.apprenant_id }
    });

    if (apprenant) {
      try {
        await this.email.sendDossierRejete(
          apprenant.email,
          `${apprenant.prenoms} ${apprenant.nom}`,
          formation.intitule,
          motif_refus,
          (apprenant.langue_preferee as 'FR' | 'EN' | 'ES' | 'PT') || 'FR'
        );
      } catch (error: any) {
        await this.audit.warning('DOSSIER_REJETE_EMAIL_FAILED', {
          dossier_id: dossierId,
          responsable_id: responsableId,
          error: error?.message || 'UNKNOWN_ERROR'
        });
      }
    }

    return { success: true, message: 'Dossier rejeté avec succès.' };
  }

  // GET /api/dossiers — Liste dossiers apprenant (Sprint 1)
  async getDossiersByApprenant(apprenantId: string) {
    return this.prisma.dossier.findMany({
      where: { apprenant_id: apprenantId },
      include: {
        formation: { select: { id: true, intitule: true, type_formation: true, cout_catalogue: true } },
        session: { select: { id: true, date_debut: true, date_fin: true, statut: true } },
        paiement: { select: { id: true, statut: true, montant_final: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getDossiersBackoffice() {
    const dossiers = await this.prisma.dossier.findMany({
      where: {
        OR: [
          { statut: 'EN_ATTENTE_VERIFICATION' },
          { statut: { in: ['GRIS', 'EXCEPTION'] } },
          { type_fenetre: { in: ['GRIS', 'EXCEPTION'] } },
        ],
      },
      include: {
        apprenant: { select: { id: true, nom: true, prenoms: true, email: true } },
        formation: { select: { id: true, intitule: true, type_formation: true, cout_catalogue: true } },
        session: { select: { id: true, date_debut: true, date_fin: true, statut: true } },
      },
      orderBy: { created_at: 'asc' }
    });

    const priority = (dossier: any) => {
      const fenetre = dossier.type_fenetre || dossier.statut;
      if (fenetre === 'EXCEPTION') return 0;
      if (fenetre === 'GRIS') return 1;
      return 2;
    };

    return dossiers.sort((a, b) => {
      const byPriority = priority(a) - priority(b);
      if (byPriority !== 0) return byPriority;
      return a.created_at.getTime() - b.created_at.getTime();
    });
  }

  async getDossiersBySession(sessionId: string) {
    return this.dossierRepo.findBySession(sessionId);
  }

  // GET /api/dossiers/:id — Détail backoffice (ADMIN, SUPERVISEUR, RESPONSABLE)
  async getDetail(dossierId: string) {
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      include: {
        apprenant: {
          select: {
            id: true, email: true, nom: true, prenoms: true,
            type_apprenant: true, langue_preferee: true,
          }
        },
        formation: true,
        session: true,
        paiement: true,
      }
    });
    if (!dossier) throw new Error('DOSSIER_NOT_FOUND');
    return dossier;
  }

  // UCS08 — Traiter dossier EXCEPTION (RM-05)
  async traiterException(dossierId: string, decision: 'RETENU' | 'REFUSE', motif_refus: string | undefined, responsableId: string) {
    const dossier = await this.dossierRepo.findById(dossierId);
    if (!dossier) throw new Error('DOSSIER_NOT_FOUND');
    if (dossier.type_fenetre !== 'EXCEPTION') throw new Error('NOT_EXCEPTION');

    if (decision === 'RETENU') {
      return this.retenir(dossierId, responsableId);
    }

    if (!motif_refus || motif_refus.trim().length < 5) {
      throw new Error('MOTIF_OBLIGATOIRE');
    }
    return this.rejeter(dossierId, responsableId, motif_refus);
  }

  // RM-19 : endpoint dossiers prioritaires pour Responsable
  async getDossiersPrioritaires(responsableId: string) {
    return this.dossierRepo.findPrioritairesByResponsable(responsableId);
  }
}
