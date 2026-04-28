import express from 'express';
import request from 'supertest';
import { createHmac } from 'crypto';

const mockConfirmerPaiement = jest.fn();

jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  authenticateOptional: (_req: any, _res: any, next: any) => next(),
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

jest.mock('../../vouchers/voucher.repository', () => ({
  VoucherRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../paiement.repository', () => ({
  PaiementRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../commission.repository', () => ({
  CommissionRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../paiement.service', () => ({
  PaiementService: jest.fn().mockImplementation(() => ({
    confirmerPaiement: mockConfirmerPaiement,
    initierPaiement: jest.fn(),
    getPaiementsByApprenant: jest.fn(),
    getPaiements: jest.fn(),
    effectuerReversementsPartenaires: jest.fn(),
    annulerPaiementsExpires: jest.fn(),
  })),
}));

import paiementRoutes from '../paiement.routes';

describe('paiement.routes', () => {
  const app = express();

  app.use(express.json());
  app.use('/api', paiementRoutes);

  beforeEach(() => {
    mockConfirmerPaiement.mockReset();
    process.env.WEBHOOK_SECRET = 'webhook-secret';
  });

  it('valide la signature HMAC et déclenche le webhook de confirmation', async () => {
    const body = {
      transaction_id: 'tx-01',
      dossier_id: 'd-01',
      statut: 'SUCCESS',
      montant: 100000,
    };
    const signature = createHmac('sha256', 'webhook-secret').update(JSON.stringify(body)).digest('hex');

    mockConfirmerPaiement.mockResolvedValueOnce({ statut: 'SUCCESS' });

    await request(app)
      .post('/api/paiements/webhook')
      .set('x-webhook-signature', signature)
      .send(body)
      .expect(200)
      .expect({ statusCode: 200, data: { statut: 'SUCCESS' } });

    expect(mockConfirmerPaiement).toHaveBeenCalledWith(body);
  });

  it('rejette une signature webhook invalide avant d appeler le service', async () => {
    await request(app)
      .post('/api/paiements/webhook')
      .set('x-webhook-signature', 'bad-signature')
      .send({
        transaction_id: 'tx-01',
        dossier_id: 'd-01',
        statut: 'SUCCESS',
        montant: 100000,
      })
      .expect(401)
      .expect({ statusCode: 401, error: 'INVALID_SIGNATURE', message: 'Signature webhook invalide' });

    expect(mockConfirmerPaiement).not.toHaveBeenCalled();
  });
});
