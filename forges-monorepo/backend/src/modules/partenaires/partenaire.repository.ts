import { PrismaClient } from '@prisma/client';

export class PartenaireRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.partenaire.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.partenaire.findUnique({ where: { email_principal: email } });
  }

  async getProfil(id: string) {
    return this.prisma.partenaire.findUnique({
      where: { id },
      include: {
        formations: { select: { id: true } },
      },
    });
  }

  async updateProfil(id: string, data: {
    raison_sociale?: string;
    email_principal?: string;
    pays?: string;
    type?: string;
    site_web?: string | null;
    telephone?: string | null;
    description?: string | null;
    logo_url?: string | null;
  }) {
    return this.prisma.partenaire.update({
      where: { id },
      data,
      include: {
        formations: { select: { id: true } },
      },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.partenaire.findUnique({
      where: { id: userId },
      select: { id: true, statut: true },
    });
  }

  async findByToken(token: string) {
    return this.prisma.partenaire.findFirst({
      where: { token_invitation: token }
    });
  }

  async create(data: {
    raison_sociale: string;
    type: string;
    pays: string;
    email_principal: string;
    commission_forges_pct: number;
    mode_inscription: string;
    statut: string;
    token_invitation?: string;
    token_invitation_expiration?: Date;
  }) {
    return this.prisma.partenaire.create({ data });
  }

  async activer(id: string, responsable_id?: string) {
    return this.prisma.partenaire.update({
      where: { id },
      data: {
        statut: 'ACTIF',
        token_invitation: null,
        token_invitation_expiration: null,
        responsable_designe_id: responsable_id,
      }
    });
  }

  async suspendre(id: string, motif: string) {
    return this.prisma.partenaire.update({
      where: { id },
      data: { statut: 'SUSPENDU' }
    });
  }

  async updateCommission(id: string, commission_pct: number) {
    return this.prisma.partenaire.update({
      where: { id },
      data: { commission_forges_pct: commission_pct }
    });
  }

  async findFormationsPartenaire(partenaire_id: string) {
    return this.prisma.formation.findMany({
      where: { partenaire_id },
      include: {
        formation_partenaire: true,
        _count: { select: { dossiers: { where: { statut: 'PAYE' } } } }
      }
    });
  }

  // RM-130 : reversements nets uniquement (sans commission FORGES)
  async findReversementsNets(partenaire_id: string) {
    return this.prisma.commissionPartenaire.findMany({
      where: { partenaire_id },
      select: {
        // RM-130 : JAMAIS exposer commission_forges_pct ni prix_catalogue
        montant_reverse: true,
        statut: true,
        created_at: true,
        reverse_le: true,
        formation: { select: { intitule: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }
}
