import { Request, Response, NextFunction } from 'express';
import { BotService } from './bot.service';

export class BotController {
  constructor(private readonly botService: BotService) {}

  // POST /api/bot/session — APPRENANT|ORGANISATION (UCS15/16)
  async demarrerSession(req: Request, res: Response, next: NextFunction) {
    try {
      const langue = req.user!.langue || 'FR';
      const result = req.user!.role === 'ORGANISATION'
        ? await this.botService.demarrerSessionOrganisation(req.user!.userId, langue)
        : await this.botService.demarrerSessionApprenant(req.user!.userId, langue);
      res.status(201).json({ statusCode: 201, data: result });
    } catch (error) { next(error); }
  }

  // GET /api/bot/session/active — APPRENANT|ORGANISATION
  async getActiveSession(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await this.botService.getSessionActive(req.user!.userId);
      if (!session) {
        return res.status(404).json({
          statusCode: 404,
          error: 'NOT_FOUND',
          code: 'NOT_FOUND',
          message: 'Aucune session active'
        });
      }
      res.status(200).json({ statusCode: 200, data: session });
    } catch (error) {
      next(error);
    }
  }

  async getSessionById(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await this.botService.getSessionById(req.params.id, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: session });
    } catch (error: any) {
      if (error.message === 'SESSION_INVALIDE') {
        return res.status(404).json({
          statusCode: 404,
          error: 'SESSION_INVALIDE',
          message: 'Conversation bot introuvable.'
        });
      }
      next(error);
    }
  }

  // POST /api/bot/session/:id/reponse — APPRENANT|ORGANISATION
  async repondre(req: Request, res: Response, next: NextFunction) {
    try {
      const question_id = req.body.question_id ?? req.body.questionId;
      const valeur = req.body.valeur ?? req.body.answer ?? req.body.response ?? req.body.option;
      if (question_id === undefined || valeur === undefined) {
        return res.status(400).json({
          statusCode: 400,
          error: 'CHAMPS_MANQUANTS',
          message: 'Les champs question_id et valeur sont obligatoires.'
        });
      }
      const result = await this.botService.repondre(req.params.id, question_id, valeur);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'SESSION_INVALIDE') return res.status(404).json({
        statusCode: 404,
        error: 'SESSION_INVALIDE'
      });
      // RM-118 : réponse hors liste
      if (error.message === 'REPONSE_HORS_LISTE') return res.status(400).json({
        statusCode: 400,
        error: 'REPONSE_HORS_LISTE',
        message: 'Valeur non autorisée. Veuillez sélectionner une option dans la liste (RM-118).'
      });
      if (error.message === 'NOTE_GLOBALE_OBLIGATOIRE') return res.status(400).json({
        statusCode: 400,
        error: 'NOTE_GLOBALE_OBLIGATOIRE',
        message: 'La note globale est obligatoire (RM-122).'
      });
      next(error);
    }
  }

  // DELETE /api/bot/session/:id — Abandon
  async abandonner(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.botService.abandonnerSession(req.params.id);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) { next(error); }
  }
}
