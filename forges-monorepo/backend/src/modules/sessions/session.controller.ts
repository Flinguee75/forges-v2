import { Request, Response, NextFunction } from 'express';
import { SessionService } from './session.service';
import { CreateSessionSchema, PlanificationAnnuelleSchema } from './dto/session.dto';

export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  private mapSessionForFront(session: any) {
    if (!session) return session;

    return {
      ...session,
      formation: session.formation
        ? {
            ...session.formation,
            titre: session.formation.intitule,
          }
        : session.formation,
    };
  }

  // POST /api/backoffice/sessions — SUPERVISEUR|ADMIN
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CreateSessionSchema.parse(req.body);
      const session = await this.sessionService.create(dto, req.user!.userId);
      res.status(201).json({ statusCode: 201, data: this.mapSessionForFront(session) });
    } catch (error: any) {
      // RM-16 : Erreurs chronologie dates depuis Zod
      if (error.name === 'ZodError') {
        const dateErrors = error.errors.filter((e: any) => e.message?.includes('RM-16'));
        if (dateErrors.length > 0) {
          return res.status(400).json({ error: 'CHRONOLOGY_ERROR', message: dateErrors[0].message, details: error.errors });
        }
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
      }
      if (error.message === 'FORMATION_NOT_FOUND') return res.status(404).json({ error: 'FORMATION_NOT_FOUND' });
      if (error.message === 'SESSION_IMPOSSIBLE_FORMATION_DEMANDE') return res.status(400).json({ error: 'SESSION_IMPOSSIBLE_FORMATION_DEMANDE', message: 'Impossible de créer une session pour une formation à la demande (RM-96).' });
      if (error.message === 'DELAI_TRAITEMENT_INSUFFISANT') return res.status(400).json({ error: 'DELAI_TRAITEMENT_INSUFFISANT', message: 'La date d\'ouverture doit être au minimum 3 jours après la création de la session (RM-04).' });
      if (error.message === 'CHRONOLOGY_ERROR') return res.status(400).json({ error: 'CHRONOLOGY_ERROR', message: 'Les dates doivent respecter : ouverture ≤ clôture ≤ début ≤ fin (RM-16).' });
      if (error.message?.startsWith('SESSION_OVERLAP')) {
        const ids = error.message.split(':')[1];
        return res.status(409).json({ error: 'SESSION_OVERLAP', message: 'Ces dates chevauchent une session existante (RM-17).', sessions_en_conflit: ids?.split(',') });
      }
      next(error);
    }
  }

  // PUT /api/backoffice/sessions/:id — SUPERVISEUR|ADMIN
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.sessionService.update(req.params.id, req.body, req.user!.userId);
      res.json({ statusCode: 200, data: this.mapSessionForFront(result.session), notification_requise: result.notification_requise });
    } catch (error: any) {
      if (error.message === 'SESSION_NOT_FOUND') return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      if (error.message === 'CHRONOLOGY_ERROR') return res.status(400).json({ error: 'CHRONOLOGY_ERROR', message: 'Ordre chronologique invalide : ouverture < clôture < début < fin (RM-16).' });
      if (error.message?.startsWith('SESSION_OVERLAP')) {
        const ids = error.message.split(':')[1];
        return res.status(409).json({ error: 'SESSION_OVERLAP', sessions_en_conflit: ids?.split(',') });
      }
      next(error);
    }
  }

  // POST /api/backoffice/sessions/bulk — SUPERVISEUR|ADMIN (RM-25)
  async planifierAnnuelle(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = PlanificationAnnuelleSchema.parse(req.body);
      const result = await this.sessionService.planifierAnnuelle(dto, req.user!.userId);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
      if (error.message === 'FORMATION_NOT_FOUND') return res.status(404).json({ error: 'FORMATION_NOT_FOUND' });
      if (error.message === 'SESSION_IMPOSSIBLE_FORMATION_DEMANDE') return res.status(400).json({ error: 'SESSION_IMPOSSIBLE_FORMATION_DEMANDE' });
      next(error);
    }
  }

  // POST /api/superviseur/sessions/planification-annuelle — SUPERVISEUR|ADMIN (RM-25)
  async createBulk(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessions } = req.body;
      if (!sessions || !Array.isArray(sessions)) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'sessions doit être un tableau' });
      }
      const result = await this.sessionService.createBulk(sessions, req.user!.userId);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message === 'FORMATION_NOT_FOUND') return res.status(404).json({ error: 'FORMATION_NOT_FOUND' });
      if (error.message === 'SESSION_IMPOSSIBLE_FORMATION_DEMANDE') return res.status(400).json({ error: 'SESSION_IMPOSSIBLE_FORMATION_DEMANDE' });
      if (error.message === 'CHRONOLOGY_ERROR') return res.status(400).json({ error: 'CHRONOLOGY_ERROR' });
      next(error);
    }
  }

  // GET /api/backoffice/sessions - SUPERVISEUR|ADMIN|RESPONSABLE
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.sessionService.list({
        formation_id: req.query.formation_id as string | undefined,
        statut: req.query.statut as string | undefined,
        superviseur_id: req.query.superviseur_id as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      });

      res.status(200).json({
        statusCode: 200,
        data: result.sessions.map((session: any) => this.mapSessionForFront(session)),
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/backoffice/sessions/:id - SUPERVISEUR|ADMIN|RESPONSABLE
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await this.sessionService.getById(req.params.id);
      res.status(200).json({ statusCode: 200, data: this.mapSessionForFront(session) });
    } catch (error: any) {
      if (error.message === 'SESSION_NOT_FOUND') return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      next(error);
    }
  }

  // PATCH /api/backoffice/sessions/:id/close - SUPERVISEUR|ADMIN
  async closeManually(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await this.sessionService.closeManually(req.params.id, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: this.mapSessionForFront(session) });
    } catch (error: any) {
      if (error.message === 'SESSION_NOT_FOUND') return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      if (error.message === 'INVALID_STATUT') return res.status(400).json({ error: 'INVALID_STATUT' });
      next(error);
    }
  }

  // DELETE /api/backoffice/sessions/:id/cancel - ADMIN
  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await this.sessionService.cancel(req.params.id, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: this.mapSessionForFront(session) });
    } catch (error: any) {
      if (error.message === 'SESSION_NOT_FOUND') return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      if (error.message === 'INVALID_STATUT') return res.status(400).json({ error: 'INVALID_STATUT' });
      next(error);
    }
  }

  // GET /api/sessions — Public (Sprint 1)
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = await this.sessionService.getAll();
      res.status(200).json({ statusCode: 200, data: sessions });
    } catch (error) { next(error); }
  }

  // GET /api/formations/:id/sessions — Auth
  async getByFormation(req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = await this.sessionService.getByFormation(req.params.id);
      res.json(sessions);
    } catch (error) { next(error); }
  }

  // GET /api/formations/:id/sessions/disponibles — Auth
  async getDisponibles(req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = await this.sessionService.getDisponibles(req.params.id);
      res.json(sessions);
    } catch (error) { next(error); }
  }

  // POST /api/admin/scheduler/sessions — ADMIN (déclencher scheduler manuellement)
  async runScheduler(req: Request, res: Response, next: NextFunction) {
    try {
      const [transitions, archives] = await Promise.all([
        this.sessionService.transitionnerStatuts(),
        this.sessionService.archiverSessionsAnciennnes(),
      ]);
      res.json({ transitions, archives });
    } catch (error) { next(error); }
  }
}
