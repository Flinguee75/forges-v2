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

jest.mock('../formation-partenaire.repository', () => ({
  FormationPartenaireRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../partenaire.repository', () => ({
  PartenaireRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../partenaire.service', () => ({
  PartenaireService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../validation-formation.service', () => ({
  ValidationFormationService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../partenaire.controller', () => ({
  PartenaireController: jest.fn().mockImplementation(() => ({
    autoInscrire: (_req: any, res: any) => res.status(201).json({ route: 'autoInscrire' }),
    activerViaToken: (_req: any, res: any) => res.status(200).json({ route: 'activerViaToken' }),
    getDashboard: (_req: any, res: any) => res.status(200).json({ route: 'getDashboard' }),
    getMesFormations: (_req: any, res: any) => res.status(200).json({ route: 'getMesFormations' }),
    soumettreFormation: (_req: any, res: any) => res.status(201).json({ route: 'soumettreFormation' }),
    getFormationDetail: (_req: any, res: any) => res.status(200).json({ route: 'getFormationDetail' }),
    editerFormationBrouillon: (_req: any, res: any) => res.status(200).json({ route: 'editerFormationBrouillon' }),
    soumettreFormationBrouillon: (_req: any, res: any) => res.status(200).json({ route: 'soumettreFormationBrouillon' }),
    getMesReversements: (_req: any, res: any) => res.status(200).json({ route: 'getMesReversements' }),
    getProfil: (_req: any, res: any) => res.status(200).json({ route: 'getProfil' }),
    updateProfil: (_req: any, res: any) => res.status(200).json({ route: 'updateProfil' }),
    getFormationsEnAttente: (_req: any, res: any) => res.status(200).json({ route: 'getFormationsEnAttente' }),
    validerFormation: (_req: any, res: any) => res.status(200).json({ route: 'validerFormation' }),
    rejeterFormation: (_req: any, res: any) => res.status(200).json({ route: 'rejeterFormation' }),
    getValidationDetail: (_req: any, res: any) => res.status(200).json({ route: 'getValidationDetail' }),
    suspendreFormationValidation: (_req: any, res: any) => res.status(200).json({ route: 'suspendreFormationValidation' }),
    reactiverFormationValidation: (_req: any, res: any) => res.status(200).json({ route: 'reactiverFormationValidation' }),
  })),
}));

import partenaireRoutes from '../partenaire.routes';

describe('partenaire.routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/partenaires', partenaireRoutes);

  it('monte le profil partenaire restauré', async () => {
    await request(app).get('/api/partenaires/profil').expect(200).expect({ route: 'getProfil' });
    await request(app).put('/api/partenaires/profil').send({ raison_sociale: 'Tech' }).expect(200).expect({ route: 'updateProfil' });
  });
});
