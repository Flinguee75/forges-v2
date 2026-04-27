import { Router } from 'express';
import { ApporteurController } from './apporteur.controller';
import { ApporteurService } from './apporteur.service';
import { ApporteurRepository } from './apporteur.repository';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';

const router = Router();
const prisma = new PrismaClient();
const audit = new AuditLogger();
const emailService = new EmailService();

// Repositories
const apporteurRepo = new ApporteurRepository(prisma);

// Services
const apporteurService = new ApporteurService(apporteurRepo, prisma, audit, emailService);

// Controller
const controller = new ApporteurController(apporteurService);

// ============================================
// ROUTES APPORTEUR (authentifié)
// ============================================

// POST /api/apporteurs/register - Inscription publique
router.post('/register', (req, res, next) => {
  controller.register(req, res, next);
});

// GET /api/apporteur/dashboard - Dashboard apporteur (UCS20, RM-142)
router.get('/dashboard', authenticate, authorize('APPORTEUR'), (req, res, next) => {
  controller.getDashboard(req, res, next);
});

// GET /api/apporteur/commissions - Mes commissions (RM-145)
router.get('/commissions', authenticate, authorize('APPORTEUR'), (req, res, next) => {
  controller.getCommissions(req, res, next);
});

// GET /api/apporteur/profil - Mon profil
router.get('/profil', authenticate, authorize('APPORTEUR'), (req, res, next) => {
  controller.getProfil(req, res, next);
});

// PUT /api/apporteur/profil - Mise à jour profil
router.put('/profil', authenticate, authorize('APPORTEUR'), (req, res, next) => {
  controller.updateProfil(req, res, next);
});

// ============================================
// ROUTES SUPERVISEUR (TDB mensuel)
// ============================================

// GET /api/superviseur/apporteurs/tdb - TDB mensuel apporteurs (RM-148)
router.get('/tdb', authenticate, authorize('SUPERVISEUR', 'ADMIN'), (req, res, next) => {
  controller.getTdbMensuel(req, res, next);
});

// ============================================
// ROUTES ADMIN
// ============================================

// DELETE /api/admin/apporteurs/:id - Clôturer compte apporteur (ADMIN)
router.delete('/:id', authenticate, authorize('ADMIN'), (req, res, next) => {
  controller.cloturerCompte(req, res, next);
});

// POST /api/admin/scheduler/apporteurs - Scheduler fin de mois (ADMIN - RM-146)
router.post('/scheduler/fin-mois', authenticate, authorize('ADMIN'), (req, res, next) => {
  controller.runSchedulerFinMois(req, res, next);
});

// ============================================
// ROUTES AGENT (Reversements)
// ============================================

// POST /api/admin/apporteurs/reversements - Effectuer reversements (AGENT - RM-147)
router.post('/reversements', authenticate, authorize('AGENT', 'ADMIN'), (req, res, next) => {
  controller.effectuerReversements(req, res, next);
});

export default router;
