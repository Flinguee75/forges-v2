import { Router } from 'express';
import { AbonnementController } from './abonnement.controller';
import { AbonnementRetailService } from './retail/abonnement-retail.service';
import { AbonnementOrganisationService } from './organisation/abonnement-organisation.service';
import { AbonnementB2BService } from './b2b/abonnement-b2b.service';
import { AbonnementRetailRepository } from './retail/abonnement-retail.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { prisma } from '../../shared/prisma/prisma.client';

const router = Router();

const auditLogger = new AuditLogger();
const emailService = new EmailService();
const retailRepository = new AbonnementRetailRepository(prisma);
const retailService = new AbonnementRetailService(retailRepository, prisma, auditLogger, emailService);
const orgService = new AbonnementOrganisationService(prisma, auditLogger, emailService);
const b2bService = new AbonnementB2BService(prisma, auditLogger, emailService);
const abonnementController = new AbonnementController(retailService, orgService, b2bService, prisma);

// GET /api/backoffice/abonnements - Vue consolidée tous les abonnements
router.get('/', authenticate, authorize('ADMIN', 'SUPERVISEUR', 'AGENT'), (req, res, next) => {
  abonnementController.getAllAbonnementsBackoffice(req, res, next);
});

// GET /api/backoffice/abonnements/contrat-institutionnel - Contrats institutionnels
router.get('/contrat-institutionnel', authenticate, authorize('ADMIN'), (req, res, next) => {
  abonnementController.getContratsInstitutionnelsBackoffice(req, res, next);
});

export default router;
