import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { BotService } from './bot.service';
import { presentBotSession } from './bot.presenter';

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
      res.status(201).json({ statusCode: 201, data: presentBotSession(result) });
    } catch (error) { next(error); }
  }

  // GET /api/bot/session/active — APPRENANT|ORGANISATION
  async getActiveSession(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await this.botService.getSessionActive(req.user!.userId);
      res.status(200).json({
        statusCode: 200,
        data: session ? presentBotSession(session) : null,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSessionById(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await this.botService.getSessionById(req.params.id, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: presentBotSession(session) });
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
      const result = await this.botService.repondre(
        req.params.id,
        question_id,
        valeur,
        req.body.commentaire ?? null,
        req.user?.userId,
      );
      res.status(200).json({ statusCode: 200, data: presentBotSession(result) });
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
      if (error.message === 'COMMENTAIRE_TROP_LONG') return res.status(400).json({
        statusCode: 400,
        error: 'COMMENTAIRE_TROP_LONG',
        message: 'Le commentaire est limité à 500 caractères.'
      });
      if (error.message === 'FEEDBACK_DEJA_COLLECTE') return res.status(409).json({
        statusCode: 409,
        error: 'FEEDBACK_DEJA_COLLECTE',
        message: 'Un feedback a déjà été collecté pour cette formation.'
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
      const { note_min, formation_id, canal, session_id, page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (note_min) where.note_globale = { gte: parseInt(note_min as string) };
      if (formation_id) where.formation_id = formation_id;
      if (canal) where.canal = canal;
      if (session_id) where.session_id = session_id;

      const [feedbacks, total, noteStats, recommendedCount] = await Promise.all([
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
            organisation: {
              select: {
                raison_sociale: true,
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
        this.prisma.feedbackFormation.aggregate({
          where,
          _avg: { note_globale: true },
        }),
        this.prisma.feedbackFormation.count({
          where: { ...where, recommande: true },
        }),
      ]);

      const sessionIds = Array.from(
        new Set(
          feedbacks
            .map((feedback) => feedback.session_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      const sessions = sessionIds.length > 0
        ? await this.prisma.session.findMany({
          where: { id: { in: sessionIds } },
          select: {
            id: true,
            formation_id: true,
            date_debut: true,
            date_fin: true,
            date_ouverture: true,
            date_cloture: true,
            statut: true,
          },
        })
        : [];

      const sessionMap = new Map(sessions.map((session) => [session.id, session]));
      const feedbacksAvecSessions = feedbacks.map((feedback) => ({
        ...feedback,
        session: feedback.session_id ? sessionMap.get(feedback.session_id) || null : null,
      }));

      const groupedFeedbacksMap = new Map<string, any>();
      for (const feedback of feedbacksAvecSessions) {
        const key = feedback.formation_id;
        const existing = groupedFeedbacksMap.get(key);
        if (!existing) {
          groupedFeedbacksMap.set(key, {
            formation: feedback.formation,
            feedbacks: [feedback],
          });
          continue;
        }

        existing.feedbacks.push(feedback);
      }

      const groupedFeedbacks = Array.from(groupedFeedbacksMap.values()).map((group) => {
        const totalFeedbacks = group.feedbacks.length;
        const moyenneGlobale = totalFeedbacks > 0
          ? Math.round(
              (group.feedbacks.reduce((sum: number, feedback: any) => sum + Number(feedback.note_globale || 0), 0) / totalFeedbacks) * 10,
            ) / 10
          : 0;
        const tauxRecommandation = totalFeedbacks > 0
          ? Math.round(
              (group.feedbacks.filter((feedback: any) => feedback.recommande).length / totalFeedbacks) * 100,
            )
          : 0;
        const sessionsUniques = Array.from(
          new Map(
            group.feedbacks
              .map((feedback: any) => feedback.session)
              .filter(Boolean)
              .map((session: any) => [session.id, session]),
          ).values(),
        );

        return {
          formation: group.formation,
          feedbacks: group.feedbacks,
          sessions: sessionsUniques,
          meta: {
            total: totalFeedbacks,
            moyenne_globale: moyenneGlobale,
            taux_recommandation: tauxRecommandation,
          },
        };
      }).sort((a, b) => {
        const aDate = new Date(a.feedbacks[0]?.date_saisie || 0).getTime();
        const bDate = new Date(b.feedbacks[0]?.date_saisie || 0).getTime();
        return bDate - aDate;
      });

      const moyenne_globale = noteStats._avg.note_globale ?? 0;
      const taux_recommandation = total > 0 ? (recommendedCount / total) * 100 : 0;

      res.status(200).json({
        statusCode: 200,
        data: {
          feedbacks: feedbacksAvecSessions,
          grouped_feedbacks: groupedFeedbacks,
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
