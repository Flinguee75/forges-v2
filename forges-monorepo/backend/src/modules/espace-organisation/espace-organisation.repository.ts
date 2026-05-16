import { PrismaClient } from '@prisma/client';

export class EspaceOrganisationRepository {
  constructor(private readonly prisma: PrismaClient) {}

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

  async findVouchers(organisation_id: string) {
    const [vouchersOrganisation, vouchersApporteur] = await Promise.all([
      this.prisma.voucherOrganisation.findMany({
        where: { organisation_id },
        include: {
          formation: { select: { id: true, intitule: true, type_formation: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.voucherApporteur.findMany({
        where: { organisation_id },
        include: {
          formation: { select: { id: true, intitule: true, type_formation: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return [...vouchersOrganisation.map((voucher) => this.normalizeVoucherOrganisation(voucher)), ...vouchersApporteur.map((voucher) => this.normalizeVoucherApporteur(voucher))]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // RM-61 : vérification plafond B2B
  async countActifsB2B(organisation_id: string): Promise<number> {
    return this.prisma.apprenant.count({
      where: { organisation_id, statut: 'ACTIF' }
    });
  }

  async getStatsOrganisation(organisation_id: string) {
    const [nbBeneficiaires, nbInscriptions, nbVouchersActifsOrganisation, nbVouchersActifsApporteur, paiements] = await Promise.all([
      this.prisma.apprenant.count({ where: { organisation_id } }),
      this.prisma.dossier.count({
        where: {
          apprenant: { organisation_id },
          OR: [
            { source_financement: 'B2B' },
            { voucher_organisation_id: { not: null } },
          ],
        },
      }),
      this.prisma.voucherOrganisation.count({
        where: { organisation_id, statut: 'ACTIF' }
      }),
      this.prisma.voucherApporteur.count({
        where: { organisation_id, statut: 'ACTIF' }
      }),
      this.prisma.paiement.aggregate({
        _sum: { montant_final: true },
        where: {
          dossier: {
            apprenant: { organisation_id },
            OR: [
              { source_financement: 'B2B' },
              { voucher_organisation_id: { not: null } },
            ],
          },
        },
      }),
    ]);

    return {
      nb_beneficiaires: nbBeneficiaires,
      nb_inscriptions: nbInscriptions,
      nb_vouchers_actifs: nbVouchersActifsOrganisation + nbVouchersActifsApporteur,
      montant_paye_total: paiements._sum.montant_final || 0,
    };
  }
}
