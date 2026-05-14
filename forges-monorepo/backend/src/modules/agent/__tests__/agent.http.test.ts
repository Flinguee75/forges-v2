import express from 'express';
import request from 'supertest';

const mockGetReversementsEnAttente = jest.fn();
const mockEffectuerReversementPartenaire = jest.fn();
const mockGetCommissionsEnAttente = jest.fn();
const mockEffectuerReversementApporteur = jest.fn();

jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'agent-01', role: 'AGENT', langue: 'FR' };
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../../shared/prisma/prisma.client', () => ({
  prisma: {},
}));

jest.mock('../../../shared/audit/audit.logger', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../shared/email/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../partenaires/partenaire.repository', () => ({
  PartenaireRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../partenaires/formation-partenaire.repository', () => ({
  FormationPartenaireRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../apporteurs/apporteur.repository', () => ({
  ApporteurRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../partenaires/partenaire.service', () => ({
  PartenaireService: jest.fn().mockImplementation(() => ({
    getReversementsEnAttente: mockGetReversementsEnAttente,
    effectuerReversementPartenaire: mockEffectuerReversementPartenaire,
  })),
}));

jest.mock('../../apporteurs/apporteur.service', () => ({
  ApporteurService: jest.fn().mockImplementation(() => ({
    getCommissionsEnAttente: mockGetCommissionsEnAttente,
    effectuerReversementApporteur: mockEffectuerReversementApporteur,
  })),
}));

import agentRoutes from '../agent.routes';

describe('agent.http', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/agent', agentRoutes);
  app.use('/api/backoffice', agentRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('monte les routes de reversement partenaire sur /api/agent et /api/backoffice', async () => {
    mockGetReversementsEnAttente.mockResolvedValueOnce([
      { partenaire_id: 'part-01', montant_total_xof: 75000, nb_commissions: 2 },
    ]);
    mockEffectuerReversementPartenaire.mockResolvedValueOnce({
      partenaire_id: 'part-01',
      montant_total_xof: 75000,
      message: 'Reversement partenaire effectué.',
    });
    mockGetCommissionsEnAttente.mockResolvedValueOnce([
      { apporteur_id: 'apt-01', montant_total_xof: 5000, nb_commissions: 1 },
    ]);
    mockEffectuerReversementApporteur.mockResolvedValueOnce({
      apporteur_id: 'apt-01',
      montant_total_xof: 5000,
      message: 'Reversement apporteur effectué.',
    });

    await request(app)
      .get('/api/agent/reversements/partenaires')
      .expect(200)
      .expect({
        statusCode: 200,
        data: [{ partenaire_id: 'part-01', montant_total_xof: 75000, nb_commissions: 2 }],
      });

    await request(app)
      .post('/api/backoffice/reversements/partenaires/part-01/execute')
      .send({ preuve_virement: 'pv-01' })
      .expect(201)
      .expect({
        statusCode: 201,
        data: {
          partenaire_id: 'part-01',
          montant_total_xof: 75000,
          message: 'Reversement partenaire effectué.',
        },
      });

    await request(app)
      .get('/api/agent/reversements/apporteurs')
      .expect(200)
      .expect({
        statusCode: 200,
        data: [{ apporteur_id: 'apt-01', montant_total_xof: 5000, nb_commissions: 1 }],
      });

    await request(app)
      .post('/api/backoffice/reversements/apporteurs/apt-01/execute')
      .expect(201)
      .expect({
        statusCode: 201,
        data: {
          apporteur_id: 'apt-01',
          montant_total_xof: 5000,
          message: 'Reversement apporteur effectué.',
        },
      });

    expect(mockGetReversementsEnAttente).toHaveBeenCalledWith('agent-01');
    expect(mockEffectuerReversementPartenaire).toHaveBeenCalledWith(
      'part-01',
      'agent-01',
      { preuve_virement: 'pv-01' }
    );
    expect(mockGetCommissionsEnAttente).toHaveBeenCalledWith('agent-01');
    expect(mockEffectuerReversementApporteur).toHaveBeenCalledWith('apt-01', 'agent-01');
  });

  it('mappe une erreur de seuil sur le reversement partenaire', async () => {
    mockEffectuerReversementPartenaire.mockRejectedValueOnce(new Error('SEUIL_NON_ATTEINT'));

    await request(app)
      .post('/api/agent/reversements/partenaires/part-01/execute')
      .send({})
      .expect(400)
      .expect({
        statusCode: 400,
        error: 'SEUIL_NON_ATTEINT',
        message: 'Seuil minimum non atteint (RM-138)',
      });
  });
});
