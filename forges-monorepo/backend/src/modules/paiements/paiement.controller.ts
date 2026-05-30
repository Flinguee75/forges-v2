import { Request, Response, NextFunction } from 'express';
import { PaiementService } from './paiement.service';
import { InitierPaiementNgserSchema, InitierPaiementSchema, WebhookPaiementSchema } from './dto/paiement.dto';
import { createHmac } from 'crypto';
import { QueueItem } from '../../shared/queue/ipn-queue.service';
import { masquerSecrets } from '../../shared/utils/masque-secrets.util';
import { getDelaiPaiementH } from '../../config/env.config';

interface IpnQueuePort {
  enqueue(item: QueueItem): Promise<void>;
}

export class PaiementController {
  constructor(
    private readonly paiementService: PaiementService,
    private readonly ipnQueue?: IpnQueuePort
  ) {}

  // POST /api/paiements/initier — initiation backend-only NGSER mock (RM-157)
  async initierPaiementNgser(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = InitierPaiementNgserSchema.parse(req.body);
      const result = await this.paiementService.initierPaiementNgser(dto, req.user!.userId);
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
      if (error.message === 'PAIEMENT_DEJA_VALIDE') {
        return res.status(409).json({ statusCode: 409, error: 'PAIEMENT_DEJA_VALIDE', message: 'Un paiement validé existe déjà pour ce dossier (RM-06).' });
      }
      if (error.message === 'DOSSIER_STATUT_INVALIDE') {
        return res.status(400).json({ statusCode: 400, error: 'DOSSIER_STATUT_INVALIDE', message: 'Le dossier doit être RETENU ou PAYE_DIRECTEMENT' });
      }
      if (error.message === 'MONTANT_FINEO_MINIMUM') {
        return res.status(422).json({
          statusCode: 422,
          error: 'MONTANT_FINEO_MINIMUM',
          message: 'Le montant restant à payer est inférieur au minimum FineoPay de 100 FCFA.',
        });
      }
      next(error);
    }
  }

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
        return res.status(410).json({
          statusCode: 410,
          error: 'PAYMENT_EXPIRED',
          message: `Le délai de paiement de ${getDelaiPaiementH()}h est dépassé (RM-07).`,
        });
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
      if (!signature) {
        return res.status(401).json({
          statusCode: 401,
          error: 'SIGNATURE_MANQUANTE',
          message: 'Header x-webhook-signature absent',
        });
      }
      const payload = JSON.stringify(req.body);
      const expectedSig = createHmac('sha256', process.env.WEBHOOK_SECRET || 'dev-secret')
        .update(payload).digest('hex');
      if (signature !== expectedSig) {
        return res.status(401).json({
          statusCode: 401,
          error: 'INVALID_SIGNATURE',
          message: 'Signature webhook invalide',
        });
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

  // GET /api/backoffice/paiements/:id — Détail paiement avec infos voucher/apporteur (ADMIN, AGENT)
  async getPaiementById(req: Request, res: Response, next: NextFunction) {
    try {
      const paiement = await this.paiementService.getPaiementById(req.params.id);
      if (!paiement) return res.status(404).json({ statusCode: 404, error: 'NOT_FOUND' });
      return res.status(200).json({ statusCode: 200, data: paiement });
    } catch (error) { next(error); }
  }

  // GET /api/admin/paiements/stats — ADMIN/AGENT
  async getPaiementsStats(req: Request, res: Response, next: NextFunction) {
    try {
      const period = typeof req.query.period === 'string' ? req.query.period : '24h';
      const stats = await this.paiementService.getPaiementsStats(period);
      res.status(200).json({ statusCode: 200, data: stats });
    } catch (error) {
      next(error);
    }
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

  // POST /api/admin/scheduler/reconciliation-ngser — ADMIN (Phase 1 v4.9)
  async runReconciliationScheduler(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.paiementService.reconcilierPaiementsPendingNgser();
      res.status(200).json({
        statusCode: 200,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/admin/paiements/:id/rembourser — ADMIN (RM-10)
  async rembourserPaiement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { motif } = req.body;
      if (!motif) {
        res.status(400).json({ statusCode: 400, error: 'MOTIF_REQUIS' });
        return;
      }
      const result = await this.paiementService.rembourserPaiement(id, motif, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'PAIEMENT_NOT_FOUND') {
        res.status(404).json({ statusCode: 404, error: 'PAIEMENT_NOT_FOUND' });
        return;
      }
      if (error.message === 'PAIEMENT_NON_REMBOURSABLE') {
        res.status(422).json({ statusCode: 422, error: 'PAIEMENT_NON_REMBOURSABLE' });
        return;
      }
      next(error);
    }
  }

  // DELETE /api/admin/paiements/:id — ADMIN
  async supprimerPaiement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const motif = typeof req.body?.motif === 'string' ? req.body.motif : undefined;
      const result = await this.paiementService.supprimerPaiement(id, req.user!.userId, motif);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'PAIEMENT_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'PAIEMENT_NOT_FOUND' });
      }
      if (error.message === 'PAIEMENT_SUPPRESSION_INTERDITE') {
        return res.status(422).json({
          statusCode: 422,
          error: 'PAIEMENT_SUPPRESSION_INTERDITE',
          message: 'Un paiement confirmé ou remboursé ne peut pas être supprimé.',
        });
      }
      next(error);
    }
  }

  // POST /webhooks/paiement — IPN NGSER (RM-158/160)
  async traiterIpnNgser(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['x-webhook-signature'];
      if (!signature) {
        return res.status(401).json({
          statusCode: 401,
          error: 'SIGNATURE_MANQUANTE',
          message: 'Header x-webhook-signature absent',
        });
      }
      const payload = JSON.stringify(req.body);
      const expectedSig = createHmac('sha256', process.env.WEBHOOK_SECRET || 'dev-secret')
        .update(payload)
        .digest('hex');
      if (signature !== expectedSig) {
        return res.status(401).json({
          statusCode: 401,
          error: 'INVALID_SIGNATURE',
          message: 'Signature webhook invalide',
        });
      }

      const headersMasques = masquerSecrets(req.headers);

      // En test : traitement synchrone pour que les tests puissent lire la DB immédiatement
      if (process.env.NODE_ENV === 'test') {
        try {
          await this.paiementService.traiterIpnNgser(req.body);
        } catch { /* swallow — on répond 200 dans tous les cas */ }
        return res.status(200).json({ statusCode: 200, data: { accepted: true } });
      }

      // Production : réponse HTTP 200 immédiate (RM-158) + traitement asynchrone
      if (this.ipnQueue) {
        try {
          await this.ipnQueue.enqueue({
            provider: 'NGSER',
            payload: req.body,
            received_at: new Date(),
            headers: headersMasques,
          });
        } catch {
          void this.paiementService.traiterIpnNgser(req.body).catch(() => undefined);
        }
      } else {
        void this.paiementService.traiterIpnNgser(req.body).catch(() => undefined);
      }

      return res.status(200).json({
        statusCode: 200,
        data: { accepted: true },
      });
    } catch (error: any) {
      // Toujours répondre 200 pour éviter les retry NGSER
      return res.status(200).json({
        statusCode: 200,
        data: { accepted: false, error: error.message },
      });
    }
  }

  // GET /api/paiements/retour — Payment Data Transfer NGSER (redirection post-paiement)
  async retourPaiementNgser(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        order_id,
        status_id,
        transaction_id,
        transaction_amount,
      } = req.query as Record<string, string>;

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const statutInt = parseInt(status_id || '0', 10);
      const succes = statutInt === 1;

      // Rediriger vers la page frontend appropriée
      const params = new URLSearchParams({
        order_id: order_id || '',
        status: succes ? 'success' : 'fail',
        status_id: status_id || '0',
        ...(transaction_id ? { transaction_id } : {}),
      });

      const redirectUrl = `${frontendUrl}/apprenant/paiements/callback?${params}`;

      // RM-158 : fallback IPN via retour — si le webhook server-to-server n'est pas arrivé,
      // le retour navigateur déclenche le traitement IPN en dernier recours.
      if (order_id && status_id && transaction_id) {
        const ipnPayload = {
          order_id,
          status_id: statutInt,
          transaction_id,
          transaction_amount: transaction_amount ? Number(transaction_amount) : undefined,
        };

        if (process.env.NODE_ENV === 'test') {
          await this.paiementService.traiterIpnNgser(ipnPayload).catch(() => undefined);
        } else {
          void this.paiementService.traiterIpnNgser(ipnPayload).catch(() => undefined);
        }
      }

      return res.redirect(302, redirectUrl);
    } catch (error: any) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(302, `${frontendUrl}/paiement/echec?error=redirect_error`);
    }
  }

  // POST /webhooks/fineo — Callback FineoPay (PUBLIC, double vérification côté FineoPay)
  async traiterCallbackFineo(req: Request, res: Response, next: NextFunction) {
    try {
      const { reference, amount, status, clientAccountNumber, timestamp, syncRef } = req.body;

      if (!reference || !status) {
        return res.status(400).json({ statusCode: 400, error: 'FINEO_CB_CHAMPS_MANQUANTS' });
      }

      await this.paiementService.traiterCallbackFineo({
        reference,
        amount,
        status,
        clientAccountNumber,
        timestamp,
        syncRef,
      });

      return res.status(200).json({ statusCode: 200, received: true });
    } catch (error: any) {
      if (error.message === 'FINEO_CB_VERIFICATION_ECHEC') {
        return res.status(502).json({ statusCode: 502, error: 'FINEO_CB_VERIFICATION_ECHEC' });
      }
      if (error.message === 'PAIEMENT_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'PAIEMENT_NOT_FOUND' });
      }
      if (error.message === 'MONTANT_MISMATCH') {
        return res.status(422).json({ statusCode: 422, error: 'MONTANT_MISMATCH' });
      }
      next(error);
    }
  }

  // POST /api/paiements/fineo/initier — Initier un paiement FineoPay (APPRENANT)
  async initierPaiementFineo(req: Request, res: Response, next: NextFunction) {
    try {
      const { dossier_id, clientAccount, canal } = req.body;
      if (!dossier_id) {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', message: 'dossier_id requis' });
      }
      const result = await this.paiementService.initierPaiementFineo(dossier_id, req.user!.userId, clientAccount, canal);
      return res.status(201).json({ statusCode: 201, data: result });
    } catch (error: any) {
      if (error.message === 'DOSSIER_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'DOSSIER_NOT_FOUND' });
      }
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ statusCode: 403, error: 'FORBIDDEN' });
      }
      if (error.message === 'PAIEMENT_DEJA_VALIDE') {
        return res.status(409).json({ statusCode: 409, error: 'PAIEMENT_DEJA_VALIDE' });
      }
      if (error.message === 'DOSSIER_STATUT_INVALIDE') {
        return res.status(400).json({ statusCode: 400, error: 'DOSSIER_STATUT_INVALIDE' });
      }
      if (error.message === 'MONTANT_FINEO_MINIMUM') {
        return res.status(422).json({
          statusCode: 422,
          error: 'MONTANT_FINEO_MINIMUM',
          message: 'Le montant restant à payer est inférieur au minimum FineoPay de 100 FCFA.',
        });
      }
      next(error);
    }
  }
}
