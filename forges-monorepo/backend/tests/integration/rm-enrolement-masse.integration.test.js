const {
  createApprenantAccount,
  ids,
  prisma,
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

describe('Wave 2 - Enrolement masse institutionnel', () => {
  const contratIds = [];
  const emails = [];

  afterAll(async () => {
    if (emails.length > 0) {
      const apprenants = await prisma.apprenant.findMany({
        where: { email: { in: emails } },
        select: { id: true },
      });
      const apprenantIds = apprenants.map((apprenant) => apprenant.id);
      await prisma.dossier.deleteMany({ where: { apprenant_id: { in: apprenantIds } } });
      await prisma.apprenant.deleteMany({ where: { id: { in: apprenantIds } } });
    }

    if (contratIds.length > 0) {
      await prisma.contratInstitutionnel.deleteMany({ where: { id: { in: contratIds } } });
    }
  });

  test('RM-59 - import CSV cree les apprenants et les lie au code contrat', async () => {
    const service = buildService();
    const gestionnaire = await createApprenantAccount('rm59-gest');
    await prisma.apprenant.update({
      where: { id: gestionnaire.id },
      data: { role: 'GESTIONNAIRE' },
    });

    const contrat = await service.creerContrat({
      numero_contrat: uniqueId('INST-RM59'),
      institution_nom: 'Institution RM-59',
      programme_id: uniqueId('PROG-RM59'),
      date_debut: daysFromNow(-1),
      date_fin: daysFromNow(365),
      montant_saas_annuel: 4500000,
      fee_par_certifie: 12000,
      gestionnaires_ids: [gestionnaire.id],
    }, ids.responsable);
    contratIds.push(contrat.id);
    await service.activerContrat(contrat.id, ids.responsable);

    const email1 = `rm59-${Date.now()}-1@forges.test`;
    const email2 = `rm59-${Date.now()}-2@forges.test`;
    emails.push(email1, email2);

    const csv = [
      'email,nom,prenoms,pays,formation_id',
      `${email1},Kone,Awa,CI,${ids.standardFormation}`,
      `${email2},Diallo,,CI,${ids.demandeFormation}`,
    ].join('\n');

    const result = await service.enrollerMasse(contrat.id, csv, gestionnaire.id);

    expect(result.succes).toBe(1);
    expect(result.erreurs).toBe(1);
    expect(result.rapport).toEqual(expect.arrayContaining([
      expect.objectContaining({ email: email1, statut: 'SUCCES' }),
      expect.objectContaining({ email: email2, statut: 'ERREUR' }),
    ]));

    const apprenant = await prisma.apprenant.findUnique({ where: { email: email1 } });
    const dossier = await prisma.dossier.findFirst({
      where: {
        apprenant_id: apprenant.id,
        source_financement: 'INSTITUTIONNEL',
        voucher_code: contrat.numero_contrat,
      },
    });

    expect(apprenant).toBeTruthy();
    expect(apprenant.secteur_activite).toBe(`INSTITUTIONNEL:${contrat.numero_contrat}`);
    expect(dossier).toBeTruthy();
    expect(dossier.formation_id).toBe(ids.standardFormation);
  });
});
