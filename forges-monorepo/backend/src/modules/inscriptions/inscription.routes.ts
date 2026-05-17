import { Router } from 'express';
import { InscriptionController } from './inscription.controller';
import { InscriptionService } from './inscription.service';
import { DossierRepository } from './dossier.repository';
import { SessionRepository } from '../sessions/session.repository';
import { SessionController } from '../sessions/session.controller';
import { SessionService } from '../sessions/session.service';
import { FormationRepository } from '../formations/formation.repository';
import { VoucherValidationService } from '../vouchers/voucher-validation.service';
import { VoucherRepository } from '../vouchers/voucher.repository';
import { AbonnementRetailRepository } from '../abonnements/retail/abonnement-retail.repository';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { prisma } from '../../shared/prisma/prisma.client';

const router = Router();

// Services
const audit = new AuditLogger();
const emailService = new EmailService();

// Repositories
const dossierRepo = new DossierRepository(prisma);
const sessionRepo = new SessionRepository(prisma);
const formationRepo = new FormationRepository(prisma);
const voucherRepo = new VoucherRepository(prisma);
const voucherValidation = new VoucherValidationService(voucherRepo);
const retailRepo = new AbonnementRetailRepository(prisma);

// InscriptionService
const inscriptionService = new InscriptionService(
  dossierRepo,
  sessionRepo,
  formationRepo,
  voucherValidation,
  retailRepo,
  audit,
  emailService,
  prisma
);

// Controllers
const inscriptionController = new InscriptionController(inscriptionService);

// SessionService et SessionController
const sessionService = new SessionService(sessionRepo, formationRepo, audit, emailService);
const sessionController = new SessionController(sessionService);

// ============================================
// ROUTES INSCRIPTIONS/DOSSIERS
// ============================================

// GET /api/sessions — Public (Sprint 1)
router.get('/sessions', (req, res, next) => {
  sessionController.getAll(req, res, next);
});

// POST /api/dossiers — APPRENANT|ORGANISATION|GESTIONNAIRE (Sprint 1 - UCS07)
router.post('/dossiers', authenticate, authorize('APPRENANT', 'ORGANISATION', 'GESTIONNAIRE'), (req, res, next) => {
  inscriptionController.createDossier(req, res, next);
});

// GET /api/dossiers — APPRENANT (Sprint 1 - liste mes dossiers)
router.get('/dossiers', authenticate, authorize('APPRENANT', 'ORGANISATION', 'GESTIONNAIRE'), (req, res, next) => {
  inscriptionController.getAllDossiers(req, res, next);
});

router.get('/backoffice/dossiers', authenticate, authorize('RESPONSABLE', 'ADMIN', 'SUPERVISEUR'), (req, res, next) => {
  inscriptionController.getBackofficeDossiers(req, res, next);
});

router.get('/backoffice/sessions/:id/dossiers', authenticate, authorize('RESPONSABLE', 'SUPERVISEUR', 'ADMIN'), (req, res, next) => {
  inscriptionController.getDossiersBySession(req, res, next);
});

// POST /api/dossiers/:id/retenir — RESPONSABLE (RM-05, UCS08)
router.post('/dossiers/:id/retenir', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  inscriptionController.retenir(req, res, next);
});

// GET /api/dossiers/:id — Détail backoffice (ADMIN, SUPERVISEUR, RESPONSABLE)
router.get('/dossiers/:id', authenticate, authorize('APPRENANT', 'ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  inscriptionController.getDetail(req, res, next);
});

// PUT /api/dossiers/:id/refuser — RESPONSABLE (RM-140, UCS08)
router.put('/dossiers/:id/refuser', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  inscriptionController.refuser(req, res, next);
});

// PUT /api/dossiers/:id/exception — RESPONSABLE (RM-05, UCS08)
router.put('/dossiers/:id/exception', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  inscriptionController.traiterException(req, res, next);
});

// POST /api/sessions/:id/inscrire — APPRENANT|ORGANISATION|GESTIONNAIRE
router.post('/sessions/:id/inscrire', authenticate, authorize('APPRENANT', 'ORGANISATION', 'GESTIONNAIRE'), (req, res, next) => {
  inscriptionController.inscrire(req, res, next);
});

// PATCH /api/backoffice/dossiers/:id/retenir — RESPONSABLE (Sprint 1 - UCS08)
router.patch('/backoffice/dossiers/:id/retenir', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  inscriptionController.retenir(req, res, next);
});

// PATCH /api/backoffice/dossiers/:id/rejeter — RESPONSABLE (Sprint 1 - UCS08)
router.patch('/backoffice/dossiers/:id/rejeter', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  inscriptionController.refuser(req, res, next);
});

export default router;
