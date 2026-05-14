const { accounts, auth, createApprenantAccount, createPaiementAndConfirm, ids, prisma, request, API_URL } = require('./helpers');

async function seedPartenaireCommission() {
  await prisma.commissionPartenaire.upsert({
    where: { paiement_id: 'P-E2E-PAYE-01' },
    create: {
      partenaire_id: ids.partenaire,
      formation_id: ids.partenaireFormation,
      paiement_id: 'P-E2E-PAYE-01',
      montant_catalogue: 75000,
      commission_forges_pct: 20,
      montant_reverse: 60000,
      statut: 'EN_ATTENTE',
    },
    update: {
      partenaire_id: ids.partenaire,
      formation_id: ids.partenaireFormation,
      montant_catalogue: 75000,
      commission_forges_pct: 20,
      montant_reverse: 60000,
      statut: 'EN_ATTENTE',
      reverse_le: null,
      reverse_par: null,
    },
  });
}

describe('RM-151 — Alias legacy reversements Agent et Backoffice', () => {
  test('AGENT peut executer un reversement partenaire via /api/agent/reversements/:id/effectuer', async () => {
    const agentHeaders = await auth(accounts.agent);
    await seedPartenaireCommission();

    const res = await request(API_URL)
      .post(`/api/agent/reversements/${ids.partenaire}/effectuer`)
      .set(agentHeaders)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.statusCode).toBe(201);

    const remaining = await prisma.commissionPartenaire.count({
      where: { partenaire_id: ids.partenaire, statut: 'EN_ATTENTE' },
    });
    expect(remaining).toBe(0);

    await prisma.commissionPartenaire.deleteMany({
      where: { paiement_id: 'P-E2E-PAYE-01' },
    });
  });

  test('BACKOFFICE peut executer un reversement partenaire via /api/backoffice/reversements/:id/effectuer', async () => {
    const agentHeaders = await auth(accounts.agent);
    await seedPartenaireCommission();

    const res = await request(API_URL)
      .post(`/api/backoffice/reversements/${ids.partenaire}/effectuer`)
      .set(agentHeaders)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.statusCode).toBe(201);

    const remaining = await prisma.commissionPartenaire.count({
      where: { partenaire_id: ids.partenaire, statut: 'EN_ATTENTE' },
    });
    expect(remaining).toBe(0);

    await prisma.commissionPartenaire.deleteMany({
      where: { paiement_id: 'P-E2E-PAYE-01' },
    });
  });

  test('BACKOFFICE peut lister et executer les reversements apporteurs', async () => {
    const apprenant = await createApprenantAccount('rm151-app');
    const apprenantHeaders = await auth(apprenant);

    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(apprenantHeaders)
      .send({ source_financement: 'RETAIL', code_apporteur: ids.apporteurCode });

    expect(inscription.status).toBe(201);
    const dossierId = inscription.body.dossier?.id || inscription.body.data?.id;
    expect(dossierId).toBeTruthy();

    await createPaiementAndConfirm(apprenantHeaders, dossierId, 'rm151-app', 10000000);

    const paiementEnBase = await prisma.paiement.findFirst({
      where: { dossier_id: dossierId },
      select: { id: true },
    });
    expect(paiementEnBase).toBeTruthy();

    const apporteur = await prisma.apporteur.findFirst({
      where: { code_apporteur: ids.apporteurCode },
    });
    expect(apporteur).toBeTruthy();

    await prisma.commissionApporteur.deleteMany({
      where: { paiement_id: paiementEnBase.id },
    });

    await prisma.commissionApporteur.create({
      data: {
        apporteur: { connect: { id: apporteur.id } },
        paiement: { connect: { id: paiementEnBase.id } },
        dossier_id: dossierId,
        montant_base: 10000000,
        montant_commission: 500000,
        montant_commission_xof: 500000,
        taux_commission_pct: apporteur.taux_commission_pct,
        statut: 'VALIDEE',
      },
    });

    const agentHeaders = await auth(accounts.agent);
    const pending = await request(API_URL)
      .get('/api/backoffice/reversements/apporteurs')
      .set(agentHeaders);

    expect(pending.status).toBe(200);
    expect(Array.isArray(pending.body.data)).toBe(true);
    expect(pending.body.data.some((row) => row.apporteur_id === apporteur.id)).toBe(true);

    const reversement = await request(API_URL)
      .post(`/api/backoffice/reversements/apporteurs/${apporteur.id}/execute`)
      .set(agentHeaders)
      .send({});

    expect(reversement.status).toBe(201);

    const remaining = await prisma.commissionApporteur.count({
      where: { dossier_id: dossierId, statut: 'VALIDEE' },
    });
    expect(remaining).toBe(0);
  });
});
