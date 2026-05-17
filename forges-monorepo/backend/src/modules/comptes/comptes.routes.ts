import { Router } from 'express';
import { ApprenantController } from './apprenant/apprenant.controller';
import { ApprenantService } from './apprenant/apprenant.service';
import { ApprenantRepository } from './apprenant/apprenant.repository';
import { OrganisationController } from './organisation/organisation.controller';
import { OrganisationService } from './organisation/organisation.service';
import { OrganisationRepository } from './organisation/organisation.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { prisma } from '../../shared/prisma/prisma.client';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { registrationLimiter } from '../../middlewares/rate-limit.middleware';

const router = Router();

// Shared services
const auditLogger = new AuditLogger();
const emailService = new EmailService();

// =======================
// APPRENANT (Étudiant)
// =======================
const apprenantRepository = new ApprenantRepository(prisma);
const apprenantService = new ApprenantService(apprenantRepository, auditLogger, emailService);
const apprenantController = new ApprenantController(apprenantService);

// Routes Apprenant (ancienne convention /etudiant)
router.post('/etudiant/register', registrationLimiter, (req, res, next) => {
  apprenantController.register(req, res, next);
});

router.get('/etudiant/confirm/:token', (req, res, next) => {
  apprenantController.confirm(req, res, next);
});

router.post('/etudiant/resend-confirmation', (req, res, next) => {
  apprenantController.resendConfirmation(req, res, next);
});

// Routes Apprenant (nouvelle convention - Sprint 1 - UCS00)
// Montées sur /api/apprenants dans app.ts
// RM-32 : Rate limiter spécifique pour inscription (5/heure, blocage 30min)
router.post('/register', registrationLimiter, (req, res, next) => {
  apprenantController.register(req, res, next);
});

router.get('/confirm/:token', (req, res, next) => {
  apprenantController.confirm(req, res, next);
});

// Routes Profil Apprenant authentifiées (UCS02)
router.get('/profil', authenticate, authorize('APPRENANT'), (req, res, next) => {
  apprenantController.getProfil(req, res, next);
});

router.put('/profil', authenticate, authorize('APPRENANT'), (req, res, next) => {
  apprenantController.updateProfil(req, res, next);
});

// =======================
// ORGANISATION
// =======================
const organisationRepository = new OrganisationRepository(prisma);
const organisationService = new OrganisationService(organisationRepository, auditLogger, emailService);
const organisationController = new OrganisationController(organisationService);

// Routes Organisation (ancienne convention /organisation singulier)
router.post('/organisation/register', registrationLimiter, (req, res, next) => {
  organisationController.register(req, res, next);
});

router.get('/organisation/confirm/:token', (req, res, next) => {
  organisationController.confirm(req, res, next);
});

// Routes Organisation (nouvelle convention - Sprint 1 - UCS03)
// Montées sur /api/organisations dans app.ts
// RM-32 : Rate limiter spécifique pour inscription (5/heure, blocage 30min)
router.post('/register', registrationLimiter, (req, res, next) => {
  organisationController.register(req, res, next);
});

// Route Profil Organisation authentifiée (UCS03)
router.get('/profil', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  organisationController.getProfil(req, res, next);
});

export default router;
