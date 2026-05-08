import { Router } from 'express';
import { VoucherController } from './voucher.controller';
import { VoucherService } from './voucher.service';
import { VoucherRepository } from './voucher.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { prisma } from '../../shared/prisma/prisma.client';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
const auditLogger = new AuditLogger();
const voucherRepository = new VoucherRepository(prisma);
const voucherService = new VoucherService(voucherRepository, auditLogger, prisma);
const voucherController = new VoucherController(voucherService);

router.post('/organisation', authenticate, authorize('ADMIN', 'AGENT', 'ORGANISATION'), (req, res, next) => {
  voucherController.createVoucher(req, res, next);
});

// Correction PLAN_CORRECTION_WAVE4 #8 : Ajouter SUPERVISEUR
router.post('/promotionnel', authenticate, authorize('ADMIN', 'SUPERVISEUR', 'AGENT'), (req, res, next) => {
  voucherController.createPromotionnel(req, res, next);
});

router.get('/apporteur/:code/check', authenticate, authorize('APPRENANT', 'ADMIN', 'AGENT', 'SUPERVISEUR'), (req, res, next) => {
  voucherController.checkApporteurCode(req, res, next);
});

// POST /api/vouchers/check — Valider un voucher (PUBLIC)
router.post('/check', (req, res, next) => {
  voucherController.validateVoucher(req, res, next);
});

router.get('/', authenticate, authorize('ADMIN', 'AGENT', 'SUPERVISEUR', 'ORGANISATION'), (req, res, next) => {
  voucherController.list(req, res, next);
});

router.get('/code/:code', authenticate, authorize('APPRENANT', 'ORGANISATION', 'ADMIN', 'AGENT', 'SUPERVISEUR'), (req, res, next) => {
  voucherController.getByCode(req, res, next);
});

router.get('/:id', authenticate, authorize('ADMIN', 'AGENT', 'SUPERVISEUR', 'ORGANISATION'), (req, res, next) => {
  voucherController.getById(req, res, next);
});

router.patch('/:id/validate', authenticate, authorize('ADMIN', 'SUPERVISEUR'), (req, res, next) => {
  voucherController.validatePromotionnel(req, res, next);
});

router.patch('/:id/reject', authenticate, authorize('ADMIN', 'SUPERVISEUR'), (req, res, next) => {
  voucherController.rejectPromotionnel(req, res, next);
});

router.patch('/:id', authenticate, authorize('ADMIN', 'SUPERVISEUR'), (req, res, next) => {
  voucherController.updateVoucher(req, res, next);
});

router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERVISEUR'), (req, res, next) => {
  voucherController.deleteVoucher(req, res, next);
});

export default router;
