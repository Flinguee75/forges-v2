import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';

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

  // GET Mon abonnement organisation actif
  async getAbonnementActif(organisation_id: string) {
    const abo = await this.prisma.abonnementOrganisation.findFirst({
      where: {
        organisation_id,
        statut: 'ACTIF'
      }
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

  // UCS03 → Souscrire AbonnementOrganisation
  async souscrire(organisation_id: string, offre_org: 'BASIQUE' | 'PRO' | 'ENTERPRISE') {
    // RM-84 : unicité — un seul AbonnementOrganisation actif
    const existant = await this.prisma.abonnementOrganisation.findFirst({
      where: { organisation_id, statut: 'ACTIF' }
    });
    if (existant) throw new Error('ABONNEMENT_ORG_DEJA_ACTIF');

    const offre = offre_org;
    const montant = TARIFS_ORG[offre];
    const date_fin = new Date(Date.now() + 365 * 24 * 3600 * 1000); // annuel

    const abo = await this.prisma.abonnementOrganisation.create({
      data: {
        organisation_id,
        offre,
        montant_annuel: montant,
        date_debut: new Date(),
        date_fin,
        statut: 'ACTIF',
        renouvellement_auto: true,
      }
    });

    // Lier à l'Organisation
    await this.prisma.organisation.update({
      where: { id: organisation_id },
      data: { abonnement_org_id: abo.id }
    });

    await this.audit.info('ABONNEMENT_ORG_SOUSCRIT', { organisation_id, offre, montant });
    return abo;
  }

  // Scheduler alertes J-30 et J-7 (RM-109 / RM-82)
  async envoyerAlertesExpiration() {
    const now = new Date();
    const j30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    const j7 = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

    const [abosJ30, abosJ7] = await Promise.all([
      this.prisma.abonnementOrganisation.findMany({
        where: { statut: 'ACTIF', date_fin: { gte: j30, lte: new Date(j30.getTime() + 24 * 3600 * 1000) } },
        include: { organisation: true }
      }),
      this.prisma.abonnementOrganisation.findMany({
        where: { statut: 'ACTIF', date_fin: { gte: j7, lte: new Date(j7.getTime() + 24 * 3600 * 1000) } },
        include: { organisation: true }
      })
    ]);

    for (const abo of [...abosJ30, ...abosJ7]) {
      await this.email.sendAlerteExpirationOrg(abo.organisation.email, abo.date_fin, abo.organisation.langue_preferee);
    }

    return { alertes_j30: abosJ30.length, alertes_j7: abosJ7.length };
  }
}
