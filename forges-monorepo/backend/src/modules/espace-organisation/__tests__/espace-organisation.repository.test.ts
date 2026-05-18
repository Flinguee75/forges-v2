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

  it('retourne les vouchers organisation paginés, compte les actifs B2B et calcule les stats', async () => {
    prisma.voucherOrganisation.findMany.mockResolvedValue([
      {
        id: 'voucher-org-01',
        code: 'ORG-01',
        organisation_id: 'org-01',
        formation_id: 'formation-org-01',
        devis_id: 'devis-01',
        type: 'ORGANISATION',
        valeur: 100,
        type_valeur: 'POURCENTAGE',
        quota_max: 1,
        quota_utilise: 0,
        date_expiration: new Date('2026-12-31T00:00:00.000Z'),
        statut: 'ACTIF',
        created_at: new Date('2026-02-02T00:00:00.000Z'),
        formation: { id: 'formation-org-01', intitule: 'Session devis' },
      },
    ] as any);
    prisma.voucherOrganisation.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);
    prisma.apprenant.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(9);
    prisma.dossier.count.mockResolvedValue(12);
    prisma.paiement.aggregate.mockResolvedValue({ _sum: { montant_final: 50000 } } as any);

    await expect(repository.findVouchers('org-01', { statut: 'ACTIF', page: 1, limit: 10 })).resolves.toEqual({
      vouchers: [
        expect.objectContaining({
          id: 'voucher-org-01',
          source: 'DEVIS',
          formation: expect.objectContaining({ titre: 'Session devis' }),
        }),
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    await expect(repository.countActifsB2B('org-01')).resolves.toBe(4);
    await expect(repository.getStatsOrganisation('org-01')).resolves.toEqual({
      nb_beneficiaires: 9,
      nb_inscriptions: 12,
      nb_vouchers_actifs: 2,
      montant_paye_total: 50000,
    });

    expect(prisma.voucherOrganisation.findMany).toHaveBeenCalledWith({
      where: { organisation_id: 'org-01', statut: 'ACTIF' },
      include: {
        formation: { select: { id: true, intitule: true, type_formation: true } },
      },
      skip: 0,
      take: 10,
      orderBy: { created_at: 'desc' },
    });
    expect(prisma.voucherOrganisation.count).toHaveBeenNthCalledWith(1, {
      where: { organisation_id: 'org-01', statut: 'ACTIF' },
    });
    expect(prisma.voucherOrganisation.count).toHaveBeenNthCalledWith(2, {
      where: { organisation_id: 'org-01', statut: 'ACTIF' },
    });
    expect(prisma.apprenant.count).toHaveBeenNthCalledWith(1, {
      where: { organisation_id: 'org-01', statut: 'ACTIF' },
    });
    expect(prisma.apprenant.count).toHaveBeenNthCalledWith(2, {
      where: { organisation_id: 'org-01' },
    });
  });

  it('getStatsOrganisation exclut les inscriptions personnelles (non B2B et sans voucher org)', async () => {
    prisma.apprenant.count.mockResolvedValue(1);
    prisma.dossier.count.mockResolvedValue(2);
    prisma.voucherOrganisation.count.mockResolvedValue(0);
    prisma.paiement.aggregate.mockResolvedValue({ _sum: { montant_final: 0 } } as any);

    await repository.getStatsOrganisation('org-01');

    expect(prisma.dossier.count).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            apprenant: { organisation_id: 'org-01' },
            OR: [
              { source_financement: 'B2B' },
              { voucher_organisation_id: { not: null } },
            ],
          },
          { organisation_inscriptrice_id: 'org-01' },
        ],
      },
    });
    expect(prisma.paiement.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          dossier: {
            OR: [
              {
                apprenant: { organisation_id: 'org-01' },
                OR: [
                  { source_financement: 'B2B' },
                  { voucher_organisation_id: { not: null } },
                ],
              },
              { organisation_inscriptrice_id: 'org-01' },
            ],
          },
        },
      })
    );
  });

  it('inclut les dossiers initiés par l organisation dans les stats', async () => {
    prisma.apprenant.count.mockResolvedValue(1);
    prisma.dossier.count.mockResolvedValue(3);
    prisma.voucherOrganisation.count.mockResolvedValue(0);
    prisma.paiement.aggregate.mockResolvedValue({ _sum: { montant_final: 75000 } } as any);

    await expect(repository.getStatsOrganisation('org-01')).resolves.toEqual({
      nb_beneficiaires: 1,
      nb_inscriptions: 3,
      nb_vouchers_actifs: 0,
      montant_paye_total: 75000,
    });

    expect(prisma.dossier.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          { organisation_inscriptrice_id: 'org-01' },
        ]),
      }),
    });
  });

  it('retourne les inscriptions et paiements récents du contrat dashboard', async () => {
    prisma.dossier.findMany.mockResolvedValue([{ id: 'dossier-01' }] as any);
    prisma.paiement.findMany.mockResolvedValue([{ id: 'paiement-01' }] as any);

    await expect(repository.findRecentInscriptions('org-01', 3)).resolves.toEqual([{ id: 'dossier-01' }]);
    await expect(repository.findRecentPaiements('org-01', 4)).resolves.toEqual([{ id: 'paiement-01' }]);

    expect(prisma.dossier.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.arrayContaining([{ organisation_inscriptrice_id: 'org-01' }]),
      }),
      take: 3,
      orderBy: { created_at: 'desc' },
    }));
    expect(prisma.paiement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        dossier: expect.objectContaining({
          OR: expect.arrayContaining([{ organisation_inscriptrice_id: 'org-01' }]),
        }),
      },
      take: 4,
      orderBy: { confirmed_at: 'desc' },
    }));
  });
});
