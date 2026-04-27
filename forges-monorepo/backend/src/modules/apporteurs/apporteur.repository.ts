import { PrismaClient } from '@prisma/client';

// RM-147 : seuil minimum reversement (défaut 5 000 XOF, configurable Admin)
export const SEUIL_REVERSEMENT_DEFAUT = 5000;

export class ApporteurRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.apporteur.findUnique({ where: { id } });
  }

  async findByCode(code_apporteur: string) {
    return this.prisma.apporteur.findFirst({
      where: { code_apporteur, statut: 'ACTIF' }
    });
  }

  async findByEmail(email: string) {
    return this.prisma.apporteur.findUnique({ where: { email } });
  }

  async getProfil(id: string) {
    return this.prisma.apporteur.findUnique({
      where: { id },
      include: {
        _count: { select: { commissions: true } },
        voucher: { select: { id: true, code: true, statut: true } },
      },
    });
  }

  async updateProfil(id: string, data: { nom?: string; email?: string; telephone?: string; pays?: string }) {
    return this.prisma.apporteur.update({
      where: { id },
      data,
      include: {
        _count: { select: { commissions: true } },
        voucher: { select: { id: true, code: true, statut: true } },
      },
    });
  }

  // Commissions d'un apporteur par mois
  async findCommissions(apporteur_id: string, filters?: {
    statut?: string;
    mois?: Date;
  }) {
    const debutMois = filters?.mois
      ? new Date(filters.mois.getFullYear(), filters.mois.getMonth(), 1)
      : undefined;
    const finMois = filters?.mois
      ? new Date(filters.mois.getFullYear(), filters.mois.getMonth() + 1, 0)
      : undefined;

    return this.prisma.commissionApporteur.findMany({
      where: {
        apporteur_id,
        ...(filters?.statut && { statut: filters.statut }),
        ...(debutMois && finMois && { created_at: { gte: debutMois, lte: finMois } })
      },
      include: {
        paiement: { select: { id: true, transaction_id: true, confirmed_at: true, statut: true } },
      },
      orderBy: { created_at: 'desc' }
    });
  }

  // RM-146 : agrégation mensuelle
  async aggregerCommissionsMois(apporteur_id: string, mois: Date) {
    const debut = new Date(mois.getFullYear(), mois.getMonth(), 1);
    const fin = new Date(mois.getFullYear(), mois.getMonth() + 1, 0);

    const result = await this.prisma.commissionApporteur.aggregate({
      where: { apporteur_id, statut: 'EN_ATTENTE', created_at: { gte: debut, lte: fin } },
      _sum: { montant_commission: true },
      _count: true,
    });

    return {
      montant_total: result._sum.montant_commission || 0,
      nb_transactions: result._count,
    };
  }

  // RM-146 : passer EN_ATTENTE → VALIDEE fin de mois
  async validerCommissionsMois(apporteur_id: string, mois: Date) {
    const debut = new Date(mois.getFullYear(), mois.getMonth(), 1);
    const fin = new Date(mois.getFullYear(), mois.getMonth() + 1, 0);

    return this.prisma.commissionApporteur.updateMany({
      where: { apporteur_id, statut: 'EN_ATTENTE', created_at: { gte: debut, lte: fin } },
      data: { statut: 'VALIDEE' }
    });
  }

  // Cumul commissions VALIDEES non encore reversées
  async getCumulDu(apporteur_id: string): Promise<number> {
    const result = await this.prisma.commissionApporteur.aggregate({
      where: { apporteur_id, statut: 'VALIDEE' },
      _sum: { montant_commission: true }
    });
    return result._sum.montant_commission || 0;
  }

  // RM-147 : marquer reversement effectué
  async marquerReverseesCommePayees(apporteur_id: string, agentId: string) {
    return this.prisma.commissionApporteur.updateMany({
      where: { apporteur_id, statut: 'VALIDEE' },
      data: { statut: 'REVERSEE', reverse_par: agentId, reverse_le: new Date() }
    });
  }

  // RM-147 : apporteurs éligibles au reversement (cumul >= seuil)
  async findEligiblesReversement(seuil: number = SEUIL_REVERSEMENT_DEFAUT) {
    const groupes = await this.prisma.commissionApporteur.groupBy({
      by: ['apporteur_id'],
      where: { statut: 'VALIDEE' },
      _sum: { montant_commission: true },
      having: { montant_commission: { _sum: { gte: seuil } } }
    });
    return groupes;
  }

  // RM-148 : top apporteurs du mois (Superviseur)
  async getTopApporteursMois(mois: Date, limit: number = 10) {
    const debut = new Date(mois.getFullYear(), mois.getMonth(), 1);
    const fin = new Date(mois.getFullYear(), mois.getMonth() + 1, 0);

    return this.prisma.commissionApporteur.groupBy({
      by: ['apporteur_id'],
      where: { created_at: { gte: debut, lte: fin } },
      _sum: { montant_commission: true, montant_base: true },
      _count: true,
      orderBy: { _sum: { montant_commission: 'desc' } },
      take: limit,
    });
  }

  async updateStatut(id: string, statut: string) {
    return this.prisma.apporteur.update({ where: { id }, data: { statut } });
  }

  // RM-142 : code UUID permanent — ne change JAMAIS sauf demande Admin
  async regenererCode(id: string, adminId: string) {
    const { v4: uuidv4 } = require('uuid');
    const nouveauCode = uuidv4();
    await this.prisma.apporteur.update({
      where: { id },
      data: { code_apporteur: nouveauCode }
    });
    return nouveauCode;
  }
}
