import { PrismaClient, Prisma } from '@prisma/client';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { getCommissionApporteurDefaut, getCommissionForgesDefaut } from '../../config/env.config';

export class CommissionService {
  private readonly audit: AuditLogger;

  constructor(
    private readonly prisma: PrismaClient,
    audit?: AuditLogger
  ) {
    this.audit = audit || new AuditLogger(prisma);
  }

  async creerCommissionsApresSuccessPayment(
    paiement: any,
    dossier: any,
    formation: any,
    tx: Prisma.TransactionClient
  ) {
    const commissions: { partenaire?: any; apporteur?: any } = {};

    // Commission partenaire
    if (formation.partenaire_id) {
      commissions.partenaire = await this.creerCommissionPartenaire(
        paiement,
        formation,
        tx
      );
    }

    const apporteur = await this.resolveApporteur(dossier, tx);
    if (apporteur) {
      commissions.apporteur = await this.creerCommissionApporteur(
        paiement,
        dossier,
        tx,
        apporteur
      );
    }

    return commissions;
  }

  private async creerCommissionPartenaire(
    paiement: any,
    formation: any,
    tx: Prisma.TransactionClient
  ) {
    // Vérifier si commission existe déjà (idempotence)
    const existante = await tx.commissionPartenaire.findUnique({
      where: { paiement_id: paiement.id },
    });

    if (existante) {
      return existante;
    }

    const montantCatalogue = paiement.montant_catalogue ?? paiement.montant_final ?? 0;
    const { commissionForgesPct, montantReverse } = await this.resolveReversementPartenaire(
      formation,
      montantCatalogue,
      tx
    );

    const commission = await tx.commissionPartenaire.create({
      data: {
        paiement_id: paiement.id,
        partenaire_id: formation.partenaire_id,
        formation_id: formation.id,
        montant_catalogue: montantCatalogue,
        commission_forges_pct: commissionForgesPct,
        montant_reverse: montantReverse,
        statut: 'EN_ATTENTE',
      },
    });

    return commission;
  }

  private async creerCommissionApporteur(
    paiement: any,
    dossier: any,
    tx: Prisma.TransactionClient,
    apporteur: { id: string; taux_commission_pct?: number | null }
  ) {
    // Vérifier si commission existe déjà (idempotence)
    const existante = await tx.commissionApporteur.findUnique({
      where: { paiement_id: paiement.id },
    });

    if (existante) {
      await this.audit.info('COMMISSION_APPORTEUR_EXISTANTE', {
        paiement_id: paiement.id,
        commission_id: existante.id,
      });
      return existante;
    }

    // RM-145: Commission apporteur calculée sur montant encaissé
    const montantBase = paiement.montant_final ?? paiement.montant_initie ?? paiement.montant_catalogue ?? 0;
    const tauxCommission = apporteur.taux_commission_pct ?? getCommissionApporteurDefaut();
    const montantCommission = Math.floor(montantBase * tauxCommission / 100);

    const commission = await tx.commissionApporteur.create({
      data: {
        apporteur_id: apporteur.id,
        paiement_id: paiement.id,
        dossier_id: dossier.id,
        montant_base: montantBase,
        montant_base_xof: montantBase,
        taux_commission_pct: tauxCommission,
        montant_commission: montantCommission,
        montant_commission_xof: montantCommission,
        statut: 'EN_ATTENTE',
        mois_facturation: this.getMoisFacturation(),
      },
    });

    await this.audit.info('COMMISSION_APPORTEUR_CREEE', {
      commission_id: commission.id,
      paiement_id: paiement.id,
      apporteur_id: apporteur.id,
      montant_commission: montantCommission,
      taux_commission_pct: tauxCommission,
    });

    return commission;
  }

  private getMoisFacturation(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private async resolveApporteur(dossier: any, tx: Prisma.TransactionClient) {
    if (dossier.code_apporteur_id) {
      return {
        id: dossier.code_apporteur_id,
        taux_commission_pct: dossier.code_apporteur?.apporteur?.taux_commission_pct,
      };
    }

    if (!dossier.code_apporteur) return null;

    const apporteur = await tx.apporteur.findFirst({
      where: { code_apporteur: dossier.code_apporteur },
    });

    if (!apporteur) {
      await this.audit.warning('COMMISSION_APPORTEUR_CODE_INTROUVABLE', {
        dossier_id: dossier.id,
        code_apporteur: dossier.code_apporteur,
      });
      return null;
    }

    return apporteur;
  }

  private async resolveReversementPartenaire(
    formation: any,
    montantCatalogue: number,
    tx: Prisma.TransactionClient
  ) {
    const prixCoutantFormation = this.positiveNumber(formation.prix_coutant);
    if (prixCoutantFormation !== null) {
      const montantReverse = Math.min(prixCoutantFormation, montantCatalogue);
      return {
        montantReverse,
        commissionForgesPct: this.deriveCommissionForgesPct(montantCatalogue, montantReverse),
      };
    }

    const prixCoutantRelation = this.positiveNumber(formation.formation_partenaire?.prix_coutant_valide);
    if (prixCoutantRelation !== null) {
      const montantReverse = Math.min(prixCoutantRelation, montantCatalogue);
      return {
        montantReverse,
        commissionForgesPct: this.deriveCommissionForgesPct(montantCatalogue, montantReverse),
      };
    }

    if (formation.id) {
      const formationPartenaire = await tx.formationPartenaire.findUnique({
        where: { formation_id: formation.id },
        include: { partenaire: true },
      });

      const prixCoutantValide = this.positiveNumber(formationPartenaire?.prix_coutant_valide);
      if (prixCoutantValide !== null) {
        const montantReverse = Math.min(prixCoutantValide, montantCatalogue);
        return {
          montantReverse,
          commissionForgesPct: this.deriveCommissionForgesPct(montantCatalogue, montantReverse),
        };
      }

      if (!formation.partenaire?.commission_forges_pct && formationPartenaire?.partenaire?.commission_forges_pct) {
        formation = {
          ...formation,
          partenaire: formationPartenaire.partenaire,
        };
      }
    }

    const commissionForgesPct =
      formation.partenaire?.commission_forges_pct ??
      formation.commission_forges_pct ??
      getCommissionForgesDefaut();
    return {
      commissionForgesPct,
      montantReverse: Math.floor(montantCatalogue * (100 - commissionForgesPct) / 100),
    };
  }

  private positiveNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private deriveCommissionForgesPct(montantCatalogue: number, montantReverse: number): number {
    if (montantCatalogue <= 0) return getCommissionForgesDefaut();
    return Number(((1 - montantReverse / montantCatalogue) * 100).toFixed(2));
  }
}
