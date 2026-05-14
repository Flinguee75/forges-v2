import { PrismaClient } from '@prisma/client';

export class DevisRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.devis.findUnique({
      where: { id },
      include: {
        organisation: { select: { id: true, raison_sociale: true, email: true } },
        formation:    { select: { id: true, intitule: true } },
        session:      { select: { id: true, date_debut: true, date_fin: true } },
      },
    });
  }

  async findAll(filters: { organisation_id?: string; statut?: string } = {}) {
    return this.prisma.devis.findMany({
      where: {
        ...(filters.organisation_id ? { organisation_id: filters.organisation_id } : {}),
        ...(filters.statut ? { statut: filters.statut as any } : {}),
      },
      include: {
        organisation: { select: { id: true, raison_sociale: true } },
        formation:    { select: { id: true, intitule: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(data: {
    numero_devis: string;
    organisation_id: string | null;
    destinataire_nom?: string | null;
    destinataire_email?: string | null;
    destinataire_organisation?: string | null;
    formation_id: string;
    session_id: string;
    nb_places: number;
    tarif_unitaire_xof: number;
    montant_total_xof: number;
    notes_admin?: string;
    created_by: string;
  }) {
    return this.prisma.devis.create({ data });
  }

  async payer(id: string, notes_admin?: string) {
    return this.prisma.devis.update({
      where: { id },
      data: {
        statut: 'PAYE',
        paid_at: new Date(),
        ...(notes_admin !== undefined ? { notes_admin } : {}),
      },
    });
  }

  async annuler(id: string, notes_admin?: string) {
    return this.prisma.devis.update({
      where: { id },
      data: {
        statut: 'ANNULE',
        cancelled_at: new Date(),
        ...(notes_admin !== undefined ? { notes_admin } : {}),
      },
    });
  }

  async countParAnnee(annee: number): Promise<number> {
    const debut = new Date(`${annee}-01-01T00:00:00.000Z`);
    const fin = new Date(`${annee + 1}-01-01T00:00:00.000Z`);
    return this.prisma.devis.count({
      where: { created_at: { gte: debut, lt: fin } },
    });
  }
}
