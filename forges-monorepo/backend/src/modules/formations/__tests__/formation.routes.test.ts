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

jest.mock('../formation.controller', () => ({
  FormationController: jest.fn().mockImplementation(() => ({
    getCataloguePublic: (_req: any, res: any) => res.status(200).json({ route: 'catalogue' }),
    getById: (_req: any, res: any) => res.status(200).json({ route: 'publicDetail' }),
    getAllBackoffice: (_req: any, res: any) => res.status(200).json({ route: 'backofficeList' }),
    getByIdBackoffice: (_req: any, res: any) => res.status(200).json({ route: 'backofficeDetail' }),
    create: (_req: any, res: any) => res.status(201).json({ route: 'create' }),
    update: (_req: any, res: any) => res.status(200).json({ route: 'update' }),
    publish: (_req: any, res: any) => res.status(200).json({ route: 'publish' }),
    archiver: (_req: any, res: any) => res.status(200).json({ route: 'archive' }),
    assignerType: (_req: any, res: any) => res.status(200).json({ route: 'assignerType' }),
    getAll: (_req: any, res: any) => res.status(200).json({ route: 'getAll' }),
    accederDemande: (_req: any, res: any) => res.status(201).json({ route: 'acceder' }),
  })),
}));

jest.mock('../../sessions/session.controller', () => ({
  SessionController: jest.fn().mockImplementation(() => ({
    getByFormation: (_req: any, res: any) => res.status(200).json({ route: 'sessionsByFormation' }),
    getDisponibles: (_req: any, res: any) => res.status(200).json({ route: 'sessionsDisponibles' }),
    getAll: (_req: any, res: any) => res.status(200).json({ route: 'sessionsPublic' }),
  })),
}));

jest.mock('../formation.service', () => ({ FormationService: jest.fn() }));
jest.mock('../formation.repository', () => ({ FormationRepository: jest.fn() }));
jest.mock('../../sessions/session.service', () => ({ SessionService: jest.fn() }));
jest.mock('../../sessions/session.repository', () => ({ SessionRepository: jest.fn() }));

import formationRoutes from '../formation.routes';

describe('formation.routes', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/formations', formationRoutes);

  it('monte les routes backoffice formations critiques', async () => {
    await request(app).get('/api/formations/backoffice/list').expect(200).expect({ route: 'backofficeList' });
    await request(app).get('/api/formations/backoffice/formation-1').expect(200).expect({ route: 'backofficeDetail' });
    await request(app).post('/api/formations').send({}).expect(201).expect({ route: 'create' });
    await request(app).patch('/api/formations/formation-1').send({}).expect(200).expect({ route: 'update' });
    await request(app).patch('/api/formations/formation-1/publish').send({}).expect(200).expect({ route: 'publish' });
    await request(app).delete('/api/formations/formation-1/archive').expect(200).expect({ route: 'archive' });
  });
});
