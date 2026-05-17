/**
 * Tests d'intégration — Retour NGSER (Payment Data Transfer)
 * Couvre: GET /api/paiements/retour (redirection post-paiement)
 * RM-158/160 — Phase v4.9
 */

const { request, auth, createApprenantAccount, ids, prisma, API_URL } = require('./helpers');
const crypto = require('crypto');

const MONTANT_CATALOGUE_XOF = 1500;

async function createDossierEtPaiement(prefix) {
  const account = await createApprenantAccount(prefix + '-' + Date.now());
  const headers = await auth(account);

  const inscription = await request(API_URL)
    .post(`/api/sessions/${ids.standardSession}/inscrire`)
    .set(headers)
    .send({ source_financement: 'RETAIL' });

  if (inscription.status !== 201) {
    throw new Error(`Inscription échouée: ${inscription.status} — ${JSON.stringify(inscription.body)}`);
  }

  const dossierId = inscription.body.dossier.id;

  const initiation = await request(API_URL)
    .post('/api/paiements/initier')
    .set(headers)
    .send({ dossier_id: dossierId });

  if (initiation.status !== 201) {
    throw new Error(`Initiation paiement échouée: ${initiation.status} — ${JSON.stringify(initiation.body)}`);
  }

  const paiement = await prisma.paiement.findUnique({ where: { dossier_id: dossierId } });
  return { account, headers, dossierId, paiement };
}

describe('Retour NGSER — GET /api/paiements/retour (Payment Data Transfer)', () => {
  afterEach(async () => {
    await prisma.commissionPartenaire.deleteMany({
      where: { paiement: { dossier_id: { startsWith: 'D-RETOUR-' } } },
    });
    await prisma.paiement.deleteMany({
      where: { dossier_id: { startsWith: 'D-RETOUR-' } },
    });
    await prisma.dossier.deleteMany({
      where: { id: { startsWith: 'D-RETOUR-' } },
    });
  });

  describe('Redirection post-paiement', () => {
    test('status_id=1 (succès) redirige vers le frontend avec status=success', async () => {
      const { paiement } = await createDossierEtPaiement('retour-success');

      const res = await request(API_URL)
        .get('/api/paiements/retour')
        .query({
          order_id: paiement.order_ngser,
          status_id: '1',
          transaction_id: `TXN-RETOUR-OK-${Date.now()}`,
          transaction_amount: String(MONTANT_CATALOGUE_XOF),
        })
        .redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('status=success');
      expect(res.headers.location).toContain(`order_id=${paiement.order_ngser}`);
      expect(res.headers.location).toContain('/apprenant/paiements/callback');
    });

    test('status_id=0 (échec) redirige avec status=fail', async () => {
      const { paiement } = await createDossierEtPaiement('retour-fail');

      const res = await request(API_URL)
        .get('/api/paiements/retour')
        .query({
          order_id: paiement.order_ngser,
          status_id: '0',
          transaction_id: `TXN-RETOUR-FAIL-${Date.now()}`,
          transaction_amount: String(MONTANT_CATALOGUE_XOF),
        })
        .redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('status=fail');
      expect(res.headers.location).toContain('/apprenant/paiements/callback');
    });

    test('status_id=2 (montant insuffisant) redirige avec status=fail et status_id=2', async () => {
      const { paiement } = await createDossierEtPaiement('retour-insuff');

      const res = await request(API_URL)
        .get('/api/paiements/retour')
        .query({
          order_id: paiement.order_ngser,
          status_id: '2',
          transaction_id: `TXN-RETOUR-INSUFF-${Date.now()}`,
          transaction_amount: String(MONTANT_CATALOGUE_XOF - 100),
        })
        .redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('status=fail');
      expect(res.headers.location).toContain('status_id=2');
    });

    test('inclut transaction_id dans l\'URL de redirection', async () => {
      const { paiement } = await createDossierEtPaiement('retour-txnid');
      const txnId = `TXN-RETOUR-ID-${Date.now()}`;

      const res = await request(API_URL)
        .get('/api/paiements/retour')
        .query({
          order_id: paiement.order_ngser,
          status_id: '1',
          transaction_id: txnId,
          transaction_amount: String(MONTANT_CATALOGUE_XOF),
        })
        .redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain(`transaction_id=${txnId}`);
    });

    test('sans order_id redirige quand même sans crash (302)', async () => {
      const res = await request(API_URL)
        .get('/api/paiements/retour')
        .query({ status_id: '0' })
        .redirects(0);

      expect(res.status).toBe(302);
    });
  });

  describe('Fallback IPN via retour (RM-158)', () => {
    test('status_id=1 déclenche le traitement IPN en fallback et confirme le paiement', async () => {
      const { dossierId, paiement } = await createDossierEtPaiement('retour-ipn-fallback');

      await request(API_URL)
        .get('/api/paiements/retour')
        .query({
          order_id: paiement.order_ngser,
          status_id: '1',
          transaction_id: `TXN-FALLBACK-${Date.now()}`,
          transaction_amount: String(MONTANT_CATALOGUE_XOF),
        })
        .redirects(0);

      // Attendre le traitement asynchrone
      await new Promise((resolve) => setTimeout(resolve, 300));

      const paiementUpdated = await prisma.paiement.findUnique({ where: { id: paiement.id } });
      expect(paiementUpdated.statut).toBe('CONFIRME');

      const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } });
      expect(dossier.statut).toBe('PAYE');
    });

    test('status_id=0 déclenche le fallback IPN et échoue le paiement', async () => {
      const { dossierId, paiement } = await createDossierEtPaiement('retour-ipn-fail');

      await request(API_URL)
        .get('/api/paiements/retour')
        .query({
          order_id: paiement.order_ngser,
          status_id: '0',
          transaction_id: `TXN-FALLBACK-FAIL-${Date.now()}`,
          transaction_amount: String(MONTANT_CATALOGUE_XOF),
        })
        .redirects(0);

      await new Promise((resolve) => setTimeout(resolve, 300));

      const paiementUpdated = await prisma.paiement.findUnique({ where: { id: paiement.id } });
      expect(paiementUpdated.statut).toBe('ECHOUE');

      const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } });
      expect(dossier.statut).toBe('ANNULE');
    });
  });
});

describe('IPN NGSER sans signature — RM-158', () => {
  afterEach(async () => {
    await prisma.commissionPartenaire.deleteMany({
      where: { paiement: { dossier_id: { startsWith: 'D-NOSIG-' } } },
    });
    await prisma.paiement.deleteMany({
      where: { dossier_id: { startsWith: 'D-NOSIG-' } },
    });
    await prisma.dossier.deleteMany({
      where: { id: { startsWith: 'D-NOSIG-' } },
    });
  });

  test('IPN sans x-webhook-signature est accepté et traité (200 accepted:true)', async () => {
    const account = await createApprenantAccount('nosig-' + Date.now());
    const headers = await auth(account);

    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    const dossierId = inscription.body.dossier.id;

    await request(API_URL)
      .post('/api/paiements/initier')
      .set(headers)
      .send({ dossier_id: dossierId });

    const paiement = await prisma.paiement.findUnique({ where: { dossier_id: dossierId } });

    const ipnPayload = {
      order_id: paiement.order_ngser,
      status_id: 1,
      transaction_id: `TXN-NOSIG-${Date.now()}`,
      transaction_amount: MONTANT_CATALOGUE_XOF,
    };

    // Envoi sans header x-webhook-signature
    const res = await request(API_URL)
      .post('/webhooks/paiement')
      .send(ipnPayload);

    expect(res.status).toBe(200);
    expect(res.body.data.accepted).toBe(true);

    // Attendre le traitement
    await new Promise((resolve) => setTimeout(resolve, 500));

    const paiementUpdated = await prisma.paiement.findUnique({ where: { id: paiement.id } });
    expect(paiementUpdated.statut).toBe('CONFIRME');
  });

  test('IPN avec signature invalide est rejeté (401)', async () => {
    const ipnPayload = {
      order_id: 'FRG-NOSIG-FAKE',
      status_id: 1,
      transaction_id: `TXN-BADSIG-${Date.now()}`,
      transaction_amount: MONTANT_CATALOGUE_XOF,
    };

    const res = await request(API_URL)
      .post('/webhooks/paiement')
      .set('x-webhook-signature', 'mauvaise-signature')
      .send(ipnPayload);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_SIGNATURE');
  });
});
