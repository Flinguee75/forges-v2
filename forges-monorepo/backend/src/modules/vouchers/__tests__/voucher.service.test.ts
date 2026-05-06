import { PrismaClient } from '@prisma/client';
import { VoucherRepository } from '../voucher.repository';
import { VoucherService } from '../voucher.service';
import { AuditLogger } from '../../../shared/audit/audit.logger';

describe('VoucherService', () => {
  let service: VoucherService;
  let mockRepo: jest.Mocked<VoucherRepository>;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    } as any;

    mockAudit = {
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    } as any;

    mockPrisma = {
      organisation: {
        findUnique: jest.fn(),
      },
      formation: {
        findUnique: jest.fn(),
      },
      voucherApporteur: {
        findUnique: jest.fn(),
      },
      voucherOrganisation: {
        findUnique: jest.fn(),
      },
      apporteur: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      dossier: {
        findUnique: jest.fn(),
      },
      paiement: {
        findFirst: jest.fn(),
      },
    } as any;

    service = new VoucherService(mockRepo, mockAudit, mockPrisma);
  });

  it('valide un voucher promotionnel brouillon', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 'voucher-01',
      type: 'PROMOTIONNEL',
      statut: 'BROUILLON',
    } as any);
    mockRepo.update.mockResolvedValue({
      id: 'voucher-01',
      type: 'PROMOTIONNEL',
      statut: 'ACTIF',
    } as any);

    await expect(service.validateVoucherPromotionnel('voucher-01', 'superviseur-01')).resolves.toEqual(expect.objectContaining({
      id: 'voucher-01',
      statut: 'ACTIF',
    }));

    expect(mockRepo.update).toHaveBeenCalledWith('voucher-01', expect.objectContaining({
      statut: 'ACTIF',
      valide_par: 'superviseur-01',
    }));
    expect(mockAudit.info).toHaveBeenCalledWith('VOUCHER_PROMOTIONNEL_VALIDE', {
      voucher_id: 'voucher-01',
      superviseur_id: 'superviseur-01',
    });
  });

  it('refuse un voucher promotionnel brouillon', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 'voucher-02',
      type: 'PROMOTIONNEL',
      statut: 'BROUILLON',
    } as any);
    mockRepo.update.mockResolvedValue({
      id: 'voucher-02',
      type: 'PROMOTIONNEL',
      statut: 'REFUSE',
    } as any);

    await expect(service.rejectVoucherPromotionnel('voucher-02', 'superviseur-01', 'Motif')).resolves.toEqual(expect.objectContaining({
      id: 'voucher-02',
      statut: 'REFUSE',
    }));

    expect(mockRepo.update).toHaveBeenCalledWith('voucher-02', expect.objectContaining({
      statut: 'REFUSE',
      valide_par: 'superviseur-01',
      motif_refus: 'Motif',
    }));
    expect(mockAudit.info).toHaveBeenCalledWith('VOUCHER_PROMOTIONNEL_REFUSE', {
      voucher_id: 'voucher-02',
      superviseur_id: 'superviseur-01',
      motif: 'Motif',
    });
  });

  it('calcule une réduction promotionnelle pour un voucher montant', async () => {
    (mockPrisma.voucherOrganisation.findUnique as jest.Mock).mockResolvedValue({
      id: 'voucher-03',
      formation_id: 'formation-01',
      statut: 'ACTIF',
      quota_utilise: 0,
      quota_max: 5,
      date_expiration: new Date(Date.now() + 86_400_000),
      type: 'PROMOTIONNEL',
      type_valeur: 'MONTANT',
      valeur: 15000,
      formation: { cout_catalogue: 100000 },
    } as any);

    await expect(service.validateVoucher('CODE-1', 'formation-01', 'app-01')).resolves.toEqual(expect.objectContaining({
      voucher_id: 'voucher-03',
      montant_reduit: 85000,
      quota_restant: 5,
    }));
  });

  it('rejette le cumul voucher et code apporteur', async () => {
    (mockPrisma.apporteur.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.apporteur.findFirst as jest.Mock).mockResolvedValue({ id: 'apporteur-01', statut: 'ACTIF' } as any);
    (mockPrisma.paiement.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.dossier.findUnique as jest.Mock).mockResolvedValue({
      voucher_code: 'voucher-01',
      paiement: { code_apporteur_id: null },
    } as any);
    (mockPrisma.voucherApporteur.findUnique as jest.Mock).mockResolvedValue({
      id: 'voucher-01',
      apporteur: { id: 'apporteur-01', statut: 'ACTIF' },
    } as any);

    await expect(
      service.checkApporteurCode('CODE-1', { dossier_id: 'dossier-01' })
    ).rejects.toThrow('VOUCHER_CUMUL_INTERDIT');
  });
});
