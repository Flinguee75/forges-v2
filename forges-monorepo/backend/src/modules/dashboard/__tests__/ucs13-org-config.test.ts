import express from 'express';
import request from 'supertest';

const mockOrganisationConfig = {
  findUnique: jest.fn(),
  upsert: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    organisationConfig: mockOrganisationConfig,
  })),
}));

jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'admin-01', role: 'ADMIN', langue: 'FR' };
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../../shared/audit/audit.logger', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../dashboard.service', () => ({
  DashboardService: jest.fn().mockImplementation(() => ({
    getKPI: (role: string) => ({ role, data: {} }),
  })),
}));

jest.mock('../../apporteurs/apporteur.service', () => ({
  ApporteurService: jest.fn().mockImplementation(() => ({
    getTdbMensuelSuperviseur: () => ({}),
  })),
}));

jest.mock('../../apporteurs/apporteur.repository', () => ({
  ApporteurRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../shared/email/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({})),
}));

import backofficeRoutes from '../backoffice.routes';

const ORG_ID = 'org-uuid-001';
const DEFAULT_COMMISSION = Number(process.env.COMMISSION_FORGES_DEFAULT_PCT ?? 30);
const DEFAULT_SEUIL = Number(process.env.SEUIL_REVERSEMENT_PARTENAIRE_XOF ?? 50000);

describe('UCS13 — Surcharge config par organisation', () => {
  const app = express();
  app.use(express.json());
  app.use('/api', backofficeRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/organisations/:id/config', () => {
    it('retourne null overrides et valeurs effectives globales si aucune surcharge', async () => {
      mockOrganisationConfig.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/admin/organisations/${ORG_ID}/config`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.data.organisation_id).toBe(ORG_ID);
      expect(res.body.data.commission_forges_pct).toBeNull();
      expect(res.body.data.seuil_reversement_xof).toBeNull();
      expect(res.body.data.effective_commission_forges_pct).toBe(DEFAULT_COMMISSION);
      expect(res.body.data.effective_seuil_reversement_xof).toBe(DEFAULT_SEUIL);
    });

    it('retourne la surcharge et les valeurs effectives quand une config existe', async () => {
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

    it('resolution partielle: commission surchargee, seuil utilise le defaut global', async () => {
      mockOrganisationConfig.findUnique.mockResolvedValue({
        organisation_id: ORG_ID,
        commission_forges_pct: 10,
        seuil_reversement_xof: null,
      });

      const res = await request(app)
        .get(`/api/admin/organisations/${ORG_ID}/config`)
        .expect(200);

      expect(res.body.data.effective_commission_forges_pct).toBe(10);
      expect(res.body.data.effective_seuil_reversement_xof).toBe(DEFAULT_SEUIL);
    });
  });

  describe('PATCH /api/admin/organisations/:id/config', () => {
    it('cree la surcharge avec commission personnalisee', async () => {
      mockOrganisationConfig.upsert.mockResolvedValue({
        organisation_id: ORG_ID,
        commission_forges_pct: 15,
        seuil_reversement_xof: null,
      });

      const res = await request(app)
        .patch(`/api/admin/organisations/${ORG_ID}/config`)
        .send({ commission_forges_pct: 15 })
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.data.commission_forges_pct).toBe(15);
      expect(res.body.data.effective_commission_forges_pct).toBe(15);
      expect(res.body.data.effective_seuil_reversement_xof).toBe(DEFAULT_SEUIL);

      expect(mockOrganisationConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organisation_id: ORG_ID },
          create: expect.objectContaining({ organisation_id: ORG_ID, commission_forges_pct: 15 }),
          update: expect.objectContaining({ commission_forges_pct: 15 }),
        })
      );
    });

    it('met a jour les deux champs simultanement', async () => {
      mockOrganisationConfig.upsert.mockResolvedValue({
        organisation_id: ORG_ID,
        commission_forges_pct: 20,
        seuil_reversement_xof: 30000,
      });

      const res = await request(app)
        .patch(`/api/admin/organisations/${ORG_ID}/config`)
        .send({ commission_forges_pct: 20, seuil_reversement_xof: 30000 })
        .expect(200);

      expect(res.body.data.commission_forges_pct).toBe(20);
      expect(res.body.data.seuil_reversement_xof).toBe(30000);
    });

    it('null supprime la surcharge et revert au defaut global', async () => {
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
      expect(res.body.data.effective_commission_forges_pct).toBe(DEFAULT_COMMISSION);
    });

    it('repond 200 et appelle upsert avec les donnees transmises', async () => {
      mockOrganisationConfig.upsert.mockResolvedValue({
        organisation_id: ORG_ID,
        commission_forges_pct: 12,
        seuil_reversement_xof: null,
      });

      const res = await request(app)
        .patch(`/api/admin/organisations/${ORG_ID}/config`)
        .send({ commission_forges_pct: 12 })
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(mockOrganisationConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organisation_id: ORG_ID },
          update: expect.objectContaining({ commission_forges_pct: 12 }),
        })
      );
    });
  });
});
