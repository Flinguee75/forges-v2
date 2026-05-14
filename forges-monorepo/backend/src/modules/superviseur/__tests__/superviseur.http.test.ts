import express from 'express';
import request from 'supertest';

const mockGetTdbMensuel = jest.fn();
const mockCreateBulk = jest.fn();

jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'sup-01', role: 'SUPERVISEUR', langue: 'FR' };
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../../shared/prisma/prisma.client', () => ({
  prisma: {},
}));

jest.mock('../../../shared/audit/audit.logger', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../shared/email/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../apporteurs/apporteur.repository', () => ({
  ApporteurRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../apporteurs/apporteur.service', () => ({
  ApporteurService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../apporteurs/apporteur.controller', () => ({
  ApporteurController: jest.fn().mockImplementation(() => ({
    getTdbMensuel: mockGetTdbMensuel,
  })),
}));

jest.mock('../../sessions/session.repository', () => ({
  SessionRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../formations/formation.repository', () => ({
  FormationRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../sessions/session.service', () => ({
  SessionService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../sessions/session.controller', () => ({
  SessionController: jest.fn().mockImplementation(() => ({
    createBulk: mockCreateBulk,
  })),
}));

import superviseurRoutes from '../superviseur.routes';

describe('superviseur.http', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/superviseur', superviseurRoutes);
  app.use('/api/backoffice', superviseurRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('monte le tableau de bord mensuel apporteurs et la planification annuelle', async () => {
    mockGetTdbMensuel.mockImplementation((req: any, res: any) => {
      res.status(200).json({
        statusCode: 200,
        data: {
          route: 'getTdbMensuel',
          userId: req.user.userId,
          mois: req.query.mois || null,
        },
      });
    });

    mockCreateBulk.mockImplementation((req: any, res: any) => {
      res.status(201).json({
        statusCode: 201,
        data: {
          route: 'createBulk',
          sessions: req.body.sessions,
        },
      });
    });

    await request(app)
      .get('/api/superviseur/apporteurs/tdb?mois=2026-03-01T00:00:00.000Z')
      .expect(200)
      .expect({
        statusCode: 200,
        data: {
          route: 'getTdbMensuel',
          userId: 'sup-01',
          mois: '2026-03-01T00:00:00.000Z',
        },
      });

    await request(app)
      .get('/api/backoffice/apporteurs/stats')
      .expect(200)
      .expect({
        statusCode: 200,
        data: {
          route: 'getTdbMensuel',
          userId: 'sup-01',
          mois: null,
        },
      });

    await request(app)
      .post('/api/superviseur/sessions/planification-annuelle')
      .send({ sessions: [{ id: 's-01' }] })
      .expect(201)
      .expect({
        statusCode: 201,
        data: {
          route: 'createBulk',
          sessions: [{ id: 's-01' }],
        },
      });

    expect(mockGetTdbMensuel).toHaveBeenCalledTimes(2);
    expect(mockCreateBulk).toHaveBeenCalledWith(
      expect.objectContaining({ body: { sessions: [{ id: 's-01' }] } }),
      expect.any(Object),
      expect.any(Function)
    );
  });
});
