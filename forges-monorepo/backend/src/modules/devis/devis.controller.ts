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

  // GET /api/admin/devis/:id/pdf — Télécharger le devis depuis le template officiel (ADMIN, AGENT)
  async telechargerPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const { buffer, filename } = await this.devisService.telechargerPdfDevis(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (error: any) {
      if (error.message === 'DEVIS_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'DEVIS_NOT_FOUND', message: 'Devis introuvable' });
      }
      if (error.message === 'ORGANISATION_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'ORGANISATION_NOT_FOUND', message: 'Organisation introuvable' });
      }
      if (error.message === 'FORMATION_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'FORMATION_NOT_FOUND', message: 'Formation introuvable' });
      }
      next(error);
    }
  }

  // GET /api/admin/devis/:id/docx — Télécharger le DOCX (ADMIN, AGENT)
  async telechargerDocx(req: Request, res: Response, next: NextFunction) {
    try {
      const { buffer, filename } = await this.devisService.telechargerDocxDevis(req.params.id);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (error: any) {
      if (error.message === 'DEVIS_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'DEVIS_NOT_FOUND', message: 'Devis introuvable' });
      }
      next(error);
    }
  }

  // POST /api/admin/devis/:id/generer-vouchers — ADMIN (RM-152)
  async genererVouchers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.devisService.genererVouchersDevis(req.params.id, req.user!.userId);
      return res.status(201).json({ statusCode: 201, data: result });
    } catch (error: any) {
      if (error.message === 'DEVIS_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'DEVIS_NOT_FOUND', message: 'Devis introuvable' });
      }
      if (error.message === 'DEVIS_ANNULE') {
        return res.status(409).json({ statusCode: 409, error: 'DEVIS_ANNULE', message: 'Impossible de générer des vouchers pour un devis annulé' });
      }
      if (error.message === 'DEVIS_DEJA_PAYE') {
        return res.status(409).json({ statusCode: 409, error: 'DEVIS_DEJA_PAYE', message: 'Le devis est déjà payé, les vouchers sont actifs' });
      }
      if (error.message === 'VOUCHERS_DEJA_GENERES') {
        return res.status(409).json({ statusCode: 409, error: 'VOUCHERS_DEJA_GENERES', message: 'Les vouchers ont déjà été générés pour ce devis' });
      }
      next(error);
    }
  }

  // GET /api/admin/devis/:id/vouchers — ADMIN, AGENT (RM-152)
  async listerVouchersDevis(req: Request, res: Response, next: NextFunction) {
    try {
      const vouchers = await this.devisService.listerVouchersDevis(req.params.id);
      return res.status(200).json({ statusCode: 200, data: vouchers });
    } catch (error: any) {
      if (error.message === 'DEVIS_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'DEVIS_NOT_FOUND', message: 'Devis introuvable' });
      }
      next(error);
    }
  }

  // POST /api/admin/devis/:id/envoyer-email — ADMIN, AGENT
  async envoyerEmailDevis(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.devisService.envoyerEmailDevis(req.params.id, req.user!.userId);
      return res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'DEVIS_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'DEVIS_NOT_FOUND', message: 'Devis introuvable' });
      }
      if (error.message === 'ORGANISATION_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'ORGANISATION_NOT_FOUND', message: 'Organisation introuvable' });
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
