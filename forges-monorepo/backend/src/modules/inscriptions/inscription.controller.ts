import { Request, Response, NextFunction } from 'express';
import { InscriptionService } from './inscription.service';

export class InscriptionController {
  constructor(private readonly inscriptionService: InscriptionService) {}

  // POST /api/dossiers — APPRENANT|ORGANISATION|GESTIONNAIRE (Sprint 1 - alias UCS07)
  async createDossier(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.body.session_id) {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', message: 'session_id est requis' });
      }

      const params = {
        session_id: req.body.session_id,
        apprenantId: req.user!.userId,
        source_financement: req.body.source_financement,
        mode_paiement: req.body.mode_paiement,
        voucher_code: req.body.voucher_code,
        code_apporteur: req.body.code_apporteur
      };

      const dossier = await this.inscriptionService.inscrire(params);
      res.status(201).json({ statusCode: 201, success: true, dossier });
    } catch (error: any) {
      if (error.message === 'SESSION_COMPLETE') return res.status(400).json({ statusCode: 400, error: 'SESSION_COMPLETE', message: 'Cette session est complète.' });
      if (error.message === 'ALREADY_ENROLLED') return res.status(409).json({ statusCode: 409, error: 'ALREADY_ENROLLED', message: 'Vous êtes déjà inscrit à cette session (RM-01).' });
      if (error.message === 'FORMATION_LIMIT_REACHED') return res.status(422).json({ statusCode: 422, error: 'FORMATION_LIMIT_REACHED', message: 'Vous avez atteint la limite de 3 formations actives simultanées (RM-72).' });
      if (error.message === 'VOUCHER_CUMUL_INTERDIT') return res.status(422).json({ statusCode: 422, error: 'VOUCHER_CUMUL_INTERDIT', message: 'Impossible de cumuler un voucher organisation et un code apporteur (RM-144).' });
      if (error.message === 'APPORTEUR_CODE_INVALID') return res.status(422).json({ statusCode: 422, error: 'APPORTEUR_CODE_INVALID', message: 'Code apporteur invalide ou inactif (RM-143).' });
      if (error.message === 'VOUCHER_FORMATION_INCORRECTE') return res.status(422).json({ statusCode: 422, error: 'VOUCHER_WRONG_FORMATION', message: 'Ce voucher ne peut être utilisé que pour une autre formation (RM-37).' });
      if (error.message === 'VOUCHER_INVALIDE') return res.status(422).json({ statusCode: 422, error: 'VOUCHER_INVALID', message: 'Voucher invalide.' });
      if (error.message === 'VOUCHER_QUOTA_EPUISE') return res.status(422).json({ statusCode: 422, error: 'VOUCHER_QUOTA_EPUISE', message: 'Le quota de ce voucher est épuisé.' });
      if (error.message === 'VOUCHER_EXPIRE') return res.status(422).json({ statusCode: 422, error: 'VOUCHER_EXPIRE', message: 'Ce voucher a expiré.' });
      next(error);
    }
  }

  // POST /api/sessions/:id/inscrire — APPRENANT|ORGANISATION|GESTIONNAIRE
  async inscrire(req: Request, res: Response, next: NextFunction) {
    try {
      const params = {
        session_id: req.params.id,
        apprenantId: req.user!.userId,
        source_financement: req.body.source_financement,
        mode_paiement: req.body.mode_paiement,
        voucher_code: req.body.voucher_code,
        code_apporteur: req.body.code_apporteur
      };

      const dossier = await this.inscriptionService.inscrire(params);
      res.status(201).json({ statusCode: 201, success: true, dossier });
    } catch (error: any) {
      if (error.message === 'SESSION_COMPLETE') return res.status(400).json({ error: 'SESSION_COMPLETE', message: 'Cette session est complète.' });
      if (error.message === 'ALREADY_ENROLLED') return res.status(409).json({ error: 'ALREADY_ENROLLED', message: 'Vous êtes déjà inscrit à cette session (RM-01).' });
      if (error.message === 'FORMATION_LIMIT_REACHED') return res.status(422).json({ error: 'FORMATION_LIMIT_REACHED', message: 'Vous avez atteint la limite de 3 formations actives simultanées (RM-72).' });
      if (error.message === 'VOUCHER_CUMUL_INTERDIT') return res.status(422).json({ error: 'VOUCHER_CUMUL_INTERDIT', message: 'Impossible de cumuler un voucher organisation et un code apporteur (RM-144).' });
      if (error.message === 'APPORTEUR_CODE_INVALID') return res.status(422).json({ error: 'APPORTEUR_CODE_INVALID', message: 'Code apporteur invalide ou inactif (RM-143).' });
      if (error.message === 'VOUCHER_FORMATION_INCORRECTE') return res.status(422).json({ error: 'VOUCHER_WRONG_FORMATION', message: 'Ce voucher ne peut être utilisé que pour une autre formation (RM-37).' });
      if (error.message === 'VOUCHER_INVALIDE') return res.status(422).json({ error: 'VOUCHER_INVALID', message: 'Voucher invalide.' });
      if (error.message === 'VOUCHER_QUOTA_EPUISE') return res.status(422).json({ error: 'VOUCHER_QUOTA_EPUISE', message: 'Le quota de ce voucher est épuisé.' });
      if (error.message === 'VOUCHER_EXPIRE') return res.status(422).json({ error: 'VOUCHER_EXPIRE', message: 'Ce voucher a expiré.' });
      next(error);
    }
  }

  // POST /api/dossiers/:id/retenir — RESPONSABLE (RM-05, UCS08)
  async retenir(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.inscriptionService.retenir(req.params.id, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'DOSSIER_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'DOSSIER_NOT_FOUND' });
      if (error.message === 'DOSSIER_ALREADY_PROCESSED') return res.status(400).json({
        statusCode: 400,
        error: 'DOSSIER_ALREADY_PROCESSED',
        message: 'Ce dossier a déjà été traité. Statut RETENU irréversible (RM-05).'
      });
      if (error.message === 'NOT_PREMIUM_RETAIL') return res.status(400).json({
        statusCode: 400,
        error: 'NOT_PREMIUM_RETAIL',
        message: 'Seuls les dossiers Premium+Retail peuvent être retenus (RM-140).'
      });
      next(error);
    }
  }

  // GET /api/dossiers — Liste dossiers apprenant (Sprint 1 - APPRENANT)
  async getAllDossiers(req: Request, res: Response, next: NextFunction) {
    try {
      const { statut } = req.query as { statut?: string };
      const dossiers = await this.inscriptionService.getDossiersByApprenant(req.user!.userId, { statut });
      res.status(200).json({ statusCode: 200, data: dossiers });
    } catch (error: any) {
      next(error);
    }
  }

  async getBackofficeDossiers(req: Request, res: Response, next: NextFunction) {
    try {
      const { statut, search } = req.query as { statut?: string; search?: string };
      const dossiers = await this.inscriptionService.getDossiersBackoffice({ statut, search });
      res.status(200).json({ statusCode: 200, data: dossiers, meta: { total: dossiers.length } });
    } catch (error: any) {
      next(error);
    }
  }

  // GET /api/backoffice/sessions/:id/dossiers — Dossiers d'une session backoffice
  async getDossiersBySession(req: Request, res: Response, next: NextFunction) {
    try {
      const dossiers = await this.inscriptionService.getDossiersBySession(req.params.id);
      res.status(200).json({ statusCode: 200, data: dossiers });
    } catch (error: any) {
      next(error);
    }
  }

  // GET /api/dossiers/:id — Détail backoffice (ADMIN, SUPERVISEUR, RESPONSABLE)
  async getDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.inscriptionService.getDetail(req.params.id);
      if (req.user?.role === 'APPRENANT' && result.apprenant?.id !== req.user.userId) {
        return res.status(403).json({ statusCode: 403, error: 'FORBIDDEN', message: 'Accès refusé' });
      }
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'DOSSIER_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'DOSSIER_NOT_FOUND' });
      next(error);
    }
  }

  // PUT /api/dossiers/:id/refuser — RESPONSABLE (RM-140, UCS08)
  async refuser(req: Request, res: Response, next: NextFunction) {
    try {
      const motif_refus: string = req.body?.motif_refus || '';
      if (!motif_refus || motif_refus.trim().length < 5) {
        return res.status(400).json({ statusCode: 400, error: 'MOTIF_OBLIGATOIRE', message: 'Motif de refus obligatoire (min 5 caractères).' });
      }
      const result = await this.inscriptionService.rejeter(req.params.id, req.user!.userId, motif_refus);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'DOSSIER_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'DOSSIER_NOT_FOUND' });
      if (error.message === 'DOSSIER_ALREADY_PROCESSED') return res.status(400).json({ statusCode: 400, error: 'DOSSIER_ALREADY_PROCESSED' });
      if (error.message === 'NOT_PREMIUM_RETAIL') return res.status(400).json({ statusCode: 400, error: 'NOT_PREMIUM_RETAIL' });
      next(error);
    }
  }

  // PUT /api/dossiers/:id/exception — Traiter dossier EXCEPTION (RM-05)
  async traiterException(req: Request, res: Response, next: NextFunction) {
    try {
      const decision: 'RETENU' | 'REFUSE' = req.body?.decision;
      if (decision !== 'RETENU' && decision !== 'REFUSE') {
        return res.status(400).json({ error: 'DECISION_INVALIDE', message: 'decision doit être RETENU ou REFUSE.' });
      }
      const result = await this.inscriptionService.traiterException(
        req.params.id,
        decision,
        req.body?.motif_refus,
        req.user!.userId
      );
      res.json(result);
    } catch (error: any) {
      if (error.message === 'DOSSIER_NOT_FOUND') return res.status(404).json({ error: 'DOSSIER_NOT_FOUND' });
      if (error.message === 'NOT_EXCEPTION') return res.status(409).json({ error: 'NOT_EXCEPTION' });
      if (error.message === 'MOTIF_OBLIGATOIRE') return res.status(400).json({ error: 'MOTIF_OBLIGATOIRE' });
      if (error.message === 'DOSSIER_ALREADY_PROCESSED') return res.status(400).json({ error: 'DOSSIER_ALREADY_PROCESSED' });
      next(error);
    }
  }

  // GET /api/responsable/dossiers/prioritaires — RM-19 (Dossiers GRIS/EXCEPTION)
  async getDossiersPrioritaires(req: Request, res: Response, next: NextFunction) {
    try {
      const dossiers = await this.inscriptionService.getDossiersPrioritaires(req.user!.userId);
      res.status(200).json({ statusCode: 200, data: dossiers });
    } catch (error: any) {
      next(error);
    }
  }
}
