import { Router } from 'express';
import { ProxyAccesController } from './proxy-acces.controller';
import { ProxyAccesService } from './proxy-acces.service';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { prisma } from '../../shared/prisma/prisma.client';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

const auditLogger = new AuditLogger();
const service = new ProxyAccesService(prisma, auditLogger);
const controller = new ProxyAccesController(service);

// GET /api/formations-demande/:accesId/acceder
// L'URL réelle n'est jamais exposée dans les logs ni en clair en base (RM-152 à RM-154)
router.get('/:accesId/acceder', authenticate, authorize('APPRENANT'), (req, res, next) => {
  controller.acceder(req, res, next);
});

export default router;
