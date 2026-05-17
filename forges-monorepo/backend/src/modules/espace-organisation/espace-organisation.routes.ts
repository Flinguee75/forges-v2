import { Router } from 'express';
import { EspaceOrganisationController } from './espace-organisation.controller';
import { EspaceOrganisationService } from './espace-organisation.service';
import { EspaceOrganisationRepository } from './espace-organisation.repository';
import { ImportCSVService } from './import-csv.service';
import { RapportService } from './rapport.service';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { prisma } from '../../shared/prisma/prisma.client';

const router = Router();

// Services partagés
const auditLogger = new AuditLogger();
const emailService = new EmailService();

// Dépendances
const orgRepository = new EspaceOrganisationRepository(prisma);
const importCSV = new ImportCSVService(prisma, auditLogger, emailService);
const rapport = new RapportService(prisma, auditLogger);

const orgService = new EspaceOrganisationService(
  orgRepository,
  importCSV,
  rapport,
  prisma,
  auditLogger,
  emailService
);
const orgController = new EspaceOrganisationController(orgService);

// ============================================
// DASHBOARD & RAPPORTS
// ============================================

// GET /api/organisation/dashboard - Dashboard organisation
router.get('/dashboard', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  orgController.getDashboard(req, res, next);
});

// GET /api/organisation/rapport-pdf - Rapport PDF bailleur
router.get('/rapport-pdf', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  orgController.getRapportBailleur(req, res, next);
});

// ============================================
// MEMBRES & BÉNÉFICIAIRES
// ============================================

// GET /api/organisation/membres - Liste membres
router.get('/membres', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  orgController.getBeneficiaires(req, res, next);
});

router.get('/apprenants', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  orgController.getBeneficiaires(req, res, next);
});

// POST /api/organisation/membres - Créer un membre
router.post('/membres', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  orgController.createMembre(req, res, next);
});

// POST /api/organisation/membres/import-b2b - Import CSV B2B
router.post('/membres/import-b2b', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  orgController.importerCSV(req, res, next);
});

// DELETE /api/organisation/membres/:id - Désactiver un membre
router.delete('/membres/:id', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  orgController.desactiverBeneficiaire(req, res, next);
});

// Alias beneficiaires
router.get('/beneficiaires', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  orgController.getBeneficiaires(req, res, next);
});

// ============================================
// VOUCHERS
// ============================================

// GET /api/organisation/vouchers - Liste vouchers
router.get('/vouchers', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  orgController.getMesVouchers(req, res, next);
});

// POST /api/organisation/vouchers/commander - Commander des vouchers
router.post('/vouchers/commander', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  orgController.commanderVouchers(req, res, next);
});

// ============================================
// INSCRIPTIONS & PAIEMENTS
// ============================================

// POST /api/organisation/inscrire-beneficiaire - Inscrire un bénéficiaire (UCS12)
router.post('/inscrire-beneficiaire', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  orgController.inscrireBeneficiaire(req, res, next);
});

// GET /api/organisation/inscriptions - Suivi des inscriptions
router.get('/inscriptions', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  orgController.getSuiviInscriptions(req, res, next);
});

// GET /api/organisation/paiements - Historique paiements
router.get('/paiements', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  orgController.getMesPaiements(req, res, next);
});

// ============================================
// PROFIL
// ============================================

// GET /api/organisation/profil - Mon profil
router.get('/profil', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  orgController.getMonProfil(req, res, next);
});

// PUT /api/organisation/profil - Mise à jour profil
router.put('/profil', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  orgController.updateMonProfil(req, res, next);
});

export default router;
