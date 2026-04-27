import { FormationPartenaireRepository } from '../formation-partenaire.repository';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('FormationPartenaireRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: FormationPartenaireRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new FormationPartenaireRepository(prisma);
  });

  it('cherche les formations partenaires par id, formation et responsable', async () => {
    prisma.formationPartenaire.findUnique
      .mockResolvedValueOnce({ id: 'fp-01' } as any)
      .mockResolvedValueOnce({ id: 'fp-02', version: 2 } as any);
    prisma.formationPartenaire.findMany
      .mockResolvedValueOnce([{ id: 'fp-03' }] as any)
      .mockResolvedValueOnce([{ id: 'fp-04' }] as any);

    await expect(repository.findById('fp-01')).resolves.toEqual({ id: 'fp-01' });
    await expect(repository.findByFormation('formation-01')).resolves.toEqual({ id: 'fp-02', version: 2 });
    await expect(repository.findEnAttente('resp-01')).resolves.toEqual([{ id: 'fp-03' }]);
    await expect(repository.findEnRetard()).resolves.toEqual([{ id: 'fp-04' }]);
  });

  it('crée, valide et rejette une formation partenaire', async () => {
    prisma.formationPartenaire.create.mockResolvedValue({ id: 'fp-01' } as any);
    prisma.formationPartenaire.update.mockResolvedValue({ id: 'fp-01' } as any);

    await repository.create({
      formation_id: 'formation-01',
      partenaire_id: 'part-01',
      prix_coutant_soumis: 50000,
    });
    await repository.valider('fp-01', {
      responsable_id: 'resp-01',
      prix_coutant_valide: 50000,
      type_formation: 'STANDARD',
      pilier_abonnement: 'TOUS',
    });
    await repository.rejeter('fp-01', 'Motif de rejet', 'Corrections', 'resp-01');

    expect(prisma.formationPartenaire.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'fp-01' },
      data: expect.objectContaining({
        statut_validation: 'VALIDE',
        responsable_validateur_id: 'resp-01',
      }),
    });
    expect(prisma.formationPartenaire.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'fp-01' },
      data: expect.objectContaining({
        statut_validation: 'REJETE',
        commentaire_responsable: 'Motif de rejet',
      }),
    });
  });

  it('incrémente la version si la formation partenaire existe', async () => {
    prisma.formationPartenaire.findUnique.mockResolvedValueOnce({ version: 3 } as any).mockResolvedValueOnce(null);
    prisma.formationPartenaire.update.mockResolvedValue({ version: 4 } as any);

    await expect(repository.incrementerVersion('formation-01')).resolves.toEqual({ version: 4 });
    await expect(repository.incrementerVersion('formation-02')).resolves.toBeUndefined();
  });
});
