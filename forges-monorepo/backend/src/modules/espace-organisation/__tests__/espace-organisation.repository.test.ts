import { EspaceOrganisationRepository } from '../espace-organisation.repository';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('EspaceOrganisationRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: EspaceOrganisationRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new EspaceOrganisationRepository(prisma);
  });

  it('retourne une organisation avec ses abonnements', async () => {
    prisma.organisation.findUnique.mockResolvedValue({ id: 'org-01' });

    await expect(repository.findOrganisationById('org-01')).resolves.toEqual({ id: 'org-01' });

    expect(prisma.organisation.findUnique).toHaveBeenCalledWith({
      where: { id: 'org-01' },
      include: {
        abonnement_org: true,
        abonnement_b2b: true,
      },
    });
  });

  it('retourne les bénéficiaires filtrés avec pagination', async () => {
    prisma.apprenant.findMany.mockResolvedValue([{
      id: 'app-01',
      email: 'app-01@forges.ci',
      nom: 'Doe',
      prenoms: 'John',
      statut: 'ACTIF',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      dossiers: [{ id: 'dossier-01' }],
    }]);
    prisma.apprenant.count.mockResolvedValue(7);

    await expect(repository.findBeneficiaires('org-01', {
      statut: 'PAYE',
      formation_id: 'formation-01',
      page: 2,
      limit: 5,
    })).resolves.toEqual({
      membres: [{
        id: 'app-01',
        email: 'app-01@forges.ci',
        nom: 'Doe',
        prenom: 'John',
        statut: 'ACTIF',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        derniere_inscription: { id: 'dossier-01' },
      }],
      total: 7,
      page: 2,
      limit: 5,
      totalPages: 2,
    });

    expect(prisma.apprenant.findMany).toHaveBeenCalledWith({
      where: {
        organisation_id: 'org-01',
        statut: 'PAYE',
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenoms: true,
        statut: true,
        created_at: true,
        dossiers: {
          where: { formation_id: 'formation-01' },
          select: {
            id: true,
            statut: true,
            formation: { select: { id: true, intitule: true, type_formation: true } },
            session: { select: { date_debut: true, date_fin: true, statut: true } },
            paiement: { select: { statut: true, confirmed_at: true } },
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      skip: 5,
      take: 5,
      orderBy: { created_at: 'desc' },
    });
    expect(prisma.apprenant.count).toHaveBeenCalledWith({
      where: {
        organisation_id: 'org-01',
        statut: 'PAYE',
      },
    });
  });

  it('retourne les vouchers, compte les actifs B2B et calcule les stats', async () => {
    prisma.voucherApporteur.findMany.mockResolvedValue([{ id: 'voucher-01' }]);
    prisma.apprenant.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(9);
    prisma.dossier.count.mockResolvedValue(12);
    prisma.voucherApporteur.count.mockResolvedValue(3);
    prisma.paiement.aggregate.mockResolvedValue({ _sum: { montant_final: 50000 } } as any);

    await expect(repository.findVouchers('org-01')).resolves.toEqual([{ id: 'voucher-01' }]);
    await expect(repository.countActifsB2B('org-01')).resolves.toBe(4);
    await expect(repository.getStatsOrganisation('org-01')).resolves.toEqual({
      nb_beneficiaires: 9,
      nb_inscriptions: 12,
      nb_vouchers_actifs: 3,
      montant_paye_total: 50000,
    });

    expect(prisma.voucherApporteur.findMany).toHaveBeenCalledWith({
      where: { organisation_id: 'org-01' },
      include: {
        formation: { select: { intitule: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    expect(prisma.apprenant.count).toHaveBeenNthCalledWith(1, {
      where: { organisation_id: 'org-01', statut: 'ACTIF' },
    });
    expect(prisma.apprenant.count).toHaveBeenNthCalledWith(2, {
      where: { organisation_id: 'org-01' },
    });
  });
});
