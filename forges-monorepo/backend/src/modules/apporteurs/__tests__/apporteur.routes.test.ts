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

jest.mock('../apporteur.repository', () => ({
  ApporteurRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../apporteur.service', () => ({
  ApporteurService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../apporteur.controller', () => ({
  ApporteurController: jest.fn().mockImplementation(() => ({
    register: (_req: any, res: any) => res.status(201).json({ route: 'register' }),
    getDashboard: (_req: any, res: any) => res.status(200).json({ route: 'getDashboard' }),
    getCommissions: (_req: any, res: any) => res.status(200).json({ route: 'getCommissions' }),
    getProfil: (_req: any, res: any) => res.status(200).json({ route: 'getProfil' }),
    updateProfil: (_req: any, res: any) => res.status(200).json({ route: 'updateProfil' }),
    getTdbMensuel: (_req: any, res: any) => res.status(200).json({ route: 'getTdbMensuel' }),
    cloturerCompte: (_req: any, res: any) => res.status(200).json({ route: 'cloturerCompte' }),
    runSchedulerFinMois: (_req: any, res: any) => res.status(200).json({ route: 'runSchedulerFinMois' }),
    effectuerReversements: (_req: any, res: any) => res.status(200).json({ route: 'effectuerReversements' }),
  })),
}));

import apporteurRoutes from '../apporteur.routes';

describe('apporteur.routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/apporteurs', apporteurRoutes);

  it('monte l inscription publique apporteur', async () => {
    await request(app).post('/api/apporteurs/register').send({ nom: 'Alpha', email: 'a@test.ci', password: 'Password1!' }).expect(201).expect({ route: 'register' });
  });

  it('monte le profil apporteur restauré', async () => {
    await request(app).get('/api/apporteurs/profil').expect(200).expect({ route: 'getProfil' });
    await request(app).put('/api/apporteurs/profil').send({ nom: 'Alpha' }).expect(200).expect({ route: 'updateProfil' });
  });
});
