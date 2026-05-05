import { Router } from 'express';
import { prisma } from '../../shared/prisma/prisma.client';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';
import { ApporteurRepository } from '../apporteurs/apporteur.repository';
import { ApporteurService } from '../apporteurs/apporteur.service';
import { EmailService } from '../../shared/email/email.service';
import { getCommissionForgesDefaut, getCommissionApporteurDefaut, getSeuilReversementPartenaire, getSeuilReversementApporteur } from '../../config/env.config';

const router = Router();
const audit = new AuditLogger();
const dashboardRepository = new DashboardRepository(prisma);
const dashboardService = new DashboardService(dashboardRepository, audit);
const apporteurService = new ApporteurService(new ApporteurRepository(prisma), prisma, audit, new EmailService());

const getConfigPayload = () => ({
  default_commission_forges_pct: getCommissionForgesDefaut(),
  default_commission_apporteur_pct: getCommissionApporteurDefaut(),
  seuil_reversement_partenaire_xof: getSeuilReversementPartenaire(),
  seuil_reversement_apporteur_xof: getSeuilReversementApporteur(),
  validation_partenaire_delai_jours: Number(process.env.VALIDATION_PARTENAIRE_DELAI_JOURS ?? 5),
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
    'COMMISSION_FORGES_DEFAULT_PCT',
    'COMMISSION_APPORTEUR_DEFAULT_PCT',
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

router.get('/admin/organisations/:id/config', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const config = await prisma.organisationConfig.findUnique({
      where: { organisation_id: req.params.id },
    });
    const defaults = getConfigPayload();
    res.status(200).json({
      statusCode: 200,
      data: {
        organisation_id: req.params.id,
        commission_forges_pct: config?.commission_forges_pct ?? null,
        seuil_reversement_xof: config?.seuil_reversement_xof ?? null,
        effective_commission_forges_pct: config?.commission_forges_pct ?? defaults.default_commission_forges_pct,
        effective_seuil_reversement_xof: config?.seuil_reversement_xof ?? defaults.seuil_reversement_partenaire_xof,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/organisations/:id/config', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { commission_forges_pct, seuil_reversement_xof } = req.body;
    const data: { commission_forges_pct?: number | null; seuil_reversement_xof?: number | null } = {};

    if (commission_forges_pct !== undefined) {
      data.commission_forges_pct = commission_forges_pct === null ? null : Number(commission_forges_pct);
    }
    if (seuil_reversement_xof !== undefined) {
      data.seuil_reversement_xof = seuil_reversement_xof === null ? null : Number(seuil_reversement_xof);
    }

    const config = await prisma.organisationConfig.upsert({
      where: { organisation_id: req.params.id },
      create: { organisation_id: req.params.id, ...data },
      update: data,
    });

    await audit.log('INFO', 'ORGANISATION_CONFIG_UPDATE', { organisation_id: req.params.id, ...data }, req.user!.userId);

    const defaults = getConfigPayload();
    res.status(200).json({
      statusCode: 200,
      data: {
        organisation_id: req.params.id,
        commission_forges_pct: config.commission_forges_pct,
        seuil_reversement_xof: config.seuil_reversement_xof,
        effective_commission_forges_pct: config.commission_forges_pct ?? defaults.default_commission_forges_pct,
        effective_seuil_reversement_xof: config.seuil_reversement_xof ?? defaults.seuil_reversement_partenaire_xof,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
