import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';
import { PaiementCheckoutService } from '../../paiements/paiement-checkout.service';

// Paliers B2B, prix annuels en XOF.
export const PALIERS_B2B = {
  STARTER:    { nb_max: 20,  prix_annuel: 250000 },
  BUSINESS:   { nb_max: 50,  prix_annuel: 500000 },
  ENTERPRISE: { nb_max: 100, prix_annuel: 900000, premium_inclus: 2 },
  SUR_DEVIS:  { nb_max: 999, prix_annuel: 0 }, // UCS13
};

export class AbonnementB2BService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly email: EmailService,
    private readonly checkoutService = new PaiementCheckoutService(audit)
  ) {}

  // GET Mon abonnement B2B actif
  async getAbonnementActif(organisation_id: string) {
    const abo = await this.prisma.abonnementB2B.findFirst({
      where: {
        organisation_id,
        statut: 'ACTIF'
      }
    });

    if (!abo) {
      return null;
    }

    // RM-61 : Calcul dynamique du nombre d'apprenants actifs B2B
    const nb_actifs = await this.prisma.apprenant.count({
      where: {
        organisation_id,
        statut: 'ACTIF'
      }
    });

    // RM-115 : calcul taux_utilisation (déclencheur bot si > 80%)
    const taux_utilisation = abo.nb_max > 0 ? Math.round((nb_actifs / abo.nb_max) * 100) : 0;

    return this.toB2BResponse(abo, {
      nb_actifs,
      taux_utilisation,
    });
  }

  private toB2BResponse(abo: any, extra: Record<string, unknown> = {}) {
    const prixAnnuelXof = Number(abo.prix_annuel || 0);

    return {
      id: abo.id,
      organisation_id: abo.organisation_id,
      palier: abo.palier,
      statut: abo.statut,
      nb_max: abo.nb_max,
      nb_actifs: abo.nb_actifs,
      taux_utilisation: 0,
      prix_annuel: abo.prix_annuel,
      prix_annuel_xof: prixAnnuelXof,
      montant_annuel_xof: prixAnnuelXof,
      premium_inclus_par_an: abo.premium_inclus_par_an,
      premium_consommes: abo.premium_consommes,
      date_debut: abo.date_debut,
      date_fin: abo.date_fin,
      descente_planifiee: abo.descente_planifiee || false,
      palier_descente_cible: abo.palier_descente_cible,
      order_ngser: abo.order_ngser,
      ...extra,
    };
  }

  // UCS03.2 — Souscrire AbonnementB2B avec paiement NGSER
  async souscrire(organisation_id: string, palier: keyof typeof PALIERS_B2B) {
    const normalizedPalier = this.normaliserPalier(palier);
    const config = PALIERS_B2B[normalizedPalier];

    if (!config) {
      throw new Error('PALIER_INVALIDE');
    }

    // Palier SUR_DEVIS : pas de paiement en ligne
    if (normalizedPalier === 'SUR_DEVIS') {
      throw new Error('PALIER_SUR_DEVIS_HORS_LIGNE');
    }

    const existant = await this.prisma.abonnementB2B.findFirst({
      where: { organisation_id, statut: { in: ['ACTIF', 'EN_ATTENTE_PAIEMENT'] } },
    });

    if (existant) {
      if (existant.statut === 'EN_ATTENTE_PAIEMENT') {
        const session = await this.creerSessionPaiement(existant.id, existant.prix_annuel);
        const paymentUrl = session.payment_url;
        return {
          abonnement: this.toB2BResponse(existant),
          payment_url: paymentUrl,
          order_ngser: existant.order_ngser,
          prix_annuel_xof: Number(existant.prix_annuel || 0),
        };
      }
      // RM-84 : unicité stricte
      throw new Error('ABONNEMENT_B2B_DEJA_ACTIF');
    }

    const date_fin = new Date(Date.now() + 365 * 24 * 3600 * 1000);
    const orderNgser = this.generateOrderNgser();

    const abo = await this.prisma.abonnementB2B.create({
      data: {
        organisation_id,
        palier: normalizedPalier,
        nb_max: config.nb_max,
        nb_actifs: 0,
        prix_annuel: config.prix_annuel,
        premium_inclus_par_an: 'premium_inclus' in config ? (config as any).premium_inclus : 0,
        premium_consommes: 0,
        date_debut: new Date(),
        date_fin,
        statut: 'EN_ATTENTE_PAIEMENT',
        order_ngser: orderNgser,
      },
    });

    const session = await this.creerSessionPaiement(abo.id, config.prix_annuel);

    await this.audit.info('ABONNEMENT_B2B_EN_ATTENTE_PAIEMENT', {
      organisation_id,
      palier: normalizedPalier,
      prix_annuel: config.prix_annuel,
      prix_annuel_xof: config.prix_annuel,
      order_ngser: orderNgser,
    });

    return {
      abonnement: this.toB2BResponse(abo),
      payment_url: session.payment_url,
      order_ngser: orderNgser,
      prix_annuel_xof: config.prix_annuel,
    };
  }

  private generateOrderNgser(date = new Date()): string {
    const year = date.getUTCFullYear();
    const start = Date.UTC(year, 0, 0);
    const dayOfYear = Math.floor((date.getTime() - start) / 86400000)
      .toString()
      .padStart(3, '0');
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `ABO-B2B-${year}-${dayOfYear}-${suffix}`;
  }

  private async creerSessionPaiement(abonnement_id: string, montantXof: number): Promise<{ payment_url: string }> {
    const abo = await this.prisma.abonnementB2B.findUnique({ where: { id: abonnement_id } });
    const order = abo?.order_ngser ?? this.generateOrderNgser();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const notificationUrl = process.env.FINEO_CALLBACK_URL || `${backendUrl}/webhooks/fineo`;
    const returnUrl = `${frontendUrl}/organisation/b2b/callback`;

    const session = await this.checkoutService.initierCheckout({
      order,
      amountXof: montantXof,
      title: `Abonnement B2B — ${abo?.palier || 'FORGES'}`,
      callbackUrl: notificationUrl,
      returnUrl,
    });

    return { payment_url: session.payment_url };
  }

  // UCS12.1 — Montée en palier prorata (RM-68)
  async monterPalier(organisation_id: string, nouveauPalier: keyof typeof PALIERS_B2B) {
    const normalizedPalier = this.normaliserPalier(nouveauPalier);
    if (!normalizedPalier) {
      throw new Error('PALIER_INVALIDE');
    }

    const abo = await this.prisma.abonnementB2B.findFirst({
      where: { organisation_id, statut: 'ACTIF' }
    });
    if (!abo) throw new Error('ABONNEMENT_B2B_NOT_FOUND');

    const config = PALIERS_B2B[normalizedPalier];
    const ancienConfig = PALIERS_B2B[abo.palier as keyof typeof PALIERS_B2B];
    if (!ancienConfig) {
      throw new Error('PALIER_INVALIDE');
    }

    if (config.nb_max <= ancienConfig.nb_max) throw new Error('NOUVEAU_PALIER_INFERIEUR');

    // RM-68 : facturation différentiel prorata
    const joursRestants = Math.ceil((abo.date_fin.getTime() - Date.now()) / (24 * 3600 * 1000));
    const montantProrata = Math.floor((config.prix_annuel - ancienConfig.prix_annuel) * joursRestants / 365);

    await this.prisma.abonnementB2B.update({
      where: { id: abo.id },
      data: {
        palier: normalizedPalier,
        nb_max: config.nb_max,
        prix_annuel: config.prix_annuel,
        premium_inclus_par_an: 'premium_inclus' in config ? (config as any).premium_inclus : 0,
      }
    });

    await this.audit.info('ABONNEMENT_B2B_MONTEE_PALIER', {
      organisation_id,
      nouveauPalier: normalizedPalier,
      montant_prorata: montantProrata,
      montant_prorata_xof: montantProrata,
    });
    return { montant_prorata: montantProrata, montant_prorata_xof: montantProrata, nouveau_palier: normalizedPalier };
  }

  // RM-69 : alerte quand le plafond de palier est atteint
  async trouverAlertesPlafond() {
    const abos = await this.prisma.abonnementB2B.findMany({
      where: { statut: 'ACTIF' },
      include: { organisation: true },
    });

    return abos.filter((abo) => abo.nb_actifs >= abo.nb_max);
  }

  // RM-89 : palier Enterprise inclut 2 certifications Premium par an
  async consommerPremiumEnterprise(organisation_id: string) {
    const abo = await this.prisma.abonnementB2B.findFirst({
      where: { organisation_id, statut: 'ACTIF', palier: 'ENTERPRISE' },
    });
    if (!abo) throw new Error('PREMIUM_ENTERPRISE_NON_DISPONIBLE');

    const quota = abo.premium_inclus_par_an || 0;
    if (abo.premium_consommes >= quota) {
      throw new Error('QUOTA_PREMIUM_ENTERPRISE_EPUISE');
    }

    return this.prisma.abonnementB2B.update({
      where: { id: abo.id },
      data: { premium_consommes: { increment: 1 } },
    });
  }

  async resetPremiumEnterpriseAnnuel(organisation_id: string) {
    const abo = await this.prisma.abonnementB2B.findFirst({
      where: { organisation_id, statut: 'ACTIF', palier: 'ENTERPRISE' },
    });
    if (!abo) throw new Error('PREMIUM_ENTERPRISE_NON_DISPONIBLE');

    return this.prisma.abonnementB2B.update({
      where: { id: abo.id },
      data: {
        premium_consommes: 0,
        compteur_premium_used: 0,
        compteur_premium_reset_at: new Date(),
      },
    });
  }

  // Scheduler — alertes expiration J-45 et J-15 (RM-66)
  async envoyerAlertesExpiration() {
    const now = new Date();
    const j45 = new Date(now.getTime() + 45 * 24 * 3600 * 1000);
    const j15 = new Date(now.getTime() + 15 * 24 * 3600 * 1000);

    const [abosJ45, abosJ15] = await Promise.all([
      this.prisma.abonnementB2B.findMany({
        where: { statut: 'ACTIF', date_fin: { gte: j45, lte: new Date(j45.getTime() + 24 * 3600 * 1000) } },
        include: { organisation: true }
      }),
      this.prisma.abonnementB2B.findMany({
        where: { statut: 'ACTIF', date_fin: { gte: j15, lte: new Date(j15.getTime() + 24 * 3600 * 1000) } },
        include: { organisation: true }
      })
    ]);

    for (const abo of [...abosJ45, ...abosJ15]) {
      await this.email.sendAlerteExpirationB2B(abo.organisation.email, abo.date_fin, abo.organisation.langue_preferee);
    }

    return { alertes_j45: abosJ45.length, alertes_j15: abosJ15.length };
  }

  // Scheduler — suspension B2B expiré (RM-67)
  async suspendreB2BExpires() {
    const abosExpires = await this.prisma.abonnementB2B.findMany({
      where: { statut: 'ACTIF', date_fin: { lt: new Date() } },
      include: { organisation: true }
    });

    for (const abo of abosExpires) {
      await this.prisma.abonnementB2B.update({
        where: { id: abo.id },
        data: { statut: 'EXPIRE' }
      });

      // RM-111 : suspension des accès à la demande financés par B2B.
      await this.prisma.accesFormationDemande.updateMany({
        where: {
          statut: 'ACTIF',
          source_financement: 'B2B',
          apprenant: { organisation_id: abo.organisation_id },
        },
        data: { statut: 'SUSPENDU' },
      });

      await this.audit.warning('ABONNEMENT_B2B_EXPIRE', { organisation_id: abo.organisation_id });
    }

    return abosExpires.length;
  }

  private normaliserPalier(palier?: string): keyof typeof PALIERS_B2B | undefined {
    if (!palier || typeof palier !== 'string') {
      return undefined;
    }

    const normalized = palier.trim().toUpperCase();
    if (normalized in PALIERS_B2B) {
      return normalized as keyof typeof PALIERS_B2B;
    }

    return undefined;
  }
}
