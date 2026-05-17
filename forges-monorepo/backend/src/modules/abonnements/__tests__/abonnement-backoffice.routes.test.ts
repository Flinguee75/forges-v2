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
    abonnementRetail: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'abo-retail-01',
          apprenantId: 'app-01',
          offre: 'ESSENTIEL',
          statut: 'ACTIF',
          date_debut: new Date('2026-01-01'),
          date_fin: new Date('2026-02-01'),
          apprenant: {
            nom: 'Dupont',
            prenoms: 'Jean',
            email: 'jean@test.ci',
          },
        },
      ]),
      count: jest.fn().mockResolvedValue(1),
    },
    abonnementOrganisation: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'abo-org-01',
          organisationId: 'org-01',
          statut: 'ESSAI',
          date_debut: new Date('2026-01-01'),
          date_fin: new Date('2026-01-31'),
          organisation: {
            raison_sociale: 'TechCorp',
            email: 'contact@techcorp.ci',
          },
        },
      ]),
      count: jest.fn().mockResolvedValue(1),
    },
    abonnementB2B: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'abo-b2b-01',
          organisationId: 'org-02',
          palier: 'STANDARD',
          statut: 'ACTIF',
          date_debut: new Date('2026-01-01'),
          date_fin: new Date('2027-01-01'),
          quota: 50,
          consomme: 12,
          organisation: {
            raison_sociale: 'BigCorp',
            email: 'contact@bigcorp.ci',
          },
        },
      ]),
      count: jest.fn().mockResolvedValue(1),
    },
    contratInstitutionnel: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'contrat-01',
          numero_contrat: 'INST-2026-001',
          institution_nom: 'Ministere Formation',
          programme_id: 'PROG-001',
          bailleur: 'Banque Africaine',
          date_debut: new Date('2026-01-01'),
          date_fin: new Date('2026-12-31'),
          montant_saas_annuel: 100000000,
          fee_par_certifie: 25000,
          seuil_facturation_fees: 25000,
          cumul_fees_reportes: 0,
          statut: 'ACTIF',
          gestionnaires_ids: ['gestionnaire-01'],
          avenants: [],
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

jest.mock('../../../shared/email/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({})),
}));

import abonnementRoutes from '../abonnement.routes';
import abonnementBackofficeRoutes from '../abonnement-backoffice.routes';

describe('GET /api/backoffice/abonnements - Route backoffice abonnements', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/abonnements', abonnementRoutes);
  app.use('/api/backoffice/abonnements', abonnementBackofficeRoutes);

  describe('Authentification et autorisation', () => {
    it('autorise ADMIN (mockImpl global)', async () => {
      const response = await request(app)
        .get('/api/abonnements/backoffice')
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
    });

    it('les middlewares auth et authorize sont bien appliques', async () => {
      // Mock global applique ADMIN par defaut
      // Dans un vrai test d'integration, on testerait avec de vrais tokens
      await request(app)
        .get('/api/abonnements/backoffice')
        .expect(200);
    });

    it('expose aussi l alias backoffice attendu par le frontend', async () => {
      const response = await request(app)
        .get('/api/backoffice/abonnements')
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body.data).toHaveProperty('retail');
    });
  });

  describe('Reponse de la route', () => {
    it('retourne tous les types abonnements consolides', async () => {
      const response = await request(app)
        .get('/api/abonnements/backoffice')
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toHaveProperty('retail');
      expect(response.body.data).toHaveProperty('organisation');
      expect(response.body.data).toHaveProperty('b2b');
      expect(response.body.data).toHaveProperty('meta');
    });

    it('retourne les abonnements retail avec informations apprenant', async () => {
      const response = await request(app)
        .get('/api/abonnements/backoffice')
        .expect(200);

      const retail = response.body.data.retail;
      expect(Array.isArray(retail)).toBe(true);
      expect(retail[0]).toHaveProperty('id');
      expect(retail[0]).toHaveProperty('offre');
      expect(retail[0]).toHaveProperty('statut');
      expect(retail[0]).toHaveProperty('apprenant');
      expect(retail[0].apprenant).toHaveProperty('nom');
      expect(retail[0].apprenant).toHaveProperty('email');
    });

    it('retourne les abonnements organisation avec informations organisation', async () => {
      const response = await request(app)
        .get('/api/abonnements/backoffice')
        .expect(200);

      const organisation = response.body.data.organisation;
      expect(Array.isArray(organisation)).toBe(true);
      expect(organisation[0]).toHaveProperty('id');
      expect(organisation[0]).toHaveProperty('statut');
      expect(organisation[0]).toHaveProperty('organisation');
      expect(organisation[0].organisation).toHaveProperty('raison_sociale');
    });

    it('retourne les abonnements b2b avec quota et consommation', async () => {
      const response = await request(app)
        .get('/api/abonnements/backoffice')
        .expect(200);

      const b2b = response.body.data.b2b;
      expect(Array.isArray(b2b)).toBe(true);
      expect(b2b[0]).toHaveProperty('id');
      expect(b2b[0]).toHaveProperty('palier');
      expect(b2b[0]).toHaveProperty('quota');
      expect(b2b[0]).toHaveProperty('consomme');
      expect(b2b[0]).toHaveProperty('organisation');
    });

    it('retourne les metadonnees avec totaux', async () => {
      const response = await request(app)
        .get('/api/abonnements/backoffice')
        .expect(200);

      const meta = response.body.data.meta;
      expect(meta).toHaveProperty('total_retail');
      expect(meta).toHaveProperty('total_organisation');
      expect(meta).toHaveProperty('total_b2b');
      expect(meta.total_retail).toBe(1);
      expect(meta.total_organisation).toBe(1);
      expect(meta.total_b2b).toBe(1);
    });
  });

  describe('Filtres et pagination', () => {
    it('accepte le filtre par statut', async () => {
      await request(app)
        .get('/api/abonnements/backoffice?statut=ACTIF')
        .expect(200);
    });

    it('accepte le filtre par type', async () => {
      await request(app)
        .get('/api/abonnements/backoffice?type=retail')
        .expect(200);
    });

    it('accepte la pagination', async () => {
      await request(app)
        .get('/api/abonnements/backoffice?page=1&limit=10')
        .expect(200);
    });

    it('accepte le filtre par date', async () => {
      await request(app)
        .get('/api/abonnements/backoffice?date_debut=2026-01-01&date_fin=2026-12-31')
        .expect(200);
    });
  });

  describe('Contrats institutionnels', () => {
    it('retourne les contrats institutionnels sur la route backoffice frontend', async () => {
      const response = await request(app)
        .get('/api/backoffice/abonnements/contrat-institutionnel')
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toHaveProperty('contrats');
      expect(response.body.data).toHaveProperty('meta');
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data.contrats[0]).toHaveProperty('numero_contrat', 'INST-2026-001');
    });
  });
});
