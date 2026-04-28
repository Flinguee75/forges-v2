import { Router } from 'express';
import { PartenaireController } from '../partenaires/partenaire.controller';
import { PartenaireService } from '../partenaires/partenaire.service';
import { PartenaireRepository } from '../partenaires/partenaire.repository';
import { FormationPartenaireRepository } from '../partenaires/formation-partenaire.repository';
import { ValidationFormationService } from '../partenaires/validation-formation.service';
import { ApporteurController } from '../apporteurs/apporteur.controller';
import { ApporteurService } from '../apporteurs/apporteur.service';
import { ApporteurRepository } from '../apporteurs/apporteur.repository';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { prisma } from '../../shared/prisma/prisma.client';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';

const router = Router();
const audit = new AuditLogger();
const emailService = new EmailService();

// Repositories
const partenaireRepo = new PartenaireRepository(prisma);
const fpRepo = new FormationPartenaireRepository(prisma);
const apporteurRepo = new ApporteurRepository(prisma);

// Services
const partenaireService = new PartenaireService(partenaireRepo, fpRepo, prisma, audit, emailService);
const validationService = new ValidationFormationService(fpRepo, prisma, audit, emailService);
const apporteurService = new ApporteurService(apporteurRepo, prisma, audit, emailService);

// Controllers
const partenaireController = new PartenaireController(partenaireService, validationService);
const apporteurController = new ApporteurController(apporteurService);

// ============================================
// ROUTES AGENT COMPTABLE (Reversements - RM-138, RM-147)
// ============================================

// GET /api/agent/reversements/partenaires - Liste reversements partenaires en attente
router.get('/reversements/partenaires', authenticate, authorize('AGENT', 'ADMIN'), async (req, res, next) => {
  try {
    const result = await partenaireService.getReversementsEnAttente(req.user!.userId);
    res.status(200).json({ statusCode: 200, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/agent/reversements/:id/effectuer - Effectuer reversement partenaire (RM-138)
router.post('/reversements/:id/effectuer', authenticate, authorize('AGENT', 'ADMIN'), async (req, res, next) => {
  try {
    const result = await partenaireService.effectuerReversementPartenaire(
      req.params.id,
      req.user!.userId,
      req.body
    );
    res.status(201).json({ statusCode: 201, data: result });
  } catch (error: any) {
    if (error.message === 'SEUIL_NON_ATTEINT') {
      return res.status(400).json({ statusCode: 400, error: 'SEUIL_NON_ATTEINT', message: 'Seuil minimum non atteint (RM-138)' });
    }
    if (error.message === 'PARTENAIRE_NOT_FOUND') {
      return res.status(404).json({ statusCode: 404, error: 'PARTENAIRE_NOT_FOUND', message: 'Partenaire introuvable' });
    }
    if (error.message === 'AUCUNE_COMMISSION_EN_ATTENTE') {
      return res.status(400).json({ statusCode: 400, error: 'AUCUNE_COMMISSION_EN_ATTENTE', message: 'Aucune commission en attente pour ce partenaire' });
    }
    next(error);
  }
});

router.post('/reversements/partenaires/:id/execute', authenticate, authorize('AGENT', 'ADMIN'), async (req, res, next) => {
  try {
    const result = await partenaireService.effectuerReversementPartenaire(req.params.id, req.user!.userId, req.body);
    res.status(201).json({ statusCode: 201, data: result });
  } catch (error: any) {
    if (error.message === 'SEUIL_NON_ATTEINT') {
      return res.status(400).json({ statusCode: 400, error: 'SEUIL_NON_ATTEINT', message: 'Seuil minimum non atteint (RM-138)' });
    }
    if (error.message === 'PARTENAIRE_NOT_FOUND') {
      return res.status(404).json({ statusCode: 404, error: 'PARTENAIRE_NOT_FOUND', message: 'Partenaire introuvable' });
    }
    if (error.message === 'AUCUNE_COMMISSION_EN_ATTENTE') {
      return res.status(400).json({ statusCode: 400, error: 'AUCUNE_COMMISSION_EN_ATTENTE', message: 'Aucune commission en attente pour ce partenaire' });
    }
    next(error);
  }
});

// GET /api/agent/reversements/apporteurs - Liste reversements apporteurs (RM-147)
router.get('/reversements/apporteurs', authenticate, authorize('AGENT', 'ADMIN'), async (req, res, next) => {
  try {
    const result = await apporteurService.getCommissionsEnAttente(req.user!.userId);
    res.status(200).json({ statusCode: 200, data: result });
  } catch (error: any) {
    next(error);
  }
});

router.post('/reversements/apporteurs/:id/execute', authenticate, authorize('AGENT', 'ADMIN'), async (req, res, next) => {
  try {
    const result = await apporteurService.effectuerReversementApporteur(req.params.id, req.user!.userId);
    res.status(201).json({ statusCode: 201, data: result });
  } catch (error: any) {
    if (error.message === 'APPORTEUR_NOT_FOUND') {
      return res.status(404).json({ statusCode: 404, error: 'APPORTEUR_NOT_FOUND' });
    }
    if (error.message === 'AUCUNE_COMMISSION_EN_ATTENTE') {
      return res.status(400).json({ statusCode: 400, error: 'AUCUNE_COMMISSION_EN_ATTENTE' });
    }
    if (error.message === 'SEUIL_NON_ATTEINT') {
      return res.status(400).json({ statusCode: 400, error: 'SEUIL_NON_ATTEINT' });
    }
    next(error);
  }
});

export default router;
