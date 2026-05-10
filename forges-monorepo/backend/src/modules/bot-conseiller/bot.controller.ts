import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { BotService } from './bot.service';

export class BotController {
  constructor(
    private readonly botService: BotService,
    private readonly prisma: PrismaClient,
  ) {}

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
      res.status(200).json({ statusCode: 200, data: session ?? null });
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

  // GET /api/bot/backoffice/enquetes — ADMIN, AGENT, RESPONSABLE
  async getEnquetesCatalogue(req: Request, res: Response, next: NextFunction) {
    try {
      const { statut, domaine, page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (statut) where.statut = statut;
      if (domaine) where.domaine = { contains: domaine as string };

      const [enquetes, total] = await Promise.all([
        this.prisma.enqueteCatalogue.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { date_saisie: 'desc' },
        }),
        this.prisma.enqueteCatalogue.count({ where }),
      ]);

      res.status(200).json({
        statusCode: 200,
        data: {
          enquetes,
          meta: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/bot/backoffice/feedbacks — ADMIN, AGENT, RESPONSABLE
  async getFeedbacksFormations(req: Request, res: Response, next: NextFunction) {
    try {
      const { note_min, formation_id, canal, page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (note_min) where.note_globale = { gte: parseInt(note_min as string) };
      if (formation_id) where.formation_id = formation_id;
      if (canal) where.canal = canal;

      const [feedbacks, total] = await Promise.all([
        this.prisma.feedbackFormation.findMany({
          where,
          include: {
            apprenant: {
              select: {
                nom: true,
                prenoms: true,
                email: true,
              },
            },
            formation: {
              select: {
                intitule: true,
                partenaire: {
                  select: {
                    raison_sociale: true,
                  },
                },
              },
            },
          },
          skip,
          take: limitNum,
          orderBy: { date_saisie: 'desc' },
        }),
        this.prisma.feedbackFormation.count({ where }),
      ]);

      // Calcul statistiques
      const totalNotes = feedbacks.reduce((sum, f) => sum + f.note_globale, 0);
      const moyenne_globale = feedbacks.length > 0 ? totalNotes / feedbacks.length : 0;
      const nbRecommandations = feedbacks.filter(f => f.recommande).length;
      const taux_recommandation = feedbacks.length > 0 ? (nbRecommandations / feedbacks.length) * 100 : 0;

      res.status(200).json({
        statusCode: 200,
        data: {
          feedbacks,
          meta: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            moyenne_globale: Math.round(moyenne_globale * 10) / 10,
            taux_recommandation: Math.round(taux_recommandation),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
