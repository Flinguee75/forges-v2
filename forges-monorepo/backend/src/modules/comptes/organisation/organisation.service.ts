import { hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { OrganisationRepository } from './organisation.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';
import { RegisterOrganisationDto } from './dto/register-organisation.dto';
import { isEmailAvailable } from '../../../shared/helpers/email-uniqueness';
import { PrismaClient } from '@prisma/client';

const SALT_ROUNDS = 12;
const TOKEN_EXPIRATION_HOURS = 24;

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

    const password_hash = await hash(dto.password, SALT_ROUNDS);
    const token_confirmation = uuidv4();
    const token_expiration = new Date(Date.now() + TOKEN_EXPIRATION_HOURS * 3600 * 1000);

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

  // GET /api/organisations/profil — UCS03
  async getProfil(userId: string) {
    const organisation = await this.orgRepo.findById(userId);
    if (!organisation) throw new Error('NOT_FOUND');

    // RM-34 : ne pas exposer password_hash ni token_confirmation (sécurité)
    const { password_hash, token_confirmation, token_expiration, ...safe } = organisation;
    return safe;
  }
}
