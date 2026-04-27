import { PrismaClient } from '@prisma/client';

export class EspaceOrganisationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findOrganisationById(id: string) {
    return this.prisma.organisation.findUnique({
      where: { id },
      include: {
        abonnement_org: true,
        abonnement_b2b: true,
      }
    });
  }

  // RM-44 : visibilité RH limitée — uniquement bénéficiaires ayant utilisé un voucher ORG
  async findBeneficiaires(organisation_id: string, filters?: {
    statut?: string;
    formation_id?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, ...where } = filters || {};
    const parsedPage = parseInt(String(page), 10) || 1;
    const parsedLimit = parseInt(String(limit), 10) || 20;
    const skip = (parsedPage - 1) * parsedLimit;

    const [dossiers, total] = await Promise.all([
      this.prisma.dossier.findMany({
        where: {
          source_financement: 'B2B',
          apprenant: { organisation_id },
          ...(where.statut && { statut: where.statut }),
          ...(where.formation_id && { formation_id: where.formation_id }),
        },
        include: {
          apprenant: { select: { id: true, nom: true, prenoms: true, email: true } },
          formation: { select: { id: true, intitule: true, type_formation: true } },
          session: { select: { date_debut: true, date_fin: true, statut: true } },
          paiement: { select: { statut: true, confirmed_at: true } }
        },
        skip,
        take: parsedLimit,
        orderBy: { created_at: 'desc' }
      }),
      this.prisma.dossier.count({
        where: {
          source_financement: 'B2B',
          apprenant: { organisation_id },
        }
      })
    ]);

    return { dossiers, total, page: parsedPage, limit: parsedLimit };
  }

  async findVouchers(organisation_id: string) {
    return this.prisma.voucherApporteur.findMany({
      where: { organisation_id },
      include: {
        formation: { select: { intitule: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  // RM-61 : vérification plafond B2B
  async countActifsB2B(organisation_id: string): Promise<number> {
    return this.prisma.apprenant.count({
      where: { organisation_id, statut: 'ACTIF' }
    });
  }

  async getStatsOrganisation(organisation_id: string) {
    const [nbBeneficiaires, nbInscriptions, nbVouchersActifs, paiements] = await Promise.all([
      this.prisma.apprenant.count({ where: { organisation_id } }),
      this.prisma.dossier.count({ where: { apprenant: { organisation_id } } }),
      this.prisma.voucherApporteur.count({
        where: { organisation_id, statut: 'ACTIF' }
      }),
      this.prisma.paiement.aggregate({
        _sum: { montant_final: true },
        where: {
          dossier: {
            apprenant: { organisation_id }
          }
        }
      }),
    ]);

    return {
      nb_beneficiaires: nbBeneficiaires,
      nb_inscriptions: nbInscriptions,
      nb_vouchers_actifs: nbVouchersActifs,
      montant_paye_total: paiements._sum.montant_final || 0,
    };
  }
}
