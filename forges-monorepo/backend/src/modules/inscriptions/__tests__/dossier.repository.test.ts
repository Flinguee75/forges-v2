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

  it('trie les dossiers prioritaires (GRIS/EXCEPTION) avant les autres et par date croissante', async () => {
    const prisma = createPrismaMock();
    prisma.dossier.findMany.mockResolvedValue([
      { id: 'd1', statut: 'EN_ATTENTE_VERIFICATION', created_at: '2026-01-01T00:00:00.000Z' },
      { id: 'd2', statut: 'GRIS', created_at: '2026-01-03T00:00:00.000Z' },
      { id: 'd3', statut: 'EXCEPTION', created_at: '2026-01-02T00:00:00.000Z' },
    ] as any);
    const repository = new DossierRepository(prisma);

    const result = await repository.findBySession('session-01');
    expect(['GRIS', 'EXCEPTION']).toContain(result[0].statut);
    expect(['GRIS', 'EXCEPTION']).toContain(result[1].statut);
    expect(result[2].statut).toBe('EN_ATTENTE_VERIFICATION');
    expect(result[0].id).toBe('d3');
    expect(result[1].id).toBe('d2');
  });

  it('trouve un dossier par id', async () => {
    const prisma = createPrismaMock();
    prisma.dossier.findUnique.mockResolvedValue({ id: 'dossier-01' });
    const repository = new DossierRepository(prisma);

    await expect(repository.findById('dossier-01')).resolves.toEqual({ id: 'dossier-01' });
    expect(prisma.dossier.findUnique).toHaveBeenCalledWith({ where: { id: 'dossier-01' } });
  });

  it('met a jour le statut d un dossier', async () => {
    const prisma = createPrismaMock();
    prisma.dossier.update.mockResolvedValue({ id: 'dossier-01', statut: 'RETENU' });
    const repository = new DossierRepository(prisma);

    await expect(repository.updateStatut('dossier-01', 'RETENU')).resolves.toEqual({ id: 'dossier-01', statut: 'RETENU' });
    expect(prisma.dossier.update).toHaveBeenCalledWith({ where: { id: 'dossier-01' }, data: { statut: 'RETENU' } });
  });

  it('fixe le delai de paiement d un dossier', async () => {
    const prisma = createPrismaMock();
    const expiry = new Date('2026-06-01T00:00:00.000Z');
    prisma.dossier.update.mockResolvedValue({ id: 'dossier-01', expires_at: expiry });
    const repository = new DossierRepository(prisma);

    await expect(repository.setDelaiPaiement('dossier-01', expiry)).resolves.toEqual({ id: 'dossier-01', expires_at: expiry });
    expect(prisma.dossier.update).toHaveBeenCalledWith({ where: { id: 'dossier-01' }, data: { expires_at: expiry } });
  });

  it('retourne les dossiers prioritaires d un responsable', async () => {
    const prisma = createPrismaMock();
    const mockDossiers = [
      { id: 'dossier-gris', statut: 'GRIS', created_at: '2026-01-01T00:00:00.000Z' },
    ];
    prisma.dossier.findMany.mockResolvedValue(mockDossiers as any);
    const repository = new DossierRepository(prisma);

    const result = await repository.findPrioritairesByResponsable('resp-01');
    expect(result).toEqual(mockDossiers);
    expect(prisma.dossier.findMany).toHaveBeenCalledWith({
      where: {
        formation: { responsable_id: 'resp-01' },
        statut: { in: ['GRIS', 'EXCEPTION'] },
      },
      include: expect.any(Object),
      orderBy: { created_at: 'asc' },
    });
  });
});
