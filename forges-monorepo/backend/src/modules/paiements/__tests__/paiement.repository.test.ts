import { PaiementRepository } from '../paiement.repository';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('PaiementRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: PaiementRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new PaiementRepository(prisma);
  });

  it('cherche un paiement par id avec ses relations', async () => {
    prisma.paiement.findUnique.mockResolvedValue({ id: 'paiement-01' });

    await expect(repository.findById('paiement-01')).resolves.toEqual({ id: 'paiement-01' });
    expect(prisma.paiement.findUnique).toHaveBeenCalledWith({
      where: { id: 'paiement-01' },
      include: { dossier: { include: { formation: true, session: true } } },
    });
  });

  it('cherche un paiement par dossier et transaction', async () => {
    prisma.paiement.findUnique.mockResolvedValue({ id: 'paiement-01' });
    prisma.paiement.findFirst.mockResolvedValue({ id: 'paiement-02' });

    await expect(repository.findByDossierId('dossier-01')).resolves.toEqual({ id: 'paiement-01' });
    await expect(repository.findByTransactionId('tx-01')).resolves.toEqual({ id: 'paiement-02' });
    expect(prisma.paiement.findUnique).toHaveBeenCalledWith({ where: { dossier_id: 'dossier-01' } });
    expect(prisma.paiement.findFirst).toHaveBeenCalledWith({ where: { transaction_id: 'tx-01' } });
  });

  it('crée un paiement en attente avec tentatives à zéro', async () => {
    prisma.paiement.create.mockResolvedValue({ id: 'paiement-01' });

    await repository.create({
      dossier_id: 'dossier-01',
      montant_catalogue: 100000,
      montant_final: 90000,
      reduction_appliquee: 10000,
      methode: 'CARTE',
      expires_at: new Date('2026-01-01'),
    });

    expect(prisma.paiement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dossier_id: 'dossier-01',
        statut: 'EN_ATTENTE',
        tentatives: 0,
      }),
    });
  });

  it('incrémente les tentatives, confirme et échoue un paiement', async () => {
    prisma.paiement.update.mockResolvedValue({ id: 'paiement-01' });

    await repository.incrementerTentatives('paiement-01');
    await repository.confirmer('paiement-01', 'tx-01');
    await repository.echouer('paiement-01');

    expect(prisma.paiement.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'paiement-01' },
      data: { tentatives: { increment: 1 } },
    });
    expect(prisma.paiement.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'paiement-01' },
      data: {
        statut: 'CONFIRME',
        transaction_id: 'tx-01',
        confirmed_at: expect.any(Date),
      },
    });
    expect(prisma.paiement.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'paiement-01' },
      data: { statut: 'ECHOUE' },
    });
  });

  it('cherche les paiements expirés et calcule les agrégats', async () => {
    prisma.paiement.findMany.mockResolvedValue([{ id: 'paiement-01' }]);
    prisma.paiement.aggregate
      .mockResolvedValueOnce({ _sum: { montant_final: 90000 } } as any)
      .mockResolvedValueOnce({ _sum: { montant_final: null } } as any);
    prisma.paiement.count.mockResolvedValue(4);

    await expect(repository.findPaiementsExpires()).resolves.toEqual([{ id: 'paiement-01' }]);
    await expect(repository.sumMontant({ debut: new Date('2026-01-01'), fin: new Date('2026-01-31') })).resolves.toBe(90000);
    await expect(repository.countByStatut('CONFIRME')).resolves.toBe(4);

    expect(prisma.paiement.findMany).toHaveBeenCalledWith({
      where: {
        statut: 'EN_ATTENTE',
        expires_at: { lt: expect.any(Date) },
      },
      include: { dossier: true },
    });
    expect(prisma.paiement.count).toHaveBeenCalledWith({ where: { statut: 'CONFIRME' } });
  });
});
