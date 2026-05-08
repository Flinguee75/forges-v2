import { PrismaClient } from '@prisma/client';

export class SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll() {
    return this.prisma.session.findMany({
      where: { statut: { not: 'ARCHIVEE' } },
      include: {
        formation: true,
        _count: {
          select: { dossiers: true },
        },
      },
      orderBy: { date_debut: 'asc' }
    });
  }

  async findById(id: string) {
    return this.prisma.session.findUnique({
      where: { id },
      include: {
        formation: true,
        dossiers: true,
        _count: {
          select: { dossiers: true },
        },
      }
    });
  }

  async findAllBackoffice(filters: {
    formation_id?: string;
    statut?: string;
    superviseur_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, search, ...where } = filters;
    const skip = (page - 1) * limit;
    const whereClause = search
      ? {
          ...where,
          formation: {
            ...(where.formation_id ? { id: where.formation_id } : {}),
            intitule: { contains: search, mode: 'insensitive' as const },
          },
        }
      : where;

    const [sessions, total] = await Promise.all([
      this.prisma.session.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          formation: true,
          _count: {
            select: { dossiers: true },
          },
        },
        orderBy: { date_debut: 'asc' },
      }),
      this.prisma.session.count({ where: whereClause }),
    ]);

    return { sessions, total, page, limit };
  }

  async findByFormation(formation_id: string) {
    return this.prisma.session.findMany({
      where: { formation_id, statut: { not: 'ARCHIVEE' } },
      orderBy: { date_debut: 'asc' }
    });
  }

  async findDisponibles(formation_id: string) {
    return this.prisma.session.findMany({
      where: {
        formation_id,
        statut: { in: ['INSCRIPTIONS_OUVERTES', 'A_VENIR'] },
        places_restantes: { gt: 0 }
      },
      orderBy: { date_debut: 'asc' }
    });
  }

  async create(data: {
    formation_id: string;
    date_ouverture: Date;
    date_cloture: Date;
    date_debut: Date;
    date_fin: Date;
    capacite: number;
  }) {
    return this.prisma.session.create({
      data: {
        ...data,
        places_restantes: data.capacite,
        statut: 'PLANIFIEE',
      }
    });
  }

  async update(id: string, data: Partial<{
    date_ouverture: Date;
    date_cloture: Date;
    date_debut: Date;
    date_fin: Date;
    capacite: number;
  }>) {
    return this.prisma.session.update({ where: { id }, data });
  }

  async updateStatut(id: string, statut: string) {
    return this.prisma.session.update({ where: { id }, data: { statut } });
  }

  async archivePendingDossiers(sessionId: string) {
    return this.prisma.dossier.updateMany({
      where: {
        session_id: sessionId,
        statut: { in: ['EN_ATTENTE_VERIFICATION', 'EN_ATTENTE'] },
      },
      data: { statut: 'ARCHIVE' },
    });
  }

  async decrementerPlaces(id: string) {
    return this.prisma.session.update({
      where: { id },
      data: { places_restantes: { decrement: 1 } }
    });
  }

  async hasInscrits(id: string): Promise<boolean> {
    const count = await this.prisma.dossier.count({
      where: { session_id: id, statut: { notIn: ['REJETE', 'ANNULE'] } }
    });
    return count > 0;
  }

  // RM-17 : vérification non-chevauchement
  async findChevauchements(formation_id: string, date_debut: Date, date_fin: Date, excludeId?: string) {
    return this.prisma.session.findMany({
      where: {
        formation_id,
        id: excludeId ? { not: excludeId } : undefined,
        statut: { not: 'ARCHIVEE' },
        OR: [
          { date_debut: { lte: date_fin }, date_fin: { gte: date_debut } },
        ]
      }
    });
  }

  async findDossiersBySession(sessionId: string) {
    return this.prisma.dossier.findMany({
      where: { session_id: sessionId },
      include: {
        apprenant: {
          select: { id: true, nom: true, prenoms: true, email: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // RM-20 : sessions à transitionner par le scheduler
  async findSessionsATransitionner() {
    const now = new Date();
    return this.prisma.session.findMany({
      where: {
        statut: { in: ['PLANIFIEE', 'A_VENIR', 'INSCRIPTIONS_OUVERTES', 'EN_COURS'] }
      }
    });
  }

  // RM-21 : sessions à archiver (clôturées depuis > 90j)
  async findSessionsAArchiver() {
    const limite = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    return this.prisma.session.findMany({
      where: { statut: 'CLOTUREE', date_fin: { lt: limite } }
    });
  }
}
