import { Request, Response, NextFunction } from 'express';
import { ApprenantService } from './apprenant.service';
import { RegisterApprenantSchema } from './dto/register-apprenant.dto';
import { UpdateProfilSchema } from './dto/update-profil.dto';

export class ApprenantController {
  constructor(private readonly apprenantService: ApprenantService) {}

  // POST /api/apprenants/register — public (UCS00)
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = RegisterApprenantSchema.parse(req.body);
      const result = await this.apprenantService.register(dto, req.ip || '');
      res.status(201).json({ statusCode: 201, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      if (error.message === 'EMAIL_ALREADY_EXISTS') return res.status(409).json({ statusCode: 409, error: 'EMAIL_ALREADY_EXISTS', message: 'Un compte avec cet email existe déjà.' });
      next(error);
    }
  }

  // GET /api/apprenants/confirm/:token — public (UCS00)
  async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.apprenantService.confirmEmail(req.params.token);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'TOKEN_INVALID') return res.status(404).json({ statusCode: 404, error: 'TOKEN_INVALID' });
      if (error.message === 'TOKEN_EXPIRED') return res.status(410).json({ statusCode: 410, error: 'TOKEN_EXPIRED', message: 'Token expiré. Demandez un nouveau lien.' });
      next(error);
    }
  }

  // POST /api/apprenants/resend-confirmation — public (UCS00)
  async resendConfirmation(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await this.apprenantService.resendConfirmation(email);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/apprenants/profil — APPRENANT (UCS02)
  async getProfil(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.apprenantService.getProfil(req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'NOT_FOUND', message: 'Profil non trouvé' });
      }
      next(error);
    }
  }

  // PUT /api/apprenants/profil — APPRENANT (UCS02)
  async updateProfil(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = UpdateProfilSchema.parse(req.body);
      const result = await this.apprenantService.updateProfil(req.user!.userId, dto);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      }
      next(error);
    }
  }
}
