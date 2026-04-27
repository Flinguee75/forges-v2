import { Request, Response, NextFunction } from 'express';
import { PaiementService } from './paiement.service';
import { InitierPaiementSchema, WebhookPaiementSchema } from './dto/paiement.dto';
import { createHmac } from 'crypto';

export class PaiementController {
  constructor(private readonly paiementService: PaiementService) {}

  // POST /api/paiements — APPRENANT|ORGANISATION (Sprint 1 Semaine 2)
  async createPaiement(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = InitierPaiementSchema.parse(req.body);
      const result = await this.paiementService.initierPaiement(dto, req.user!.userId);
      res.status(201).json({ statusCode: 201, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      }
      if (error.message === 'DOSSIER_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'DOSSIER_NOT_FOUND', message: 'Dossier non trouvé' });
      }
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ statusCode: 403, error: 'FORBIDDEN', message: 'Accès refusé' });
      }
      if (error.message === 'PAYMENT_EXPIRED') {
        return res.status(410).json({ statusCode: 410, error: 'PAYMENT_EXPIRED', message: 'Le délai de paiement de 72h est dépassé (RM-07).' });
      }
      if (error.message === 'TOO_MANY_ATTEMPTS') {
        return res.status(429).json({ statusCode: 429, error: 'TOO_MANY_ATTEMPTS', message: 'Nombre maximum de tentatives atteint (RM-08).' });
      }
      if (error.message === 'PAIEMENT_DEJA_VALIDE') {
        return res.status(409).json({ statusCode: 409, error: 'PAIEMENT_DEJA_VALIDE', message: 'Un paiement validé existe déjà pour ce dossier (RM-06).' });
      }
      if (error.message === 'DOSSIER_STATUT_INVALIDE') {
        return res.status(400).json({ statusCode: 400, error: 'DOSSIER_STATUT_INVALIDE', message: 'Le dossier doit être RETENU ou PAYE_DIRECTEMENT' });
      }
      next(error);
    }
  }

  // GET /api/paiements — APPRENANT (Sprint 1 Semaine 2)
  async getPaiementsByApprenant(req: Request, res: Response, next: NextFunction) {
    try {
      const paiements = await this.paiementService.getPaiementsByApprenant(req.user!.userId);
      res.status(200).json({ statusCode: 200, data: paiements });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/paiements/webhook — PUBLIC (signature vérifiée) (Sprint 1 Semaine 2)
  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      // Vérification signature HMAC webhook (RM-09)
      const signature = req.headers['x-webhook-signature'];
      const payload = JSON.stringify(req.body);
      const expectedSig = createHmac('sha256', process.env.WEBHOOK_SECRET || 'dev-secret')
        .update(payload).digest('hex');

      if (signature && signature !== expectedSig) {
        return res.status(401).json({ statusCode: 401, error: 'INVALID_SIGNATURE', message: 'Signature webhook invalide' });
      }

      const dto = WebhookPaiementSchema.parse(req.body);
      const result = await this.paiementService.confirmerPaiement({
        transaction_id: dto.transaction_id,
        dossier_id: dto.dossier_id,
        statut: dto.statut,
        montant: dto.montant,
      });
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      }
      if (error.message === 'PAIEMENT_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'PAIEMENT_NOT_FOUND', message: 'Paiement non trouvé' });
      }
      next(error);
    }
  }

  // GET /api/backoffice/paiements — AGENT
  async getPaiements(req: Request, res: Response, next: NextFunction) {
    try {
      const { statut, debut, fin } = req.query;
      const paiements = await this.paiementService.getPaiements({
        statut,
        confirmed_at: debut || fin ? { gte: debut ? new Date(debut as string) : undefined, lte: fin ? new Date(fin as string) : undefined } : undefined
      });
      res.json(paiements);
    } catch (error) { next(error); }
  }

  // POST /api/backoffice/reversements/partenaires — AGENT (RM-139)
  async effectuerReversements(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.paiementService.effectuerReversementsPartenaires(req.user!.userId);
      res.json(result);
    } catch (error) { next(error); }
  }

  // POST /api/admin/scheduler/paiements — ADMIN
  async runScheduler(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await this.paiementService.annulerPaiementsExpires();
      res.json({ annules: count });
    } catch (error) { next(error); }
  }
}
