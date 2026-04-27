import { EspaceApprenantRepository } from '../espace-apprenant.repository';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('EspaceApprenantRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: EspaceApprenantRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new EspaceApprenantRepository(prisma);
  });

  it('retourne les dossiers apprenant avec leurs relations et un dossier par id', async () => {
    prisma.dossier.findMany.mockResolvedValueOnce([{ id: 'dossier-01' }]);
    prisma.dossier.findFirst.mockResolvedValueOnce({ id: 'dossier-02' });

    await expect(repository.findDossiersByApprenant('app-01')).resolves.toEqual([{ id: 'dossier-01' }]);
    await expect(repository.findDossierById('dossier-02', 'app-01')).resolves.toEqual({ id: 'dossier-02' });

    expect(prisma.dossier.findMany).toHaveBeenNthCalledWith(1, {
      where: { apprenant_id: 'app-01' },
      include: {
        formation: { select: { id: true, intitule: true, type_formation: true, mode_formation: true, cout_catalogue: true } },
        session: { select: { id: true, date_debut: true, date_fin: true, statut: true } },
        paiement: { select: { statut: true, montant_final: true, confirmed_at: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    expect(prisma.dossier.findFirst).toHaveBeenCalledWith({
      where: { id: 'dossier-02', apprenant_id: 'app-01' },
      include: {
        formation: { select: { id: true, intitule: true, type_formation: true, mode_formation: true, cout_catalogue: true } },
        session: true,
        paiement: true,
      },
    });
  });

  it('annule un dossier et cherche les attestations disponibles', async () => {
    prisma.dossier.update.mockResolvedValue({ id: 'dossier-01', statut: 'ANNULE' });
    prisma.dossier.findMany.mockResolvedValueOnce([{ id: 'dossier-01' }]);
    prisma.accesFormationDemande.update.mockResolvedValueOnce({ id: 'acces-01', progression: 75 });

    await repository.annulerDossier('dossier-01');
    await repository.findDossiersAvecAttestationDisponible('app-01');
    await repository.updateProgression('acces-01', 75);

    expect(prisma.dossier.update).toHaveBeenCalledWith({
      where: { id: 'dossier-01' },
      data: { statut: 'ANNULE' },
    });
    expect(prisma.dossier.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        apprenant_id: 'app-01',
        statut: 'PAYE',
        session: { statut: 'CLOTUREE' },
      },
      include: {
        formation: { select: { intitule: true, duree_jours: true } },
        session: { select: { date_debut: true, date_fin: true } },
        apprenant: { select: { nom: true, prenoms: true } },
      },
    });
    expect(prisma.accesFormationDemande.update).toHaveBeenCalledWith({
      where: { id: 'acces-01' },
      data: {
        progression: 75,
        last_access_at: expect.any(Date),
      },
    });
  });

  it('interroge Prisma pour les accès à la demande (UCS14, RM-92, RM-103, RM-105)', async () => {
    prisma.accesFormationDemande.findMany.mockResolvedValueOnce([]);
    prisma.accesFormationDemande.findFirst.mockResolvedValueOnce(null);
    prisma.accesFormationDemande.create.mockResolvedValueOnce({ id: 'acces-01' });
    prisma.accesFormationDemande.updateMany.mockResolvedValue({ count: 0 });

    await expect(repository.findAccesFormationsDemande('app-01')).resolves.toEqual([]);
    await expect(repository.findAccesFormationById('formation-01', 'app-01')).resolves.toBeNull();
    await expect(repository.creerAccesFormationDemande({
      apprenant_id: 'app-01',
      formation_id: 'formation-01',
      source_financement: 'ABONNEMENT',
      date_expiration: new Date('2026-01-01T00:00:00.000Z'),
    })).resolves.toEqual({ id: 'acces-01' });
    await expect(repository.suspendreAccesByAbonnement('app-01')).resolves.toEqual({ count: 0 });
    await expect(repository.reactiverAccesByAbonnement('app-01')).resolves.toEqual({ count: 0 });
  });
});
