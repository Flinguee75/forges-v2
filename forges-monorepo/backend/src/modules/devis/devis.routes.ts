import { Router } from 'express';
import { DevisController } from './devis.controller';
import { DevisService } from './devis.service';
import { DevisRepository } from './devis.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { prisma } from '../../shared/prisma/prisma.client';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

const auditLogger = new AuditLogger();
const emailService = new EmailService();
const devisRepository = new DevisRepository(prisma);
const devisService = new DevisService(devisRepository, prisma, auditLogger, emailService);
const devisController = new DevisController(devisService);

// POST /api/admin/devis — Créer un devis (ADMIN)
router.post('/admin/devis', authenticate, authorize('ADMIN'), (req, res, next) => {
  devisController.creerDevis(req, res, next);
});

// GET /api/admin/devis — Lister tous les devis (ADMIN, AGENT)
router.get('/admin/devis', authenticate, authorize('ADMIN', 'AGENT'), (req, res, next) => {
  devisController.listerDevis(req, res, next);
});

// GET /api/admin/devis/:id — Détail devis (ADMIN, AGENT)
router.get('/admin/devis/:id', authenticate, authorize('ADMIN', 'AGENT'), (req, res, next) => {
  devisController.getDevis(req, res, next);
});

// PATCH /api/admin/devis/:id/payer — Marquer payé (ADMIN, AGENT)
router.patch('/admin/devis/:id/payer', authenticate, authorize('ADMIN', 'AGENT'), (req, res, next) => {
  devisController.payerDevis(req, res, next);
});

// GET /api/admin/devis/:id/docx — Télécharger DOCX (ADMIN, AGENT)
router.get('/admin/devis/:id/docx', authenticate, authorize('ADMIN', 'AGENT'), (req, res, next) => {
  devisController.telechargerDocx(req, res, next);
});

// PATCH /api/admin/devis/:id/annuler — Annuler (ADMIN uniquement — RM-151)
router.patch('/admin/devis/:id/annuler', authenticate, authorize('ADMIN'), (req, res, next) => {
  devisController.annulerDevis(req, res, next);
});

// POST /api/admin/devis/:id/generer-vouchers — Générer N vouchers EN_ATTENTE (ADMIN) — RM-152
router.post('/admin/devis/:id/generer-vouchers', authenticate, authorize('ADMIN'), (req, res, next) => {
  devisController.genererVouchers(req, res, next);
});

// GET /api/admin/devis/:id/vouchers — Lister les vouchers d'un devis (ADMIN, AGENT) — RM-152
router.get('/admin/devis/:id/vouchers', authenticate, authorize('ADMIN', 'AGENT'), (req, res, next) => {
  devisController.listerVouchersDevis(req, res, next);
});

// GET /api/organisation/devis — Lecture seule organisation
router.get('/organisation/devis', authenticate, authorize('ORGANISATION'), (req, res, next) => {
  devisController.listerDevisOrganisation(req, res, next);
});

export default router;
