import { Router } from 'express';
import { prisma } from '../../shared/prisma/prisma.client';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { SessionRepository } from './session.repository';
import { FormationRepository } from '../formations/formation.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

const auditLogger = new AuditLogger();
const emailService = new EmailService();
const sessionRepository = new SessionRepository(prisma);
const formationRepository = new FormationRepository(prisma);
const sessionService = new SessionService(sessionRepository, formationRepository, auditLogger, emailService);
const sessionController = new SessionController(sessionService);

router.use(authenticate);

router.get('/', authorize('ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  sessionController.list(req, res, next);
});

router.post('/bulk', authorize('ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  sessionController.planifierAnnuelle(req, res, next);
});

router.post('/scheduler/run', authorize('ADMIN'), (req, res, next) => {
  sessionController.runScheduler(req, res, next);
});

router.get('/:id', authorize('ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  sessionController.getById(req, res, next);
});

router.post('/', authorize('ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  sessionController.create(req, res, next);
});

router.patch('/:id', authorize('ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  sessionController.update(req, res, next);
});

router.patch('/:id/close', authorize('ADMIN', 'SUPERVISEUR'), (req, res, next) => {
  sessionController.closeManually(req, res, next);
});

router.delete('/:id/cancel', authorize('ADMIN'), (req, res, next) => {
  sessionController.cancel(req, res, next);
});

export default router;
