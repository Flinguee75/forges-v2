import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { BotRepository } from './bot.repository';
import { BotEngineService } from './bot-engine.service';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { prisma } from '../../shared/prisma/prisma.client';
import { FeedbackEligibilityService } from './feedback-eligibility.service';

const router = Router();

// Initialisation des dépendances
const botRepository = new BotRepository(prisma);
const botEngine = new BotEngineService(botRepository, prisma);
const auditLogger = new AuditLogger();
const feedbackEligibility = new FeedbackEligibilityService(botRepository);
const botService = new BotService(botRepository, botEngine, auditLogger, feedbackEligibility);
const botController = new BotController(botService, prisma);

/**
 * Routes backoffice (ADMIN, AGENT, RESPONSABLE) - sans le middleware APPRENANT/ORGANISATION
 */
router.get('/backoffice/enquetes', authenticate, authorize('ADMIN', 'AGENT', 'RESPONSABLE'), (req, res, next) => {
  botController.getEnquetesCatalogue(req, res, next);
});

router.get('/backoffice/feedbacks', authenticate, authorize('ADMIN', 'AGENT', 'RESPONSABLE'), (req, res, next) => {
  botController.getFeedbacksFormations(req, res, next);
});

router.get('/backoffice/demandes-contact', authenticate, authorize('ADMIN', 'AGENT', 'RESPONSABLE'), (req, res, next) => {
  botController.getDemandesContact(req, res, next);
});

/**
 * Routes utilisateurs (APPRENANT, ORGANISATION)
 */
router.use(authenticate);
router.use(authorize('APPRENANT', 'ORGANISATION'));

/**
 * POST /api/bot/session
 * Démarre une nouvelle session bot pour l'utilisateur connecté
 */
router.post('/session', (req, res, next) => botController.demarrerSession(req, res, next));
router.post('/conversation/start', (req, res, next) => botController.demarrerSession(req, res, next));

/**
 * GET /api/bot/session/active
 * Récupère la session active de l'utilisateur connecté
 */
router.get('/session/active', (req, res, next) => botController.getActiveSession(req, res, next));
router.get('/conversation/:id', (req, res, next) => botController.getSessionById(req, res, next));

/**
 * POST /api/bot/session/:id/reponse
 * Soumet une réponse à une question du bot
 */
router.post('/session/:id/reponse', (req, res, next) => botController.repondre(req, res, next));
router.post('/conversation/:id/answer', (req, res, next) => botController.repondre(req, res, next));

/**
 * POST /api/bot/session/:id/abandon
 * Abandonne la session en cours
 */
router.post('/session/:id/abandon', (req, res, next) => botController.abandonner(req, res, next));

/**
 * GET /api/bot/conversation/:id/messages
 * Récupère l'historique des messages de la conversation
 */
router.get('/conversation/:id/messages', (req, res, next) => botController.getSessionById(req, res, next));

export default router;
