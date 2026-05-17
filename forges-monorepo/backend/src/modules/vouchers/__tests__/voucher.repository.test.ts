import { VoucherRepository } from '../voucher.repository';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('VoucherRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: VoucherRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new VoucherRepository(prisma);
  });

  it('cherche un voucher par code', async () => {
    prisma.voucherApporteur.findUnique.mockResolvedValue({ id: 'voucher-01' });

    await expect(repository.findByCode('code-01')).resolves.toEqual({ id: 'voucher-01' });
    expect(prisma.voucherApporteur.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { code: 'code-01' },
      include: expect.objectContaining({
        formation: expect.any(Object),
        apporteur: expect.any(Object),
      }),
    }));
  });

  it('cherche un voucher par id', async () => {
    prisma.voucherApporteur.findUnique.mockResolvedValue({ id: 'voucher-01' });

    await expect(repository.findById('voucher-01')).resolves.toEqual({ id: 'voucher-01' });
    expect(prisma.voucherApporteur.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'voucher-01' },
      include: expect.objectContaining({
        formation: expect.any(Object),
        apporteur: expect.any(Object),
      }),
    }));
  });

  it('enrichit un voucher organisation avec son organisation liée', async () => {
    prisma.voucherOrganisation.findUnique.mockResolvedValue({
      id: 'voucher-org-01',
      organisation_id: 'org-01',
    } as any);
    prisma.organisation.findUnique.mockResolvedValue({
      id: 'org-01',
      raison_sociale: 'Organisation Test',
      statut: 'ACTIF',
    } as any);

    await expect(repository.findById('voucher-org-01')).resolves.toEqual({
      id: 'voucher-org-01',
      organisation_id: 'org-01',
      organisation: {
        id: 'org-01',
        raison_sociale: 'Organisation Test',
        statut: 'ACTIF',
      },
    });

    expect(prisma.organisation.findUnique).toHaveBeenCalledWith({
      where: { id: 'org-01' },
      select: { id: true, raison_sociale: true, statut: true },
    });
  });

  it('marque un voucher comme épuisé quand le quota est atteint', async () => {
    prisma.voucherApporteur.update
      .mockResolvedValueOnce({ id: 'voucher-01', quota_max: 2, quota_utilise: 2 } as any)
      .mockResolvedValueOnce({ id: 'voucher-01', statut: 'EPUISE' } as any);

    await expect(repository.utiliser('voucher-01')).resolves.toEqual({ id: 'voucher-01', quota_max: 2, quota_utilise: 2 });
    expect(prisma.voucherApporteur.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'voucher-01' },
      data: { quota_utilise: { increment: 1 } },
    });
    expect(prisma.voucherApporteur.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'voucher-01' },
      data: { statut: 'EPUISE' },
    });
  });

  it('n épuisе pas le voucher si le quota reste disponible', async () => {
    prisma.voucherApporteur.update.mockResolvedValue({ id: 'voucher-01', quota_max: 3, quota_utilise: 1 } as any);

    await repository.utiliser('voucher-01');

    expect(prisma.voucherApporteur.update).toHaveBeenCalledTimes(1);
  });

  it('ignore la réactivation si le voucher est introuvable', async () => {
    prisma.voucherApporteur.findUnique.mockResolvedValue(null);

    await expect(repository.reactiverApresRejet('voucher-01')).resolves.toBeUndefined();
    expect(prisma.voucherApporteur.update).not.toHaveBeenCalled();
  });

  it('réactive un voucher épuisé après rejet', async () => {
    prisma.voucherApporteur.findUnique.mockResolvedValue({ id: 'voucher-01', statut: 'EPUISE' } as any);
    prisma.voucherApporteur.update.mockResolvedValue({ id: 'voucher-01' } as any);

    await repository.reactiverApresRejet('voucher-01');

    expect(prisma.voucherApporteur.update).toHaveBeenCalledWith({
      where: { id: 'voucher-01' },
      data: {
        quota_utilise: { decrement: 1 },
        statut: 'ACTIF',
      },
    });
  });
});
