import express from 'express';
import request from 'supertest';

jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'app-01', role: 'APPRENANT', langue: 'FR' };
    next();
  },
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

jest.mock('../retail/abonnement-retail.service', () => ({
  AbonnementRetailService: jest.fn().mockImplementation(() => ({
    getAbonnementActif: (_apprenantId: string) => ({ id: 'abo-01' }),
    getFormationsIncluses: (_apprenantId: string) => ([{ id: 'f-01' }]),
    souscrire: (_apprenantId: string, _offre: string, _langue: string) => ({ abonnement: { id: 'abo-01' } }),
    upgrader: () => ({ effectif: 'immediat' }),
    planifierDowngrade: () => ({ effectif: new Date('2026-01-01T00:00:00.000Z') }),
    suspendre: () => ({ message: 'ok' }),
    resilier: () => ({ date_fin: new Date('2026-01-01T00:00:00.000Z') }),
    traiterRenouvellements: () => ({ renouveles: 1, echecs: 0 }),
    traiterGracesExpires: () => 2,
    traiterDowngradesPlanifies: () => 1,
  })),
}));

jest.mock('../organisation/abonnement-organisation.service', () => ({
  AbonnementOrganisationService: jest.fn().mockImplementation(() => ({
    getAbonnementActif: () => null,
    souscrire: () => ({ id: 'abo-org-01' }),
  })),
}));

jest.mock('../b2b/abonnement-b2b.service', () => ({
  AbonnementB2BService: jest.fn().mockImplementation(() => ({
    getAbonnementActif: () => null,
    souscrire: () => ({ id: 'abo-b2b-01' }),
    monterPalier: () => ({ nouveau_palier: 'ENTERPRISE' }),
    suspendreB2BExpires: () => 3,
  })),
}));

import abonnementRoutes from '../abonnement.routes';

describe('abonnement.routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/abonnements', abonnementRoutes);

  it('monte les formations incluses retail', async () => {
    await request(app)
      .get('/api/abonnements/retail/formations-incluses')
      .expect(200)
      .expect({ statusCode: 200, data: [{ id: 'f-01' }] });
  });
});
