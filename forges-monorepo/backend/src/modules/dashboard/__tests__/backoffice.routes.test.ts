import express from 'express';
import request from 'supertest';

jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'admin-01', role: 'ADMIN', langue: 'FR' };
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

const mockOrganisationConfig = {
  findUnique: jest.fn(),
  upsert: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    organisationConfig: mockOrganisationConfig,
  })),
}));

jest.mock('../../../shared/audit/audit.logger', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn().mockResolvedValue(undefined),
  })),
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
  app.use('/api/admin', backofficeRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('monte les routes dashboard et config globale', async () => {
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
        default_commission_forges_pct: 30,
        default_commission_apporteur_pct: 5,
        seuil_reversement_partenaire_xof: 50000,
        seuil_reversement_apporteur_xof: 5000,
        validation_partenaire_delai_jours: 5,
      });
    });
  });

  describe('UCS13 — Surcharge config par organisation', () => {
    const ORG_ID = 'org-uuid-001';

    it('GET /admin/organisations/:id/config retourne null overrides + valeurs effectives globales si aucune surcharge', async () => {
      mockOrganisationConfig.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/admin/organisations/${ORG_ID}/config`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.data.organisation_id).toBe(ORG_ID);
      expect(res.body.data.commission_forges_pct).toBeNull();
      expect(res.body.data.seuil_reversement_xof).toBeNull();
      expect(res.body.data.effective_commission_forges_pct).toBe(30);
      expect(res.body.data.effective_seuil_reversement_xof).toBe(50000);
    });

    it('GET /admin/organisations/:id/config retourne la surcharge quand elle existe', async () => {
      mockOrganisationConfig.findUnique.mockResolvedValue({
        organisation_id: ORG_ID,
        commission_forges_pct: 15,
        seuil_reversement_xof: 25000,
      });

      const res = await request(app)
        .get(`/api/admin/organisations/${ORG_ID}/config`)
        .expect(200);

      expect(res.body.data.commission_forges_pct).toBe(15);
      expect(res.body.data.seuil_reversement_xof).toBe(25000);
      expect(res.body.data.effective_commission_forges_pct).toBe(15);
      expect(res.body.data.effective_seuil_reversement_xof).toBe(25000);
    });

    it('PATCH /admin/organisations/:id/config crée ou met a jour la surcharge', async () => {
      const savedConfig = {
        organisation_id: ORG_ID,
        commission_forges_pct: 15,
        seuil_reversement_xof: null,
      };
      mockOrganisationConfig.upsert.mockResolvedValue(savedConfig);

      const res = await request(app)
        .patch(`/api/admin/organisations/${ORG_ID}/config`)
        .send({ commission_forges_pct: 15 })
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.data.commission_forges_pct).toBe(15);
      expect(res.body.data.effective_commission_forges_pct).toBe(15);
      expect(mockOrganisationConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organisation_id: ORG_ID },
          create: expect.objectContaining({ organisation_id: ORG_ID, commission_forges_pct: 15 }),
          update: expect.objectContaining({ commission_forges_pct: 15 }),
        })
      );
    });

    it('PATCH /admin/organisations/:id/config accepte null pour supprimer la surcharge', async () => {
      mockOrganisationConfig.upsert.mockResolvedValue({
        organisation_id: ORG_ID,
        commission_forges_pct: null,
        seuil_reversement_xof: null,
      });

      const res = await request(app)
        .patch(`/api/admin/organisations/${ORG_ID}/config`)
        .send({ commission_forges_pct: null })
        .expect(200);

      expect(res.body.data.commission_forges_pct).toBeNull();
      expect(res.body.data.effective_commission_forges_pct).toBe(30);
    });
  });
});
