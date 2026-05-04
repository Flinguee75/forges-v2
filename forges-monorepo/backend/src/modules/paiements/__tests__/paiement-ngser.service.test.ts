import { PaiementNgserService } from '../paiement-ngser.service';
import { VoucherRepository } from '../../vouchers/voucher.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';

const mockCreateSession = jest.fn();
jest.mock('../ngser.client', () => ({
  NgserClient: jest.fn().mockImplementation(() => ({
    createSession: mockCreateSession,
  })),
}));

describe('PaiementNgserService — RM-157 initiation backend-only', () => {
  let service: PaiementNgserService;
  let mockPrisma: any;
  let mockVoucherRepo: jest.Mocked<VoucherRepository>;
  let mockAudit: jest.Mocked<AuditLogger>;

  const dossierStandard = {
    id: 'd-01',
    apprenant_id: 'a-01',
    formation_id: 'f-01',
    session_id: 's-01',
    statut: 'RETENU',
    source_financement: 'RETAIL',
    voucher_code: null,
    formation: {
      id: 'f-01',
      intitule: 'Formation Standard',
      cout_catalogue: 100000,
      type_formation: 'STANDARD',
    },
  };

  beforeEach(() => {
    process.env.NGSER_MOCK_MODE = 'true';

    mockPrisma = {
      dossier: { findUnique: jest.fn() },
      paiement: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      abonnementRetail: { findFirst: jest.fn() },
    };
    mockVoucherRepo = { findByCode: jest.fn() } as any;
    mockAudit = { info: jest.fn(), warning: jest.fn() } as any;

    service = new PaiementNgserService(mockPrisma, mockVoucherRepo, mockAudit);
  });

  it('ignore le montant client et stocke le montant recalcule backend', async () => {
    mockPrisma.dossier.findUnique.mockResolvedValue(dossierStandard);
    mockPrisma.paiement.findUnique.mockResolvedValue(null);
    mockPrisma.paiement.findFirst.mockResolvedValue(null);
    mockPrisma.abonnementRetail.findFirst.mockResolvedValue(null);
    mockPrisma.paiement.create.mockImplementation(({ data }: any) => ({
      id: 'p-01',
      ...data,
    }));

    const result = await service.initierPaiement(
      { dossier_id: 'd-01', methode: 'MOBILE_MONEY', montant: 1 } as any,
      'a-01'
    );

    expect(mockPrisma.paiement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        montant_catalogue: 100000,
        montant_final: 100000,
        montant_initie: 100000,
        statut: 'PENDING',
      }),
    });
    expect(result.montant_initie).toBe(100000);
    expect(result.payment_url).toContain('https://mock-ngser.forges.ci/pay?order=');
  });

  it('genere order_ngser au format FRG-YYYY-SEQ-XXXXXX et verifie son unicite', async () => {
    mockPrisma.dossier.findUnique.mockResolvedValue(dossierStandard);
    mockPrisma.paiement.findUnique.mockResolvedValue(null);
    mockPrisma.paiement.findFirst
      .mockResolvedValueOnce({ id: 'collision' })
      .mockResolvedValueOnce(null);
    mockPrisma.abonnementRetail.findFirst.mockResolvedValue(null);
    mockPrisma.paiement.create.mockImplementation(({ data }: any) => ({
      id: 'p-01',
      ...data,
    }));

    const result = await service.initierPaiement(
      { dossier_id: 'd-01' },
      'a-01'
    );

    expect(result.order_ngser).toMatch(/^FRG-\d{4}-\d{3}-[A-F0-9]{6}$/);
    expect(result.order_ngser.length).toBeLessThanOrEqual(25);
    expect(mockPrisma.paiement.findFirst).toHaveBeenCalledTimes(2);
  });

  it('stocke les champs NGSER requis', async () => {
    mockPrisma.dossier.findUnique.mockResolvedValue(dossierStandard);
    mockPrisma.paiement.findUnique.mockResolvedValue(null);
    mockPrisma.paiement.findFirst.mockResolvedValue(null);
    mockPrisma.abonnementRetail.findFirst.mockResolvedValue(null);
    mockPrisma.paiement.create.mockImplementation(({ data }: any) => ({
      id: 'p-01',
      ...data,
    }));

    await service.initierPaiement({ dossier_id: 'd-01' }, 'a-01');

    expect(mockPrisma.paiement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: 'NGSER',
        payment_token_ngser: expect.stringMatching(/^mock-token-/),
        order_ngser: expect.stringMatching(/^FRG-\d{4}-\d{3}-[A-F0-9]{6}$/),
        montant_initie: 100000,
        statut: 'PENDING',
      }),
    });
  });

  it('rejette un dossier inexistant ou deja paye', async () => {
    mockPrisma.dossier.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.initierPaiement({ dossier_id: 'missing' }, 'a-01')
    ).rejects.toThrow('DOSSIER_NOT_FOUND');

    mockPrisma.dossier.findUnique.mockResolvedValueOnce({ ...dossierStandard, statut: 'PAYE' });
    await expect(
      service.initierPaiement({ dossier_id: 'd-01' }, 'a-01')
    ).rejects.toThrow('PAIEMENT_DEJA_VALIDE');
  });

  it('mode réel: envoie le montant en XOF (centimes / 100) à NgserClient', async () => {
    process.env.NGSER_MOCK_MODE = 'false';
    mockCreateSession.mockResolvedValueOnce({
      payment_token: 'real-token-001',
      payment_url: 'https://securetest.crossroad-africa.net/pay?order=FRG-2026-001-AAAAAA',
    });

    mockPrisma.dossier.findUnique.mockResolvedValue({
      ...dossierStandard,
      formation: { ...dossierStandard.formation, cout_catalogue: 200000 }, // 200 000 centimes = 2 000 XOF
    });
    mockPrisma.paiement.findUnique.mockResolvedValue(null);
    mockPrisma.paiement.findFirst.mockResolvedValue(null);
    mockPrisma.abonnementRetail.findFirst.mockResolvedValue(null);
    mockPrisma.paiement.create.mockImplementation(({ data }: any) => ({ id: 'p-real', ...data }));

    await service.initierPaiement({ dossier_id: 'd-01' }, 'a-01');

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2000 }) // 200000 centimes / 100 = 2000 XOF
    );
    // Pas de fuite du montant en centimes bruts
    const callArgs = mockCreateSession.mock.calls[0][0];
    expect(callArgs.amount).not.toBe(200000);
  });

  it('conserve la reduction Premium -15% si un abonnement actif la rend applicable', async () => {
    mockPrisma.dossier.findUnique.mockResolvedValue({
      ...dossierStandard,
      formation: {
        ...dossierStandard.formation,
        type_formation: 'PREMIUM',
        cout_catalogue: 200000,
      },
    });
    mockPrisma.paiement.findUnique.mockResolvedValue(null);
    mockPrisma.paiement.findFirst.mockResolvedValue(null);
    mockPrisma.abonnementRetail.findFirst.mockResolvedValue({ id: 'abo-01', statut: 'ACTIF' });
    mockPrisma.paiement.create.mockImplementation(({ data }: any) => ({
      id: 'p-01',
      ...data,
    }));

    const result = await service.initierPaiement(
      { dossier_id: 'd-01', methode: 'MOBILE_MONEY', montant: 999999 } as any,
      'a-01'
    );

    expect(result.montant_initie).toBe(170000);
    expect(mockPrisma.paiement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        montant_catalogue: 200000,
        montant_final: 170000,
        montant_initie: 170000,
        reduction_appliquee: 30000,
      }),
    });
  });
});
