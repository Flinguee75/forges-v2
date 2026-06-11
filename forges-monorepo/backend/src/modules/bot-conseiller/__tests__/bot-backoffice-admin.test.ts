import express from 'express';
import request from 'supertest';

jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'admin-01', role: 'ADMIN', langue: 'FR' };
    next();
  },
  authorize: (...roles: string[]) => (req: any, res: any, next: any) => {
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'FORBIDDEN' });
    }
  },
}));

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    demandeContactBot: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'contact-01',
          utilisateur_id: 'org-01',
          type_utilisateur: 'ORGANISATION',
          organisation_id: 'org-01',
          session_bot_id: 'bot-session-01',
          motif: 'Technique',
          commentaire: 'Besoin d aide sur les vouchers',
          statut: 'NOUVELLE',
          date_saisie: new Date('2026-01-22'),
          organisation: {
            raison_sociale: 'FORGES Org',
            contact_referent: 'Mme Diallo',
            email: 'orga@test.ci',
          },
        },
      ]),
      count: jest.fn().mockResolvedValue(1),
    },
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

jest.mock('../../../shared/audit/audit.logger', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({})),
}));

import botRoutes from '../bot.routes';

describe('GET /api/bot/backoffice/demandes-contact - Route backoffice demandes de contact', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/bot', botRoutes);

  it('retourne les demandes de contact regroupables par organisation', async () => {
    const response = await request(app)
      .get('/api/bot/backoffice/demandes-contact')
      .expect(200);

    expect(response.body.statusCode).toBe(200);
    expect(Array.isArray(response.body.data.demandes)).toBe(true);
    expect(response.body.data.demandes).toHaveLength(1);
    expect(response.body.data.demandes[0]).toHaveProperty('organisation');
    expect(response.body.data.meta).toHaveProperty('total', 1);
  });
});
