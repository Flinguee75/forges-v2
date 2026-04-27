import { PrismaClient } from '@prisma/client';
export class DossierRepository {
  constructor(private prisma: PrismaClient) {}

  async findActiveByApprenantAndSession(apprenantId: string, sessionId: string) {
    return this.prisma.dossier.findFirst({
      where: { apprenant_id: apprenantId, session_id: sessionId, statut: { notIn: ['REJETE', 'ANNULE'] } }
    });
  }

  async create(data: any) {
    return this.prisma.dossier.create({ data });
  }

  async findById(id: string) {
    return this.prisma.dossier.findUnique({ where: { id } });
  }

  async findBySession(sessionId: string) {
    const dossiers = await this.prisma.dossier.findMany({
      where: { session_id: sessionId },
      include: {
        apprenant: {
          select: {
            id: true,
            nom: true,
            prenoms: true,
            email: true,
          },
        },
        formation: {
          select: {
            id: true,
            intitule: true,
            type_formation: true,
            cout_catalogue: true,
          },
        },
        session: {
          select: {
            id: true,
            date_debut: true,
            date_fin: true,
            statut: true,
          },
        },
      },
    });

    const priority = new Set(['GRIS', 'EXCEPTION']);
    return dossiers.sort((left: any, right: any) => {
      const leftPriority = priority.has(left.statut) ? 0 : 1;
      const rightPriority = priority.has(right.statut) ? 0 : 1;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      const leftDate = new Date(left.created_at || left.createdAt || 0).getTime();
      const rightDate = new Date(right.created_at || right.createdAt || 0).getTime();
      return leftDate - rightDate;
    });
  }

  async updateStatut(id: string, statut: string) {
    return this.prisma.dossier.update({
      where: { id },
      data: { statut }
    });
  }

  async setDelaiPaiement(id: string, delaiExpiration: Date) {
    return this.prisma.dossier.update({
      where: { id },
      data: { expires_at: delaiExpiration }
    });
  }

  // RM-19 : endpoint dossiers prioritaires GRIS/EXCEPTION pour Responsable
  async findPrioritairesByResponsable(responsableId: string) {
    const dossiers = await this.prisma.dossier.findMany({
      where: {
        formation: { responsable_id: responsableId },
        statut: { in: ['GRIS', 'EXCEPTION'] }
      },
      include: {
        apprenant: {
          select: {
            id: true,
            nom: true,
            prenoms: true,
            email: true,
          },
        },
        formation: {
          select: {
            id: true,
            intitule: true,
            type_formation: true,
            cout_catalogue: true,
          },
        },
        session: {
          select: {
            id: true,
            date_debut: true,
            date_fin: true,
            statut: true,
          },
        },
      },
      orderBy: { created_at: 'asc' } // FIFO
    });

    return dossiers;
  }
}
