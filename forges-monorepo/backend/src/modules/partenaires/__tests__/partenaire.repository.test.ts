import { PartenaireRepository } from '../partenaire.repository';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('PartenaireRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: PartenaireRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new PartenaireRepository(prisma);
  });

  it('cherche un partenaire par id, email et token', async () => {
    prisma.partenaire.findUnique.mockResolvedValue({ id: 'part-01' });
    prisma.partenaire.findFirst.mockResolvedValue({ id: 'part-02' });

    await expect(repository.findById('part-01')).resolves.toEqual({ id: 'part-01' });
    await expect(repository.findByEmail('part@test.ci')).resolves.toEqual({ id: 'part-01' });
    await expect(repository.findByToken('token-01')).resolves.toEqual({ id: 'part-02' });
  });

  it('crée et met à jour un partenaire', async () => {
    prisma.partenaire.create.mockResolvedValue({ id: 'part-01' } as any);
    prisma.partenaire.update.mockResolvedValue({ id: 'part-01' } as any);

    await repository.create({
      raison_sociale: 'Partenaire',
      type: 'ENTREPRISE',
      pays: 'CI',
      email_principal: 'part@test.ci',
      commission_forges_pct: 20,
      mode_inscription: 'AUTO_INSCRIPTION',
      statut: 'EN_ATTENTE_VERIFICATION',
    });
    await repository.activer('part-01', 'resp-01');
    await repository.suspendre('part-01', 'motif');
    await repository.updateCommission('part-01', 15);

    expect(prisma.partenaire.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'part-01' },
      data: {
        statut: 'ACTIF',
        token_invitation: null,
        token_invitation_expiration: null,
        responsable_designe_id: 'resp-01',
      },
    });
    expect(prisma.partenaire.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'part-01' },
      data: { statut: 'SUSPENDU' },
    });
    expect(prisma.partenaire.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'part-01' },
      data: { commission_forges_pct: 15 },
    });
  });

  it('retourne les formations et reversements nets', async () => {
    prisma.formation.findMany.mockResolvedValue([{ id: 'formation-01' }] as any);
    prisma.commissionPartenaire.findMany.mockResolvedValue([{ montant_reverse: 80000 }] as any);

    await expect(repository.findFormationsPartenaire('part-01')).resolves.toEqual([{ id: 'formation-01' }]);
    await expect(repository.findReversementsNets('part-01')).resolves.toEqual([{ montant_reverse: 80000 }]);
  });
});
