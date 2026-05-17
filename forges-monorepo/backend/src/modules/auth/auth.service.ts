import { compare, hash } from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';
import { UserRepository } from './auth.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  private readonly SALT_ROUNDS = 12;
  constructor(
    private userRepo: UserRepository,
    private audit: AuditLogger,
    private email: EmailService = new EmailService()
  ) {}

  private isAccountActive(statut: string | undefined | null) {
    return statut === 'ACTIF' || statut === 'ACTIVE';
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  async login(email: string, password: string, ip: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.userRepo.findByEmail(normalizedEmail);

    if (!user || !user.password_hash || !this.isAccountActive(user.statut)) {
      await this.audit.warning('LOGIN_FAILED', { email: normalizedEmail, reason: 'USER_NOT_FOUND_OR_INACTIVE', ip });
      throw new Error('INVALID_CREDENTIALS');
    }

    const valid = await compare(password, user.password_hash);
    if (!valid) {
      await this.audit.warning('LOGIN_FAILED', { userId: user.id, email: normalizedEmail, reason: 'WRONG_PASSWORD', ip });
      throw new Error('INVALID_CREDENTIALS');
    }

    const tokenPayload = {
      sub: user.id,
      role: user.role,
      ...((user as any).langue_preferee && { langue: (user as any).langue_preferee })
    };

    const accessToken = sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: '1h' });
    const refreshToken = sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
    await this.audit.info('LOGIN_SUCCESS', { userId: user.id, role: user.role, ip });
    const userPayload: any = { id: user.id, email: user.email, role: user.role };
    if (user.role === 'ORGANISATION' && (user as any).raison_sociale) {
      userPayload.raison_sociale = (user as any).raison_sociale;
    }
    return { accessToken, refreshToken, user: userPayload };
  }

  async refresh(refreshToken: string) {
    const payload = verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { sub: string };

    // Récupérer l'utilisateur pour obtenir son role actuel
    const user = await this.userRepo.findById(payload.sub);
    if (!user || !this.isAccountActive(user.statut)) throw new Error('UNAUTHORIZED');

    const tokenPayload = {
      sub: user.id,
      role: user.role,
      ...((user as any).langue_preferee && { langue: (user as any).langue_preferee })
    };

    const accessToken = sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: '1h' });
    return { accessToken };
  }

  async forgotPassword(email: string, ip: string) {
    const user = await this.userRepo.findByEmail(this.normalizeEmail(email));

    if (
      !user ||
      !user.password_hash ||
      !this.isAccountActive(user.statut) ||
      !['APPRENANT', 'ORGANISATION'].includes(user.source)
    ) {
      return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
    }

    const resetSource = user.source as 'APPRENANT' | 'ORGANISATION';
    const token = uuidv4();
    const expiration = new Date(Date.now() + 60 * 60 * 1000);

    await this.userRepo.setResetToken(user.id, resetSource, token, expiration);

    try {
      await this.email.sendResetPassword(user.email, token, user.langue_preferee || 'FR');
    } catch (error: any) {
      await this.audit.warning('PASSWORD_RESET_EMAIL_FAILED', {
        userId: user.id,
        email: user.email,
        error: error?.message || 'Unknown error',
        ip,
      });
    }

    await this.audit.info('PASSWORD_RESET_REQUESTED', { userId: user.id, ip });

    return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
  }

  async resetPassword(token: string, newPassword: string, ip: string) {
    const user = await this.userRepo.findByResetToken(token);
    if (!user) {
      throw new Error('TOKEN_INVALID');
    }

    if (user.token_expiration && user.token_expiration < new Date()) {
      throw new Error('TOKEN_EXPIRED');
    }

    const resetSource = user.source as 'APPRENANT' | 'ORGANISATION';
    const passwordHash = await hash(newPassword, this.SALT_ROUNDS);
    await this.userRepo.updatePassword(user.id, resetSource, passwordHash);
    await this.audit.info('PASSWORD_RESET_SUCCESS', { userId: user.id, ip });

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, ip: string) {
    const user = await this.userRepo.findById(userId);
    if (
      !user ||
      !user.password_hash ||
      !['APPRENANT', 'ORGANISATION'].includes(user.source) ||
      !this.isAccountActive(user.statut)
    ) {
      throw new Error('USER_NOT_FOUND');
    }

    const valid = await compare(currentPassword, user.password_hash);
    if (!valid) {
      throw new Error('INVALID_CURRENT_PASSWORD');
    }

    const passwordHash = await hash(newPassword, this.SALT_ROUNDS);
    const resetSource = user.source as 'APPRENANT' | 'ORGANISATION';
    await this.userRepo.updatePassword(user.id, resetSource, passwordHash);
    await this.audit.info('PASSWORD_CHANGED', { userId, ip });

    return { message: 'Mot de passe modifié avec succès' };
  }

  async me(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const { password_hash, token_confirmation, token_expiration, ...safe } = user as any;
    return safe;
  }

  /**
   * RM-30 : Confirmation email avec token expiré → erreur 410 TOKEN_EXPIRED
   * Correction PLAN_CORRECTION_WAVE4 #5
   */
  async confirmEmail(token: string, ip: string) {
    const user = await this.userRepo.findByConfirmationToken(token);

    if (!user) {
      throw new Error('TOKEN_INVALID');
    }

    if (user.token_expiration && user.token_expiration < new Date()) {
      throw new Error('TOKEN_EXPIRED');
    }

    const confirmSource = user.source as 'APPRENANT' | 'ORGANISATION';
    await this.userRepo.confirmAccount(user.id, confirmSource);
    await this.audit.info('EMAIL_CONFIRMED', { userId: user.id, ip });

    return { message: 'Email confirmé avec succès' };
  }

  async logout(userId: string, token: string) {
    await this.audit.info('LOGOUT', { userId, ip: null });
  }
}
