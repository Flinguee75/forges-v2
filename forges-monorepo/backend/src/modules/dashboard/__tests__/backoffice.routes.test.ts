import express from 'express';
import request from 'supertest';

jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'admin-01', role: 'ADMIN', langue: 'FR' };
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

jest.mock('../dashboard.service', () => ({
  DashboardService: jest.fn().mockImplementation(() => ({
    getKPI: (role: string) => ({ role, data: { ok: true }, timestamp: '2026-04-22T10:00:00.000Z' }),
  })),
}));

jest.mock('../../apporteurs/apporteur.service', () => ({
  ApporteurService: jest.fn().mockImplementation(() => ({
    getTdbMensuelSuperviseur: () => ({ top_apporteurs_mois: [] }),
  })),
}));

jest.mock('../../apporteurs/apporteur.repository', () => ({
  ApporteurRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../shared/email/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({})),
}));

import backofficeRoutes from '../backoffice.routes';

describe('backoffice.routes', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/backoffice', backofficeRoutes);

  it('monte les routes dashboard et config runtime', async () => {
    await request(app)
      .get('/api/backoffice/dashboard/admin')
      .expect(200)
      .expect({
        statusCode: 200,
        data: { role: 'ADMIN', data: { ok: true }, timestamp: '2026-04-22T10:00:00.000Z' },
      });

    await request(app)
      .get('/api/backoffice/dashboard/superviseur')
      .expect(200)
      .expect({
        statusCode: 200,
        data: {
          role: 'SUPERVISEUR',
          data: { ok: true },
          timestamp: '2026-04-22T10:00:00.000Z',
        },
      });

    await request(app).get('/api/backoffice/config').expect(200).expect(({ body }) => {
      expect(body.statusCode).toBe(200);
      expect(body.data).toMatchObject({
        default_commission_forges_pct: 20,
        default_commission_apporteur_pct: 5,
        seuil_reversement_partenaire_xof: 50000,
        seuil_reversement_apporteur_xof: 5000,
        validation_partenaire_delai_jours: 5,
      });
    });
  });
});
