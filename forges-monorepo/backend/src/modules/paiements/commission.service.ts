import { PrismaClient, Prisma } from '@prisma/client';
import { AuditLogger } from '../../shared/audit/audit.logger';

// RM-09: Commission FORGES par défaut 30%
const DEFAULT_COMMISSION_FORGES_PCT = parseFloat(process.env.DEFAULT_COMMISSION_FORGES_PCT || process.env.COMMISSION_FORGES_DEFAULT_PCT || '30');
const DEFAULT_COMMISSION_APPORTEUR_PCT = parseFloat(process.env.DEFAULT_COMMISSION_APPORTEUR_PCT || '5');

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
    tx?: Prisma.TransactionClient
  ) {
    const prismaClient = tx || this.prisma;
    const commissions: { partenaire?: any; apporteur?: any } = {};

    // Commission partenaire
    if (formation.partenaire_id) {
      commissions.partenaire = await this.creerCommissionPartenaire(
        paiement,
        formation,
        prismaClient
      );
    }

    // Commission apporteur si code apporteur présent
    if (dossier.code_apporteur_id) {
      commissions.apporteur = await this.creerCommissionApporteur(
        paiement,
        dossier,
        prismaClient
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
      await this.audit.info('COMMISSION_PARTENAIRE_EXISTANTE', {
        paiement_id: paiement.id,
        commission_id: existante.id,
      });
      return existante;
    }

    // Récupérer commission custom ou défaut
    const commissionForgesPct = formation.commission_forges_pct || DEFAULT_COMMISSION_FORGES_PCT;
    const montantCatalogue = paiement.montant_catalogue || paiement.montant_final;
    const montantReverse = Math.floor(montantCatalogue * (100 - commissionForgesPct) / 100);

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

    await this.audit.info('COMMISSION_PARTENAIRE_CREEE', {
      commission_id: commission.id,
      paiement_id: paiement.id,
      partenaire_id: formation.partenaire_id,
      montant_reverse: montantReverse,
      commission_forges_pct: commissionForgesPct,
    });

    return commission;
  }

  private async creerCommissionApporteur(
    paiement: any,
    dossier: any,
    tx: Prisma.TransactionClient
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
    const montantBase = paiement.montant_final;
    const tauxCommission = DEFAULT_COMMISSION_APPORTEUR_PCT;
    const montantCommission = Math.floor(montantBase * tauxCommission / 100);

    const commission = await tx.commissionApporteur.create({
      data: {
        apporteur_id: dossier.code_apporteur_id,
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
      apporteur_id: dossier.code_apporteur_id,
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
}
