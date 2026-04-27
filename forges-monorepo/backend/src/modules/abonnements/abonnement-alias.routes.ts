import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { AbonnementController } from './abonnement.controller';
import { AbonnementRetailRepository } from './retail/abonnement-retail.repository';
import { AbonnementRetailService } from './retail/abonnement-retail.service';
import { AbonnementOrganisationService } from './organisation/abonnement-organisation.service';
import { AbonnementB2BService } from './b2b/abonnement-b2b.service';

const router = Router();
const prisma = new PrismaClient();
const auditLogger = new AuditLogger();
const emailService = new EmailService();
const retailRepository = new AbonnementRetailRepository(prisma);
const retailService = new AbonnementRetailService(retailRepository, prisma, auditLogger, emailService);
const organisationService = new AbonnementOrganisationService(prisma, auditLogger, emailService);
const b2bService = new AbonnementB2BService(prisma, auditLogger, emailService);
const controller = new AbonnementController(retailService, organisationService, b2bService);

router.post('/abonnements-retail/subscribe', authenticate, authorize('APPRENANT'), (req, res, next) => {
  controller.souscrireRetail(req, res, next);
});

router.get('/abonnements-retail/status', authenticate, authorize('APPRENANT'), (req, res, next) => {
  controller.getMonAbonnementRetail(req, res, next);
});

router.post('/abonnements-retail/cancel', authenticate, authorize('APPRENANT'), (req, res, next) => {
  controller.resilierRetail(req, res, next);
});

router.post('/abonnements-b2b/subscribe', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  controller.souscrireB2B(req, res, next);
});

router.get('/abonnements-b2b/status', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  controller.getMonAbonnementB2B(req, res, next);
});

router.get('/abonnements-b2b/apprenants', authenticate, authorize('ORGANISATION'), async (req, res, next) => {
  try {
    const abonnement = await b2bService.getAbonnementActif(req.user!.userId);

    return res.status(200).json({
      statusCode: 200,
      data: {
        palier: abonnement?.palier || null,
        nb_max: abonnement?.nb_max || 0,
        apprenants: []
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
