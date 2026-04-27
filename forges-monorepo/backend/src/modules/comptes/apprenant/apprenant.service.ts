import { hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ApprenantRepository } from './apprenant.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';
import { RegisterApprenantDto } from './dto/register-apprenant.dto';
import { UpdateProfilDto } from './dto/update-profil.dto';
import { isEmailAvailable } from '../../../shared/helpers/email-uniqueness';
import { PrismaClient } from '@prisma/client';

const SALT_ROUNDS = 12; // MT-02
const TOKEN_EXPIRATION_HOURS = 24; // RM-30
const VERSION_CGU = '1.0';

export class ApprenantService {
  private readonly prisma: PrismaClient;

  constructor(
    private readonly apprenantRepo: ApprenantRepository,
    private readonly audit: AuditLogger,
    private readonly email: EmailService
  ) {
    this.prisma = (this.apprenantRepo as any).prisma;
  }

  async register(dto: RegisterApprenantDto, ip: string) {
    const emailNormalise = dto.email.trim().toLowerCase();

    // RM-28 : unicité email tous rôles confondus
    const available = await isEmailAvailable(this.prisma, emailNormalise);
    if (!available) {
      // RM-31 : message générique, ne révèle pas l'état du compte
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    // MT-02 : hachage bcrypt coût 12
    const password_hash = await hash(dto.password, SALT_ROUNDS);

    // Token de confirmation UUID v4, expiration 24h (RM-30)
    const token_confirmation = uuidv4();
    const token_expiration = new Date(Date.now() + TOKEN_EXPIRATION_HOURS * 3600 * 1000);

    // RM-33 : conservation consentement RGPD avec timestamp
    const apprenant = await this.apprenantRepo.create({
      email: emailNormalise,
      password_hash,
      nom: dto.nom,
      prenoms: dto.prenoms,
      type_apprenant: dto.type_apprenant,
      secteur_activite: dto.secteur_activite,
      niveau_etude: dto.niveau_etude,
      pays_residence: dto.pays_residence,
      pays_nationalite: dto.pays_nationalite,
      langue_preferee: dto.langue_preferee,
      consentement_rgpd: true,
      consentement_timestamp: new Date(),
      consentement_version_cgu: VERSION_CGU,
      token_confirmation,
      token_expiration,
    });

    // MT-01 : journalisation
    await this.audit.info('COMPTE_CREE', { apprenant_id: apprenant.id, ip });

    // RM-100 : email dans la langue préférée
    try {
      await this.email.sendConfirmation(emailNormalise, token_confirmation, dto.langue_preferee);
    } catch (error: any) {
      await this.audit.warning('COMPTE_CREE_EMAIL_FAILED', {
        apprenant_id: apprenant.id,
        error: error.message
      });
    }

    return { message: 'Compte créé. Vérifiez votre email pour activer votre compte.' };
  }

  async confirmEmail(token: string) {
    const apprenant = await this.apprenantRepo['prisma'].apprenant.findFirst({
      where: { token_confirmation: token }
    });

    if (!apprenant) throw new Error('TOKEN_INVALID');

    // RM-30 : vérification expiration token
    if (apprenant.token_expiration && apprenant.token_expiration < new Date()) {
      throw new Error('TOKEN_EXPIRED');
    }

    await this.apprenantRepo.activate(apprenant.id);
    await this.audit.info('COMPTE_ACTIVE', { apprenant_id: apprenant.id });

    return { message: 'Compte activé avec succès.' };
  }

  async resendConfirmation(email: string) {
    const apprenant = await this.apprenantRepo.findByEmail(email);
    // RM-31 : réponse générique même si email inconnu
    if (!apprenant || apprenant.statut !== 'INACTIF') {
      return { message: 'Si un compte existe, un email a été envoyé.' };
    }

    const token = uuidv4();
    const expiration = new Date(Date.now() + TOKEN_EXPIRATION_HOURS * 3600 * 1000);
    await this.apprenantRepo.updateToken(apprenant.id, token, expiration);
    await this.email.sendConfirmation(email, token, apprenant.langue_preferee);
    await this.audit.info('TOKEN_RENOUVELE', { apprenant_id: apprenant.id });

    return { message: 'Si un compte existe, un email a été envoyé.' };
  }

  async purgerComptesInactifs() {
    // RM-30 : scheduler — purge après 7 jours
    const count = await this.apprenantRepo.purgeInactifs();
    await this.audit.info('COMPTES_INACTIFS_PURGES', { count });
    return count;
  }

  // GET /api/apprenants/profil — UCS02
  async getProfil(userId: string) {
    const apprenant = await this.apprenantRepo.findById(userId);
    if (!apprenant) throw new Error('NOT_FOUND');

    // RM-34 : ne pas exposer password_hash ni token_confirmation (sécurité)
    const { password_hash, token_confirmation, token_expiration, ...safe } = apprenant;
    return safe;
  }

  // PUT /api/apprenants/profil — UCS02
  async updateProfil(userId: string, dto: UpdateProfilDto) {
    // RM-28 : email non modifiable depuis ce endpoint (seulement via réinitialisation)
    const updated = await this.apprenantRepo.update(userId, dto);

    // MT-01 : journalisation
    await this.audit.info('PROFIL_MODIFIE', { apprenant_id: userId });

    return { message: 'Profil mis à jour avec succès', apprenant: updated };
  }
}
