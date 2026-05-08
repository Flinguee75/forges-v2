import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';

const NGSER_MOCK_BASE_URL = 'https://mock-ngser.forges.ci/pay';

// RM-107 : grille tarifaire AbonnementOrganisation
export const TARIFS_ORG = {
  BASIQUE:    50000,  // XOF/an
  PRO:       150000,  // XOF/an
  ENTERPRISE: 400000, // XOF/an
};

export class AbonnementOrganisationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly email: EmailService
  ) {}

  // GET Mon abonnement organisation actif ou en attente de paiement
  async getAbonnementActif(organisation_id: string) {
    const abo = await this.prisma.abonnementOrganisation.findFirst({
      where: {
        organisation_id,
        statut: { in: ['ACTIF', 'EN_ATTENTE_PAIEMENT'] },
      },
    });

    if (!abo) {
      return null;
    }

    // Récupérer le nb de gestionnaires selon offre (RM-112)
    const nb_gestionnaires_max = abo.offre === 'BASIQUE' ? 1 : abo.offre === 'PRO' ? 1 : 5;

    return {
      id: abo.id,
      offre: abo.offre,
      statut: abo.statut,
      montant_annuel: abo.montant_annuel,
      date_debut: abo.date_debut,
      date_fin: abo.date_fin,
      date_renouvellement: abo.date_fin, // alias explicite pour le normaliseur front
      renouvellement_auto: abo.renouvellement_auto,
      nb_gestionnaires_max,
    };
  }

  // UCS03 → Souscrire AbonnementOrganisation avec paiement NGSER
  async souscrire(organisation_id: string, offre_org: 'BASIQUE' | 'PRO' | 'ENTERPRISE') {
    // RM-84 : unicité — un seul AbonnementOrganisation actif ou en attente
    const existant = await this.prisma.abonnementOrganisation.findFirst({
      where: { organisation_id, statut: { in: ['ACTIF', 'EN_ATTENTE_PAIEMENT'] } },
    });

    if (existant) {
      // RM-84 : unicité stricte — un seul abonnement actif ou en attente par organisation
      throw new Error('ABONNEMENT_ORG_DEJA_ACTIF');
    }

    const offre = offre_org;
    const montant = TARIFS_ORG[offre];
    const date_fin = new Date(Date.now() + 365 * 24 * 3600 * 1000);
    const orderNgser = this.generateOrderNgser();

    const abo = await this.prisma.abonnementOrganisation.create({
      data: {
        organisation_id,
        offre,
        montant_annuel: montant,
        date_debut: new Date(),
        date_fin,
        statut: 'EN_ATTENTE_PAIEMENT',
        renouvellement_auto: true,
        order_ngser: orderNgser,
      },
    });

    const session = await this.creerSessionNgser(abo.id, montant);

    await this.audit.info('ABONNEMENT_ORG_EN_ATTENTE_PAIEMENT', {
      organisation_id,
      offre,
      montant,
      order_ngser: orderNgser,
    });

    return {
      abonnement: abo,
      payment_url: session.payment_url,
      order_ngser: orderNgser,
    };
  }

  private generateOrderNgser(date = new Date()): string {
    const year = date.getUTCFullYear();
    const start = Date.UTC(year, 0, 0);
    const dayOfYear = Math.floor((date.getTime() - start) / 86400000)
      .toString()
      .padStart(3, '0');
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `ABO-ORG-${year}-${dayOfYear}-${suffix}`;
  }

  private async creerSessionNgser(abonnement_id: string, montantXof: number): Promise<{ payment_url: string }> {
    const isMock = process.env.NGSER_MOCK_MODE !== 'false';
    const abo = await this.prisma.abonnementOrganisation.findUnique({ where: { id: abonnement_id } });
    const order = abo?.order_ngser ?? this.generateOrderNgser();

    if (isMock) {
      return { payment_url: `${NGSER_MOCK_BASE_URL}?order=${order}` };
    }

    const { NgserClient } = await import('../../paiements/ngser.client');
    const ngserClient = new NgserClient(this.audit);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const notificationUrl = process.env.NGSER_NOTIFICATION_URL || 'http://localhost:3000/webhooks/paiement';
    const returnUrl = `${frontendUrl}/organisation/abonnement/callback`;

    const session = await ngserClient.createSession({
      order,
      amount: montantXof,
      currency: 'XOF',
      notification_url: notificationUrl,
      return_url: returnUrl,
    });

    return { payment_url: session.payment_url };
  }

  // Scheduler alertes J-7 et J-2 (RM-82)
  async envoyerAlertesExpiration() {
    const now = new Date();
    const j7 = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    const j2 = new Date(now.getTime() + 2 * 24 * 3600 * 1000);

    const [abosJ7, abosJ2] = await Promise.all([
      this.prisma.abonnementOrganisation.findMany({
        where: { statut: 'ACTIF', date_fin: { gte: j7, lte: new Date(j7.getTime() + 24 * 3600 * 1000) } },
        include: { organisation: true }
      }),
      this.prisma.abonnementOrganisation.findMany({
        where: { statut: 'ACTIF', date_fin: { gte: j2, lte: new Date(j2.getTime() + 24 * 3600 * 1000) } },
        include: { organisation: true }
      })
    ]);

    for (const abo of [...abosJ7, ...abosJ2]) {
      await this.email.sendAlerteExpirationOrg(abo.organisation.email, abo.date_fin, abo.organisation.langue_preferee);
    }

    return { alertes_j7: abosJ7.length, alertes_j2: abosJ2.length };
  }

  // UCS09.1 — Renouvellement automatique Organisation (RM-109)
  async traiterRenouvellements() {
    const demain = new Date(Date.now() + 24 * 3600 * 1000);
    const abos = await this.prisma.abonnementOrganisation.findMany({
      where: {
        statut: 'ACTIF',
        renouvellement_auto: true,
        date_fin: { lte: demain },
      },
      include: { organisation: true },
    });

    let renouveles = 0;
    let echecs = 0;

    for (const abo of abos) {
      try {
        const nouvelleDateFin = new Date(abo.date_fin.getTime() + 365 * 24 * 3600 * 1000);
        await this.prisma.abonnementOrganisation.update({
          where: { id: abo.id },
          data: { date_fin: nouvelleDateFin, statut: 'ACTIF' },
        });

        await this.audit.info('ABONNEMENT_ORG_RENOUVELE', {
          organisation_id: abo.organisation_id,
          abonnement_id: abo.id,
          date_fin: nouvelleDateFin,
        });
        try {
          await this.email.sendAbonnementConfirmation(abo.organisation.email, abo.offre);
        } catch (error: any) {
          await this.audit.warning('ABONNEMENT_ORG_RENOUVELLEMENT_EMAIL_FAILED', {
            organisation_id: abo.organisation_id,
            error: error?.message || 'UNKNOWN_ERROR',
          });
        }
        renouveles++;
      } catch (error) {
        echecs++;
      }
    }

    return { renouveles, echecs };
  }
}
