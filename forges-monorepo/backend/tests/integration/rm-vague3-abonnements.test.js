const {
  accounts,
  auth,
  createApprenantAccount,
  createOrganisationAccount,
  ids,
  prisma,
  request,
  API_URL,
} = require('./helpers');

describe('Vague 3 API — Abonnements RM-60/61/64/65/68/70/75/76/77/79/84/104/105/106/108/112', () => {
  test('RM-70/RM-75/RM-106 — souscription Retail unique avec consentement et prorata premier mois', async () => {
    const account = await createApprenantAccount('rm70');
    const headers = await auth(account);

    const first = await request(API_URL)
      .post('/api/abonnements/retail')
      .set(headers)
      .send({ offre: 'ESSENTIEL' });
    expect(first.status).toBe(201);
    expect(first.body.data.abonnement.offre).toBe('ESSENTIEL');
    expect(first.body.data.abonnement.consentement_auto).toBe(true);
    expect(first.body.data.abonnement.consentement_timestamp).toBeTruthy();
    expect(first.body.data.montant_premier_mois).toBeGreaterThan(0);
    expect(first.body.data.montant_premier_mois).toBeLessThanOrEqual(first.body.data.abonnement.montant_mensuel);

    const duplicate = await request(API_URL)
      .post('/api/abonnements/retail')
      .set(headers)
      .send({ offre: 'PREMIUM' });
    expect(duplicate.status).toBe(201);
    expect(duplicate.body.data.order_ngser).toBe(first.body.data.order_ngser);

    await prisma.abonnementRetail.update({
      where: { id: first.body.data.abonnement.id },
      data: { statut: 'ACTIF' },
    });
    const duplicateActif = await request(API_URL)
      .post('/api/abonnements/retail')
      .set(headers)
      .send({ offre: 'PREMIUM' });
    expect(duplicateActif.status).toBe(409);
    expect(duplicateActif.body.error).toBe('ABONNEMENT_DEJA_ACTIF');
  });

  test('RM-79/RM-104/RM-76/RM-105/RM-77 — cycle upgrade, downgrade, suspension acces et resilitation Retail', async () => {
    const account = await createApprenantAccount('rm79');
    const headers = await auth(account);

    const created = await request(API_URL).post('/api/abonnements/retail').set(headers).send({ offre: 'ESSENTIEL' }).expect(201);
    await prisma.abonnementRetail.update({
      where: { id: created.body.data.abonnement.id },
      data: { statut: 'ACTIF' },
    });

    const upgrade = await request(API_URL).put('/api/abonnements/retail/upgrade').set(headers).send({});
    expect(upgrade.status).toBe(200);
    expect(upgrade.body.data.effectif).toBe('immediat');
    expect(upgrade.body.data.montant_prorata).toBeGreaterThanOrEqual(0);

    const afterUpgrade = await prisma.abonnementRetail.findUnique({ where: { id: created.body.data.abonnement.id } });
    expect(afterUpgrade.offre).toBe('PREMIUM');

    const downgrade = await request(API_URL).put('/api/abonnements/retail/downgrade').set(headers).send({});
    expect(downgrade.status).toBe(200);
    const afterDowngrade = await prisma.abonnementRetail.findUnique({ where: { id: created.body.data.abonnement.id } });
    expect(afterDowngrade.offre).toBe('PREMIUM');
    expect(afterDowngrade.downgrade_planifie).toBe('ESSENTIEL');

    await prisma.accesFormationDemande.create({
      data: {
        apprenant_id: account.id,
        formation_id: ids.demandeFormation,
        source_financement: 'ABONNEMENT',
        statut: 'ACTIF',
        date_expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const suspend = await request(API_URL).put('/api/abonnements/retail/suspendre').set(headers).send({});
    expect(suspend.status).toBe(200);
    const suspendedAccess = await prisma.accesFormationDemande.findFirst({
      where: { apprenant_id: account.id, formation_id: ids.demandeFormation },
    });
    expect(suspendedAccess.statut).toBe('SUSPENDU');

    await prisma.abonnementRetail.update({
      where: { id: created.body.data.abonnement.id },
      data: { statut: 'ACTIF' },
    });
    const resilier = await request(API_URL).delete('/api/abonnements/retail').set(headers).send({});
    expect(resilier.status).toBe(200);
    const afterResiliation = await prisma.abonnementRetail.findUnique({ where: { id: created.body.data.abonnement.id } });
    expect(afterResiliation.statut).toBe('EN_RESILIATION');
  });

  test('RM-84/RM-108/RM-112 — abonnement Organisation unique et contenu par offre', async () => {
    const account = await createOrganisationAccount('rm84');
    const headers = await auth(account);

    const first = await request(API_URL)
      .post('/api/abonnements/organisation')
      .set(headers)
      .send({ offre: 'ENTERPRISE' });
    expect(first.status).toBe(201);
    expect(first.body.data.offre).toBe('ENTERPRISE');
    expect(first.body.data.renouvellement_auto).toBe(true);

    const me = await request(API_URL).get('/api/abonnements/organisation/me').set(headers);
    expect(me.status).toBe(200);
    expect(me.body.data.nb_gestionnaires_max).toBe(5);

    // EN_ATTENTE_PAIEMENT → idempotence : retourne 201 avec la meme URL paiement
    const duplicate = await request(API_URL)
      .post('/api/abonnements/organisation')
      .set(headers)
      .send({ offre: 'BASIQUE' });
    expect(duplicate.status).toBe(201);
    expect(duplicate.body.data.payment_url).toBeTruthy();

    // Forcer ACTIF pour tester le 409 strict (RM-84)
    await prisma.abonnementOrganisation.update({
      where: { id: first.body.data.id },
      data: { statut: 'ACTIF' },
    });
    const duplicateActif = await request(API_URL)
      .post('/api/abonnements/organisation')
      .set(headers)
      .send({ offre: 'BASIQUE' });
    expect(duplicateActif.status).toBe(409);
    expect(duplicateActif.body.error).toBe('ABONNEMENT_ORG_DEJA_ACTIF');
  });

  test('RM-60/RM-61/RM-64/RM-65/RM-68 — B2B lie organisation, plafonne et monte en palier au prorata', async () => {
    const account = await createOrganisationAccount('rm60');
    const headers = await auth(account);

    const first = await request(API_URL)
      .post('/api/abonnements/b2b')
      .set(headers)
      .send({ palier: 'STARTER' });
    expect(first.status).toBe(201);
    expect(first.body.data.organisation_id).toBe(account.id);
    expect(first.body.data.nb_max).toBe(20);

    // Activer l'abonnement (simule le paiement NGSER reçu)
    await prisma.abonnementB2B.update({
      where: { id: first.body.data.id },
      data: { statut: 'ACTIF' },
    });

    const duplicate = await request(API_URL)
      .post('/api/abonnements/b2b')
      .set(headers)
      .send({ palier: 'BUSINESS' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe('ABONNEMENT_B2B_DEJA_ACTIF');

    const upgrade = await request(API_URL)
      .put('/api/abonnements/b2b/monter-palier')
      .set(headers)
      .send({ nouveau_palier: 'BUSINESS' });
    expect(upgrade.status).toBe(200);
    expect(upgrade.body.data.nouveau_palier).toBe('BUSINESS');
    expect(upgrade.body.data.montant_prorata).toBeGreaterThanOrEqual(0);

    const b2b = await prisma.abonnementB2B.findFirst({ where: { organisation_id: account.id, statut: 'ACTIF' } });
    expect(b2b).not.toBeNull();
    expect(b2b.palier).toBe('BUSINESS');
    expect(b2b.nb_max).toBe(50);

    const retail = await prisma.abonnementRetail.findFirst({ where: { apprenant_id: account.id } });
    expect(retail).toBeNull();
  });
});
