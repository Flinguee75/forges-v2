import { ApporteurRepository } from '../apporteur.repository';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('ApporteurRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: ApporteurRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new ApporteurRepository(prisma);
  });

  it('cherche un apporteur par id, code et email', async () => {
    prisma.apporteur.findUnique.mockResolvedValue({ id: 'apt-01' });
    prisma.apporteur.findFirst.mockResolvedValue({ id: 'apt-02' });

    await expect(repository.findById('apt-01')).resolves.toEqual({ id: 'apt-01' });
    await expect(repository.findByCode('code-01')).resolves.toEqual({ id: 'apt-02' });
    await expect(repository.findByEmail('apt@test.ci')).resolves.toEqual({ id: 'apt-01' });
  });

  it('filtre les commissions par mois et statut', async () => {
    prisma.commissionApporteur.findMany.mockResolvedValue([{ id: 'commission-01' }] as any);

    await expect(repository.findCommissions('apt-01', { statut: 'VALIDEE', mois: new Date('2026-01-15') })).resolves.toEqual([
      { id: 'commission-01' },
    ]);
    expect(prisma.commissionApporteur.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        apporteur_id: 'apt-01',
        statut: 'VALIDEE',
        created_at: expect.any(Object),
      }),
    }));
  });

  it('agrège, calcule le cumul et marque les reversements', async () => {
    prisma.commissionApporteur.aggregate
      .mockResolvedValueOnce({ _sum: { montant_commission: 9000 }, _count: 3 } as any)
      .mockResolvedValueOnce({ _sum: { montant_commission: 14000 } } as any);
    prisma.commissionApporteur.updateMany.mockResolvedValue({ count: 2 } as any);

    await expect(repository.aggregerCommissionsMois('apt-01', new Date('2026-01-15'))).resolves.toEqual({
      montant_total: 9000,
      nb_transactions: 3,
    });
    await expect(repository.getCumulDu('apt-01')).resolves.toBe(14000);
    await repository.marquerReverseesCommePayees('apt-01', 'agent-01');

    expect(prisma.commissionApporteur.updateMany).toHaveBeenCalledWith({
      where: { apporteur_id: 'apt-01', statut: 'VALIDEE' },
      data: { statut: 'REVERSEE', reverse_par: 'agent-01', reverse_le: expect.any(Date) },
    });
  });

  it('retourne les éligibles, les tops, met à jour le statut et régénère le code', async () => {
    prisma.commissionApporteur.groupBy
      .mockResolvedValueOnce([{ apporteur_id: 'apt-01' }] as any)
      .mockResolvedValueOnce([{ apporteur_id: 'apt-02' }] as any);
    prisma.apporteur.update.mockResolvedValue({ id: 'apt-01' } as any);

    await expect(repository.findEligiblesReversement()).resolves.toEqual([{ apporteur_id: 'apt-01' }]);
    await expect(repository.getTopApporteursMois(new Date('2026-01-15'), 5)).resolves.toEqual([{ apporteur_id: 'apt-02' }]);
    await repository.updateStatut('apt-01', 'SUSPENDU');
    await expect(repository.regenererCode('apt-01', 'admin-01')).resolves.toBe('00000000-0000-4000-8000-000000000000');
  });
});
