import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

const router = Router();
const prisma = new PrismaClient();
const audit = new AuditLogger();
const repository = new DashboardRepository(prisma);
const service = new DashboardService(repository, audit);
const controller = new DashboardController(service);

router.get('/stats', authenticate, authorize('ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  controller.getGlobalStats(req, res, next);
});

router.get('/stats/global', authenticate, authorize('ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  controller.getGlobalStats(req, res, next);
});

router.get('/stats/formations/:id', authenticate, authorize('ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  controller.getFormationStats(req, res, next);
});

router.get('/stats/sessions/:id', authenticate, authorize('ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  controller.getSessionStats(req, res, next);
});

router.get('/stats/paiements', authenticate, authorize('ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  controller.getPaiementsStats(req, res, next);
});

router.get('/inscriptions/evolution', authenticate, authorize('ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  controller.getInscriptionsEvolution(req, res, next);
});

router.get('/paiements/evolution', authenticate, authorize('ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  controller.getPaiementsEvolution(req, res, next);
});

router.get('/rapports', authenticate, authorize('ADMIN', 'SUPERVISEUR'), (req, res, next) => {
  controller.getRapportsData(req, res, next);
});

router.get('/rapports/export/csv', authenticate, authorize('ADMIN', 'SUPERVISEUR'), (req, res, next) => {
  controller.exportCSV(req, res, next);
});

router.get('/rapports/export/pdf', authenticate, authorize('ADMIN', 'SUPERVISEUR'), (req, res, next) => {
  controller.exportPDF(req, res, next);
});

export default router;
