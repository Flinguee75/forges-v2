import { hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';
import { CreateUserDtoType, InvitePartenaireDtoType, CreateApporteurDtoType } from './dto/admin-user.dto';
import { isEmailAvailable } from '../../../shared/helpers/email-uniqueness';

const SALT_ROUNDS = 12;
const INVITATION_EXPIRATION_HOURS = 48; // RM-126 : token invitation 48h

export class AdminService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly email: EmailService
  ) {}

  // UCS02 — Créer compte backoffice
  async createUser(dto: CreateUserDtoType, adminId: string) {
    const existant = await this.prisma.apprenant.findUnique({ where: { email: dto.email } });
    if (existant) throw new Error('EMAIL_ALREADY_EXISTS');

    const tempPassword = uuidv4().substring(0, 12) + 'A1!';
    const password_hash = await hash(tempPassword, SALT_ROUNDS);

    const user = await this.prisma.apprenant.create({
      data: {
        email: dto.email,
        password_hash,
        role: dto.role as any,
        nom: dto.nom,
        prenoms: dto.prenoms,
        type_apprenant: 'PROFESSIONNEL',
        pays_residence: 'CI',
        pays_nationalite: 'CI',
        langue_preferee: 'FR',
        statut: 'ACTIF',
        consentement_rgpd: false,
        consentement_timestamp: new Date(),
        consentement_version_cgu: '1.0',
      }
    });

    await this.audit.info('UTILISATEUR_CREE', { user_id: user.id, role: dto.role, admin_id: adminId });
    await this.email.sendTempPasswordBackoffice(dto.email, dto.prenoms || dto.nom, tempPassword, dto.role as any);

    return user;
  }

  // UCS02 — Activer / Désactiver compte
  async updateUserStatus(userId: string, statut: string, adminId: string) {
    const user = await this.prisma.apprenant.findUnique({ where: { id: userId } });
    if (!user) throw new Error('USER_NOT_FOUND');

    // RM-alt3 : désactivation uniquement si pas de dossiers actifs
    if (statut === 'INACTIF') {
      const dossiersActifs = await this.prisma.dossier.count({
        where: { apprenant_id: userId, statut: { notIn: ['REJETE', 'ANNULE'] } }
      });
      if (dossiersActifs > 0) throw new Error('CANNOT_DEACTIVATE_WITH_ACTIVE_DOSSIERS');
    }

    await this.prisma.apprenant.update({ where: { id: userId }, data: { statut } });
    await this.audit.info(`UTILISATEUR_${statut}`, { user_id: userId, admin_id: adminId });

    return { message: `Compte mis à jour : ${statut}` };
  }

  // UCS02 — Invitation Partenaire Flux A (RM-126)
  async invitePartenaire(dto: InvitePartenaireDtoType, adminId: string) {
    // RM-28 : Unicité email cross-tables
    const emailAvailable = await isEmailAvailable(this.prisma, dto.email);
    if (!emailAvailable) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    const token = uuidv4();
    const token_expiration = new Date(Date.now() + INVITATION_EXPIRATION_HOURS * 3600 * 1000);

    const partenaire = await this.prisma.partenaire.create({
      data: {
        email_principal: dto.email,
        raison_sociale: dto.raison_sociale,
        type: dto.type as any,
        pays: 'CI',
        commission_forges_pct: dto.commission_forges_pct,
        statut: 'INVITE',
        mode_inscription: 'INVITATION_ADMIN',
        token_invitation: token,
        token_invitation_expiration: token_expiration,
      }
    });

    await this.audit.info('PARTENAIRE_INVITE', { partenaire_id: partenaire.id, admin_id: adminId });
    await this.email.sendInvitationPartenaire(dto.email, token, 'FR');

    return { message: 'Invitation envoyée', partenaire_id: partenaire.id };
  }

  // UCS02 — Création Apporteur (RM-141, RM-142)
  async createApporteur(dto: CreateApporteurDtoType, adminId: string) {
    // RM-28 : Unicité email cross-tables
    const emailAvailable = await isEmailAvailable(this.prisma, dto.email);
    if (!emailAvailable) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    // RM-142 : code UUID permanent généré à la création — JAMAIS modifiable
    const code_apporteur = uuidv4();
    const password_hash = 'PENDING_ACTIVATION'; // Password temporaire = email

    const apporteur = await this.prisma.apporteur.create({
      data: {
        nom: dto.nom,
        email: dto.email,
        password_hash,
        type: dto.type as any,
        taux_commission_pct: dto.taux_commission_pct,
        code_apporteur, // RM-142 : permanent
        statut: 'ACTIF',
      }
    });

    await this.audit.info('APPORTEUR_CREE', { apporteur_id: apporteur.id, admin_id: adminId });
    await this.email.sendCodeApporteur(dto.email, code_apporteur, 'FR', dto.nom, dto.taux_commission_pct);

    return { apporteur_id: apporteur.id, code_apporteur };
  }

  // UCS02 — Liste utilisateurs backoffice
  private static readonly ROLES_BACKOFFICE = ['ADMIN', 'SUPERVISEUR', 'RESPONSABLE', 'AGENT', 'GESTIONNAIRE'];

  async listUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = {
      statut: { not: 'INACTIF' as const },
      role: { notIn: AdminService.ROLES_BACKOFFICE as any[] },
    };
    const [users, total] = await Promise.all([
      this.prisma.apprenant.findMany({
        where,
        select: { id: true, email: true, nom: true, prenoms: true, role: true, statut: true, created_at: true },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.apprenant.count({ where })
    ]);
    return { users, total, page, limit };
  }

  async listBackofficeUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = {
      role: { in: AdminService.ROLES_BACKOFFICE as any[] },
    };
    const [users, total] = await Promise.all([
      this.prisma.apprenant.findMany({
        where,
        select: { id: true, email: true, nom: true, prenoms: true, role: true, statut: true, created_at: true },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.apprenant.count({ where })
    ]);
    return { users, total, page, limit };
  }

  async listPartenaires(page = 1, limit = 20, search = '') {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { raison_sociale: { contains: search, mode: 'insensitive' as const } },
            { email_principal: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [partenaires, total] = await Promise.all([
      this.prisma.partenaire.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: {
              formations: true,
              formations_partenaires: true,
              commissions_partenaires: true,
              commissions_partenaires_abonnement: true,
            },
          },
        },
      }),
      this.prisma.partenaire.count({ where }),
    ]);

    return {
      data: partenaires.map((partenaire) => ({
        id: partenaire.id,
        raison_sociale: partenaire.raison_sociale,
        type: partenaire.type,
        email_principal: partenaire.email_principal,
        commission_forges_pct: partenaire.commission_forges_pct,
        statut: partenaire.statut,
        mode_inscription: partenaire.mode_inscription,
        responsable_designe_id: partenaire.responsable_designe_id,
        token_invitation_expiration: partenaire.token_invitation_expiration,
        created_at: partenaire.created_at,
        counts: partenaire._count,
      })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async getPartenaireById(id: string) {
    const partenaire = await this.prisma.partenaire.findUnique({
      where: { id },
      include: {
        formations: { select: { id: true, intitule: true, statut: true } },
        formations_partenaires: {
          select: {
            id: true,
            formation_id: true,
            statut_validation: true,
            prix_coutant_soumis: true,
            prix_coutant_valide: true,
            date_soumission: true,
            date_validation: true,
          },
        },
        commissions_partenaires: {
          select: { id: true, montant_reverse: true, statut: true, created_at: true, reverse_le: true },
        },
        commissions_partenaires_abonnement: {
          select: { id: true, montant_reverse: true, statut: true, created_at: true, reverse_le: true },
        },
      },
    });

    if (!partenaire) {
      throw new Error('PARTENAIRE_NOT_FOUND');
    }

    return partenaire;
  }

  async approvePartenaire(id: string, adminId: string, responsableId?: string) {
    const partenaire = await this.prisma.partenaire.findUnique({ where: { id } });
    if (!partenaire) throw new Error('PARTENAIRE_NOT_FOUND');

    const updated = await this.prisma.partenaire.update({
      where: { id },
      data: {
        statut: 'ACTIF',
        responsable_designe_id: responsableId || partenaire.responsable_designe_id,
      },
    });

    await this.audit.info('PARTENAIRE_APPROUVE', { partenaire_id: id, admin_id: adminId });
    try {
      await this.email.sendPartenaireApprouve(partenaire.email_principal, 'FR');
    } catch {
      // Non-bloquant
    }

    return updated;
  }

  async rejectPartenaire(id: string, adminId: string) {
    const partenaire = await this.prisma.partenaire.findUnique({ where: { id } });
    if (!partenaire) throw new Error('PARTENAIRE_NOT_FOUND');

    const updated = await this.prisma.partenaire.update({
      where: { id },
      data: { statut: 'REJETE' },
    });

    await this.audit.info('PARTENAIRE_REJETE', { partenaire_id: id, admin_id: adminId });
    return updated;
  }

  async suspendPartenaire(id: string, adminId: string) {
    const partenaire = await this.prisma.partenaire.findUnique({ where: { id } });
    if (!partenaire) throw new Error('PARTENAIRE_NOT_FOUND');

    const updated = await this.prisma.partenaire.update({
      where: { id },
      data: { statut: 'SUSPENDU' },
    });

    await this.audit.info('PARTENAIRE_SUSPENDU', { partenaire_id: id, admin_id: adminId });
    return updated;
  }

  async reactivatePartenaire(id: string, adminId: string) {
    const partenaire = await this.prisma.partenaire.findUnique({ where: { id } });
    if (!partenaire) throw new Error('PARTENAIRE_NOT_FOUND');

    const updated = await this.prisma.partenaire.update({
      where: { id },
      data: { statut: 'ACTIF' },
    });

    await this.audit.info('PARTENAIRE_REACTIVE', { partenaire_id: id, admin_id: adminId });
    return updated;
  }

  async deletePartenaire(id: string, adminId: string) {
    const partenaire = await this.prisma.partenaire.findUnique({ where: { id } });
    if (!partenaire) throw new Error('PARTENAIRE_NOT_FOUND');

    await this.prisma.formationPartenaire.deleteMany({ where: { partenaire_id: id } });
    await this.prisma.partenaire.delete({ where: { id } });

    await this.audit.info('PARTENAIRE_SUPPRIME', { partenaire_id: id, email: partenaire.email_principal, admin_id: adminId });
    return { message: 'Partenaire supprimé.' };
  }

  async listApporteurs(page = 1, limit = 20, search = '') {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { nom: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { code_apporteur: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [apporteurs, total] = await Promise.all([
      this.prisma.apporteur.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date_inscription: 'desc' },
        include: {
          _count: { select: { commissions: true } },
          voucher: { select: { id: true, code: true, statut: true } },
        },
      }),
      this.prisma.apporteur.count({ where }),
    ]);

    return {
      data: apporteurs.map((apporteur) => ({
        id: apporteur.id,
        nom: apporteur.nom,
        type: apporteur.type,
        email: apporteur.email,
        pays: apporteur.pays,
        code_apporteur: apporteur.code_apporteur,
        taux_commission_pct: apporteur.taux_commission_pct,
        statut: apporteur.statut,
        date_inscription: apporteur.date_inscription,
        commissions_count: apporteur._count.commissions,
        voucher: apporteur.voucher,
      })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async getApporteurById(id: string) {
    const apporteur = await this.prisma.apporteur.findUnique({
      where: { id },
      include: {
        _count: { select: { commissions: true } },
        voucher: { select: { id: true, code: true, statut: true, date_expiration: true } },
        commissions: {
          select: {
            id: true,
            montant_base: true,
            montant_commission: true,
            statut: true,
            created_at: true,
            reverse_le: true,
          },
          orderBy: { created_at: 'desc' },
          take: 12,
        },
      },
    });

    if (!apporteur) {
      throw new Error('APPORTEUR_NOT_FOUND');
    }

    return apporteur;
  }

  async approveApporteur(id: string, adminId: string) {
    const apporteur = await this.prisma.apporteur.findUnique({ where: { id } });
    if (!apporteur) throw new Error('APPORTEUR_NOT_FOUND');

    const updated = await this.prisma.apporteur.update({
      where: { id },
      data: { statut: 'ACTIF' },
    });

    await this.audit.info('APPORTEUR_APPROUVE', { apporteur_id: id, admin_id: adminId });
    return updated;
  }
}
