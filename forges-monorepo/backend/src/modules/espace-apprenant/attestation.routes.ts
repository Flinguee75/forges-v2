import { Router } from 'express';
import { prisma } from '../../shared/prisma/prisma.client';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { EspaceApprenantRepository } from './espace-apprenant.repository';
import { AttestationService } from './attestation.service';
import { EspaceApprenantService } from './espace-apprenant.service';
import { EspaceApprenantController } from './espace-apprenant.controller';

const router = Router();
const auditLogger = new AuditLogger();
const emailService = new EmailService();
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

router.get('/', authenticate, authorize('APPRENANT'), (req, res, next) => {
  espaceController.getMesAttestations(req, res, next);
});

router.get('/:dossierId/download', authenticate, authorize('APPRENANT'), (req, res, next) => {
  espaceController.getAttestationUrl(req, res, next);
});

export default router;
