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

jest.mock('../session.controller', () => ({
  SessionController: jest.fn().mockImplementation(() => ({
    list: (_req: any, res: any) => res.status(200).json({ route: 'list' }),
    getById: (_req: any, res: any) => res.status(200).json({ route: 'detail' }),
    create: (_req: any, res: any) => res.status(201).json({ route: 'create' }),
    update: (_req: any, res: any) => res.status(200).json({ route: 'update' }),
    closeManually: (_req: any, res: any) => res.status(200).json({ route: 'close' }),
    cancel: (_req: any, res: any) => res.status(200).json({ route: 'cancel' }),
    planifierAnnuelle: (_req: any, res: any) => res.status(201).json({ route: 'bulk' }),
    runScheduler: (_req: any, res: any) => res.status(200).json({ route: 'scheduler' }),
    getAll: (_req: any, res: any) => res.status(200).json({ route: 'public' }),
    getByFormation: (_req: any, res: any) => res.status(200).json({ route: 'byFormation' }),
    getDisponibles: (_req: any, res: any) => res.status(200).json({ route: 'disponibles' }),
  })),
}));

jest.mock('../session.service', () => ({ SessionService: jest.fn() }));
jest.mock('../session.repository', () => ({ SessionRepository: jest.fn() }));
jest.mock('../../formations/formation.repository', () => ({ FormationRepository: jest.fn() }));

import sessionRoutes from '../session.routes';

describe('session.routes', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/backoffice/sessions', sessionRoutes);

  it('monte les routes backoffice sessions critiques', async () => {
    await request(app).get('/api/backoffice/sessions').expect(200).expect({ route: 'list' });
    await request(app).post('/api/backoffice/sessions/bulk').send({}).expect(201).expect({ route: 'bulk' });
    await request(app).post('/api/backoffice/sessions/scheduler/run').send({}).expect(200).expect({ route: 'scheduler' });
    await request(app).get('/api/backoffice/sessions/session-1').expect(200).expect({ route: 'detail' });
    await request(app).post('/api/backoffice/sessions').send({}).expect(201).expect({ route: 'create' });
    await request(app).patch('/api/backoffice/sessions/session-1').send({}).expect(200).expect({ route: 'update' });
    await request(app).patch('/api/backoffice/sessions/session-1/close').send({}).expect(200).expect({ route: 'close' });
    await request(app).delete('/api/backoffice/sessions/session-1/cancel').expect(200).expect({ route: 'cancel' });
  });
});
