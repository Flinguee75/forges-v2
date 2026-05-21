import { DashboardRepository } from '../dashboard.repository';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('DashboardRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: DashboardRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new DashboardRepository(prisma);
  });

  it('retourne les stats admin', async () => {
    prisma.apprenant.count.mockResolvedValueOnce(10);
    prisma.organisation.count.mockResolvedValueOnce(2);
    prisma.formation.count.mockResolvedValueOnce(4);
    prisma.session.count.mockResolvedValueOnce(3);
    prisma.dossier.count.mockResolvedValueOnce(20);
    prisma.paiement.aggregate.mockResolvedValueOnce({ _sum: { montant_final: 100000 } } as any);
    prisma.devis.aggregate.mockResolvedValueOnce({ _sum: { montant_total_xof: 50000 } } as any);
    prisma.abonnementRetail.count.mockResolvedValueOnce(5);
    prisma.abonnementB2B.count.mockResolvedValueOnce(1);
    prisma.dossier.groupBy.mockResolvedValueOnce([{ statut: 'PAYE', _count: 12 }] as any);

    await expect(repository.getStatsAdmin()).resolves.toEqual({
      nb_apprenants_actifs: 10,
      nb_organisations_actives: 2,
      nb_formations_actives: 4,
      nb_sessions_en_cours: 3,
      nb_dossiers_total: 20,
      ca_total_xof: 150000,
      nb_abonnements_retail_actifs: 5,
      nb_abonnements_b2b_actifs: 1,
      dossiers_par_statut: { PAYE: 12 },
    });

    expect(prisma.apprenant.count).toHaveBeenCalledWith({
      where: { statut: 'ACTIF', role: 'APPRENANT' },
    });
  });

  it('compte les organisations actives avec les statuts ACTIVE et ACTIF', async () => {
    prisma.apprenant.count.mockResolvedValueOnce(0);
    prisma.organisation.count.mockResolvedValueOnce(1);
    prisma.formation.count.mockResolvedValueOnce(0);
    prisma.session.count.mockResolvedValueOnce(0);
    prisma.dossier.count.mockResolvedValueOnce(0);
    prisma.paiement.aggregate.mockResolvedValueOnce({ _sum: { montant_final: 0 } } as any);
    prisma.devis.aggregate.mockResolvedValueOnce({ _sum: { montant_total_xof: 0 } } as any);
    prisma.abonnementRetail.count.mockResolvedValueOnce(0);
    prisma.abonnementB2B.count.mockResolvedValueOnce(0);
    prisma.dossier.groupBy.mockResolvedValueOnce([] as any);

    await repository.getStatsAdmin();

    expect(prisma.organisation.count).toHaveBeenCalledWith({
      where: { statut: { in: ['ACTIF', 'ACTIVE'] } },
    });
  });

  it('inclut les devis PAYE dans le CA total sans compter les paiements issus des vouchers devis', async () => {
    prisma.apprenant.count.mockResolvedValueOnce(0);
    prisma.organisation.count.mockResolvedValueOnce(0);
    prisma.formation.count.mockResolvedValueOnce(0);
    prisma.session.count.mockResolvedValueOnce(0);
    prisma.dossier.count.mockResolvedValueOnce(0);
    prisma.paiement.aggregate.mockResolvedValueOnce({ _sum: { montant_final: 120000 } } as any);
    prisma.devis.aggregate.mockResolvedValueOnce({ _sum: { montant_total_xof: 300000 } } as any);
    prisma.abonnementRetail.count.mockResolvedValueOnce(0);
    prisma.abonnementB2B.count.mockResolvedValueOnce(0);
    prisma.dossier.groupBy.mockResolvedValueOnce([] as any);

    await expect(repository.getStatsAdmin()).resolves.toMatchObject({
      ca_total_xof: 420000,
    });
    expect(prisma.paiement.aggregate).toHaveBeenCalledWith({
      where: {
        AND: [
          { statut: 'CONFIRME' },
          {
            NOT: {
              dossier: {
                voucher_organisation: {
                  is: {
                    devis_id: { not: null },
                  },
                },
              },
            },
          },
        ],
      },
      _sum: { montant_final: true },
    });
    expect(prisma.devis.aggregate).toHaveBeenCalledWith({
      where: { statut: 'PAYE' },
      _sum: { montant_total_xof: true },
    });
  });

  it('retourne les stats agent, responsable et superviseur', async () => {
    prisma.paiement.count.mockResolvedValueOnce(4);
    prisma.paiement.aggregate.mockResolvedValueOnce({ _sum: { montant_final: 80000 } } as any);
    prisma.devis.aggregate.mockResolvedValueOnce({ _sum: { montant_total_xof: 20000 } } as any);
    prisma.commissionPartenaire.aggregate
      .mockResolvedValueOnce({ _sum: { montant_reverse: 70000 } } as any)
      .mockResolvedValueOnce({ _sum: { montant_reverse: 15000 } } as any);
    prisma.commissionApporteur.aggregate.mockResolvedValueOnce({ _sum: { montant_commission: 5000 } } as any);
    prisma.dossier.count.mockResolvedValueOnce(6);
    prisma.dossier.findMany.mockResolvedValueOnce([{ id: 'dossier-01' }] as any);
    prisma.formationPartenaire.count.mockResolvedValueOnce(2);
    prisma.session.count.mockResolvedValueOnce(8);
    prisma.voucherApporteur.count.mockResolvedValueOnce(3);
    prisma.dossier.count.mockResolvedValueOnce(45);
    prisma.apporteur.count.mockResolvedValueOnce(12);
    prisma.commissionApporteur.groupBy.mockResolvedValueOnce([{ apporteur_id: 'apt-01' }] as any);

    await expect(repository.getStatsAgent()).resolves.toEqual({
      paiements_en_attente: 4,
      ca_confirme_xof: 100000,
      reversements_partenaires_a_effectuer_xof: 70000,
      commissions_apporteurs_a_reverser_xof: 5000,
      reversements_partenaires_ce_mois_xof: 15000,
    });
    await expect(repository.getStatsResponsable('resp-01')).resolves.toEqual({
      dossiers_en_attente_verification: 6,
      dossiers_retenus_urgents: [{ id: 'dossier-01' }],
      formations_partenaires_a_valider: 6,
      formations_partenaires_en_attente: 2,
    });
    await expect(repository.getStatsSuperviseur()).resolves.toEqual({
      sessions_ouvertes: 8,
      vouchers_promo_a_valider: 3,
      inscriptions_ce_mois: 45,
      apporteurs_actifs: 12,
      top_apporteurs_mois: [{ apporteur_id: 'apt-01' }],
    });
  });

  it('retourne les stats partenaire, apporteur et organisation', async () => {
    prisma.formation.findMany.mockResolvedValueOnce([
      {
        id: 'formation-01',
        intitule: 'Formation 1',
        statut: 'ACTIVE',
        formation_partenaire: { statut_validation: 'VALIDEE' },
        _count: { dossiers: 2 },
      },
    ] as any);
    prisma.commissionPartenaire.findMany.mockResolvedValueOnce([
      { montant_reverse: 80000, statut: 'EN_ATTENTE' },
      { montant_reverse: 120000, statut: 'REVERSE' },
    ] as any);
    prisma.apporteur.findUnique.mockResolvedValueOnce({
      code_apporteur: 'code-01',
      taux_commission_pct: 5,
    } as any);
    prisma.commissionApporteur.aggregate.mockResolvedValueOnce({
      _sum: { montant_commission: 6000, montant_base: 120000 },
      _count: 2,
    } as any);
    prisma.commissionApporteur.findMany.mockResolvedValueOnce([
      { montant_commission: 2000, statut: 'EN_ATTENTE' },
      { montant_commission: 4000, statut: 'REVERSEE' },
    ] as any);
    prisma.apprenant.count.mockResolvedValueOnce(10);
    prisma.dossier.count.mockResolvedValueOnce(15).mockResolvedValueOnce(8);
    prisma.abonnementB2B.findFirst.mockResolvedValueOnce({ palier: 'BUSINESS', nb_max: 50 } as any);

    await expect(repository.getStatsPartenaire('part-01')).resolves.toEqual({
      formations: [{
        id: 'formation-01',
        intitule: 'Formation 1',
        statut: 'ACTIVE',
        statut_validation: 'VALIDEE',
        nb_certifies: 2,
      }],
      reversements_nets_en_attente_xof: 80000,
      reversements_nets_percus_xof: 120000,
    });
    await expect(repository.getStatsApporteur('apt-01')).resolves.toEqual({
      code_apporteur: 'code-01',
      taux_commission_pct: 5,
      transactions_ce_mois: 2,
      ca_genere_ce_mois_xof: 120000,
      commission_ce_mois_xof: 6000,
      cumul_en_attente_xof: 2000,
      historique_reversements: [
        { montant_commission: 2000, statut: 'EN_ATTENTE' },
        { montant_commission: 4000, statut: 'REVERSEE' },
      ],
    });
    await expect(repository.getStatsOrganisation('org-01')).resolves.toEqual({
      nb_beneficiaires_actifs: 10,
      nb_inscriptions: 15,
      nb_certifies: 8,
      taux_certification: 53,
      abonnement_b2b: {
        palier: 'BUSINESS',
        nb_max: 50,
        nb_actifs: 10,
        taux_utilisation: 20,
      },
    });
  });

  it('retourne les statistiques globales, formation, session et rapports', async () => {
    prisma.formation.count.mockResolvedValueOnce(7).mockResolvedValueOnce(5);
    prisma.session.count.mockResolvedValueOnce(11).mockResolvedValueOnce(6);
    prisma.dossier.count.mockResolvedValueOnce(18).mockResolvedValueOnce(12);
    prisma.dossier.groupBy.mockResolvedValueOnce([{ statut: 'PAYE', _count: { _all: 12 } }] as any);
    prisma.paiement.aggregate.mockResolvedValueOnce({ _count: { _all: 4 }, _sum: { montant_final: 420000 } } as any);

    await expect(repository.getGlobalStats('ADMIN', 'admin-01')).resolves.toMatchObject({
      totalFormations: 7,
      totalFormationsActives: 5,
      totalSessions: 11,
      totalSessionsOuvertes: 6,
      totalDossiers: 18,
      totalDossiersConfirmes: 12,
      dossiersByStatut: { PAYE: 12 },
      paiementsConfirmes: 4,
      montantPayeTotal: 420000,
    });

    prisma.formation.findFirst.mockResolvedValueOnce({
      id: 'f-01',
      intitule: 'Formation 1',
      statut: 'ACTIVE',
      cout_catalogue: 100000,
      type_formation: 'STANDARD',
      mode_formation: 'AVEC_SESSION',
    } as any);
    prisma.session.count.mockResolvedValueOnce(2);
    prisma.session.groupBy.mockResolvedValueOnce([{ statut: 'OUVERTE', _count: { _all: 2 } }] as any);
    prisma.dossier.count.mockResolvedValueOnce(6);
    prisma.dossier.groupBy.mockResolvedValueOnce([{ statut: 'PAYE', _count: { _all: 6 } }] as any);
    prisma.paiement.aggregate.mockResolvedValueOnce({ _count: { _all: 4 }, _sum: { montant_final: 250000 } } as any);

    await expect(repository.getFormationStats('ADMIN', 'admin-01', 'f-01')).resolves.toMatchObject({
      formation: { id: 'f-01' },
      sessionsTotal: 2,
      dossiersTotal: 6,
      paiementsTotal: 4,
      montantPayeTotal: 250000,
    });

    prisma.session.findFirst.mockResolvedValueOnce({
      id: 's-01',
      statut: 'OUVERTE',
      date_debut: new Date('2026-04-01'),
      date_fin: new Date('2026-04-10'),
      capacite: 20,
      nb_inscrits: 12,
      places_restantes: 8,
      formation: { id: 'f-01', intitule: 'Formation 1' },
    } as any);
    prisma.dossier.count.mockResolvedValueOnce(6);
    prisma.dossier.groupBy.mockResolvedValueOnce([{ statut: 'PAYE', _count: { _all: 6 } }] as any);
    prisma.paiement.groupBy.mockResolvedValueOnce([{ statut: 'CONFIRME', _count: { _all: 4 } }] as any);
    prisma.paiement.aggregate.mockResolvedValueOnce({ _count: { _all: 4 }, _sum: { montant_final: 250000 } } as any);

    await expect(repository.getSessionStats('ADMIN', 'admin-01', 's-01')).resolves.toMatchObject({
      session: { id: 's-01' },
      dossiersTotal: 6,
      paiementsTotal: 4,
      montantPayeTotal: 250000,
    });

    prisma.dossier.findMany.mockResolvedValueOnce([
      {
        id: 'd-01',
        statut: 'PAYE',
        source_financement: 'RETAIL',
        voucher_code: null,
        code_apporteur: null,
        montant_remise: 0,
        created_at: new Date('2026-04-02'),
        apprenant: { nom: 'Ada', prenoms: 'Lovelace', email: 'ada@example.com' },
        formation: { intitule: 'Formation 1' },
        session: { date_debut: new Date('2026-04-10') },
        paiement: { statut: 'CONFIRME', montant_final: 250000, methode: 'CARTE' },
      },
    ] as any);

    await expect(repository.getRapportsData('ADMIN', 'admin-01')).resolves.toMatchObject({
      total_rapports: 1,
      rapports: [{
        dossier_id: 'd-01',
        apprenant_nom: 'Ada Lovelace',
        apprenant_email: 'ada@example.com',
        formation_titre: 'Formation 1',
        statut_dossier: 'PAYE',
        statut_paiement: 'CONFIRME',
        montant_paiement: 250000,
      }],
    });
  });
});
