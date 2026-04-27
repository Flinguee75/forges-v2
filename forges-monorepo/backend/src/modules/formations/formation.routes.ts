import { Router } from 'express';
import { FormationController } from './formation.controller';
import { FormationService } from './formation.service';
import { FormationRepository } from './formation.repository';
import { SessionController } from '../sessions/session.controller';
import { SessionService } from '../sessions/session.service';
import { SessionRepository } from '../sessions/session.repository';
import { authenticate, authorize, authenticateOptional } from '../../middlewares/auth.middleware';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Shared services
const auditLogger = new AuditLogger();
const emailService = new EmailService();

// Formation dependencies
const formationRepository = new FormationRepository(prisma);
const formationService = new FormationService(formationRepository, auditLogger);
const formationController = new FormationController(formationService);

// Session dependencies
const sessionRepository = new SessionRepository(prisma);
const sessionService = new SessionService(sessionRepository, formationRepository, auditLogger, emailService);
const sessionController = new SessionController(sessionService);

// ============================================
// ROUTES PUBLIQUES (Catalogue)
// ============================================

// GET /api/formations - Liste des formations publiées (catalogue public)
router.get('/', (req, res, next) => {
  formationController.getCataloguePublic(req, res, next);
});

// GET /api/formations/:id - Détail d'une formation (auth optionnelle pour RM-88)
router.get('/:id', authenticateOptional, (req, res, next) => {
  formationController.getById(req, res, next);
});

// GET /api/formations/:id/sessions - Sessions d'une formation
router.get('/:id/sessions', (req, res, next) => {
  sessionController.getByFormation(req, res, next);
});

// GET /api/formations/:id/sessions/disponibles - Sessions disponibles (ouvertes)
router.get('/:id/sessions/disponibles', (req, res, next) => {
  sessionController.getDisponibles(req, res, next);
});

// POST /api/formations/:id/acceder - Accès formation à la demande (RM-92)
router.post('/:id/acceder', authenticate, authorize('APPRENANT', 'ORGANISATION'), (req, res, next) => {
  formationController.accederDemande(req, res, next);
});

// ============================================
// ROUTES BACKOFFICE (à protéger avec auth middleware)
// ============================================

router.get('/backoffice/list', authenticate, authorize('ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  formationController.getAllBackoffice(req, res, next);
});

router.get('/backoffice/:id', authenticate, authorize('ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  formationController.getByIdBackoffice(req, res, next);
});

router.post('/', authenticate, authorize('ADMIN', 'RESPONSABLE'), (req, res, next) => {
  formationController.create(req, res, next);
});

router.patch('/:id', authenticate, authorize('ADMIN', 'RESPONSABLE'), (req, res, next) => {
  formationController.update(req, res, next);
});

router.patch('/:id/publish', authenticate, authorize('ADMIN'), (req, res, next) => {
  formationController.publish(req, res, next);
});

router.delete('/:id/archive', authenticate, authorize('ADMIN'), (req, res, next) => {
  formationController.archiver(req, res, next);
});

export default router;
