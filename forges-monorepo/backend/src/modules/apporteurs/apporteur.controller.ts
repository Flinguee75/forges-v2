import { Request, Response, NextFunction } from 'express';
import { ApporteurService } from './apporteur.service';
import { RegisterApporteurSchema, UpdateProfilApporteurSchema } from './dto/profil.dto';

export class ApporteurController {
  constructor(private readonly apporteurService: ApporteurService) {}

  // POST /api/apporteurs/register — inscription publique
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = RegisterApporteurSchema.parse(req.body);
      const result = await this.apporteurService.register(dto, req.ip);
      res.status(201).json({ statusCode: 201, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      if (error.message === 'EMAIL_ALREADY_EXISTS') return res.status(409).json({ statusCode: 409, error: 'EMAIL_ALREADY_EXISTS' });
      next(error);
    }
  }

  // GET /api/apporteur/dashboard — APPORTEUR (UCS20, RM-142)
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.apporteurService.getDashboard(req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'APPORTEUR_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'APPORTEUR_NOT_FOUND' });
      next(error);
    }
  }

  // GET /api/apporteur/commissions — APPORTEUR (RM-145)
  async getCommissions(req: Request, res: Response, next: NextFunction) {
    try {
      const mois = req.query.mois ? new Date(req.query.mois as string) : undefined;
      const result = await this.apporteurService.getCommissionsParMois(req.user!.userId, mois);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) { next(error); }
  }

  // POST /api/admin/apporteurs/reversements — AGENT (RM-147)
  async effectuerReversements(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.apporteurService.effectuerReversements(req.user!.userId);
      res.status(201).json({ statusCode: 201, data: result });
    } catch (error) { next(error); }
  }

  // DELETE /api/admin/apporteurs/:id — ADMIN (RM-147 clôture)
  async cloturerCompte(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.apporteurService.cloturerCompte(req.params.id, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'APPORTEUR_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'APPORTEUR_NOT_FOUND' });
      next(error);
    }
  }

  // GET /api/superviseur/apporteurs/tdb — SUPERVISEUR (RM-148)
  async getTdbMensuel(req: Request, res: Response, next: NextFunction) {
    try {
      const mois = req.query.mois ? new Date(req.query.mois as string) : undefined;
      const result = await this.apporteurService.getTdbMensuelSuperviseur(mois);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) { next(error); }
  }

  async getProfil(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.apporteurService.getProfil(req.user!.userId, req.user);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') return res.status(403).json({ statusCode: 403, error: 'FORBIDDEN' });
      if (error.message === 'APPORTEUR_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'APPORTEUR_NOT_FOUND' });
      next(error);
    }
  }

  async updateProfil(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = UpdateProfilApporteurSchema.parse(req.body);
      const result = await this.apporteurService.updateProfil(req.user!.userId, dto, req.user);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      if (error.message === 'FORBIDDEN') return res.status(403).json({ statusCode: 403, error: 'FORBIDDEN' });
      if (error.message === 'APPORTEUR_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'APPORTEUR_NOT_FOUND' });
      if (error.message === 'EMAIL_ALREADY_EXISTS') return res.status(409).json({ statusCode: 409, error: 'EMAIL_ALREADY_EXISTS' });
      next(error);
    }
  }

  // POST /api/admin/scheduler/apporteurs — ADMIN (RM-146)
  async runSchedulerFinMois(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.apporteurService.traiterFinDeMois();
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) { next(error); }
  }
}
