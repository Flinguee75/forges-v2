import { PrismaClient } from '@prisma/client';

const SEUIL_REVERSEMENT_PARTENAIRE = 50000; // RM-139 : 50 000 XOF

export class CommissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async creerCommissionPartenaire(data: {
    paiement_id: string;
    partenaire_id: string;
    formation_id: string;
    montant_catalogue: number;
    commission_forges_pct: number;
    montant_reverse: number;
    statut: string;
  }) {
    return this.prisma.commissionPartenaire.create({ data });
  }

  async creerCommissionApporteur(data: {
    paiement_id: string;
    apporteur_id: string;
    dossier_id: string;
    montant_base: number;
    taux_commission_pct: number;
    montant_commission: number;
    statut: string;
  }) {
    return this.prisma.commissionApporteur.create({ data });
  }

  async getTotalReversementsPartenaireAReverser(partenaire_id: string) {
    const result = await this.prisma.commissionPartenaire.aggregate({
      where: { partenaire_id, statut: 'EN_ATTENTE' },
      _sum: { montant_reverse: true }
    });
    return result._sum.montant_reverse || 0;
  }

  // RM-139 : seuil 50 000 XOF
  async getPartenairesEligiblesReversement() {
    const partenaires = await this.prisma.commissionPartenaire.groupBy({
      by: ['partenaire_id'],
      where: { statut: 'EN_ATTENTE' },
      _sum: { montant_reverse: true },
      having: { montant_reverse: { _sum: { gte: SEUIL_REVERSEMENT_PARTENAIRE } } }
    });
    return partenaires;
  }

  async effectuerReversementPartenaire(partenaire_id: string, agentId: string) {
    return this.prisma.commissionPartenaire.updateMany({
      where: { partenaire_id, statut: 'EN_ATTENTE' },
      data: { statut: 'REVERSE', reverse_le: new Date(), reverse_par: agentId }
    });
  }

  async getTotalCommissionsApporteur(apporteur_id: string) {
    const result = await this.prisma.commissionApporteur.aggregate({
      where: { apporteur_id, statut: 'EN_ATTENTE' },
      _sum: { montant_commission: true }
    });
    return result._sum.montant_commission || 0;
  }
}
