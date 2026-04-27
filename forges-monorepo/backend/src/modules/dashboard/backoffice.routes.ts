import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';
import { ApporteurRepository } from '../apporteurs/apporteur.repository';
import { ApporteurService } from '../apporteurs/apporteur.service';
import { EmailService } from '../../shared/email/email.service';

const router = Router();
const prisma = new PrismaClient();
const audit = new AuditLogger();
const dashboardRepository = new DashboardRepository(prisma);
const dashboardService = new DashboardService(dashboardRepository, audit);
const apporteurService = new ApporteurService(new ApporteurRepository(prisma), prisma, audit, new EmailService());

const getConfigPayload = () => ({
  default_commission_forges_pct: Number(process.env.DEFAULT_COMMISSION_FORGES_PCT || 20),
  default_commission_apporteur_pct: Number(process.env.DEFAULT_COMMISSION_APPORTEUR_PCT || 5),
  seuil_reversement_partenaire_xof: Number(process.env.SEUIL_REVERSEMENT_PARTENAIRE_XOF || 50000),
  seuil_reversement_apporteur_xof: Number(process.env.SEUIL_REVERSEMENT_APPORTEUR_XOF || 5000),
  validation_partenaire_delai_jours: Number(process.env.VALIDATION_PARTENAIRE_DELAI_JOURS || 5),
});

router.get('/dashboard/superviseur', authenticate, authorize('SUPERVISEUR', 'ADMIN'), async (req, res, next) => {
  try {
    const result = await dashboardService.getKPI('SUPERVISEUR', req.user!.userId);
    res.status(200).json({ statusCode: 200, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/apporteurs/stats', authenticate, authorize('SUPERVISEUR', 'ADMIN'), async (req, res, next) => {
  try {
    const result = await apporteurService.getTdbMensuelSuperviseur();
    res.status(200).json({ statusCode: 200, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/admin', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const result = await dashboardService.getKPI('ADMIN', req.user!.userId);
    res.status(200).json({ statusCode: 200, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/config', authenticate, authorize('ADMIN'), (req, res) => {
  res.status(200).json({ statusCode: 200, data: getConfigPayload() });
});

router.put('/config', authenticate, authorize('ADMIN'), (req, res) => {
  const allowedKeys = [
    'DEFAULT_COMMISSION_FORGES_PCT',
    'DEFAULT_COMMISSION_APPORTEUR_PCT',
    'SEUIL_REVERSEMENT_PARTENAIRE_XOF',
    'SEUIL_REVERSEMENT_APPORTEUR_XOF',
    'VALIDATION_PARTENAIRE_DELAI_JOURS',
  ];

  for (const key of allowedKeys) {
    if (req.body[key] !== undefined) {
      process.env[key] = String(req.body[key]);
    }
  }

  res.status(200).json({ statusCode: 200, data: getConfigPayload() });
});

export default router;
