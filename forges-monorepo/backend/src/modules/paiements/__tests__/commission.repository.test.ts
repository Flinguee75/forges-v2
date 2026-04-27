import { CommissionRepository } from '../commission.repository';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('CommissionRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: CommissionRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new CommissionRepository(prisma);
  });

  it('crée les commissions partenaire et apporteur', async () => {
    prisma.commissionPartenaire.create.mockResolvedValue({ id: 'cp-01' });
    prisma.commissionApporteur.create.mockResolvedValue({ id: 'ca-01' });

    await repository.creerCommissionPartenaire({
      paiement_id: 'paiement-01',
      partenaire_id: 'part-01',
      formation_id: 'formation-01',
      montant_catalogue: 100000,
      commission_forges_pct: 20,
      montant_reverse: 80000,
      statut: 'EN_ATTENTE',
    });
    await repository.creerCommissionApporteur({
      paiement_id: 'paiement-01',
      apporteur_id: 'apt-01',
      dossier_id: 'dossier-01',
      montant_base: 100000,
      taux_commission_pct: 5,
      montant_commission: 5000,
      statut: 'EN_ATTENTE',
    });

    expect(prisma.commissionPartenaire.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ partenaire_id: 'part-01', montant_reverse: 80000 }),
    });
    expect(prisma.commissionApporteur.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ apporteur_id: 'apt-01', montant_commission: 5000 }),
    });
  });

  it('retourne les montants agrégés en attente', async () => {
    prisma.commissionPartenaire.aggregate.mockResolvedValue({ _sum: { montant_reverse: 80000 } } as any);
    prisma.commissionApporteur.aggregate.mockResolvedValue({ _sum: { montant_commission: 5000 } } as any);

    await expect(repository.getTotalReversementsPartenaireAReverser('part-01')).resolves.toBe(80000);
    await expect(repository.getTotalCommissionsApporteur('apt-01')).resolves.toBe(5000);
  });

  it('retourne les partenaires éligibles au reversement', async () => {
    prisma.commissionPartenaire.groupBy.mockResolvedValue([{ partenaire_id: 'part-01' }] as any);

    await expect(repository.getPartenairesEligiblesReversement()).resolves.toEqual([{ partenaire_id: 'part-01' }]);
    expect(prisma.commissionPartenaire.groupBy).toHaveBeenCalledWith({
      by: ['partenaire_id'],
      where: { statut: 'EN_ATTENTE' },
      _sum: { montant_reverse: true },
      having: { montant_reverse: { _sum: { gte: 50000 } } },
    });
  });

  it('marque un reversement partenaire comme effectué', async () => {
    prisma.commissionPartenaire.updateMany.mockResolvedValue({ count: 2 } as any);

    await repository.effectuerReversementPartenaire('part-01', 'agent-01');

    expect(prisma.commissionPartenaire.updateMany).toHaveBeenCalledWith({
      where: { partenaire_id: 'part-01', statut: 'EN_ATTENTE' },
      data: {
        statut: 'REVERSE',
        reverse_le: expect.any(Date),
        reverse_par: 'agent-01',
      },
    });
  });
});
