import { PrismaClient } from '@prisma/client';

export class EspaceOrganisationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private buildOrganisationDossierWhere(organisation_id: string) {
    return {
      OR: [
        {
          apprenant: { organisation_id },
          OR: [
            { source_financement: 'B2B' },
            { voucher_organisation_id: { not: null } },
          ],
        },
        { organisation_inscriptrice_id: organisation_id },
      ],
    };
  }

  private normalizeFormation(formation: any) {
    if (!formation) return null;
    return {
      ...formation,
      titre: formation.titre || formation.intitule || '',
    };
  }

  private normalizeVoucherOrganisation(voucher: any) {
    return {
      ...voucher,
      source: voucher.devis_id ? 'DEVIS' : 'ORGANISATION',
      formation: this.normalizeFormation(voucher.formation),
    };
  }

  private normalizeVoucherApporteur(voucher: any) {
    return {
      ...voucher,
      source: voucher.type === 'PROMOTIONNEL' ? 'PROMOTIONNEL' : 'APPORTEUR',
      formation: this.normalizeFormation(voucher.formation),
    };
  }

  async findOrganisationById(id: string) {
    return this.prisma.organisation.findUnique({
      where: { id },
      include: {
        abonnement_org: true,
        abonnement_b2b: true,
      }
    });
  }

  // RM-44 : Liste des apprenants B2B de l'organisation
  async findBeneficiaires(organisation_id: string, filters?: {
    statut?: string;
    formation_id?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, statut, formation_id } = filters || {};
    const parsedPage = parseInt(String(page), 10) || 1;
    const parsedLimit = parseInt(String(limit), 10) || 20;
    const skip = (parsedPage - 1) * parsedLimit;

    // Récupérer tous les apprenants B2B de l'organisation
    const whereApprenant: any = {
      organisation_id,
      ...(statut && { statut }),
    };

    const [apprenants, total] = await Promise.all([
      this.prisma.apprenant.findMany({
        where: whereApprenant,
        select: {
          id: true,
          email: true,
          nom: true,
          prenoms: true,
          statut: true,
          created_at: true,
          dossiers: {
            where: formation_id ? { formation_id } : {},
            select: {
              id: true,
              statut: true,
              formation: {
                select: { id: true, intitule: true, type_formation: true }
              },
              session: {
                select: { date_debut: true, date_fin: true, statut: true }
              },
              paiement: {
                select: { statut: true, confirmed_at: true }
              }
            },
            orderBy: { created_at: 'desc' },
            take: 1, // Prendre seulement le dossier le plus récent pour affichage
          }
        },
        skip,
        take: parsedLimit,
        orderBy: { created_at: 'desc' }
      }),
      this.prisma.apprenant.count({
        where: whereApprenant
      })
    ]);

    // Transformer les données pour correspondre au format attendu par le frontend
    const membres = apprenants.map(app => ({
      id: app.id,
      email: app.email,
      nom: app.nom,
      prenom: app.prenoms,
      statut: app.statut,
      created_at: app.created_at,
      derniere_inscription: app.dossiers[0] || null,
    }));

    return {
      membres,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    };
  }

  async findVouchers(organisation_id: string, filters?: {
    statut?: string;
    formation_id?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, statut, formation_id } = filters || {};
    const parsedPage = parseInt(String(page), 10) || 1;
    const parsedLimit = parseInt(String(limit), 10) || 20;
    const skip = (parsedPage - 1) * parsedLimit;
    const where = {
      organisation_id,
      ...(statut && { statut }),
      ...(formation_id && { formation_id }),
    };

    const [vouchersOrganisation, total] = await Promise.all([
      this.prisma.voucherOrganisation.findMany({
        where,
        include: {
          formation: { select: { id: true, intitule: true, type_formation: true } },
        },
        skip,
        take: parsedLimit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.voucherOrganisation.count({ where }),
    ]);

    return {
      vouchers: vouchersOrganisation.map((voucher) => this.normalizeVoucherOrganisation(voucher)),
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    };
  }

  // RM-61 : vérification plafond B2B
  async countActifsB2B(organisation_id: string): Promise<number> {
    return this.prisma.apprenant.count({
      where: { organisation_id, statut: 'ACTIF' }
    });
  }

  async getStatsOrganisation(organisation_id: string) {
    const dossierOrganisationWhere = this.buildOrganisationDossierWhere(organisation_id);
    const [nbBeneficiaires, nbInscriptions, nbVouchersActifs, paiements] = await Promise.all([
      this.prisma.apprenant.count({ where: { organisation_id } }),
      this.prisma.dossier.count({ where: dossierOrganisationWhere }),
      this.prisma.voucherOrganisation.count({
        where: { organisation_id, statut: 'ACTIF' }
      }),
      this.prisma.paiement.aggregate({
        _sum: { montant_final: true },
        where: {
          dossier: dossierOrganisationWhere,
        },
      }),
    ]);

    return {
      nb_beneficiaires: nbBeneficiaires,
      nb_inscriptions: nbInscriptions,
      nb_vouchers_actifs: nbVouchersActifs,
      montant_paye_total: paiements._sum.montant_final || 0,
    };
  }

  async findRecentInscriptions(organisation_id: string, limit = 5) {
    return this.prisma.dossier.findMany({
      where: this.buildOrganisationDossierWhere(organisation_id),
      include: {
        apprenant: { select: { id: true, nom: true, prenoms: true, email: true } },
        formation: { select: { id: true, intitule: true, type_formation: true } },
        session: { select: { date_debut: true, date_fin: true, statut: true } },
        paiement: { select: { statut: true, confirmed_at: true, montant_final: true } },
      },
      take: limit,
      orderBy: { created_at: 'desc' },
    });
  }

  async findRecentPaiements(organisation_id: string, limit = 5) {
    return this.prisma.paiement.findMany({
      where: {
        dossier: this.buildOrganisationDossierWhere(organisation_id),
      },
      include: {
        dossier: {
          include: {
            apprenant: { select: { id: true, nom: true, prenoms: true, email: true } },
            formation: { select: { id: true, intitule: true, type_formation: true } },
            session: { select: { date_debut: true, date_fin: true, statut: true } },
          },
        },
      },
      take: limit,
      orderBy: { confirmed_at: 'desc' },
    });
  }
}
