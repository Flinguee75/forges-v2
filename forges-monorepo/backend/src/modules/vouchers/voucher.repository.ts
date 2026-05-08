import { PrismaClient } from '@prisma/client';

type VoucherType = 'ORGANISATION' | 'APPORTEUR' | 'PROMOTIONNEL';

export class VoucherRepository {
  constructor(public readonly prisma: PrismaClient) {}

  private getModel(type: VoucherType) {
    if (type === 'ORGANISATION') return this.prisma.voucherOrganisation;
    if (type === 'APPORTEUR') return this.prisma.voucherApporteur;
    return this.prisma.voucherApporteur; // PROMOTIONNEL also uses voucherApporteur
  }

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

  async findById(id: string, type?: VoucherType) {
    if (type === 'ORGANISATION') {
      return this.prisma.voucherOrganisation.findUnique({ where: { id } });
    }
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

    const whereApporteur: any = {};
    const whereOrg: any = {};

    if (filters.statut) {
      whereApporteur.statut = filters.statut;
      whereOrg.statut = filters.statut;
    }
    if (filters.formation_id) {
      whereApporteur.formation_id = filters.formation_id;
      whereOrg.formation_id = filters.formation_id;
    }
    if (filters.organisation_id) {
      whereOrg.organisation_id = filters.organisation_id;
    }
    if (filters.search) {
      whereApporteur.OR = [{ code: { contains: filters.search, mode: 'insensitive' } }];
      whereOrg.OR = [{ code: { contains: filters.search, mode: 'insensitive' } }];
    }

    const includeTypeApporteur = !filters.type || filters.type === 'APPORTEUR' || filters.type === 'PROMOTIONNEL';
    const includeTypeOrg = !filters.type || filters.type === 'ORGANISATION';

    const [apporteurItems, apporteurTotal, orgItems, orgTotal] = await Promise.all([
      includeTypeApporteur
        ? this.prisma.voucherApporteur.findMany({
            where: whereApporteur,
            orderBy: { created_at: 'desc' },
            include: {
              formation: { select: { id: true, intitule: true, statut: true } },
              apporteur: { select: { id: true, nom: true, email: true, code_apporteur: true, statut: true } },
            },
          })
        : Promise.resolve([]),
      includeTypeApporteur ? this.prisma.voucherApporteur.count({ where: whereApporteur }) : Promise.resolve(0),
      includeTypeOrg
        ? this.prisma.voucherOrganisation.findMany({
            where: whereOrg,
            orderBy: { created_at: 'desc' },
          })
        : Promise.resolve([]),
      includeTypeOrg ? this.prisma.voucherOrganisation.count({ where: whereOrg }) : Promise.resolve(0),
    ]);

    // Enrichir les voucherOrganisation avec les données de formation (jointure manuelle)
    const formationIds = [...new Set(orgItems.map((v: any) => v.formation_id).filter(Boolean))];
    const formations = formationIds.length > 0
      ? await this.prisma.formation.findMany({
          where: { id: { in: formationIds as string[] } },
          select: { id: true, intitule: true, statut: true },
        })
      : [];
    const formationMap = new Map(formations.map((f) => [f.id, f]));
    const orgItemsWithFormation = orgItems.map((v: any) => ({
      ...v,
      formation: v.formation_id ? (formationMap.get(v.formation_id) ?? null) : null,
    }));

    const allItems = [...apporteurItems, ...orgItemsWithFormation].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const total = apporteurTotal + orgTotal;
    const items = allItems.slice(skip, skip + limit);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async create(data: Record<string, unknown>) {
    const type = (data.type || 'APPORTEUR') as VoucherType;
    if (type === 'ORGANISATION') {
      return this.prisma.voucherOrganisation.create({ data: data as any });
    }
    return this.prisma.voucherApporteur.create({ data: data as any });
  }

  async update(id: string, data: Record<string, unknown>, type?: VoucherType) {
    if (type === 'ORGANISATION') {
      return this.prisma.voucherOrganisation.update({ where: { id }, data: data as any });
    }
    return this.prisma.voucherApporteur.update({ where: { id }, data: data as any });
  }

  async utiliser(id: string, type?: VoucherType) {
    let voucher;
    if (type === 'ORGANISATION') {
      voucher = await this.prisma.voucherOrganisation.update({
        where: { id },
        data: { quota_utilise: { increment: 1 } },
      });
      if (voucher.quota_max && voucher.quota_utilise >= voucher.quota_max) {
        await this.prisma.voucherOrganisation.update({
          where: { id },
          data: { statut: 'EPUISE' },
        });
      }
    } else {
      voucher = await this.prisma.voucherApporteur.update({
        where: { id },
        data: { quota_utilise: { increment: 1 } },
      });
      if (voucher.quota_max && voucher.quota_utilise >= voucher.quota_max) {
        await this.prisma.voucherApporteur.update({
          where: { id },
          data: { statut: 'EPUISE' },
        });
      }
    }
    return voucher;
  }

  async reactiverApresRejet(id: string, type?: VoucherType) {
    let voucher;
    if (type === 'ORGANISATION') {
      voucher = await this.prisma.voucherOrganisation.findUnique({ where: { id } });
      if (!voucher) return;
      await this.prisma.voucherOrganisation.update({
        where: { id },
        data: {
          quota_utilise: { decrement: 1 },
          statut: voucher.statut === 'EPUISE' ? 'ACTIF' : voucher.statut,
        },
      });
    } else {
      voucher = await this.prisma.voucherApporteur.findUnique({ where: { id } });
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

  async delete(id: string, type?: VoucherType) {
    if (type === 'ORGANISATION') {
      return this.prisma.voucherOrganisation.delete({ where: { id } });
    }
    return this.prisma.voucherApporteur.delete({ where: { id } });
  }
}
