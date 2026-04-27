import { PrismaClient } from '@prisma/client';

export class VoucherRepository {
  constructor(public readonly prisma: PrismaClient) {}

  async findByCode(code: string) {
    // Chercher d'abord dans VoucherOrganisation
    const voucherOrg = await this.prisma.voucherOrganisation.findUnique({
      where: { code },
    });
    if (voucherOrg) return voucherOrg;

    // Si pas trouvé, chercher dans VoucherApporteur
    return this.prisma.voucherApporteur.findUnique({
      where: { code },
      include: {
        formation: { select: { id: true, intitule: true, statut: true } },
        apporteur: { select: { id: true, nom: true, email: true, code_apporteur: true, statut: true } },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.voucherApporteur.findUnique({
      where: { id },
      include: {
        formation: { select: { id: true, intitule: true, statut: true } },
        apporteur: { select: { id: true, nom: true, email: true, code_apporteur: true, statut: true } },
      },
    });
  }

  async findAll(filters: {
    type?: string;
    statut?: string;
    formation_id?: string;
    organisation_id?: string;
    search?: string;
  }, pagination: { page?: number; limit?: number }) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.type) where.type = filters.type;
    if (filters.statut) where.statut = filters.statut;
    if (filters.formation_id) where.formation_id = filters.formation_id;
    if (filters.organisation_id) where.organisation_id = filters.organisation_id;
    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.voucherApporteur.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          formation: { select: { id: true, intitule: true, statut: true } },
          apporteur: { select: { id: true, nom: true, email: true, code_apporteur: true, statut: true } },
        },
      }),
      this.prisma.voucherApporteur.count({ where }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async create(data: Record<string, unknown>) {
    return this.prisma.voucherApporteur.create({ data: data as any });
  }

  async update(id: string, data: Record<string, unknown>) {
    return this.prisma.voucherApporteur.update({ where: { id }, data: data as any });
  }

  async utiliser(id: string) {
    const voucher = await this.prisma.voucherApporteur.update({
      where: { id },
      data: { quota_utilise: { increment: 1 } },
    });
    if (voucher.quota_max && voucher.quota_utilise >= voucher.quota_max) {
      await this.prisma.voucherApporteur.update({
        where: { id },
        data: { statut: 'EPUISE' },
      });
    }
    return voucher;
  }

  async reactiverApresRejet(id: string) {
    const voucher = await this.prisma.voucherApporteur.findUnique({ where: { id } });
    if (!voucher) return;
    await this.prisma.voucherApporteur.update({
      where: { id },
      data: {
        quota_utilise: { decrement: 1 },
        statut: voucher.statut === 'EPUISE' ? 'ACTIF' : voucher.statut,
      },
    });
  }
}
