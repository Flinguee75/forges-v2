import { Request, Response, NextFunction } from 'express';
import { OrganisationService } from './organisation.service';
import { RegisterOrganisationSchema } from './dto/register-organisation.dto';

export class OrganisationController {
  constructor(private readonly orgService: OrganisationService) {}

  // POST /api/organisations/register — public (UCS03)
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = RegisterOrganisationSchema.parse(req.body);
      const result = await this.orgService.register(dto, req.ip || '');
      res.status(201).json({ statusCode: 201, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      if (error.message === 'EMAIL_ALREADY_EXISTS') return res.status(409).json({ statusCode: 409, error: 'EMAIL_ALREADY_EXISTS' });
      // RM-31 : message générique pour identifiant légal déjà utilisé
      if (error.message === 'IDENTIFIANT_LEGAL_ALREADY_EXISTS') return res.status(409).json({ statusCode: 409, error: 'IDENTIFIANT_LEGAL_ALREADY_EXISTS', message: 'Identifiant légal déjà associé à un compte existant.' });
      next(error);
    }
  }

  // GET /api/organisations/confirm/:token — public (UCS03)
  async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.orgService.confirmEmail(req.params.token);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'TOKEN_INVALID') return res.status(404).json({ statusCode: 404, error: 'TOKEN_INVALID' });
      if (error.message === 'TOKEN_EXPIRED') return res.status(410).json({ statusCode: 410, error: 'TOKEN_EXPIRED' });
      next(error);
    }
  }

  // GET /api/organisations/profil — ORGANISATION (UCS03)
  async getProfil(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.orgService.getProfil(req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'NOT_FOUND', message: 'Profil non trouvé' });
      }
      next(error);
    }
  }
}
