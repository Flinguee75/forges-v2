import { createHmac } from 'crypto';
import { PaiementController } from '../paiement.controller';
import { PaiementService } from '../paiement.service';
import { createMockReq, createMockRes, createNext } from '../../../__tests__/helpers/http';

describe('PaiementController', () => {
  let controller: PaiementController;
  let mockService: jest.Mocked<PaiementService>;

  beforeEach(() => {
    mockService = {
      initierPaiement: jest.fn(),
      confirmerPaiement: jest.fn(),
      getPaiements: jest.fn(),
      effectuerReversementsPartenaires: jest.fn(),
      annulerPaiementsExpires: jest.fn(),
    } as any;

    controller = new PaiementController(mockService);
    process.env.WEBHOOK_SECRET = 'webhook-secret';
  });

  it('initie un paiement valide', async () => {
    const req = createMockReq({
      body: {
        dossier_id: '550e8400-e29b-41d4-a716-446655440000',
        methode: 'MOBILE_MONEY',
      },
      user: { userId: 'app-01' },
    });
    const res = createMockRes();
    const next = createNext();
    mockService.initierPaiement.mockResolvedValue({ paiement_id: 'paiement-01' } as any);

    await controller.createPaiement(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 201, data: { paiement_id: 'paiement-01' } });
    expect(next).not.toHaveBeenCalled();
  });

  it('mappe les erreurs métier ou validation sur initierPaiement', async () => {
    const res = createMockRes();
    const next = createNext();

    await controller.createPaiement(createMockReq({ body: {} }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    mockService.initierPaiement.mockRejectedValueOnce(new Error('DOSSIER_NOT_FOUND'));
    await controller.createPaiement(createMockReq({
      body: {
        dossier_id: '550e8400-e29b-41d4-a716-446655440000',
        methode: 'MOBILE_MONEY',
      },
      user: { userId: 'app-01' },
    }), res, next);
    expect(res.status).toHaveBeenCalledWith(404);

    mockService.initierPaiement.mockRejectedValueOnce(new Error('TOO_MANY_ATTEMPTS'));
    await controller.createPaiement(createMockReq({
      body: {
        dossier_id: '550e8400-e29b-41d4-a716-446655440000',
        methode: 'MOBILE_MONEY',
      },
      user: { userId: 'app-01' },
    }), res, next);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('délègue au next les erreurs non mappées sur initierPaiement', async () => {
    const req = createMockReq({
      body: {
        dossier_id: '550e8400-e29b-41d4-a716-446655440000',
        methode: 'MOBILE_MONEY',
      },
      user: { userId: 'app-01' },
    });
    const res = createMockRes();
    const next = createNext();
    const error = new Error('BOOM');
    mockService.initierPaiement.mockRejectedValue(error);

    await controller.createPaiement(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('valide la signature webhook et confirme le paiement', async () => {
    const body = {
      transaction_id: 'tx-01',
      dossier_id: '550e8400-e29b-41d4-a716-446655440000',
      statut: 'SUCCESS',
      montant: 1000,
    };
    const signature = createHmac('sha256', 'webhook-secret').update(JSON.stringify(body)).digest('hex');
    const req = createMockReq({
      body,
      headers: { 'x-webhook-signature': signature },
    });
    const res = createMockRes();
    const next = createNext();
    mockService.confirmerPaiement.mockResolvedValue({ statut: 'SUCCESS' } as any);

    await controller.handleWebhook(req, res, next);

    expect(mockService.confirmerPaiement).toHaveBeenCalledWith(body);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: { statut: 'SUCCESS' } });
  });

  it('rejette une signature webhook invalide et mappe les erreurs de validation', async () => {
    const res = createMockRes();
    const next = createNext();

    await controller.handleWebhook(createMockReq({
      body: {
        transaction_id: 'tx-01',
        dossier_id: '550e8400-e29b-41d4-a716-446655440000',
        statut: 'SUCCESS',
        montant: 1000,
      },
      headers: { 'x-webhook-signature': 'bad-signature' },
    }), res, next);
    expect(res.status).toHaveBeenCalledWith(401);

    await controller.handleWebhook(createMockReq({ body: { invalid: true } }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('liste les paiements avec filtres de date', async () => {
    const req = createMockReq({
      query: { statut: 'CONFIRME', debut: '2026-01-01', fin: '2026-01-31' },
    });
    const res = createMockRes();
    const next = createNext();
    mockService.getPaiements.mockResolvedValue([{ id: 'paiement-01' }] as any);

    await controller.getPaiements(req, res, next);

    expect(mockService.getPaiements).toHaveBeenCalledWith({
      statut: 'CONFIRME',
      confirmed_at: {
        gte: new Date('2026-01-01'),
        lte: new Date('2026-01-31'),
      },
    });
    expect(res.json).toHaveBeenCalledWith([{ id: 'paiement-01' }]);
  });

  it('effectue les reversements et le scheduler', async () => {
    const req = createMockReq({ user: { userId: 'agent-01' } });
    const res = createMockRes();
    const next = createNext();
    mockService.effectuerReversementsPartenaires.mockResolvedValue({ nb_reversements: 2 } as any);
    mockService.annulerPaiementsExpires.mockResolvedValue(3 as never);

    await controller.effectuerReversements(req, res, next);
    await controller.runScheduler(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ nb_reversements: 2 });
    expect(res.json).toHaveBeenCalledWith({ annules: 3 });
  });
});
