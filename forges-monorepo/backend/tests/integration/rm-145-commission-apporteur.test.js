const {
  accounts,
  auth,
  createApprenantAccount,
  ids,
  prisma,
  request,
  signedWebhook,
  API_URL,
} = require('./helpers');

// RM-145 : une commission apporteur est créée après webhook SUCCESS
// RM-147 : quand cumul >= seuil, le reversement est exécutable

describe('RM-145/RM-147 — Commission et reversement apporteur', () => {
  let apporteur;

  beforeAll(async () => {
    apporteur = await prisma.apporteur.findFirst({
      where: { code_apporteur: ids.apporteurCode },
    });
    if (!apporteur) throw new Error(`Apporteur introuvable pour le code ${ids.apporteurCode} — relancer le seed.`);
  });

  // ─────────────────────────────────────────────────────────────
  // CAS 1 : SUCCESS + code_apporteur → CommissionApporteur créée
  // ─────────────────────────────────────────────────────────────
  test('RM-145-OK — webhook SUCCESS + code_apporteur → commission créée (montant = montant_final × taux / 100)', async () => {
    const headers = await auth(await createApprenantAccount('rm145ok'));
    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL', code_apporteur: ids.apporteurCode });
    expect(inscription.status).toBe(201);
    const dossierId = inscription.body.dossier.id;

    const paiementRes = await request(API_URL)
      .post('/api/paiements')
      .set(headers)
      .send({ dossier_id: dossierId, methode: 'MOBILE_MONEY' });
    expect(paiementRes.status).toBe(201);
    const montant = paiementRes.body.data?.montant_final ?? 150000;

    const webhook = {
      transaction_id: `TX-RM145OK-${Date.now()}`,
      dossier_id: dossierId,
      statut: 'SUCCESS',
      montant,
    };
    const confirm = await request(API_URL)
      .post('/api/paiements/webhook')
      .set('x-webhook-signature', signedWebhook(webhook))
      .send(webhook);
    expect(confirm.status).toBe(200);

    const commission = await prisma.commissionApporteur.findFirst({
      where: { dossier_id: dossierId },
    });
    expect(commission).not.toBeNull();
    expect(commission.apporteur_id).toBe(apporteur.id);
    // Formule : Math.floor(montant_final * taux / 100) = Math.floor(150000 * 5 / 100) = 7500
    expect(commission.montant_commission).toBe(Math.floor(montant * apporteur.taux_commission_pct / 100));
    expect(commission.statut).toBe('EN_ATTENTE');
  });

  // ─────────────────────────────────────────────────────────────
  // CAS 2 : FAILED + code_apporteur → AUCUNE commission créée
  // ─────────────────────────────────────────────────────────────
  test('RM-145-FAIL — webhook FAILED + code_apporteur → aucune CommissionApporteur', async () => {
    const headers = await auth(await createApprenantAccount('rm145fail'));
    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL', code_apporteur: ids.apporteurCode });
    expect(inscription.status).toBe(201);
    const dossierId = inscription.body.dossier.id;

    const paiementRes = await request(API_URL)
      .post('/api/paiements')
      .set(headers)
      .send({ dossier_id: dossierId, methode: 'MOBILE_MONEY' });
    expect(paiementRes.status).toBe(201);

    const webhook = {
      transaction_id: `TX-RM145FAIL-${Date.now()}`,
      dossier_id: dossierId,
      statut: 'FAILED',
      montant: 0,
    };
    const echoue = await request(API_URL)
      .post('/api/paiements/webhook')
      .set('x-webhook-signature', signedWebhook(webhook))
      .send(webhook);
    expect(echoue.status).toBe(200);

    const commission = await prisma.commissionApporteur.findFirst({
      where: { dossier_id: dossierId },
    });
    expect(commission).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────
  // CAS 3 : cumul VALIDEE >= seuil → apporteur éligible reversement
  // ─────────────────────────────────────────────────────────────
  test('RM-147-SEUIL — commission VALIDEE >= seuil → apporteur présent dans liste reversements', async () => {
    // Créer un paiement SUCCESS pour générer une commission réelle
    const headers = await auth(await createApprenantAccount('rm147seuil'));
    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL', code_apporteur: ids.apporteurCode });
    expect(inscription.status).toBe(201);
    const dossierId = inscription.body.dossier.id;

    const paiementRes = await request(API_URL)
      .post('/api/paiements')
      .set(headers)
      .send({ dossier_id: dossierId, methode: 'MOBILE_MONEY' });
    expect(paiementRes.status).toBe(201);
    const montant = paiementRes.body.data?.montant_final ?? 150000;

    const webhook = {
      transaction_id: `TX-RM147SEUIL-${Date.now()}`,
      dossier_id: dossierId,
      statut: 'SUCCESS',
      montant,
    };
    const confirm = await request(API_URL)
      .post('/api/paiements/webhook')
      .set('x-webhook-signature', signedWebhook(webhook))
      .send(webhook);
    expect(confirm.status).toBe(200);

    // Passer la commission EN_ATTENTE → VALIDEE (simule la validation manuelle)
    await prisma.commissionApporteur.updateMany({
      where: { dossier_id: dossierId, apporteur_id: apporteur.id, statut: 'EN_ATTENTE' },
      data: { statut: 'VALIDEE' },
    });

    // L'apporteur doit apparaître dans les éligibles (montant >= seuil de 5000 XOF)
    const agentHeaders = await auth(accounts.agent);
    const liste = await request(API_URL)
      .get('/api/agent/reversements/apporteurs')
      .set(agentHeaders);
    expect(liste.status).toBe(200);

    const ligneApporteur = liste.body.data?.find(
      (row) => row.apporteur_id === apporteur.id,
    );
    expect(ligneApporteur).toBeDefined();
    expect(ligneApporteur.montant_total_xof).toBeGreaterThanOrEqual(5000);
  });

  // ─────────────────────────────────────────────────────────────
  // CAS 4 : exécution reversement → 200 ou 201
  // ─────────────────────────────────────────────────────────────
  test('RM-147-EXEC — exécution reversement apporteur éligible → 200 ou 201', async () => {
    // Créer une commission VALIDEE pour ce test isolé
    const headers = await auth(await createApprenantAccount('rm147exec'));
    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL', code_apporteur: ids.apporteurCode });
    expect(inscription.status).toBe(201);
    const dossierId = inscription.body.dossier.id;

    const paiementRes = await request(API_URL)
      .post('/api/paiements')
      .set(headers)
      .send({ dossier_id: dossierId, methode: 'MOBILE_MONEY' });
    expect(paiementRes.status).toBe(201);
    const montant = paiementRes.body.data?.montant_final ?? 150000;

    const webhook = {
      transaction_id: `TX-RM147EXEC-${Date.now()}`,
      dossier_id: dossierId,
      statut: 'SUCCESS',
      montant,
    };
    const confirm = await request(API_URL)
      .post('/api/paiements/webhook')
      .set('x-webhook-signature', signedWebhook(webhook))
      .send(webhook);
    expect(confirm.status).toBe(200);

    // Valider la commission
    await prisma.commissionApporteur.updateMany({
      where: { dossier_id: dossierId, apporteur_id: apporteur.id, statut: 'EN_ATTENTE' },
      data: { statut: 'VALIDEE' },
    });

    // Exécuter le reversement
    const agentHeaders = await auth(accounts.agent);
    const reversement = await request(API_URL)
      .post(`/api/agent/reversements/apporteurs/${apporteur.id}/execute`)
      .set(agentHeaders)
      .send({});
    expect([200, 201]).toContain(reversement.status);
  });
});
