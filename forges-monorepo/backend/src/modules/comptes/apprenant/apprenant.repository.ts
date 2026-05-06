import { PrismaClient } from '@prisma/client';

export class ApprenantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string) {
    return this.prisma.apprenant.findUnique({
      where: { email: email.toLowerCase() }
    });
  }

  async findById(id: string) {
    return this.prisma.apprenant.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    password_hash: string;
    nom: string;
    prenoms: string;
    type_apprenant: string;
    secteur_activite?: string;
    niveau_etude?: string;
    pays_residence: string;
    pays_nationalite: string;
    langue_preferee: string;
    organisation_id?: string;
    consentement_rgpd: boolean;
    consentement_timestamp: Date;
    consentement_version_cgu: string;
    token_confirmation: string;
    token_expiration: Date;
  }) {
    return this.prisma.apprenant.create({ data: { ...data, statut: 'INACTIF' } });
  }

  async activate(id: string) {
    return this.prisma.apprenant.update({
      where: { id },
      data: { statut: 'ACTIF', token_confirmation: null, token_expiration: null }
    });
  }

  async updateToken(id: string, token: string, expiration: Date) {
    return this.prisma.apprenant.update({
      where: { id },
      data: { token_confirmation: token, token_expiration: expiration }
    });
  }

  async purgeInactifs() {
    // RM-30 : purge comptes non confirmés après 7 jours
    const limite = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.prisma.apprenant.deleteMany({
      where: { statut: 'INACTIF', created_at: { lt: limite } }
    });
  }

  async update(id: string, data: Partial<{
    nom: string;
    prenoms: string;
    type_apprenant: string;
    secteur_activite: string;
    niveau_etude: string;
    pays_residence: string;
    pays_nationalite: string;
    langue_preferee: string;
  }>) {
    return this.prisma.apprenant.update({
      where: { id },
      data
    });
  }
}
