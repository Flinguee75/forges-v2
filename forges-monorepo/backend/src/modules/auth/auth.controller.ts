import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, LoginSchema } from './dto/login.dto';
import {
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from './dto/auth.dto';

export class AuthController {
  constructor(private authService: AuthService) {}

  async login(req: Request, res: Response) {
    try {
      const dto = LoginSchema.parse(req.body);
      const result = await this.authService.login(dto.email, dto.password, req.ip || '');
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      }
      if (error.message === 'INVALID_CREDENTIALS') {
        return res.status(401).json({ statusCode: 401, error: 'INVALID_CREDENTIALS', message: 'Email ou mot de passe incorrect' });
      }
      if (error.message === 'ACCOUNT_NOT_CONFIRMED') {
        return res.status(403).json({ statusCode: 403, error: 'ACCOUNT_NOT_CONFIRMED', message: 'Veuillez confirmer votre email avant de vous connecter' });
      }
      throw error;
    }
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      const dto = ForgotPasswordSchema.parse(req.body);
      const result = await this.authService.forgotPassword(dto.email, req.ip || '');
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      }
      throw error;
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const dto = ResetPasswordSchema.parse(req.body);
      const result = await this.authService.resetPassword(dto.token, dto.password, req.ip || '');
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      }
      if (error.message === 'TOKEN_INVALID') {
        return res.status(404).json({ statusCode: 404, error: 'TOKEN_INVALID' });
      }
      if (error.message === 'TOKEN_EXPIRED') {
        return res.status(410).json({ statusCode: 410, error: 'TOKEN_EXPIRED' });
      }
      throw error;
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const dto = ChangePasswordSchema.parse(req.body);
      const result = await this.authService.changePassword(req.user!.userId, dto.currentPassword, dto.newPassword, req.ip || '');
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      }
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'USER_NOT_FOUND' });
      }
      if (error.message === 'INVALID_CURRENT_PASSWORD') {
        return res.status(401).json({ statusCode: 401, error: 'INVALID_CURRENT_PASSWORD', message: 'Mot de passe actuel incorrect' });
      }
      throw error;
    }
  }

  async me(req: Request, res: Response) {
    try {
      const result = await this.authService.me(req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'USER_NOT_FOUND' });
      }
      throw error;
    }
  }

  /**
   * RM-30 : Confirmation email
   * Correction PLAN_CORRECTION_WAVE4 #6
   */
  async confirmEmail(req: Request, res: Response) {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ statusCode: 400, error: 'TOKEN_REQUIRED', message: 'Token de confirmation requis' });
      }
      const result = await this.authService.confirmEmail(token, req.ip || '');
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'TOKEN_INVALID') {
        return res.status(404).json({ statusCode: 404, error: 'TOKEN_INVALID', message: 'Token invalide' });
      }
      if (error.message === 'TOKEN_EXPIRED') {
        return res.status(410).json({ statusCode: 410, error: 'TOKEN_EXPIRED', message: 'Token expiré' });
      }
      throw error;
    }
  }

  async logout(req: Request, res: Response) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = req.user?.userId;

    if (!token || !userId) {
      return res.status(401).json({ statusCode: 401, error: 'UNAUTHORIZED' });
    }

    await this.authService.logout(userId, token);
    res.status(200).json({ statusCode: 200, data: { message: 'Déconnexion réussie' } });
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ statusCode: 400, error: 'REFRESH_TOKEN_REQUIRED' });
      }

      const result = await this.authService.refresh(refreshToken);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        return res.status(401).json({ statusCode: 401, error: 'UNAUTHORIZED' });
      }
      throw error;
    }
  }
}
