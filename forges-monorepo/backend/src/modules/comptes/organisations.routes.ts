import { Router } from 'express';
import { prisma } from '../../shared/prisma/prisma.client';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { registrationLimiter } from '../../middlewares/rate-limit.middleware';
import { OrganisationController } from './organisation/organisation.controller';
import { OrganisationRepository } from './organisation/organisation.repository';
import { OrganisationService } from './organisation/organisation.service';

const router = Router();
const controller = new OrganisationController(
  new OrganisationService(new OrganisationRepository(prisma), new AuditLogger(), new EmailService())
);

router.post('/register', registrationLimiter, (req, res, next) => {
  controller.register(req, res, next);
});

router.get('/confirm/:token', (req, res, next) => {
  controller.confirm(req, res, next);
});

router.get('/profil', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  controller.getProfil(req, res, next);
});

export default router;
