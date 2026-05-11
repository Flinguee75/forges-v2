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
      initierPaiementNgser: jest.fn(),
      confirmerPaiement: jest.fn(),
      getPaiements: jest.fn(),
      getPaiementsStats: jest.fn(),
      effectuerReversementsPartenaires: jest.fn(),
      annulerPaiementsExpires: jest.fn(),
      traiterIpnNgser: jest.fn(),
      reconcilierPaiementsPendingNgser: jest.fn(),
      supprimerPaiement: jest.fn(),
    } as any;

    controller = new PaiementController(mockService);
    process.env.WEBHOOK_SECRET = 'webhook-secret';
    process.env.FRONTEND_URL = 'http://localhost:5173';
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

  it('initie un paiement NGSER via /initier sans transmettre de montant fiable', async () => {
    const req = createMockReq({
      body: {
        dossier_id: '550e8400-e29b-41d4-a716-446655440000',
        montant: 1,
      },
      user: { userId: 'app-01' },
    });
    const res = createMockRes();
    const next = createNext();
    mockService.initierPaiementNgser.mockResolvedValue({
      paiement_id: 'paiement-01',
      order_ngser: 'FRG-2026-042-A3F7B2',
      payment_url: 'https://mock-ngser.forges.ci/pay?order=FRG-2026-042-A3F7B2',
      montant_initie: 100000,
    } as any);

    await controller.initierPaiementNgser(req, res, next);

    expect(mockService.initierPaiementNgser).toHaveBeenCalledWith(
      { dossier_id: '550e8400-e29b-41d4-a716-446655440000' },
      'app-01'
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 201,
      data: expect.objectContaining({
        order_ngser: 'FRG-2026-042-A3F7B2',
        montant_initie: 100000,
      }),
    });
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

  it('retourne les stats paiements admin', async () => {
    const req = createMockReq({ query: { period: '24h' } });
    const res = createMockRes();
    const next = createNext();
    mockService.getPaiementsStats.mockResolvedValue({
      period: '24h',
      total: 10,
      success: 9,
      fail: 1,
      pending: 0,
      success_rate: 90,
      avg_confirmation_time_seconds: 8.5,
      pending_over_30min: 0,
    } as any);

    await controller.getPaiementsStats(req, res, next);

    expect(mockService.getPaiementsStats).toHaveBeenCalledWith('24h');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      data: expect.objectContaining({ success_rate: 90 }),
    });
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

  it('supprime un paiement admin', async () => {
    const req = createMockReq({
      params: { id: 'pay-01' },
      body: { motif: 'Nettoyage test' },
      user: { userId: 'admin-01' },
    });
    const res = createMockRes();
    const next = createNext();
    mockService.supprimerPaiement.mockResolvedValue({
      statut: 'SUPPRIME',
      paiement_id: 'pay-01',
      dossier_id: 'dos-01',
    } as any);

    await controller.supprimerPaiement(req, res, next);

    expect(mockService.supprimerPaiement).toHaveBeenCalledWith('pay-01', 'admin-01', 'Nettoyage test');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      data: {
        statut: 'SUPPRIME',
        paiement_id: 'pay-01',
        dossier_id: 'dos-01',
      },
    });
  });

  it('mappe les erreurs de suppression de paiement', async () => {
    const req = createMockReq({ params: { id: 'pay-01' }, user: { userId: 'admin-01' } });
    const res = createMockRes();
    const next = createNext();

    mockService.supprimerPaiement.mockRejectedValueOnce(new Error('PAIEMENT_NOT_FOUND'));
    await controller.supprimerPaiement(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);

    mockService.supprimerPaiement.mockRejectedValueOnce(new Error('PAIEMENT_SUPPRESSION_INTERDITE'));
    await controller.supprimerPaiement(req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  describe('traiterIpnNgser — RM-158', () => {
    it('accepte un IPN sans signature et répond 200 accepted:true', async () => {
      mockService.traiterIpnNgser.mockResolvedValue(undefined as any);
      const req = createMockReq({
        body: { order_id: 'FRG-2026-042-A3F7B2', status_id: 1, transaction_id: 'TXN-001', transaction_amount: 1500 },
        headers: {},
      });
      const res = createMockRes();

      await controller.traiterIpnNgser(req, res, createNext());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: { accepted: true } });
    });

    it('accepte un IPN avec signature valide et répond 200 accepted:true', async () => {
      const body = { order_id: 'FRG-2026-042-A3F7B2', status_id: 1, transaction_id: 'TXN-002', transaction_amount: 1500 };
      const signature = createHmac('sha256', 'webhook-secret').update(JSON.stringify(body)).digest('hex');
      mockService.traiterIpnNgser.mockResolvedValue(undefined as any);

      const req = createMockReq({ body, headers: { 'x-webhook-signature': signature } });
      const res = createMockRes();

      await controller.traiterIpnNgser(req, res, createNext());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: { accepted: true } });
    });

    it('rejette un IPN avec signature invalide et répond 401', async () => {
      const req = createMockReq({
        body: { order_id: 'FRG-2026-042-A3F7B2', status_id: 1, transaction_id: 'TXN-003' },
        headers: { 'x-webhook-signature': 'mauvaise-signature' },
      });
      const res = createMockRes();

      await controller.traiterIpnNgser(req, res, createNext());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockService.traiterIpnNgser).not.toHaveBeenCalled();
    });
  });

  describe('retourPaiementNgser — Payment Data Transfer', () => {
    it('status_id=1 redirige vers le frontend avec status=success', async () => {
      mockService.traiterIpnNgser.mockResolvedValue(undefined as any);
      const req = createMockReq({
        query: { order_id: 'FRG-2026-042-A3F7B2', status_id: '1', transaction_id: 'TXN-100', transaction_amount: '1500' },
      });
      const res = createMockRes();

      await controller.retourPaiementNgser(req, res, createNext());

      expect(res.redirect).toHaveBeenCalledWith(302, expect.stringContaining('status=success'));
      expect(res.redirect).toHaveBeenCalledWith(302, expect.stringContaining('order_id=FRG-2026-042-A3F7B2'));
    });

    it('status_id=0 redirige vers le frontend avec status=fail', async () => {
      mockService.traiterIpnNgser.mockResolvedValue(undefined as any);
      const req = createMockReq({
        query: { order_id: 'FRG-2026-042-A3F7B2', status_id: '0', transaction_id: 'TXN-101' },
      });
      const res = createMockRes();

      await controller.retourPaiementNgser(req, res, createNext());

      expect(res.redirect).toHaveBeenCalledWith(302, expect.stringContaining('status=fail'));
    });

    it('status_id=2 (montant insuffisant) redirige avec status=fail et status_id=2', async () => {
      mockService.traiterIpnNgser.mockResolvedValue(undefined as any);
      const req = createMockReq({
        query: { order_id: 'FRG-2026-042-A3F7B2', status_id: '2', transaction_id: 'TXN-102' },
      });
      const res = createMockRes();

      await controller.retourPaiementNgser(req, res, createNext());

      expect(res.redirect).toHaveBeenCalledWith(302, expect.stringContaining('status=fail'));
      expect(res.redirect).toHaveBeenCalledWith(302, expect.stringContaining('status_id=2'));
    });

    it('inclut transaction_id dans la redirection si présent', async () => {
      mockService.traiterIpnNgser.mockResolvedValue(undefined as any);
      const req = createMockReq({
        query: { order_id: 'FRG-2026-042-A3F7B2', status_id: '1', transaction_id: 'TXN-200' },
      });
      const res = createMockRes();

      await controller.retourPaiementNgser(req, res, createNext());

      expect(res.redirect).toHaveBeenCalledWith(302, expect.stringContaining('transaction_id=TXN-200'));
    });

    it('redirige même sans order_id sans lever d\'erreur', async () => {
      const req = createMockReq({ query: { status_id: '0' } });
      const res = createMockRes();

      await controller.retourPaiementNgser(req, res, createNext());

      expect(res.redirect).toHaveBeenCalledWith(302, expect.any(String));
    });
  });
});
