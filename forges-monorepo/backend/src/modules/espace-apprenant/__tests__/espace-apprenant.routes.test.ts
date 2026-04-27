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

jest.mock('../espace-apprenant.controller', () => ({
  EspaceApprenantController: jest.fn().mockImplementation(() => ({
    getMesAttestations: (_req: any, res: any) => res.status(200).json({ route: 'attestations' }),
    getAttestationUrl: (_req: any, res: any) => res.status(200).json({ route: 'attestationUrl' }),
    getMesDossiers: (_req: any, res: any) => res.status(200).json({ route: 'dossiers' }),
    annulerDossier: (_req: any, res: any) => res.status(200).json({ route: 'annuler' }),
    getMesFormationsDemande: (_req: any, res: any) => res.status(200).json({ route: 'formationsDemande' }),
    getAccesFormationDemande: (_req: any, res: any) => res.status(200).json({ route: 'accesDemande' }),
    updateProgressionFormationDemande: (_req: any, res: any) => res.status(200).json({ route: 'updateProgression' }),
  })),
}));

jest.mock('../espace-apprenant.service', () => ({ EspaceApprenantService: jest.fn() }));
jest.mock('../espace-apprenant.repository', () => ({ EspaceApprenantRepository: jest.fn() }));
jest.mock('../attestation.service', () => ({ AttestationService: jest.fn() }));

import espaceApprenantRoutes from '../espace-apprenant.routes';

describe('espace-apprenant.routes', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/espace-apprenant', espaceApprenantRoutes);

  it('monte les routes apprenant et la progression des formations à la demande', async () => {
    await request(app).get('/api/espace-apprenant/dossiers').expect(200).expect({ route: 'dossiers' });
    await request(app).get('/api/espace-apprenant/formations-demande').expect(200).expect({ route: 'formationsDemande' });
    await request(app).get('/api/espace-apprenant/formations-demande/acces-1').expect(200).expect({ route: 'accesDemande' });
    await request(app).patch('/api/espace-apprenant/formations-demande/acces-1/progression').send({ progression: 55 }).expect(200).expect({ route: 'updateProgression' });
  });
});
