import { Router } from 'express';
import { ApporteurController } from '../apporteurs/apporteur.controller';
import { ApporteurService } from '../apporteurs/apporteur.service';
import { ApporteurRepository } from '../apporteurs/apporteur.repository';
import { SessionController } from '../sessions/session.controller';
import { SessionService } from '../sessions/session.service';
import { SessionRepository } from '../sessions/session.repository';
import { FormationRepository } from '../formations/formation.repository';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';

const router = Router();
const prisma = new PrismaClient();
const audit = new AuditLogger();
const emailService = new EmailService();

// Repositories
const apporteurRepo = new ApporteurRepository(prisma);
const sessionRepo = new SessionRepository(prisma);
const formationRepo = new FormationRepository(prisma);

// Services
const apporteurService = new ApporteurService(apporteurRepo, prisma, audit, emailService);
const sessionService = new SessionService(sessionRepo, formationRepo, audit, emailService);

// Controllers
const apporteurController = new ApporteurController(apporteurService);
const sessionController = new SessionController(sessionService);

// ============================================
// ROUTES SUPERVISEUR (Tableau de bord)
// ============================================

// GET /api/superviseur/apporteurs/tdb - TDB mensuel apporteurs (RM-148)
router.get('/apporteurs/tdb', authenticate, authorize('SUPERVISEUR', 'ADMIN'), (req, res, next) => {
  apporteurController.getTdbMensuel(req, res, next);
});

router.get('/apporteurs/stats', authenticate, authorize('SUPERVISEUR', 'ADMIN'), (req, res, next) => {
  apporteurController.getTdbMensuel(req, res, next);
});

// ============================================
// ROUTES SESSIONS (SUPERVISEUR)
// ============================================

// POST /api/superviseur/sessions/planification-annuelle - Créer sessions en masse (RM-25)
router.post('/sessions/planification-annuelle', authenticate, authorize('SUPERVISEUR', 'ADMIN'), (req, res, next) => {
  sessionController.createBulk(req, res, next);
});

export default router;
