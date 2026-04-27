import { VoucherValidationService } from '../voucher-validation.service';
import { VoucherRepository } from '../voucher.repository';

describe('VoucherValidationService', () => {
  let service: VoucherValidationService;
  let mockRepo: jest.Mocked<VoucherRepository>;

  beforeEach(() => {
    mockRepo = {
      findByCode: jest.fn(),
      prisma: {
        apporteur: {
          findFirst: jest.fn(),
        },
      },
    } as any;

    service = new VoucherValidationService(mockRepo);
  });

  it('rejette un voucher introuvable', async () => {
    mockRepo.findByCode.mockResolvedValue(null);

    await expect(service.validerVoucher('code', 'formation-01', 'app-01')).rejects.toThrow('VOUCHER_INVALIDE');
  });

  it('rejette si la formation ne correspond pas', async () => {
    mockRepo.findByCode.mockResolvedValue({
      formation_id: 'formation-02',
      statut: 'ACTIF',
      date_expiration: null,
      quota_max: 1,
      quota_utilise: 0,
    } as any);

    await expect(service.validerVoucher('code', 'formation-01', 'app-01')).rejects.toThrow('VOUCHER_FORMATION_INCORRECTE');
  });

  it('rejette un voucher expiré ou épuisé', async () => {
    mockRepo.findByCode.mockResolvedValue({
      formation_id: 'formation-01',
      statut: 'ACTIF',
      date_expiration: new Date(Date.now() - 1_000),
      quota_max: 1,
      quota_utilise: 0,
    } as any);

    await expect(service.validerVoucher('code', 'formation-01', 'app-01')).rejects.toThrow('VOUCHER_EXPIRE');

    mockRepo.findByCode.mockResolvedValue({
      formation_id: 'formation-01',
      statut: 'ACTIF',
      date_expiration: new Date(Date.now() + 1_000),
      quota_max: 1,
      quota_utilise: 1,
    } as any);

    await expect(service.validerVoucher('code', 'formation-01', 'app-01')).rejects.toThrow('VOUCHER_QUOTA_EPUISE');
  });

  it('rejette les statuts non actifs explicites', async () => {
    mockRepo.findByCode.mockResolvedValue({
      formation_id: 'formation-01',
      statut: 'EPUISE',
      date_expiration: null,
      quota_max: 1,
      quota_utilise: 1,
    } as any);

    await expect(service.validerVoucher('code', 'formation-01', 'app-01')).rejects.toThrow('VOUCHER_QUOTA_EPUISE');

    mockRepo.findByCode.mockResolvedValue({
      formation_id: 'formation-01',
      statut: 'EXPIRE',
      date_expiration: null,
      quota_max: 1,
      quota_utilise: 0,
    } as any);

    await expect(service.validerVoucher('code', 'formation-01', 'app-01')).rejects.toThrow('VOUCHER_EXPIRE');
  });

  it('retourne le voucher valide', async () => {
    const voucher = {
      formation_id: 'formation-01',
      statut: 'ACTIF',
      date_expiration: new Date(Date.now() + 1_000),
      quota_max: 2,
      quota_utilise: 1,
    };
    mockRepo.findByCode.mockResolvedValue(voucher as any);

    await expect(service.validerVoucher('code', 'formation-01', 'app-01')).resolves.toEqual(voucher);
  });

  it('valide un code apporteur actif', async () => {
    (mockRepo.prisma.apporteur.findFirst as jest.Mock).mockResolvedValue({ id: 'apt-01' });

    await expect(service.validateApporteur('code-01')).resolves.toEqual({ id: 'apt-01' });
    expect(mockRepo.prisma.apporteur.findFirst).toHaveBeenCalledWith({
      where: { code_apporteur: 'code-01', statut: 'ACTIF' },
    });
  });

  it('rejette un code apporteur invalide', async () => {
    (mockRepo.prisma.apporteur.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.validateApporteur('code-01')).rejects.toThrow('APPORTEUR_CODE_INVALID');
  });

  it('calcule la remise montant, pourcentage et fallback', () => {
    expect(service.calculerRemise({ valeur: 4000, type_valeur: 'MONTANT' }, 10000)).toBe(4000);
    expect(service.calculerRemise({ valeur: 15, type_valeur: 'POURCENTAGE' }, 10000)).toBe(1500);
    expect(service.calculerRemise({ valeur: 15, type_valeur: 'AUTRE' }, 10000)).toBe(0);
  });
});
