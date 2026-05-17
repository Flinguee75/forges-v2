import { DossierRepository } from '../dossier.repository';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('DossierRepository', () => {
  it('cherche un dossier actif par apprenant et session', async () => {
    const prisma = createPrismaMock();
    prisma.dossier.findFirst.mockResolvedValue({ id: 'dossier-01' });
    const repository = new DossierRepository(prisma);

    await expect(repository.findActiveByApprenantAndSession('app-01', 'session-01')).resolves.toEqual({ id: 'dossier-01' });
    expect(prisma.dossier.findFirst).toHaveBeenCalledWith({
      where: {
        apprenant_id: 'app-01',
        session_id: 'session-01',
        statut: { notIn: ['REJETE', 'ANNULE'] },
      },
    });
  });

  it('crée un dossier via Prisma', async () => {
    const prisma = createPrismaMock();
    prisma.dossier.create.mockResolvedValue({ id: 'dossier-01' });
    const repository = new DossierRepository(prisma);
    const data = { apprenant_id: 'app-01', session_id: 'session-01' };

    await expect(repository.create(data)).resolves.toEqual({ id: 'dossier-01' });
    expect(prisma.dossier.create).toHaveBeenCalledWith({ data });
  });

  it('retourne les dossiers d une session', async () => {
    const prisma = createPrismaMock();
    prisma.dossier.findMany.mockResolvedValue([
      { id: 'dossier-02', statut: 'GRIS', created_at: '2026-01-02T00:00:00.000Z' },
      { id: 'dossier-01', statut: 'EN_ATTENTE_VERIFICATION', created_at: '2026-01-01T00:00:00.000Z' },
    ] as any);
    const repository = new DossierRepository(prisma);

    const result = await repository.findBySession('session-01');

    expect(prisma.dossier.findMany).toHaveBeenCalledWith({
      where: { session_id: 'session-01', statut: { notIn: ['ANNULE', 'REJETE', 'REFUSE'] } },
      include: {
        apprenant: {
          select: {
            id: true,
            nom: true,
            prenoms: true,
            email: true,
          },
        },
        formation: {
          select: {
            id: true,
            intitule: true,
            type_formation: true,
            cout_catalogue: true,
          },
        },
        session: {
          select: {
            id: true,
            date_debut: true,
            date_fin: true,
            statut: true,
          },
        },
      },
    });
    expect(result[0].id).toBe('dossier-02');
    expect(result[1].id).toBe('dossier-01');
  });
});
