import { PrismaClient } from '@prisma/client';

export class VoucherRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByCode(code: string) {
    return this.prisma.voucherApporteur.findUnique({ where: { code } });
  }

  async findById(id: string) {
    return this.prisma.voucherApporteur.findUnique({ where: { id } });
  }

  async findByOrganisation(organisation_id: string) {
    return this.prisma.voucherApporteur.findMany({
      where: { organisation_id },
      orderBy: { created_at: 'desc' }
    });
  }

  async findPromoEnAttente() {
    return this.prisma.voucherApporteur.findMany({
      where: { type: 'PROMOTIONNEL', statut: 'BROUILLON' }
    });
  }

  async createBulk(data: Array<{
    code: string;
    type: string;
    formation_id: string;
    organisation_id?: string;
    valeur: number;
    type_valeur: string;
    quota_max: number;
    date_expiration: Date;
    cree_par: string;
  }>) {
    return this.prisma.voucherApporteur.createMany({ data });
  }

  async createPromo(data: {
    code: string;
    formation_id: string;
    valeur: number;
    type_valeur: string;
    quota_max: number;
    date_expiration: Date;
    cree_par: string;
  }) {
    return this.prisma.voucherApporteur.create({
      data: { ...data, type: 'PROMOTIONNEL', statut: 'BROUILLON' }
    });
  }

  async valider(id: string, validePar: string) {
    // RM-40 : quota_max et date_expiration non modifiables après activation
    return this.prisma.voucherApporteur.update({
      where: { id },
      data: { statut: 'ACTIF', valide_par: validePar, valide_le: new Date() }
    });
  }

  async refuser(id: string, motif: string, refusePar: string) {
    return this.prisma.voucherApporteur.update({
      where: { id },
      data: { statut: 'REFUSE', motif_refus: motif, valide_par: refusePar }
    });
  }

  async utiliser(id: string) {
    const voucher = await this.prisma.voucherApporteur.update({
      where: { id },
      data: { quota_utilise: { increment: 1 } }
    });
    // Mettre à jour le statut si quota épuisé
    if (voucher.quota_utilise >= voucher.quota_max) {
      await this.prisma.voucherApporteur.update({
        where: { id },
        data: { statut: 'EPUISE' }
      });
    }
    return voucher;
  }

  // RM-45 : réactiver voucher si dossier rejeté
  async reactiverApresRejet(id: string) {
    const voucher = await this.prisma.voucherApporteur.findUnique({ where: { id } });
    if (!voucher) return;
    await this.prisma.voucherApporteur.update({
      where: { id },
      data: {
        quota_utilise: { decrement: 1 },
        statut: voucher.statut === 'EPUISE' ? 'ACTIF' : voucher.statut
      }
    });
  }

  // Scheduler : expiration automatique
  async expirerVouchersExpires() {
    const now = new Date();
    return this.prisma.voucherApporteur.updateMany({
      where: { statut: 'ACTIF', date_expiration: { lt: now } },
      data: { statut: 'EXPIRE' }
    });
  }
}
