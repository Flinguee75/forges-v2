const {
  auth,
  createApprenantAccount,
  ids,
  prisma,
  request,
  API_URL,
} = require('./helpers');

const { ContratInstitutionnelService } = require('../../src/modules/abonnements/institutionnel/contrat-institutionnel.service');

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildService() {
  return new ContratInstitutionnelService(
    prisma,
    { info: jest.fn(), warning: jest.fn() },
    {},
  );
}

describe('Wave 2 - Contrats institutionnels RM-50 a RM-57', () => {
  const contratIds = [];

  afterAll(async () => {
    if (contratIds.length > 0) {
      await prisma.contratInstitutionnel.deleteMany({ where: { id: { in: contratIds } } });
    }
  });

  test('RM-50/RM-51/RM-54 - contrat unique par programme, activation facture le SaaS, gestionnaire ne modifie pas les tarifs', async () => {
    const service = buildService();
    const gestionnaire = await createApprenantAccount('rm50-gest');
    await prisma.apprenant.update({
      where: { id: gestionnaire.id },
      data: { role: 'GESTIONNAIRE' },
    });

    const contrat = await service.creerContrat({
      numero_contrat: uniqueId('INST-RM50'),
      institution_nom: 'Ministere RM-50',
      programme_id: uniqueId('PROG-RM50'),
      bailleur: 'Bailleur RM',
      date_debut: daysFromNow(-1),
      date_fin: daysFromNow(365),
      montant_saas_annuel: 5000000,
      fee_par_certifie: 15000,
      seuil_facturation_fees: 25000,
      gestionnaires_ids: [gestionnaire.id],
    }, ids.responsable);
    contratIds.push(contrat.id);

    await expect(service.creerContrat({
      numero_contrat: uniqueId('INST-RM50-DUP'),
      institution_nom: 'Ministere RM-50 Duplicate',
      programme_id: contrat.programme_id,
      date_debut: daysFromNow(-1),
      date_fin: daysFromNow(365),
      montant_saas_annuel: 7000000,
      fee_par_certifie: 12000,
      gestionnaires_ids: [gestionnaire.id],
    }, ids.responsable)).rejects.toThrow('CONTRAT_PROGRAMME_DEJA_EXISTANT');

    const activation = await service.activerContrat(contrat.id, ids.responsable);
    expect(activation.contrat.statut).toBe('ACTIF');
    expect(activation.facturation_saas).toMatchObject({
      type: 'FACTURATION_SAAS_ANNUELLE',
      montant: 5000000,
      statut: 'A_FACTURER',
    });

    await expect(service.modifierParGestionnaire(contrat.id, gestionnaire.id, {
      fee_par_certifie: 1000,
    })).rejects.toThrow('CONTRAT_MODIFICATION_FORBIDDEN');
  });

  test('RM-52/RM-53/RM-55 - fees mensuels, tracabilite code contrat et independance Retail', async () => {
    const service = buildService();
    const apprenant = await createApprenantAccount('rm52-inst');
    const headers = await auth(apprenant);

    const contrat = await service.creerContrat({
      numero_contrat: uniqueId('INST-RM52'),
      institution_nom: 'Institution RM-52',
      programme_id: uniqueId('PROG-RM52'),
      date_debut: daysFromNow(-1),
      date_fin: daysFromNow(365),
      montant_saas_annuel: 3000000,
      fee_par_certifie: 15000,
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

    expect(first.dossier.source_financement).toBe('INSTITUTIONNEL');
    expect(first.dossier.voucher_code).toBe(contrat.numero_contrat);
    expect(second.cumul_fees_reportes).toBe(30000);
    expect(second.facturation_mensuelle_requise).toBe(true);

    const retail = await request(API_URL)
      .post('/api/abonnements/retail')
      .set(headers)
      .send({ offre: 'ESSENTIEL' });
    expect(retail.status).toBe(201);

    const retailAbo = await prisma.abonnementRetail.findUnique({ where: { apprenant_id: apprenant.id } });
    const dossierInstitutionnel = await prisma.dossier.findFirst({
      where: { apprenant_id: apprenant.id, source_financement: 'INSTITUTIONNEL', voucher_code: contrat.numero_contrat },
    });
    expect(retailAbo).toBeTruthy();
    expect(dossierInstitutionnel).toBeTruthy();
  });

  test('RM-56/RM-57 - alertes J-60/J-30 et suspension des gestionnaires a expiration', async () => {
    const service = buildService();
    const gestionnaire = await createApprenantAccount('rm57-gest');
    await prisma.apprenant.update({
      where: { id: gestionnaire.id },
      data: { role: 'GESTIONNAIRE' },
    });

    const contratJ60 = await prisma.contratInstitutionnel.create({
      data: {
        numero_contrat: uniqueId('INST-RM56-J60'),
        institution_nom: 'Institution alerte J60',
        programme_id: uniqueId('PROG-RM56-J60'),
        date_debut: daysFromNow(-10),
        date_fin: daysFromNow(60),
        montant_saas_annuel: 2000000,
        fee_par_certifie: 10000,
        statut: 'ACTIF',
        gestionnaires_ids: [gestionnaire.id],
        avenants: [],
      },
    });
    const contratJ30 = await prisma.contratInstitutionnel.create({
      data: {
        numero_contrat: uniqueId('INST-RM56-J30'),
        institution_nom: 'Institution alerte J30',
        programme_id: uniqueId('PROG-RM56-J30'),
        date_debut: daysFromNow(-10),
        date_fin: daysFromNow(30),
        montant_saas_annuel: 2000000,
        fee_par_certifie: 10000,
        statut: 'ACTIF',
        gestionnaires_ids: [gestionnaire.id],
        avenants: [],
      },
    });
    const contratExpire = await prisma.contratInstitutionnel.create({
      data: {
        numero_contrat: uniqueId('INST-RM57'),
        institution_nom: 'Institution expiree',
        programme_id: uniqueId('PROG-RM57'),
        date_debut: daysFromNow(-400),
        date_fin: daysFromNow(-1),
        montant_saas_annuel: 2000000,
        fee_par_certifie: 10000,
        statut: 'ACTIF',
        gestionnaires_ids: [gestionnaire.id],
        avenants: [],
      },
    });
    contratIds.push(contratJ60.id, contratJ30.id, contratExpire.id);

    const alertes = await service.trouverAlertesExpiration();
    expect(alertes.alertes_j60.map((contrat) => contrat.id)).toContain(contratJ60.id);
    expect(alertes.alertes_j30.map((contrat) => contrat.id)).toContain(contratJ30.id);

    const expiredCount = await service.suspendreContratsExpires();
    expect(expiredCount).toBeGreaterThanOrEqual(1);

    const expired = await prisma.contratInstitutionnel.findUnique({ where: { id: contratExpire.id } });
    const suspendedManager = await prisma.apprenant.findUnique({ where: { id: gestionnaire.id } });
    expect(expired.statut).toBe('EXPIRE');
    expect(suspendedManager.statut).toBe('SUSPENDU');
  });
});
