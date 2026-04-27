import { SessionRepository } from '../session.repository';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('SessionRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: SessionRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new SessionRepository(prisma);
  });

  it('cherche des sessions par id, formation et disponibilité', async () => {
    prisma.session.findUnique.mockResolvedValue({ id: 'session-01' });
    prisma.session.findMany
      .mockResolvedValueOnce([{ id: 'session-02' }] as any)
      .mockResolvedValueOnce([{ id: 'session-03' }] as any);

    await expect(repository.findById('session-01')).resolves.toEqual({ id: 'session-01' });
    await expect(repository.findByFormation('formation-01')).resolves.toEqual([{ id: 'session-02' }]);
    await expect(repository.findDisponibles('formation-01')).resolves.toEqual([{ id: 'session-03' }]);
  });

  it('crée une session avec capacité initiale et statut PLANIFIEE', async () => {
    prisma.session.create.mockResolvedValue({ id: 'session-01' } as any);

    await repository.create({
      formation_id: 'formation-01',
      date_ouverture: new Date('2026-01-01'),
      date_cloture: new Date('2026-01-02'),
      date_debut: new Date('2026-01-03'),
      date_fin: new Date('2026-01-04'),
      capacite: 30,
    });

    expect(prisma.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        formation_id: 'formation-01',
        places_restantes: 30,
        statut: 'PLANIFIEE',
      }),
    });
  });

  it('met à jour une session, son statut et ses places', async () => {
    prisma.session.update.mockResolvedValue({ id: 'session-01' } as any);

    await repository.update('session-01', { capacite: 40 });
    await repository.updateStatut('session-01', 'EN_COURS');
    await repository.decrementerPlaces('session-01');

    expect(prisma.session.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'session-01' },
      data: { capacite: 40 },
    });
    expect(prisma.session.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'session-01' },
      data: { statut: 'EN_COURS' },
    });
    expect(prisma.session.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'session-01' },
      data: { places_restantes: { decrement: 1 } },
    });
  });

  it('détecte la présence d inscrits et les chevauchements', async () => {
    prisma.dossier.count.mockResolvedValue(2);
    prisma.session.findMany.mockResolvedValue([{ id: 'session-overlap' }] as any);

    await expect(repository.hasInscrits('session-01')).resolves.toBe(true);
    await expect(
      repository.findChevauchements('formation-01', new Date('2026-01-01'), new Date('2026-01-10'), 'session-01')
    ).resolves.toEqual([{ id: 'session-overlap' }]);

    expect(prisma.session.findMany).toHaveBeenCalledWith({
      where: {
        formation_id: 'formation-01',
        id: { not: 'session-01' },
        statut: { not: 'ARCHIVEE' },
        OR: [{ date_debut: { lte: new Date('2026-01-10') }, date_fin: { gte: new Date('2026-01-01') } }],
      },
    });
  });

  it('retourne les sessions à transitionner et à archiver', async () => {
    prisma.session.findMany
      .mockResolvedValueOnce([{ id: 'transition-01' }] as any)
      .mockResolvedValueOnce([{ id: 'archive-01' }] as any);

    await expect(repository.findSessionsATransitionner()).resolves.toEqual([{ id: 'transition-01' }]);
    await expect(repository.findSessionsAArchiver()).resolves.toEqual([{ id: 'archive-01' }]);
  });
});
