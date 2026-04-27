import { PrismaClient } from '@prisma/client';

export class OrganisationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string) {
    return this.prisma.organisation.findUnique({
      where: { email: email.toLowerCase() }
    });
  }

  async findById(id: string) {
    return this.prisma.organisation.findUnique({ where: { id } });
  }

  // RM-43 : unicité identifiant légal par type
  async findByIdentifiantLegal(identifiant_legal: string, type: string) {
    return this.prisma.organisation.findFirst({
      where: { identifiant_legal, type }
    });
  }

  async create(data: {
    email: string;
    password_hash: string;
    raison_sociale: string;
    type: string;
    sous_types?: string[];
    identifiant_legal?: string;
    contact_referent: string;
    pays: string;
    langue_preferee: string;
    token_confirmation: string;
    token_expiration: Date;
  }) {
    return this.prisma.organisation.create({
      data: { ...data, statut: 'EN_ATTENTE' }
    });
  }

  async activate(id: string) {
    const maintenant = new Date();
    const fin_essai = new Date(maintenant.getTime() + 30 * 24 * 3600 * 1000); // RM-81
    return this.prisma.organisation.update({
      where: { id },
      data: {
        statut: 'ACTIF',
        token_confirmation: null,
        token_expiration: null,
        date_fin_essai: fin_essai,
      }
    });
  }

  async suspendre(id: string) {
    // RM-83 : suspension à J+30 sans abonnement
    return this.prisma.organisation.update({
      where: { id },
      data: { statut: 'SUSPENDU' }
    });
  }
}
