import { Router } from 'express';
import { PartenaireController } from './partenaire.controller';
import { PartenaireService } from './partenaire.service';
import { ValidationFormationService } from './validation-formation.service';
import { PartenaireRepository } from './partenaire.repository';
import { FormationPartenaireRepository } from './formation-partenaire.repository';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { prisma } from '../../shared/prisma/prisma.client';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { ExportCsvService } from './export-csv.service';
import { ExportCsvController } from './export-csv.controller';

const router = Router();
const audit = new AuditLogger();
const emailService = new EmailService();

// Repositories
const partenaireRepo = new PartenaireRepository(prisma);
const fpRepo = new FormationPartenaireRepository(prisma);

// Services
const partenaireService = new PartenaireService(partenaireRepo, fpRepo, prisma, audit, emailService);
const validationService = new ValidationFormationService(fpRepo, prisma, audit, emailService);

// Controller
const controller = new PartenaireController(partenaireService, validationService);

// Export CSV (RM-155)
const exportCsvService = new ExportCsvService(prisma);
const exportCsvController = new ExportCsvController(exportCsvService, partenaireRepo);

// ============================================
// ROUTES PUBLIQUES (Inscription - RM-126)
// ============================================

// POST /api/partenaires/register - Auto-inscription Flux B
router.post('/register', (req, res, next) => {
  controller.autoInscrire(req, res, next);
});

// POST /api/partenaires/activate - Activation via token Flux A
router.post('/activate', (req, res, next) => {
  controller.activerViaToken(req, res, next);
});

// ============================================
// ROUTES PARTENAIRE (authentifié)
// ============================================

// GET /api/partenaires/export-csv - Export CSV anonymise (RM-155)
router.get('/export-csv', authenticate, authorize('PARTENAIRE'), (req, res, next) => {
  exportCsvController.exportCsv(req, res, next);
});

// GET /api/partenaires/dashboard - Dashboard partenaire (RM-130)
router.get('/dashboard', authenticate, authorize('PARTENAIRE'), (req, res, next) => {
  controller.getDashboard(req, res, next);
});

// GET /api/partenaires/formations - Mes formations
router.get('/formations', authenticate, authorize('PARTENAIRE'), (req, res, next) => {
  controller.getMesFormations(req, res, next);
});

// POST /api/partenaires/formations - Soumettre formation (UCS17, RM-136)
router.post('/formations', authenticate, authorize('PARTENAIRE'), (req, res, next) => {
  controller.soumettreFormation(req, res, next);
});

// GET /api/partenaires/formations/:id - Détail formation
router.get('/formations/:id', authenticate, authorize('PARTENAIRE'), (req, res, next) => {
  controller.getFormationDetail(req, res, next);
});

// PUT /api/partenaires/formations/:id - Éditer formation brouillon
router.put('/formations/:id', authenticate, authorize('PARTENAIRE'), (req, res, next) => {
  controller.editerFormationBrouillon(req, res, next);
});

// PUT /api/partenaires/formations/:id/soumettre - Soumettre brouillon
router.put('/formations/:id/soumettre', authenticate, authorize('PARTENAIRE'), (req, res, next) => {
  controller.soumettreFormationBrouillon(req, res, next);
});

// GET /api/partenaires/reversements - Mes reversements (RM-138)
router.get('/reversements', authenticate, authorize('PARTENAIRE'), (req, res, next) => {
  controller.getMesReversements(req, res, next);
});

// GET /api/partenaires/profil - Mon profil
router.get('/profil', authenticate, authorize('PARTENAIRE'), (req, res, next) => {
  controller.getProfil(req, res, next);
});

// PUT /api/partenaires/profil - Mise à jour profil
router.put('/profil', authenticate, authorize('PARTENAIRE'), (req, res, next) => {
  controller.updateProfil(req, res, next);
});

// ============================================
// ROUTES RESPONSABLE (Validation formations)
// ============================================

// GET /api/responsable/validations - Formations à valider (UCS18)
router.get('/validations', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  controller.getFormationsEnAttente(req, res, next);
});

// PUT /api/responsable/validations/:id/valider - Valider formation (UCS18, RM-127, RM-137)
router.put('/validations/:id/valider', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  controller.validerFormation(req, res, next);
});

// PUT /api/responsable/validations/:id/rejeter - Rejeter formation (RM-128)
router.put('/validations/:id/rejeter', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  controller.rejeterFormation(req, res, next);
});

router.put('/validations/:id/suspendre', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  controller.suspendreFormationValidation(req, res, next);
});

router.put('/validations/:id/reactiver', authenticate, authorize('RESPONSABLE', 'ADMIN'), (req, res, next) => {
  controller.reactiverFormationValidation(req, res, next);
});

export default router;
