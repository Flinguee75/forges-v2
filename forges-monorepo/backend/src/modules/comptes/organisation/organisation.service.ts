import { OrganisationRepository } from './organisation.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';
import { RegisterOrganisationDto } from './dto/register-organisation.dto';
import { isEmailAvailable } from '../../../shared/helpers/email-uniqueness';
import { PrismaClient } from '@prisma/client';
import { hashPassword, generateVerificationToken } from '../../../shared/account/account-provisioning';

export class OrganisationService {
  private readonly prisma: PrismaClient;

  constructor(
    private readonly orgRepo: OrganisationRepository,
    private readonly audit: AuditLogger,
    private readonly email: EmailService
  ) {
    this.prisma = (this.orgRepo as any).prisma;
  }

  async register(dto: RegisterOrganisationDto, ip: string) {
    const emailNormalise = dto.email.trim().toLowerCase();

    // RM-28 : unicité email sur l'organisation puis tous rôles confondus
    const existing = await this.orgRepo.findByEmail(emailNormalise);
    if (existing) throw new Error('EMAIL_ALREADY_EXISTS');

    const available = await isEmailAvailable(this.prisma, emailNormalise);
    if (!available) throw new Error('EMAIL_ALREADY_EXISTS');

    // RM-43 : unicité identifiant légal par type
    if (dto.identifiant_legal) {
      const existantIdLegal = await this.orgRepo.findByIdentifiantLegal(dto.identifiant_legal, dto.type);
      if (existantIdLegal) throw new Error('IDENTIFIANT_LEGAL_ALREADY_EXISTS');
    }

    const password_hash = await hashPassword(dto.password);
    const { token: token_confirmation, expiration: token_expiration } = generateVerificationToken();

    let organisation;
    try {
      organisation = await this.orgRepo.create({
        email: dto.email,
        password_hash,
        raison_sociale: dto.raison_sociale,
        type: dto.type,
        sous_types: dto.sous_types,
        identifiant_legal: dto.identifiant_legal,
        contact_referent: dto.contact_referent,
        pays: dto.pays,
        langue_preferee: dto.langue_preferee,
        token_confirmation,
        token_expiration,
      });
    } catch (error: any) {
      // RM-43 : Prisma lance P2002 si contrainte unique violée
      if (error.code === 'P2002' && error.meta?.target?.includes('identifiant_legal')) {
        throw new Error('IDENTIFIANT_LEGAL_ALREADY_EXISTS');
      }
      throw error;
    }

    await this.audit.info('ORGANISATION_CREEE', { organisation_id: organisation.id, ip });
    try {
      await this.email.sendConfirmation(emailNormalise, token_confirmation, dto.langue_preferee);
    } catch (error: any) {
      await this.audit.warning('ORGANISATION_CREEE_EMAIL_FAILED', {
        organisation_id: organisation.id,
        error: error.message
      });
    }

    return { message: 'Compte organisation créé. Vérifiez votre email.' };
  }

  async confirmEmail(token: string) {
    const org = await this.orgRepo['prisma'].organisation.findFirst({
      where: { token_confirmation: token }
    });

    if (!org) throw new Error('TOKEN_INVALID');
    if (org.token_expiration && org.token_expiration < new Date()) throw new Error('TOKEN_EXPIRED');

    // RM-81 : essai 30 jours démarré à l'activation
    await this.orgRepo.activate(org.id);
    await this.audit.info('ORGANISATION_ACTIVEE', { organisation_id: org.id });

    return { message: 'Compte activé. Essai gratuit 30 jours démarré.' };
  }

  // RM-83 : scheduler — suspension à J+30 sans abonnement
  async suspendreEssaisExpires() {
    const maintenant = new Date();
    const orgsExpirees = await this.orgRepo['prisma'].organisation.findMany({
      where: {
        statut: 'ACTIF',
        date_fin_essai: { lt: maintenant },
        abonnement_org_id: null,
      }
    });

    for (const org of orgsExpirees) {
      await this.orgRepo.suspendre(org.id);
      await this.audit.warning('ORGANISATION_SUSPENDUE_ESSAI_EXPIRE', { organisation_id: org.id });
      await this.email.sendEssaiExpire(org.email, org.langue_preferee);
    }

    return orgsExpirees.length;
  }

  // RM-82 : alertes automatiques J-7 et J-2 avant fin d'essai
  async envoyerAlertesFinEssai() {
    const maintenant = new Date();
    const jourMs = 24 * 3600 * 1000;
    const j7 = new Date(maintenant.getTime() + 7 * jourMs);
    const j2 = new Date(maintenant.getTime() + 2 * jourMs);
    const debutJ7 = new Date(j7.getFullYear(), j7.getMonth(), j7.getDate());
    const debutJ2 = new Date(j2.getFullYear(), j2.getMonth(), j2.getDate());

    const [orgsJ7, orgsJ2] = await Promise.all([
      this.orgRepo['prisma'].organisation.findMany({
        where: {
          statut: 'ACTIF',
          abonnement_org_id: null,
          date_fin_essai: { gte: debutJ7, lt: new Date(debutJ7.getTime() + jourMs) },
        },
      }),
      this.orgRepo['prisma'].organisation.findMany({
        where: {
          statut: 'ACTIF',
          abonnement_org_id: null,
          date_fin_essai: { gte: debutJ2, lt: new Date(debutJ2.getTime() + jourMs) },
        },
      }),
    ]);

    for (const org of [...orgsJ7, ...orgsJ2]) {
      await this.email.sendAlerteFinEssai(org.email, org.date_fin_essai!, org.langue_preferee);
    }

    await this.audit.info('ALERTES_FIN_ESSAI_ORGANISATION', {
      alertes_j7: orgsJ7.length,
      alertes_j2: orgsJ2.length,
    });

    return { alertes_j7: orgsJ7.length, alertes_j2: orgsJ2.length };
  }

  // GET /api/organisations/profil — UCS03
  async getProfil(userId: string) {
    const organisation = await this.orgRepo.findById(userId);
    if (!organisation) throw new Error('NOT_FOUND');

    // RM-34 : ne pas exposer password_hash ni token_confirmation (sécurité)
    const { password_hash, token_confirmation, token_expiration, ...safe } = organisation;
    return safe;
  }
}
