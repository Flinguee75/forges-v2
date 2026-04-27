import express from 'express';
import request from 'supertest';

jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'user-01', role: 'ADMIN' };
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
    getGlobalStats: (_role: any, _userId: any) => ({ totalDossiers: 12 }),
    getFormationStats: (_role: any, _userId: any, id: string) => ({ formation: { id } }),
    getSessionStats: (_role: any, _userId: any, id: string) => ({ session: { id } }),
    getPaiementsStats: () => ({ paiementsTotal: 3 }),
    getInscriptionsEvolution: () => ({ evolution: [] }),
    getPaiementsEvolution: () => ({ evolution: [] }),
    getRapportsData: () => ({ rapports: [] }),
    exportRapportCSV: () => 'a,b',
    exportRapportPDF: () => Buffer.from('%PDF-1.4'),
  })),
}));

import dashboardRoutes from '../dashboard.routes';

describe('dashboard.routes', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/dashboard', dashboardRoutes);

  it('monte les routes dashboard runtime', async () => {
    await request(app).get('/api/dashboard/stats').expect(200).expect({ statusCode: 200, data: { totalDossiers: 12 } });
    await request(app).get('/api/dashboard/stats/global').expect(200).expect({ statusCode: 200, data: { totalDossiers: 12 } });
    await request(app).get('/api/dashboard/stats/formations/f-1').expect(200).expect({ statusCode: 200, data: { formation: { id: 'f-1' } } });
    await request(app).get('/api/dashboard/stats/sessions/s-1').expect(200).expect({ statusCode: 200, data: { session: { id: 's-1' } } });
    await request(app).get('/api/dashboard/stats/paiements').expect(200).expect({ statusCode: 200, data: { paiementsTotal: 3 } });
    await request(app).get('/api/dashboard/inscriptions/evolution').expect(200).expect({ statusCode: 200, data: { evolution: [] } });
    await request(app).get('/api/dashboard/paiements/evolution').expect(200).expect({ statusCode: 200, data: { evolution: [] } });
    await request(app).get('/api/dashboard/rapports').expect(200).expect({ statusCode: 200, data: { rapports: [] } });
    await request(app).get('/api/dashboard/rapports/export/csv').expect(200).expect('content-type', /text\/csv/);
    await request(app).get('/api/dashboard/rapports/export/pdf').expect(200).expect('content-type', /application\/pdf/);
  });
});
