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

// Shared services
const auditLogger = new AuditLogger();
const emailService = new EmailService();

// Retail service
const retailRepository = new AbonnementRetailRepository(prisma);
const retailService = new AbonnementRetailService(retailRepository, prisma, auditLogger, emailService);

// Organisation service
const orgService = new AbonnementOrganisationService(prisma, auditLogger, emailService);

// B2B service
const b2bService = new AbonnementB2BService(prisma, auditLogger, emailService);

// Controller
const abonnementController = new AbonnementController(retailService, orgService, b2bService, prisma);

// ============================================
// ROUTES RETAIL (Apprenant individuel)
// ============================================

// GET /api/abonnements/retail/me - Mon abonnement retail actif
router.get('/retail/me', authenticate, authorize('APPRENANT'), (req, res, next) => {
  abonnementController.getMonAbonnementRetail(req, res, next);
});

// GET /api/abonnements/retail/formations-incluses - Formations incluses pour l'abonnement actif
router.get('/retail/formations-incluses', authenticate, authorize('APPRENANT'), (req, res, next) => {
  abonnementController.getFormationsInclusesRetail(req, res, next);
});

// POST /api/abonnements/retail - Souscrire abonnement retail (ESSENTIEL/PREMIUM)
router.post('/retail', authenticate, authorize('APPRENANT'), (req, res, next) => {
  abonnementController.souscrireRetail(req, res, next);
});

// PUT /api/abonnements/retail/upgrade - Upgrader vers PREMIUM
router.put('/retail/upgrade', authenticate, authorize('APPRENANT'), (req, res, next) => {
  abonnementController.upgraderRetail(req, res, next);
});

// PUT /api/abonnements/retail/downgrade - Planifier downgrade vers ESSENTIEL
router.put('/retail/downgrade', authenticate, authorize('APPRENANT'), (req, res, next) => {
  abonnementController.planifierDowngradeRetail(req, res, next);
});

// PUT /api/abonnements/retail/suspendre - Suspendre abonnement
router.put('/retail/suspendre', authenticate, authorize('APPRENANT'), (req, res, next) => {
  abonnementController.suspendreRetail(req, res, next);
});

// DELETE /api/abonnements/retail - Résilier abonnement
router.delete('/retail', authenticate, authorize('APPRENANT'), (req, res, next) => {
  abonnementController.resilierRetail(req, res, next);
});

// Alias pour Newman UCS12
router.delete('/retail/cancel', authenticate, authorize('APPRENANT'), (req, res, next) => {
  abonnementController.resilierRetail(req, res, next);
});
router.post('/retail/cancel', authenticate, authorize('APPRENANT'), (req, res, next) => {
  abonnementController.resilierRetail(req, res, next);
});

// ============================================
// ROUTES ORGANISATION
// ============================================

// GET /api/abonnements/organisation/me - Mon abonnement organisation actif
router.get('/organisation/me', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  abonnementController.getMonAbonnementOrganisation(req, res, next);
});

// POST /api/abonnements/organisation - Souscrire abonnement organisation
router.post('/organisation', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  abonnementController.souscrireOrganisation(req, res, next);
});

// ============================================
// ROUTES B2B
// ============================================

// GET /api/abonnements/b2b/me - Mon abonnement B2B actif
router.get('/b2b/me', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  abonnementController.getMonAbonnementB2B(req, res, next);
});

// POST /api/abonnements/b2b - Souscrire abonnement B2B
router.post('/b2b', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  abonnementController.souscrireB2B(req, res, next);
});

// PUT /api/abonnements/b2b/monter-palier - Changer palier B2B
router.put('/b2b/monter-palier', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  abonnementController.monterPalierB2B(req, res, next);
});

// GET /api/abonnements/b2b/apprenants - Liste apprenants liés au B2B
router.get('/b2b/apprenants', authenticate, authorize('ORGANISATION'), async (req, res, next) => {
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

// ============================================
// ROUTES BACKOFFICE
// ============================================

// GET /api/abonnements/backoffice - Vue consolidée tous les abonnements (ADMIN, SUPERVISEUR, AGENT)
router.get('/backoffice', authenticate, authorize('ADMIN', 'SUPERVISEUR', 'AGENT'), (req, res, next) => {
  abonnementController.getAllAbonnementsBackoffice(req, res, next);
});

// GET /api/abonnements/backoffice/contrat-institutionnel - Contrats institutionnels (ADMIN)
router.get('/backoffice/contrat-institutionnel', authenticate, authorize('ADMIN'), (req, res, next) => {
  abonnementController.getContratsInstitutionnelsBackoffice(req, res, next);
});

// ============================================
// ROUTES ADMIN (Scheduler)
// ============================================

// POST /api/abonnements/admin/scheduler - Exécuter tâches planifiées
router.post('/admin/scheduler', authenticate, authorize('ADMIN'), (req, res, next) => {
  abonnementController.runScheduler(req, res, next);
});

export default router;
