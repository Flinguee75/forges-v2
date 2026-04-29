import { Router } from 'express';
import { prisma } from '../../../shared/prisma/prisma.client';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

const router = Router();
const auditLogger = new AuditLogger();
const emailService = new EmailService();
const adminService = new AdminService(prisma, auditLogger, emailService);
const controller = new AdminController(adminService);

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/users', (req, res, next) => {
  controller.listUsers(req, res, next);
});

router.post('/users', (req, res, next) => {
  controller.createUser(req, res, next);
});

router.put('/users/:id/status', (req, res, next) => {
  controller.updateStatus(req, res, next);
});

router.post('/partenaires', (req, res, next) => {
  controller.invitePartenaire(req, res, next);
});

router.get('/partenaires', (req, res, next) => {
  controller.listPartenaires(req, res, next);
});

router.get('/partenaires/:id', (req, res, next) => {
  controller.getPartenaire(req, res, next);
});

router.put('/partenaires/:id/approuver', (req, res, next) => {
  controller.approvePartenaire(req, res, next);
});

router.put('/partenaires/:id/refuser', (req, res, next) => {
  controller.rejectPartenaire(req, res, next);
});

router.put('/partenaires/:id/suspendre', (req, res, next) => {
  controller.suspendPartenaire(req, res, next);
});

router.put('/partenaires/:id/reactiver', (req, res, next) => {
  controller.reactivatePartenaire(req, res, next);
});

router.post('/apporteurs', (req, res, next) => {
  controller.createApporteur(req, res, next);
});

router.get('/apporteurs', (req, res, next) => {
  controller.listApporteurs(req, res, next);
});

router.get('/apporteurs/:id', (req, res, next) => {
  controller.getApporteur(req, res, next);
});

router.put('/apporteurs/:id/approuver', (req, res, next) => {
  controller.approveApporteur(req, res, next);
});

export default router;
