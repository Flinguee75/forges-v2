import { FormationRepository } from '../formation.repository';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('FormationRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: FormationRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new FormationRepository(prisma);
  });

  it('cherche une formation par id avec ses relations', async () => {
    prisma.formation.findUnique.mockResolvedValue({ id: 'formation-01' });

    await expect(repository.findById('formation-01')).resolves.toEqual({ id: 'formation-01' });
    expect(prisma.formation.findUnique).toHaveBeenCalledWith({
      where: { id: 'formation-01' },
      include: {
        sessions: true,
        partenaire: true,
        _count: { select: { sessions: true } }
      },
    });
  });

  it('pagine la liste des formations', async () => {
    prisma.formation.findMany.mockResolvedValue([{ id: 'formation-01' }] as any);
    prisma.formation.count.mockResolvedValue(12);

    await expect(repository.findAll({ statut: 'ACTIVE', page: 2, limit: 5 })).resolves.toEqual({
      formations: [{ id: 'formation-01' }],
      total: 12,
      page: 2,
      limit: 5,
    });
    expect(prisma.formation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { statut: 'ACTIVE' },
      skip: 5,
      take: 5,
    }));
  });

  it('retourne le catalogue public actif paginé (RM-20)', async () => {
    prisma.formation.findMany.mockResolvedValue([{ id: 'formation-01' }] as any);
    prisma.formation.count.mockResolvedValue(1 as any);

    await expect(repository.findCataloguePublic({ langue: 'FR' })).resolves.toMatchObject({
      formations: [{ id: 'formation-01' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    expect(prisma.formation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ statut: 'ACTIVE' }),
    }));
  });

  it('crée une formation avec statut et inclus_abonnement calculés', async () => {
    prisma.formation.create.mockResolvedValue({ id: 'formation-01' } as any);

    await repository.create({
      intitule: 'Formation',
      description_courte: 'Courte',
      duree_jours: 2,
      cout_catalogue: 100000,
      responsable_id: 'resp-01',
      type_formation: 'STANDARD',
      mode_formation: 'A_LA_DEMANDE',
      pilier_abonnement: 'RETAIL',
      langues_disponibles: ['FR'],
    });

    expect(prisma.formation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        inclus_abonnement: true,
        statut: 'ACTIVE',
      }),
    });
  });

  it('met à jour, archive, assigne un type et vérifie des paiements validés', async () => {
    prisma.formation.update.mockResolvedValue({ id: 'formation-01' } as any);
    prisma.paiement.count.mockResolvedValue(1);

    await repository.update('formation-01', { intitule: 'Formation v2' });
    await repository.archiver('formation-01');
    await repository.assignerType('formation-01', 'PREMIUM', 'TOUS');
    await expect(repository.hasPaiementsValides('formation-01')).resolves.toBe(true);

    expect(prisma.formation.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'formation-01' },
      data: { intitule: 'Formation v2' },
    });
    expect(prisma.formation.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'formation-01' },
      data: { statut: 'ARCHIVEE' },
    });
    expect(prisma.formation.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'formation-01' },
      data: { type_formation: 'PREMIUM', pilier_abonnement: 'TOUS', inclus_abonnement: false },
    });
  });

  it('calcule inclus_abonnement uniquement pour STANDARD + RETAIL/TOUS', () => {
    expect(repository.calculerInclus('STANDARD', 'RETAIL')).toBe(true);
    expect(repository.calculerInclus('STANDARD', 'TOUS')).toBe(true);
    expect(repository.calculerInclus('PREMIUM', 'RETAIL')).toBe(false);
    expect(repository.calculerInclus('STANDARD', 'B2B')).toBe(false);
  });
});
