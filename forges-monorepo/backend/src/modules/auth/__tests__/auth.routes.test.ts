import express from 'express';
import request from 'supertest';

jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'user-01', role: 'APPRENANT' };
    next();
  },
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

jest.mock('../auth.service', () => ({
  AuthService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../auth.controller', () => ({
  AuthController: jest.fn().mockImplementation(() => ({
    login: (_req: any, res: any) => res.status(200).json({ route: 'login' }),
    logout: (_req: any, res: any) => res.status(200).json({ route: 'logout' }),
    refreshToken: (_req: any, res: any) => res.status(200).json({ route: 'refresh' }),
    forgotPassword: (_req: any, res: any) => res.status(200).json({ route: 'forgotPassword' }),
    resetPassword: (_req: any, res: any) => res.status(200).json({ route: 'resetPassword' }),
    changePassword: (_req: any, res: any) => res.status(200).json({ route: 'changePassword' }),
    me: (_req: any, res: any) => res.status(200).json({ route: 'me' }),
  })),
}));

import authRoutes from '../auth.routes';

describe('auth.routes', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/auth', authRoutes);

  it('monte les routes auth étendues', async () => {
    await request(app).post('/api/auth/login').send({}).expect(200).expect({ route: 'login' });
    await request(app).post('/api/auth/refresh').send({}).expect(200).expect({ route: 'refresh' });
    await request(app).post('/api/auth/logout').send({}).expect(200).expect({ route: 'logout' });
    await request(app).post('/api/auth/forgot-password').send({ email: 'user@test.ci' }).expect(200).expect({ route: 'forgotPassword' });
    await request(app).post('/api/auth/reset-password').send({ token: 'token', password: 'Password1!' }).expect(200).expect({ route: 'resetPassword' });
    await request(app).post('/api/auth/change-password').send({ currentPassword: 'Current1!', newPassword: 'NewPassword1!' }).expect(200).expect({ route: 'changePassword' });
    await request(app).get('/api/auth/me').expect(200).expect({ route: 'me' });
  });
});
