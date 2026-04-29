import { Router } from 'express';
import { PartenaireController } from '../partenaires/partenaire.controller';
import { PartenaireService } from '../partenaires/partenaire.service';
import { ValidationFormationService } from '../partenaires/validation-formation.service';
import { PartenaireRepository } from '../partenaires/partenaire.repository';
import { FormationPartenaireRepository } from '../partenaires/formation-partenaire.repository';
import { FormationController } from '../formations/formation.controller';
import { FormationService } from '../formations/formation.service';
import { FormationRepository } from '../formations/formation.repository';
import { SessionController } from '../sessions/session.controller';
import { SessionService } from '../sessions/session.service';
import { SessionRepository } from '../sessions/session.repository';
import { InscriptionController } from '../inscriptions/inscription.controller';
import { InscriptionService } from '../inscriptions/inscription.service';
import { DossierRepository } from '../inscriptions/dossier.repository';
import { VoucherValidationService } from '../vouchers/voucher-validation.service';
import { VoucherRepository } from '../vouchers/voucher.repository';
import { AbonnementRetailRepository } from '../abonnements/retail/abonnement-retail.repository';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { prisma } from '../../shared/prisma/prisma.client';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';

const router = Router();
const audit = new AuditLogger();
const emailService = new EmailService();

// Repositories
const partenaireRepo = new PartenaireRepository(prisma);
const fpRepo = new FormationPartenaireRepository(prisma);
const formationRepo = new FormationRepository(prisma);
const sessionRepo = new SessionRepository(prisma);
const dossierRepo = new DossierRepository(prisma);
const voucherRepo = new VoucherRepository(prisma);
const retailRepo = new AbonnementRetailRepository(prisma);

// Services
const partenaireService = new PartenaireService(partenaireRepo, fpRepo, prisma, audit, emailService);
const validationService = new ValidationFormationService(fpRepo, prisma, audit, emailService);
const formationService = new FormationService(formationRepo, audit);
const sessionService = new SessionService(sessionRepo, formationRepo, audit, emailService);
const voucherValidation = new VoucherValidationService(voucherRepo);
const inscriptionService = new InscriptionService(dossierRepo, sessionRepo, formationRepo, voucherValidation, retailRepo, audit, emailService, prisma);

// Controllers
const controller = new PartenaireController(partenaireService, validationService);
const formationController = new FormationController(formationService);
const sessionController = new SessionController(sessionService);
const inscriptionController = new InscriptionController(inscriptionService);

// ============================================
// ROUTES RESPONSABLE (Validation formations - UCS18)
// ============================================

// GET /api/responsable/validations - Formations à valider (UCS18)
router.get('/validations', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  controller.getFormationsEnAttente(req, res, next);
});

router.get('/formations/pending', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  controller.getFormationsEnAttente(req, res, next);
});

// GET /api/responsable/validations/:id - Détail formation à valider (UCS18)
router.get('/validations/:id', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  controller.getValidationDetail(req, res, next);
});

// PUT /api/responsable/validations/:id/valider - Valider formation (UCS18, RM-127, RM-137)
router.put('/validations/:id/valider', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  controller.validerFormation(req, res, next);
});

router.patch('/formations/:id/validate', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  controller.validerFormation(req, res, next);
});

// PUT /api/responsable/validations/:id/rejeter - Rejeter formation (RM-128)
router.put('/validations/:id/rejeter', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  controller.rejeterFormation(req, res, next);
});

router.patch('/formations/:id/reject', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  controller.rejeterFormation(req, res, next);
});

// PUT /api/responsable/validations/:id/suspendre - Suspendre formation active (RM-131)
router.put('/validations/:id/suspendre', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  controller.suspendreFormationValidation(req, res, next);
});

// PUT /api/responsable/validations/:id/reactiver - Réactiver formation suspendue (RM-131)
router.put('/validations/:id/reactiver', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  controller.reactiverFormationValidation(req, res, next);
});

// ============================================
// ROUTES FORMATIONS (RESPONSABLE)
// ============================================

// PUT /api/responsable/formations/:id - Modifier formation (RM-12)
router.put('/formations/:id', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  formationController.update(req, res, next);
});

// PUT /api/responsable/formations/:id/archiver - Archiver formation (RM-11)
router.put('/formations/:id/archiver', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  formationController.archiver(req, res, next);
});

// ============================================
// ROUTES SESSIONS (RESPONSABLE)
// ============================================

// POST /api/responsable/sessions - Créer session (RM-96)
router.post('/sessions', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  sessionController.create(req, res, next);
});

// PUT /api/responsable/sessions/:id - Modifier session + notification si inscrits (RM-24)
router.put('/sessions/:id', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  sessionController.update(req, res, next);
});

// ============================================
// ROUTES DOSSIERS (RESPONSABLE)
// ============================================

// GET /api/responsable/dossiers - Dossiers GRIS/EXCEPTION (RM-19)
router.get('/dossiers', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  inscriptionController.getDossiersPrioritaires(req, res, next);
});

// GET /api/responsable/dossiers/prioritaires - Alias pour RM-19
router.get('/dossiers/prioritaires', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  inscriptionController.getDossiersPrioritaires(req, res, next);
});

export default router;
