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
import { IpnQueueRedisService } from '../../shared/queue/ipn-queue-redis.service';

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

// Queue IPN
const ipnQueue = new IpnQueueRedisService(auditLogger);

// Définir le processor de la queue IPN
ipnQueue.setProcessor(async (item) => {
  await paiementService.traiterIpnNgser(item.payload);
});

// Controller
const paiementController = new PaiementController(paiementService, ipnQueue);

// ========================================
// ROUTES PAIEMENTS - Sprint 1 Semaine 2
// ========================================

// POST /api/paiements/initier — Initier un paiement NGSER mock (APPRENANT|ORGANISATION)
router.post('/paiements/initier', authenticate, authorize('APPRENANT', 'ORGANISATION'), (req, res, next) => {
  paiementController.initierPaiementNgser(req, res, next);
});

// POST /api/paiements — Initier un paiement (APPRENANT|ORGANISATION)
router.post('/paiements', authenticate, authorize('APPRENANT', 'ORGANISATION'), (req, res, next) => {
  paiementController.createPaiement(req, res, next);
});

// GET /api/paiements — Liste paiements apprenant (APPRENANT)
router.get('/paiements', authenticate, authorize('APPRENANT'), (req, res, next) => {
  paiementController.getPaiementsByApprenant(req, res, next);
});

// GET /api/backoffice/paiements/:id — Détail paiement avec voucher/apporteur (ADMIN, AGENT)
router.get('/backoffice/paiements/:id', authenticate, authorize('ADMIN', 'AGENT'), (req, res, next) => {
  paiementController.getPaiementById(req, res, next);
});

// GET /api/backoffice/paiements — Liste tous les paiements (ADMIN, AGENT) - UCS09, RM-88
router.get('/backoffice/paiements', authenticate, authorize('ADMIN', 'AGENT'), (req, res, next) => {
  paiementController.getPaiements(req, res, next);
});

// GET /api/admin/paiements/stats — Statistiques paiement temps réel (Phase 2 prod v4.9)
router.get('/admin/paiements/stats', authenticate, authorize('ADMIN', 'AGENT'), (req, res, next) => {
  paiementController.getPaiementsStats(req, res, next);
});

// POST /api/paiements/fineo/initier — Initier un paiement FineoPay (APPRENANT) — top 1
router.post('/paiements/fineo/initier', authenticate, authorize('APPRENANT'), (req, res, next) => {
  paiementController.initierPaiementFineo(req, res, next);
});

// POST /webhooks/fineo — Callback FineoPay (PUBLIC, double vérification)
router.post('/webhooks/fineo', (req, res, next) => {
  paiementController.traiterCallbackFineo(req, res, next);
});

// POST /api/paiements/webhook — Webhook confirmation paiement legacy (PUBLIC avec signature)
router.post('/paiements/webhook', (req, res, next) => {
  paiementController.handleWebhook(req, res, next);
});

// POST /webhooks/paiement — IPN NGSER canonical endpoint (PUBLIC avec signature) - RM-158/160
router.post('/webhooks/paiement', (req, res, next) => {
  paiementController.traiterIpnNgser(req, res, next);
});

// POST /api/paiements/webhook — Alias legacy pour IPN NGSER
router.post('/api/paiements/webhook', (req, res, next) => {
  paiementController.traiterIpnNgser(req, res, next);
});

// GET /api/paiements/retour — Payment Data Transfer NGSER (redirection post-paiement, PUBLIC)
router.get('/paiements/retour', (req, res, next) => {
  paiementController.retourPaiementNgser(req, res, next);
});

// POST /api/admin/scheduler/reconciliation-ngser — Déclencher réconciliation manuelle (ADMIN) - Phase 1 v4.9
router.post('/admin/scheduler/reconciliation-ngser', authenticate, authorize('ADMIN'), (req, res, next) => {
  paiementController.runReconciliationScheduler(req, res, next);
});

// PATCH /api/admin/paiements/:id/rembourser — Remboursement manuel (ADMIN) - RM-10
router.patch('/admin/paiements/:id/rembourser', authenticate, authorize('ADMIN'), (req, res, next) => {
  paiementController.rembourserPaiement(req, res, next);
});

// DELETE /api/admin/paiements/:id — Suppression manuelle d'un paiement (ADMIN)
router.delete('/admin/paiements/:id', authenticate, authorize('ADMIN'), (req, res, next) => {
  paiementController.supprimerPaiement(req, res, next);
});

export default router;
