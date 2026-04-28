const {
  createApprenantAccount,
  createOrganisationAccount,
  ids,
  prisma,
} = require('./helpers');

const { AbonnementB2BService } = require('../../src/modules/abonnements/b2b/abonnement-b2b.service');
const { ContratInstitutionnelService } = require('../../src/modules/abonnements/institutionnel/contrat-institutionnel.service');

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildContratService() {
  return new ContratInstitutionnelService(
    prisma,
    { info: jest.fn(), warning: jest.fn() },
    {},
  );
}

function buildB2BService() {
  return new AbonnementB2BService(
    prisma,
    { info: jest.fn(), warning: jest.fn() },
    {},
  );
}

describe('Wave 3 - Renouvellement contrats et quotas', () => {
  const contratIds = [];

  afterAll(async () => {
    if (contratIds.length > 0) {
      await prisma.contratInstitutionnel.deleteMany({ where: { id: { in: contratIds } } });
    }
  });

  test('RM-58 - renouveler un contrat cree un nouveau contrat lie a l historique', async () => {
    const service = buildContratService();
    const contrat = await service.creerContrat({
      numero_contrat: uniqueId('INST-RM58'),
      institution_nom: 'Institution RM-58',
      programme_id: uniqueId('PROG-RM58'),
      date_debut: daysFromNow(-365),
      date_fin: daysFromNow(-1),
      montant_saas_annuel: 5000000,
      fee_par_certifie: 12000,
      gestionnaires_ids: [],
    }, ids.responsable);
    contratIds.push(contrat.id);

    const renewed = await service.renouvelerContrat(contrat.id, {
      numero_contrat: uniqueId('INST-RM58-REN'),
      programme_id: uniqueId('PROG-RM58-REN'),
      date_debut: daysFromNow(1),
      date_fin: daysFromNow(366),
    }, ids.responsable);
    contratIds.push(renewed.id);

    expect(renewed.id).not.toBe(contrat.id);
    expect(renewed.avenants).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'RENOUVELLEMENT_DEPUIS',
        contrat_precedent_id: contrat.id,
        numero_precedent: contrat.numero_contrat,
      }),
    ]));
  });

  test('RM-89 - Enterprise consomme 2 Premium par an puis reset au renouvellement', async () => {
    const service = buildB2BService();
    const organisation = await createOrganisationAccount('rm89');

    await prisma.abonnementB2B.create({
      data: {
        organisation_id: organisation.id,
        palier: 'ENTERPRISE',
        nb_max: 100,
        nb_actifs: 1,
        date_debut: daysFromNow(-30),
        date_fin: daysFromNow(335),
        prix_annuel: 900000,
        premium_inclus_par_an: 2,
        premium_consommes: 0,
        statut: 'ACTIF',
      },
    });

    const first = await service.consommerPremiumEnterprise(organisation.id);
    const second = await service.consommerPremiumEnterprise(organisation.id);
    expect(first.premium_consommes).toBe(1);
    expect(second.premium_consommes).toBe(2);
    await expect(service.consommerPremiumEnterprise(organisation.id)).rejects.toThrow('QUOTA_PREMIUM_ENTERPRISE_EPUISE');

    const reset = await service.resetPremiumEnterpriseAnnuel(organisation.id);
    expect(reset.premium_consommes).toBe(0);
    expect(reset.compteur_premium_reset_at).toBeTruthy();
  });

  test('RM-114 - les fees institutionnels ne sont factures que si le seuil est depasse', async () => {
    const service = buildContratService();
    const apprenant = await createApprenantAccount('rm114');
    const contrat = await service.creerContrat({
      numero_contrat: uniqueId('INST-RM114'),
      institution_nom: 'Institution RM-114',
      programme_id: uniqueId('PROG-RM114'),
      date_debut: daysFromNow(-1),
      date_fin: daysFromNow(365),
      montant_saas_annuel: 5000000,
      fee_par_certifie: 25000,
      seuil_facturation_fees: 25000,
      gestionnaires_ids: [],
    }, ids.responsable);
    contratIds.push(contrat.id);
    await service.activerContrat(contrat.id, ids.responsable);

    const first = await service.comptabiliserCertification({
      contrat_id: contrat.id,
      apprenant_id: apprenant.id,
      formation_id: ids.standardFormation,
    });
    const second = await service.comptabiliserCertification({
      contrat_id: contrat.id,
      apprenant_id: apprenant.id,
      formation_id: ids.demandeFormation,
    });

    expect(first.facturation_mensuelle_requise).toBe(false);
    expect(second.facturation_mensuelle_requise).toBe(true);
  });
});
