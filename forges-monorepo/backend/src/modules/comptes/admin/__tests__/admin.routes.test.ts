import express from 'express';
import request from 'supertest';

jest.mock('../../../../middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../../shared/audit/audit.logger', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../../shared/email/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../admin.service', () => ({
  AdminService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../admin.controller', () => ({
  AdminController: jest.fn().mockImplementation(() => ({
    listUsers: (_req: any, res: any) => res.status(200).json({ route: 'listUsers' }),
    createUser: (_req: any, res: any) => res.status(201).json({ route: 'createUser' }),
    updateStatus: (_req: any, res: any) => res.status(200).json({ route: 'updateStatus' }),
    invitePartenaire: (_req: any, res: any) => res.status(201).json({ route: 'invitePartenaire' }),
    createApporteur: (_req: any, res: any) => res.status(201).json({ route: 'createApporteur' }),
    listPartenaires: (_req: any, res: any) => res.status(200).json({ route: 'listPartenaires' }),
    getPartenaire: (_req: any, res: any) => res.status(200).json({ route: 'getPartenaire' }),
    approvePartenaire: (_req: any, res: any) => res.status(200).json({ route: 'approvePartenaire' }),
    rejectPartenaire: (_req: any, res: any) => res.status(200).json({ route: 'rejectPartenaire' }),
    suspendPartenaire: (_req: any, res: any) => res.status(200).json({ route: 'suspendPartenaire' }),
    reactivatePartenaire: (_req: any, res: any) => res.status(200).json({ route: 'reactivatePartenaire' }),
    listApporteurs: (_req: any, res: any) => res.status(200).json({ route: 'listApporteurs' }),
    getApporteur: (_req: any, res: any) => res.status(200).json({ route: 'getApporteur' }),
    approveApporteur: (_req: any, res: any) => res.status(200).json({ route: 'approveApporteur' }),
  })),
}));

import adminRoutes from '../admin.routes';

describe('admin.routes', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/admin', adminRoutes);

  it('monte les routes admin critiques', async () => {
    await request(app).get('/api/admin/users').expect(200).expect({ route: 'listUsers' });
    await request(app).post('/api/admin/users').send({}).expect(201).expect({ route: 'createUser' });
    await request(app).put('/api/admin/users/user-1/status').send({ statut: 'ACTIF' }).expect(200).expect({ route: 'updateStatus' });
    await request(app).get('/api/admin/partenaires').expect(200).expect({ route: 'listPartenaires' });
    await request(app).get('/api/admin/partenaires/part-1').expect(200).expect({ route: 'getPartenaire' });
    await request(app).post('/api/admin/partenaires').send({}).expect(201).expect({ route: 'invitePartenaire' });
    await request(app).put('/api/admin/partenaires/part-1/approuver').send({}).expect(200).expect({ route: 'approvePartenaire' });
    await request(app).put('/api/admin/partenaires/part-1/refuser').send({}).expect(200).expect({ route: 'rejectPartenaire' });
    await request(app).put('/api/admin/partenaires/part-1/suspendre').send({}).expect(200).expect({ route: 'suspendPartenaire' });
    await request(app).put('/api/admin/partenaires/part-1/reactiver').send({}).expect(200).expect({ route: 'reactivatePartenaire' });
    await request(app).get('/api/admin/apporteurs').expect(200).expect({ route: 'listApporteurs' });
    await request(app).get('/api/admin/apporteurs/apt-1').expect(200).expect({ route: 'getApporteur' });
    await request(app).post('/api/admin/apporteurs').send({}).expect(201).expect({ route: 'createApporteur' });
    await request(app).put('/api/admin/apporteurs/apt-1/approuver').send({}).expect(200).expect({ route: 'approveApporteur' });
  });
});
