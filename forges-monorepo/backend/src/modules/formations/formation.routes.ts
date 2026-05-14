import { Router } from 'express';
import { FormationController } from './formation.controller';
import { FormationService } from './formation.service';
import { FormationRepository } from './formation.repository';
import { SessionController } from '../sessions/session.controller';
import { SessionService } from '../sessions/session.service';
import { SessionRepository } from '../sessions/session.repository';
import { authenticate, authorize, authenticateOptional } from '../../middlewares/auth.middleware';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { prisma } from '../../shared/prisma/prisma.client';

const router = Router();

// Shared services
const auditLogger = new AuditLogger();
const emailService = new EmailService();

// Formation dependencies
const formationRepository = new FormationRepository(prisma);
const formationService = new FormationService(formationRepository, auditLogger);
const formationController = new FormationController(formationService);

// Session dependencies
const sessionRepository = new SessionRepository(prisma);
const sessionService = new SessionService(sessionRepository, formationRepository, auditLogger, emailService);
const sessionController = new SessionController(sessionService);

// ============================================
// ROUTES PUBLIQUES (Catalogue)
// ============================================

// GET /api/formations - Liste des formations publiées (catalogue public)
router.get('/', (req, res, next) => {
  formationController.getCataloguePublic(req, res, next);
});

// GET /api/formations/:id - Détail d'une formation (auth optionnelle pour RM-88)
router.get('/:id', authenticateOptional, (req, res, next) => {
  formationController.getById(req, res, next);
});

// GET /api/formations/:id/sessions - Sessions d'une formation
router.get('/:id/sessions', (req, res, next) => {
  sessionController.getByFormation(req, res, next);
});

// GET /api/formations/:id/sessions/disponibles - Sessions disponibles (ouvertes)
router.get('/:id/sessions/disponibles', (req, res, next) => {
  sessionController.getDisponibles(req, res, next);
});

// POST /api/formations/:id/acceder - Accès formation à la demande (RM-92)
router.post('/:id/acceder', authenticate, authorize('APPRENANT', 'ORGANISATION'), (req, res, next) => {
  formationController.accederDemande(req, res, next);
});

// ============================================
// ROUTES BACKOFFICE (à protéger avec auth middleware)
// ============================================

router.get('/backoffice/list', authenticate, authorize('ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  formationController.getAllBackoffice(req, res, next);
});

// GET /api/formations/backoffice/partenaires — Liste partenaires pour lier une formation (ADMIN, SUPERVISEUR)
router.get('/backoffice/partenaires', authenticate, authorize('ADMIN', 'SUPERVISEUR'), async (req, res, next) => {
  try {
    const partenaires = await prisma.partenaire.findMany({
      where: { statut: 'ACTIF' },
      select: { id: true, raison_sociale: true },
      orderBy: { raison_sociale: 'asc' },
    });
    res.status(200).json({ statusCode: 200, data: partenaires });
  } catch (err) {
    next(err);
  }
});

router.get('/backoffice/:id', authenticate, authorize('ADMIN', 'SUPERVISEUR', 'RESPONSABLE'), (req, res, next) => {
  formationController.getByIdBackoffice(req, res, next);
});

router.post('/', authenticate, authorize('ADMIN', 'RESPONSABLE'), (req, res, next) => {
  formationController.create(req, res, next);
});

router.patch('/:id', authenticate, authorize('ADMIN', 'RESPONSABLE'), (req, res, next) => {
  formationController.update(req, res, next);
});

router.patch('/:id/publish', authenticate, authorize('ADMIN'), (req, res, next) => {
  formationController.publish(req, res, next);
});

router.delete('/:id/archive', authenticate, authorize('ADMIN'), (req, res, next) => {
  formationController.archiver(req, res, next);
});

router.patch('/backoffice/:id/lier-partenaire', authenticate, authorize('ADMIN', 'SUPERVISEUR'), (req, res, next) => {
  formationController.lierPartenaire(req, res, next);
});

export default router;
