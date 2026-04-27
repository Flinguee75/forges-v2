import { PrismaClient } from '@prisma/client';

export class PaiementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.paiement.findUnique({
      where: { id },
      include: { dossier: { include: { formation: true, session: true } } }
    });
  }

  async findByDossierId(dossier_id: string) {
    return this.prisma.paiement.findUnique({ where: { dossier_id } });
  }

  async findByTransactionId(transaction_id: string) {
    return this.prisma.paiement.findFirst({ where: { transaction_id } });
  }

  async create(data: {
    dossier_id: string;
    montant_catalogue: number;
    montant_final: number;
    reduction_appliquee: number;
    methode: string;
    expires_at: Date;
  }) {
    return this.prisma.paiement.create({
      data: { ...data, statut: 'EN_ATTENTE', tentatives: 0 }
    });
  }

  async incrementerTentatives(id: string) {
    return this.prisma.paiement.update({
      where: { id },
      data: { tentatives: { increment: 1 } }
    });
  }

  async confirmer(id: string, transaction_id: string) {
    return this.prisma.paiement.update({
      where: { id },
      data: {
        statut: 'CONFIRME',
        transaction_id,
        confirmed_at: new Date()
      }
    });
  }

  async echouer(id: string) {
    return this.prisma.paiement.update({
      where: { id },
      data: { statut: 'ECHOUE' }
    });
  }

  async findPaiementsExpires() {
    // RM-07 : paiements EN_ATTENTE depuis > 72h
    const limite = new Date(Date.now() - 72 * 3600 * 1000);
    return this.prisma.paiement.findMany({
      where: {
        statut: 'EN_ATTENTE',
        expires_at: { lt: new Date() }
      },
      include: { dossier: true }
    });
  }

  async sumMontant(filters?: { debut?: Date; fin?: Date }) {
    const result = await this.prisma.paiement.aggregate({
      where: {
        statut: 'CONFIRME',
        confirmed_at: {
          gte: filters?.debut,
          lte: filters?.fin
        }
      },
      _sum: { montant_final: true }
    });
    return result._sum.montant_final || 0;
  }

  async countByStatut(statut: string) {
    return this.prisma.paiement.count({ where: { statut } });
  }

  // GET /api/paiements — Liste paiements apprenant (Sprint 1 Semaine 2)
  async findByApprenant(apprenantId: string) {
    return this.prisma.paiement.findMany({
      where: {
        dossier: { apprenant_id: apprenantId }
      },
      include: {
        dossier: {
          include: {
            formation: { select: { id: true, intitule: true, type_formation: true } },
            session: { select: { id: true, date_debut: true, date_fin: true, statut: true } }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }
}
