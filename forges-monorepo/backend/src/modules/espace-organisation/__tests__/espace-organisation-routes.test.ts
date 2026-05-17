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

jest.mock('../espace-organisation.controller', () => ({
  EspaceOrganisationController: jest.fn().mockImplementation(() => ({
    getDashboard: (_req: any, res: any) => res.status(200).json({ route: 'dashboard' }),
    getBeneficiaires: (_req: any, res: any) => res.status(200).json({ route: 'beneficiaires' }),
    importerCSV: (_req: any, res: any) => res.status(200).json({ route: 'importCSV' }),
    getMesVouchers: (_req: any, res: any) => res.status(200).json({ route: 'vouchers' }),
    getRapportBailleur: (_req: any, res: any) => res.status(200).json({ route: 'rapport' }),
    getDashboardB2B: (_req: any, res: any) => res.status(200).json({ route: 'dashboardB2B' }),
    desactiverBeneficiaire: (_req: any, res: any) => res.status(200).json({ route: 'desactiver' }),
    createMembre: (_req: any, res: any) => res.status(201).json({ route: 'createMembre' }),
    commanderVouchers: (_req: any, res: any) => res.status(201).json({ route: 'commanderVouchers' }),
    inscrireBeneficiaire: (_req: any, res: any) => res.status(201).json({ route: 'inscrireBeneficiaire' }),
    getSuiviInscriptions: (_req: any, res: any) => res.status(200).json({ route: 'inscriptions' }),
    getMesPaiements: (_req: any, res: any) => res.status(200).json({ route: 'paiements' }),
    getMonProfil: (_req: any, res: any) => res.status(200).json({ route: 'profil' }),
    updateMonProfil: (_req: any, res: any) => res.status(200).json({ route: 'updateProfil' }),
  })),
}));

jest.mock('../espace-organisation.service', () => ({ EspaceOrganisationService: jest.fn() }));
jest.mock('../espace-organisation.repository', () => ({ EspaceOrganisationRepository: jest.fn() }));
jest.mock('../import-csv.service', () => ({ ImportCSVService: jest.fn() }));
jest.mock('../rapport.service', () => ({ RapportService: jest.fn() }));

import espaceOrganisationRoutes from '../espace-organisation.routes';

describe('espace-organisation.routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/organisation', espaceOrganisationRoutes);

  it('monte les routes dashboard, membres, vouchers, profil', async () => {
    await request(app).get('/api/organisation/dashboard').expect(200).expect({ route: 'dashboard' });
    await request(app).get('/api/organisation/membres').expect(200).expect({ route: 'beneficiaires' });
    await request(app).get('/api/organisation/beneficiaires').expect(200).expect({ route: 'beneficiaires' });
    await request(app).get('/api/organisation/vouchers').expect(200).expect({ route: 'vouchers' });
    await request(app).get('/api/organisation/profil').expect(200).expect({ route: 'profil' });
    await request(app).put('/api/organisation/profil').expect(200).expect({ route: 'updateProfil' });
  });

  it('monte les routes inscriptions et paiements', async () => {
    await request(app).get('/api/organisation/inscriptions').expect(200).expect({ route: 'inscriptions' });
    await request(app).get('/api/organisation/paiements').expect(200).expect({ route: 'paiements' });
  });

  // Route clé UCS12 — POST /api/organisation/inscrire-beneficiaire
  it('POST /inscrire-beneficiaire repond 201 (UCS12)', async () => {
    await request(app)
      .post('/api/organisation/inscrire-beneficiaire')
      .send({ beneficiaire_id: 'app-01', session_id: 'sess-01', source_financement: 'B2B' })
      .expect(201)
      .expect({ route: 'inscrireBeneficiaire' });
  });

  it('monte les routes membres (create, import, desactiver)', async () => {
    await request(app).post('/api/organisation/membres').expect(201).expect({ route: 'createMembre' });
    await request(app).post('/api/organisation/membres/import-b2b').expect(200);
    await request(app).delete('/api/organisation/membres/app-01').expect(200).expect({ route: 'desactiver' });
  });

  it('monte les routes vouchers commander et rapport', async () => {
    await request(app).post('/api/organisation/vouchers/commander').expect(201).expect({ route: 'commanderVouchers' });
    await request(app).get('/api/organisation/rapport-pdf').expect(200).expect({ route: 'rapport' });
  });
});
