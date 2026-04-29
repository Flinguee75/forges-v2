import { Router } from 'express';
import { PaiementController } from './paiement.controller';
import { PaiementService } from './paiement.service';
import { PaiementRepository } from './paiement.repository';
import { CommissionRepository } from './commission.repository';
import { VoucherRepository } from '../vouchers/voucher.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { prisma } from '../../shared/prisma/prisma.client';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

// Services partagés
const auditLogger = new AuditLogger();
const emailService = new EmailService();

// Repositories
const paiementRepository = new PaiementRepository(prisma);
const commissionRepository = new CommissionRepository(prisma);
const voucherRepository = new VoucherRepository(prisma);

// Service
const paiementService = new PaiementService(
  paiementRepository,
  commissionRepository,
  voucherRepository,
  prisma,
  auditLogger,
  emailService
);

// Controller
const paiementController = new PaiementController(paiementService);

// ========================================
// ROUTES PAIEMENTS - Sprint 1 Semaine 2
// ========================================

// POST /api/paiements — Initier un paiement (APPRENANT|ORGANISATION)
router.post('/paiements', authenticate, authorize('APPRENANT', 'ORGANISATION'), (req, res, next) => {
  paiementController.createPaiement(req, res, next);
});

// GET /api/paiements — Liste paiements apprenant (APPRENANT)
router.get('/paiements', authenticate, authorize('APPRENANT'), (req, res, next) => {
  paiementController.getPaiementsByApprenant(req, res, next);
});

// GET /api/backoffice/paiements — Liste tous les paiements (ADMIN, AGENT) - UCS09, RM-88
router.get('/backoffice/paiements', authenticate, authorize('ADMIN', 'AGENT'), (req, res, next) => {
  paiementController.getPaiements(req, res, next);
});

// POST /api/paiements/webhook — Webhook confirmation paiement (PUBLIC avec signature)
router.post('/paiements/webhook', (req, res, next) => {
  paiementController.handleWebhook(req, res, next);
});

export default router;
