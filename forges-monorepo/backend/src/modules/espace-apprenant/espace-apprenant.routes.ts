import { Router } from 'express';
import { EspaceApprenantController } from './espace-apprenant.controller';
import { EspaceApprenantService } from './espace-apprenant.service';
import { EspaceApprenantRepository } from './espace-apprenant.repository';
import { AttestationService } from './attestation.service';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { prisma } from '../../shared/prisma/prisma.client';

const router = Router();

// Services partagés
const auditLogger = new AuditLogger();
const emailService = new EmailService();

// Dépendances
const espaceRepository = new EspaceApprenantRepository(prisma);
const attestationService = new AttestationService(espaceRepository, auditLogger);
const espaceService = new EspaceApprenantService(
  espaceRepository,
  attestationService,
  prisma,
  auditLogger,
  emailService
);
const espaceController = new EspaceApprenantController(espaceService);

// ============================================
// ROUTES ESPACE APPRENANT (authentifié)
// ============================================

// GET /api/espace-apprenant/dossiers - Mes dossiers d'inscription
router.get('/dossiers', authenticate, authorize('APPRENANT'), (req, res, next) => {
  espaceController.getMesDossiers(req, res, next);
});

// DELETE /api/espace-apprenant/dossiers/:id - Annuler un dossier
router.delete('/dossiers/:id', authenticate, authorize('APPRENANT'), (req, res, next) => {
  espaceController.annulerDossier(req, res, next);
});

// GET /api/espace-apprenant/attestations/:dossierId - Télécharger attestation
router.get('/attestations/:dossierId', authenticate, authorize('APPRENANT'), (req, res, next) => {
  espaceController.getAttestationUrl(req, res, next);
});

// GET /api/espace-apprenant/formations-demande - Mes formations à la demande
router.get('/formations-demande', authenticate, authorize('APPRENANT'), (req, res, next) => {
  espaceController.getMesFormationsDemande(req, res, next);
});

// GET /api/espace-apprenant/formations-demande/:accesId - Détail d'un accès formation
router.get('/formations-demande/:accesId', authenticate, authorize('APPRENANT'), (req, res, next) => {
  espaceController.getAccesFormationDemande(req, res, next);
});

// PATCH /api/espace-apprenant/formations-demande/:accesId/progression - Mise à jour progression
router.patch('/formations-demande/:accesId/progression', authenticate, authorize('APPRENANT'), (req, res, next) => {
  espaceController.updateProgressionFormationDemande(req, res, next);
});

export default router;
