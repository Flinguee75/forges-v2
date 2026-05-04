import { Request, Response, NextFunction } from 'express';
import { DevisService } from './devis.service';
import { CreerDevisSchema, AnnulerDevisSchema, PayerDevisSchema } from './dto/devis.dto';

export class DevisController {
  constructor(private readonly devisService: DevisService) {}

  // POST /api/admin/devis — ADMIN
  async creerDevis(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CreerDevisSchema.parse(req.body);
      const devis = await this.devisService.creerDevis(dto, req.user!.userId);
      return res.status(201).json({ statusCode: 201, data: devis });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      }
      if (error.message === 'ORGANISATION_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'ORGANISATION_NOT_FOUND', message: 'Organisation introuvable' });
      }
      if (error.message === 'FORMATION_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'FORMATION_NOT_FOUND', message: 'Formation introuvable' });
      }
      if (error.message === 'SESSION_INVALIDE') {
        return res.status(400).json({ statusCode: 400, error: 'SESSION_INVALIDE', message: 'Session invalide ou non liée à cette formation' });
      }
      next(error);
    }
  }

  // GET /api/admin/devis — ADMIN, AGENT
  async listerDevis(req: Request, res: Response, next: NextFunction) {
    try {
      const { organisation_id, statut } = req.query as Record<string, string>;
      const devis = await this.devisService.listerDevis({ organisation_id, statut });
      return res.status(200).json({ statusCode: 200, data: devis });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/devis/:id — ADMIN, AGENT
  async getDevis(req: Request, res: Response, next: NextFunction) {
    try {
      const devis = await this.devisService.getDevis(req.params.id);
      return res.status(200).json({ statusCode: 200, data: devis });
    } catch (error: any) {
      if (error.message === 'DEVIS_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'DEVIS_NOT_FOUND', message: 'Devis introuvable' });
      }
      next(error);
    }
  }

  // PATCH /api/admin/devis/:id/payer — ADMIN, AGENT
  async payerDevis(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = PayerDevisSchema.parse(req.body);
      const devis = await this.devisService.payerDevis(req.params.id, req.user!.userId, dto.notes_admin);
      return res.status(200).json({ statusCode: 200, data: devis });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      }
      if (error.message === 'DEVIS_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'DEVIS_NOT_FOUND', message: 'Devis introuvable' });
      }
      if (error.message === 'DEVIS_STATUT_INVALIDE') {
        return res.status(409).json({ statusCode: 409, error: 'DEVIS_STATUT_INVALIDE', message: 'Seul un devis au statut CREE peut être marqué payé' });
      }
      next(error);
    }
  }

  // PATCH /api/admin/devis/:id/annuler — ADMIN
  async annulerDevis(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = AnnulerDevisSchema.parse(req.body);
      const devis = await this.devisService.annulerDevis(req.params.id, req.user!.userId, dto.notes_admin);
      return res.status(200).json({ statusCode: 200, data: devis });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      }
      if (error.message === 'DEVIS_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'DEVIS_NOT_FOUND', message: 'Devis introuvable' });
      }
      if (error.message === 'DEVIS_ANNULATION_IMPOSSIBLE') {
        return res.status(409).json({ statusCode: 409, error: 'DEVIS_ANNULATION_IMPOSSIBLE', message: 'Impossible d\'annuler un devis PAYE ou déjà ANNULE (RM-151)' });
      }
      next(error);
    }
  }

  // GET /api/organisation/devis — ORGANISATION (lecture seule)
  async listerDevisOrganisation(req: Request, res: Response, next: NextFunction) {
    try {
      const devis = await this.devisService.listerDevisOrganisation(req.user!.userId);
      return res.status(200).json({ statusCode: 200, data: devis });
    } catch (error) {
      next(error);
    }
  }
}
