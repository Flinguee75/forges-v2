import express from 'express';
import request from 'supertest';

jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../shared/audit/audit.logger', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../shared/email/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../inscription.controller', () => ({
  InscriptionController: jest.fn().mockImplementation(() => ({
    createDossier: (_req: any, res: any) => res.status(201).json({ route: 'createDossier' }),
    getAllDossiers: (_req: any, res: any) => res.status(200).json({ route: 'getAllDossiers' }),
    getBackofficeDossiers: (_req: any, res: any) => res.status(200).json({ route: 'getBackofficeDossiers' }),
    getDossiersBySession: (_req: any, res: any) => res.status(200).json({ route: 'getDossiersBySession' }),
    getDetail: (_req: any, res: any) => res.status(200).json({ route: 'getDetail' }),
    retenir: (_req: any, res: any) => res.status(200).json({ route: 'retenir' }),
    refuser: (_req: any, res: any) => res.status(200).json({ route: 'refuser' }),
    traiterException: (_req: any, res: any) => res.status(200).json({ route: 'traiterException' }),
    inscrire: (_req: any, res: any) => res.status(201).json({ route: 'inscrire' }),
  })),
}));

jest.mock('../inscription.service', () => ({ InscriptionService: jest.fn() }));
jest.mock('../dossier.repository', () => ({ DossierRepository: jest.fn() }));
jest.mock('../../sessions/session.repository', () => ({ SessionRepository: jest.fn() }));
jest.mock('../../sessions/session.controller', () => ({ SessionController: jest.fn() }));
jest.mock('../../sessions/session.service', () => ({ SessionService: jest.fn() }));
jest.mock('../../formations/formation.repository', () => ({ FormationRepository: jest.fn() }));
jest.mock('../../vouchers/voucher-validation.service', () => ({ VoucherValidationService: jest.fn() }));

import inscriptionRoutes from '../inscription.routes';

describe('inscription.routes', () => {
  const app = express();

  app.use(express.json());
  app.use('/api', inscriptionRoutes);

  it('monte la route dossiers d une session backoffice', async () => {
    await request(app).get('/api/backoffice/sessions/session-1/dossiers').expect(200).expect({ route: 'getDossiersBySession' });
  });
});
