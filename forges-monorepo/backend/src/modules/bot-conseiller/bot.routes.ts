import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { BotRepository } from './bot.repository';
import { BotEngineService } from './bot-engine.service';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Initialisation des dépendances
const botRepository = new BotRepository(prisma);
const botEngine = new BotEngineService(botRepository, prisma);
const auditLogger = new AuditLogger();
const botService = new BotService(botRepository, botEngine, prisma, auditLogger);
const botController = new BotController(botService);

// Toutes les routes nécessitent authentication
// Les rôles APPRENANT et ORGANISATION sont autorisés
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

export default router;
