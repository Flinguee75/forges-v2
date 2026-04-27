import { PrismaClient } from '@prisma/client';

// Tarifs Retail (RM-12 des abonnements, configurable via UCS13)
export const TARIFS_RETAIL = {
  ESSENTIEL: 15000, // XOF/mois
  PREMIUM:   25000, // XOF/mois
};

export class AbonnementRetailRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByApprenant(apprenant_id: string) {
    return this.prisma.abonnementRetail.findFirst({
      where: { apprenant_id, statut: { not: 'RESILIE' } }
    });
  }

  async findActifByApprenant(apprenant_id: string) {
    return this.prisma.abonnementRetail.findFirst({
      where: { apprenant_id, statut: 'ACTIF' }
    });
  }

  async findFormationsIncluses() {
    return this.prisma.formation.findMany({
      where: {
        statut: 'ACTIVE',
        type_formation: 'STANDARD',
        inclus_abonnement: true,
        pilier_abonnement: { in: ['RETAIL', 'TOUS'] },
      },
      select: {
        id: true,
        intitule: true,
        description_courte: true,
        duree_jours: true,
        cout_catalogue: true,
        type_formation: true,
        mode_formation: true,
        inclus_abonnement: true,
        pilier_abonnement: true,
        langues_disponibles: true,
        certification_delivree: true,
        partenaire: {
          select: { raison_sociale: true },
        },
        _count: {
          select: { sessions: true },
        },
        sessions: {
          where: { statut: 'INSCRIPTIONS_OUVERTES' },
          select: {
            id: true,
            date_debut: true,
            date_fin: true,
            places_restantes: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(data: {
    apprenant_id: string;
    offre: string;
    montant_mensuel: number;
    date_debut: Date;
    date_fin: Date;
    montant_premier_mois: number;
    consentement_auto: boolean;
    consentement_timestamp: Date;
  }) {
    return this.prisma.abonnementRetail.create({
      data: {
        offre: data.offre,
        montant_mensuel: data.montant_mensuel,
        date_debut: data.date_debut,
        date_fin: data.date_fin,
        montant_premier_mois: data.montant_premier_mois,
        consentement_auto: data.consentement_auto,
        consentement_timestamp: data.consentement_timestamp,
        statut: 'ACTIF',
        suspension_count: 0,
        apprenant: { connect: { id: data.apprenant_id } }
      }
    });
  }

  async upgrade(id: string, montant_prorata: number) {
    // RM-79 : upgrade immédiat, différentiel prorata
    return this.prisma.abonnementRetail.update({
      where: { id },
      data: {
        offre: 'PREMIUM',
        montant_mensuel: TARIFS_RETAIL.PREMIUM,
        downgrade_planifie: null,
      }
    });
  }

  async planifierDowngrade(id: string) {
    // RM-104 : downgrade planifié fin de période, pas immédiat
    return this.prisma.abonnementRetail.update({
      where: { id },
      data: { downgrade_planifie: 'ESSENTIEL' }
    });
  }

  async effectuerDowngrade(id: string) {
    return this.prisma.abonnementRetail.update({
      where: { id },
      data: {
        offre: 'ESSENTIEL',
        montant_mensuel: TARIFS_RETAIL.ESSENTIEL,
        downgrade_planifie: null,
      }
    });
  }

  async suspendre(id: string) {
    // RM-76 : suspension max 1 fois/trimestre, max 1 mois
    return this.prisma.abonnementRetail.update({
      where: { id },
      data: {
        statut: 'SUSPENDU',
        date_suspension: new Date(),
        suspension_count: { increment: 1 }
      }
    });
  }

  async reactiver(id: string) {
    // RM-78 : cycle de facturation reprend à la date de réactivation
    return this.prisma.abonnementRetail.update({
      where: { id },
      data: {
        statut: 'ACTIF',
        date_suspension: null,
        date_fin: new Date(Date.now() + 30 * 24 * 3600 * 1000)
      }
    });
  }

  async resilier(id: string) {
    // RM-77 : accès maintenu fin période, résiliation effective ensuite
    return this.prisma.abonnementRetail.update({
      where: { id },
      data: { statut: 'EN_RESILIATION' } // effectif à date_fin
    });
  }

  async renouveler(id: string, date_fin: Date) {
    return this.prisma.abonnementRetail.update({
      where: { id },
      data: { statut: 'ACTIF', date_fin }
    });
  }

  async suspendreGrace(id: string) {
    // RM-73 : grâce 48h puis suspension
    return this.prisma.abonnementRetail.update({
      where: { id },
      data: { statut: 'GRACE', date_grace: new Date() }
    });
  }

  // Scheduler : abonnements à renouveler J-1
  async findARenouveler() {
    const demain = new Date(Date.now() + 24 * 3600 * 1000);
    return this.prisma.abonnementRetail.findMany({
      where: {
        statut: 'ACTIF',
        date_fin: { lte: demain },
        consentement_auto: true,
      },
      include: { apprenant: true }
    });
  }

  // Scheduler : grâces expirées > 48h
  async findGracesExpirees() {
    const limite = new Date(Date.now() - 48 * 3600 * 1000);
    return this.prisma.abonnementRetail.findMany({
      where: { statut: 'GRACE', date_grace: { lt: limite } },
      include: { apprenant: true }
    });
  }

  // Scheduler : downgrade planifiés à effectuer
  async findDowngradesPlanifies() {
    return this.prisma.abonnementRetail.findMany({
      where: {
        downgrade_planifie: { not: null },
        date_fin: { lte: new Date() }
      },
      include: { apprenant: true }
    });
  }

  // RM-72 : compte formations actives simultanées
  async countFormationsActives(apprenant_id: string): Promise<number> {
    return this.prisma.accesFormationDemande.count({
      where: {
        apprenant_id,
        statut: 'ACTIF',
        source_financement: 'ABONNEMENT',
      },
    });
  }
}
