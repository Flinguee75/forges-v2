import { PrismaClient } from '@prisma/client';

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  private mapApprenant(apprenant: any) {
    return {
      id: apprenant.id,
      email: apprenant.email,
      password_hash: apprenant.password_hash,
      role: apprenant.role,
      statut: apprenant.statut,
      langue_preferee: apprenant.langue_preferee,
      source: 'APPRENANT' as const,
    };
  }

  private mapOrganisation(organisation: any) {
    return {
      id: organisation.id,
      email: organisation.email,
      password_hash: organisation.password_hash,
      role: 'ORGANISATION' as const,
      statut: organisation.statut,
      langue_preferee: organisation.langue_preferee,
      source: 'ORGANISATION' as const,
    };
  }

  private mapPartenaire(partenaire: any) {
    return {
      id: partenaire.id,
      email: partenaire.email_principal,
      password_hash: partenaire.password_hash || '',
      role: 'PARTENAIRE' as const,
      statut: partenaire.statut,
      langue_preferee: 'FR' as const,
      source: 'PARTENAIRE' as const,
    };
  }

  private mapApporteur(apporteur: any) {
    return {
      id: apporteur.id,
      email: apporteur.email,
      password_hash: apporteur.password_hash || '',
      role: 'APPORTEUR' as const,
      statut: apporteur.statut,
      langue_preferee: 'FR' as const,
      source: 'APPORTEUR' as const,
    };
  }

  async findById(id: string) {
    const apprenant = await this.prisma.apprenant.findUnique({ where: { id } });
    if (apprenant) {
      return this.mapApprenant(apprenant);
    }

    const organisation = await this.prisma.organisation.findUnique({ where: { id } });
    if (organisation) {
      return this.mapOrganisation(organisation);
    }

    const partenaire = await this.prisma.partenaire.findUnique({ where: { id } });
    if (partenaire) {
      return this.mapPartenaire(partenaire);
    }

    const apporteur = await this.prisma.apporteur.findUnique({ where: { id } });
    if (apporteur) {
      return this.mapApporteur(apporteur);
    }

    return null;
  }

  async findByEmail(email: string) {
    const apprenant = await this.prisma.apprenant.findUnique({ where: { email } });
    if (apprenant) {
      return this.mapApprenant(apprenant);
    }

    const organisation = await this.prisma.organisation.findUnique({ where: { email } });
    if (organisation) {
      return this.mapOrganisation(organisation);
    }

    const partenaire = await this.prisma.partenaire.findUnique({ where: { email_principal: email } });
    if (partenaire) {
      return this.mapPartenaire(partenaire);
    }

    const apporteur = await this.prisma.apporteur.findUnique({ where: { email } });
    if (apporteur) {
      return this.mapApporteur(apporteur);
    }

    return null;
  }

  async findByResetToken(token: string) {
    const apprenant = await this.prisma.apprenant.findFirst({ where: { token_confirmation: token } });
    if (apprenant) {
      return {
        ...this.mapApprenant(apprenant),
        token_expiration: apprenant.token_expiration,
      };
    }

    const organisation = await this.prisma.organisation.findFirst({ where: { token_confirmation: token } });
    if (organisation) {
      return {
        ...this.mapOrganisation(organisation),
        token_expiration: organisation.token_expiration,
      };
    }

    return null;
  }

  // RM-30 : Confirmation email - Correction PLAN_CORRECTION_WAVE4
  async findByConfirmationToken(token: string) {
    const apprenant = await this.prisma.apprenant.findFirst({ where: { token_confirmation: token } });
    if (apprenant) {
      return {
        ...this.mapApprenant(apprenant),
        token_expiration: apprenant.token_expiration,
      };
    }

    const organisation = await this.prisma.organisation.findFirst({ where: { token_confirmation: token } });
    if (organisation) {
      return {
        ...this.mapOrganisation(organisation),
        token_expiration: organisation.token_expiration,
      };
    }

    return null;
  }

  async confirmAccount(userId: string, source: 'APPRENANT' | 'ORGANISATION') {
    if (source === 'APPRENANT') {
      return this.prisma.apprenant.update({
        where: { id: userId },
        data: {
          statut: 'ACTIF',
          token_confirmation: null,
          token_expiration: null
        },
      });
    }

    return this.prisma.organisation.update({
      where: { id: userId },
      data: {
        statut: 'ACTIVE',
        token_confirmation: null,
        token_expiration: null
      },
    });
  }

  async setResetToken(userId: string, source: 'APPRENANT' | 'ORGANISATION', token: string, expiration: Date) {
    if (source === 'APPRENANT') {
      return this.prisma.apprenant.update({
        where: { id: userId },
        data: { token_confirmation: token, token_expiration: expiration },
      });
    }

    return this.prisma.organisation.update({
      where: { id: userId },
      data: { token_confirmation: token, token_expiration: expiration },
    });
  }

  async updatePassword(userId: string, source: 'APPRENANT' | 'ORGANISATION', passwordHash: string) {
    if (source === 'APPRENANT') {
      return this.prisma.apprenant.update({
        where: { id: userId },
        data: { password_hash: passwordHash, token_confirmation: null, token_expiration: null },
      });
    }

    return this.prisma.organisation.update({
      where: { id: userId },
      data: { password_hash: passwordHash, token_confirmation: null, token_expiration: null },
    });
  }
}
