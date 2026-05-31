const {
  API_URL,
  auth,
  createApprenantAccount,
  createOrganisationAccount,
  createPaiementAndConfirm,
  ids,
  prisma,
  request,
  signedWebhook,
} = require('./helpers');

jest.setTimeout(30000);

async function confirmerNgser(orderNgser, transactionPrefix, transactionAmount = 1) {
  const payload = {
    order_id: orderNgser,
    status_id: 1,
    transaction_id: `${transactionPrefix}-${Date.now()}`,
    transaction_amount: transactionAmount,
  };

  const response = await request(API_URL)
    .post('/webhooks/paiement')
    .set('x-webhook-signature', signedWebhook(payload))
    .send(payload);

  expect(response.status).toBe(200);
  expect(response.body.data.accepted).toBe(true);
  return payload;
}

describe('Workflow financier metier - paiements, abonnements et droits associes', () => {
  test('un apprenant peut payer une formation et son dossier devient PAYE', async () => {
    const account = await createApprenantAccount('biz-formation');
    const headers = await auth(account);

    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.partenaireSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    expect(inscription.status).toBe(201);
    expect(inscription.body.dossier.statut).toBe('PAYE_DIRECTEMENT');

    await createPaiementAndConfirm(
      headers,
      inscription.body.dossier.id,
      'biz-formation',
      250000,
    );

    const dossier = await prisma.dossier.findUnique({
      where: { id: inscription.body.dossier.id },
      include: { paiement: true },
    });

    expect(dossier.statut).toBe('PAYE');
    expect(dossier.paiement.statut).toBe('CONFIRME');
    expect(dossier.paiement.montant_final).toBe(250000);
  });

  test('un apprenant peut payer un abonnement Retail puis acceder aux formations incluses', async () => {
    const account = await createApprenantAccount('biz-retail');
    const headers = await auth(account);

    const beforePaymentAccess = await request(API_URL)
      .post(`/api/formations/${ids.demandeFormation}/acceder`)
      .set(headers)
      .send();
    expect(beforePaymentAccess.status).toBe(403);
    expect(beforePaymentAccess.body.error).toBe('NO_ACTIVE_SUBSCRIPTION');

    const souscription = await request(API_URL)
      .post('/api/abonnements/retail')
      .set(headers)
      .send({ offre: 'PREMIUM' });

    expect(souscription.status).toBe(201);
    expect(souscription.body.data.abonnement.statut).toBe('EN_ATTENTE_PAIEMENT');
    expect(souscription.body.data.payment_url).toContain(souscription.body.data.order_ngser);

    await confirmerNgser(
      souscription.body.data.order_ngser,
      'biz-retail-abo',
      souscription.body.data.montant_premier_mois,
    );

    const abonnement = await prisma.abonnementRetail.findUnique({
      where: { id: souscription.body.data.abonnement.id },
    });
    expect(abonnement.statut).toBe('ACTIF');
    expect(abonnement.transaction_id_ngser).toBeTruthy();

    const formationsIncluses = await request(API_URL)
      .get('/api/abonnements/retail/formations-incluses')
      .set(headers);

    expect(formationsIncluses.status).toBe(200);
    expect(formationsIncluses.body.data.map((formation) => formation.id)).toContain(ids.demandeFormation);

    const access = await request(API_URL)
      .post(`/api/formations/${ids.demandeFormation}/acceder`)
      .set(headers)
      .send();

    expect(access.status).toBe(200);
    expect(access.body.data.formation_id).toBe(ids.demandeFormation);
    expect(access.body.data.apprenant_id).toBe(account.id);
    expect(access.body.data.statut).toBe('ACTIF');
  });

  test('une organisation peut payer son abonnement Organisation et recuperer les droits de gestion', async () => {
    const account = await createOrganisationAccount('biz-org');
    const headers = await auth(account);

    const souscription = await request(API_URL)
      .post('/api/abonnements/organisation')
      .set(headers)
      .send({ offre: 'ENTERPRISE' });

    expect(souscription.status).toBe(201);
    expect(souscription.body.data.statut).toBe('EN_ATTENTE_PAIEMENT');
    expect(souscription.body.data.payment_url).toContain(souscription.body.data.order_ngser);

    await confirmerNgser(souscription.body.data.order_ngser, 'biz-org-abo', souscription.body.data.montant_annuel_xof);

    const abonnement = await prisma.abonnementOrganisation.findUnique({
      where: { id: souscription.body.data.id },
    });
    const organisation = await prisma.organisation.findUnique({ where: { id: account.id } });

    expect(abonnement.statut).toBe('ACTIF');
    expect(organisation.abonnement_org_id).toBe(abonnement.id);

    const me = await request(API_URL).get('/api/abonnements/organisation/me').set(headers);
    expect(me.status).toBe(200);
    expect(me.body.data.statut).toBe('ACTIF');
    expect(me.body.data.nb_gestionnaires_max).toBe(5);
  });

  test('une organisation peut payer un abonnement B2B puis inscrire un beneficiaire finance B2B', async () => {
    const organisation = await createOrganisationAccount('biz-b2b');
    const headers = await auth(organisation);
    const beneficiaire = await createApprenantAccount('biz-b2b-benef');
    await prisma.apprenant.update({
      where: { id: beneficiaire.id },
      data: { organisation_id: organisation.id, type_apprenant: 'PROFESSIONNEL' },
    });

    const beforePayment = await request(API_URL)
      .post('/api/organisation/inscrire-beneficiaire')
      .set(headers)
      .send({
        beneficiaire_id: beneficiaire.id,
        session_id: ids.standardSession,
        source_financement: 'B2B',
      });
    expect(beforePayment.status).toBe(403);
    expect(beforePayment.body.error).toBe('ABONNEMENT_B2B_INACTIF');

    const souscription = await request(API_URL)
      .post('/api/abonnements/b2b')
      .set(headers)
      .send({ palier: 'BUSINESS' });

    expect(souscription.status).toBe(201);
    expect(souscription.body.data.statut).toBe('EN_ATTENTE_PAIEMENT');
    expect(souscription.body.data.payment_url).toContain(souscription.body.data.order_ngser);

    await confirmerNgser(souscription.body.data.order_ngser, 'biz-b2b-abo', souscription.body.data.prix_annuel_xof);

    const abonnement = await prisma.abonnementB2B.findUnique({
      where: { id: souscription.body.data.id },
    });
    const organisationApresPaiement = await prisma.organisation.findUnique({ where: { id: organisation.id } });

    expect(abonnement.statut).toBe('ACTIF');
    expect(organisationApresPaiement.abonnement_b2b_id).toBe(abonnement.id);

    const me = await request(API_URL).get('/api/abonnements/b2b/me').set(headers);
    expect(me.status).toBe(200);
    expect(me.body.data.statut).toBe('ACTIF');
    expect(me.body.data.palier).toBe('BUSINESS');
    expect(me.body.data.nb_max).toBe(50);

    const inscription = await request(API_URL)
      .post('/api/organisation/inscrire-beneficiaire')
      .set(headers)
      .send({
        beneficiaire_id: beneficiaire.id,
        session_id: ids.standardSession,
        source_financement: 'B2B',
      });

    expect(inscription.status).toBe(201);
    expect(inscription.body.statut).toBe('PAYE');

    const dossier = await prisma.dossier.findUnique({
      where: { id: inscription.body.dossier_id },
      include: { paiement: true },
    });
    expect(dossier.apprenant_id).toBe(beneficiaire.id);
    expect(dossier.organisation_inscriptrice_id).toBe(organisation.id);
    expect(dossier.source_financement).toBe('B2B');
    expect(dossier.statut).toBe('PAYE');
    expect(dossier.paiement.statut).toBe('CONFIRME');
  });
});
