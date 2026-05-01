const crypto = require('crypto');
const { request, auth, accounts, ids, prisma, API_URL, createApprenantAccount } = require('./helpers');

function signWebhookNgser(payload) {
  const secret = process.env.WEBHOOK_SECRET || 'dev-secret';
  return crypto.createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

async function waitForIpnWorker(options, maxWaitMs = 5000) {
  const { order_ngser, expectedStatus } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const paiement = await prisma.paiement.findUnique({
      where: { order_ngser },
    });

    if (paiement && paiement.statut === expectedStatus) {
      return paiement;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timeout: paiement ${order_ngser} did not reach status ${expectedStatus}`);
}

async function waitForIpnWorkerError(options, maxWaitMs = 5000) {
  const { order_ngser, expectedError } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: 'IPN_ERROR',
        metadata: {
          path: ['order_ngser'],
          equals: order_ngser,
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (auditLog && auditLog.metadata?.error?.includes(expectedError)) {
      return auditLog;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timeout: error ${expectedError} not found for ${order_ngser}`);
}

describe('RM-158/160 — IPN NGSER', () => {
  test('RM-158.1: IPN SUCCESS confirme paiement et passe dossier PAYE', async () => {
    const apprenant = await createApprenantAccount('ipn-success');
    const headers = await auth(apprenant);

    // Inscription
    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    expect(inscription.status).toBe(201);
    const dossierId = inscription.body.dossier.id;

    // Initiation
    const initiation = await request(API_URL)
      .post('/api/paiements/initier')
      .set(headers)
      .send({ dossier_id: dossierId });

    expect(initiation.status).toBe(201);
    const order_ngser = initiation.body.data.order_ngser;
    const montant_initie = initiation.body.data.montant_initie;

    // IPN SUCCESS
    const webhookBody = {
      order_ngser: order_ngser,
      transaction_id: `TXN-SUCCESS-${Date.now()}`,
      status: 'SUCCESS',
      code_ngser: '1',
      amount: montant_initie,
    };
    const signature = signWebhookNgser(webhookBody);

    const ipnResponse = await request(API_URL)
      .post('/webhooks/paiement')
      .set({ 'x-webhook-signature': signature })
      .send(webhookBody);

    expect(ipnResponse.status).toBe(200);
    expect(ipnResponse.body.statusCode).toBe(200);
    expect(ipnResponse.body.data.accepted).toBe(true);

    // Attendre traitement asynchrone
    await waitForIpnWorker({ order_ngser, expectedStatus: 'CONFIRME' });

    // Vérifier en DB
    const dossier = await prisma.dossier.findUnique({
      where: { id: dossierId },
      include: { paiement: true },
    });

    expect(dossier.statut).toBe('PAYE');
    expect(dossier.paiement.statut).toBe('CONFIRME');
    expect(dossier.paiement.transaction_id).toBe(webhookBody.transaction_id);
    expect(dossier.paiement.confirmed_at).toBeDefined();
  });

  test('RM-158.2: IPN doublon retourne 200 sans action', async () => {
    const apprenant = await createApprenantAccount('ipn-doublon');
    const headers = await auth(apprenant);

    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    const dossierId = inscription.body.dossier.id;

    const initiation = await request(API_URL)
      .post('/api/paiements/initier')
      .set(headers)
      .send({ dossier_id: dossierId });

    const webhookBody = {
      order_ngser: initiation.body.data.order_ngser,
      transaction_id: `TXN-DOUBLON-${Date.now()}`,
      status: 'SUCCESS',
      code_ngser: '1',
      amount: initiation.body.data.montant_initie,
    };
    const signature = signWebhookNgser(webhookBody);

    // Premier appel
    const ipn1 = await request(API_URL)
      .post('/webhooks/paiement')
      .set({ 'x-webhook-signature': signature })
      .send(webhookBody);

    expect(ipn1.status).toBe(200);

    await waitForIpnWorker({ order_ngser: webhookBody.order_ngser, expectedStatus: 'CONFIRME' });

    // Deuxième appel (doublon)
    const ipn2 = await request(API_URL)
      .post('/webhooks/paiement')
      .set({ 'x-webhook-signature': signature })
      .send(webhookBody);

    expect(ipn2.status).toBe(200);
    expect(ipn2.body.data.accepted).toBe(true);

    // Vérifier qu'il n'y a qu'une seule commission
    const paiement = await prisma.paiement.findUnique({
      where: { order_ngser: webhookBody.order_ngser },
    });

    const commissions = await prisma.commissionPartenaire.count({
      where: { paiement_id: paiement.id },
    });
    expect(commissions).toBeLessThanOrEqual(1);
  });

  test('RM-160: Montant invalide accepté HTTP puis rejeté par worker', async () => {
    const apprenant = await createApprenantAccount('ipn-montant');
    const headers = await auth(apprenant);

    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    const dossierId = inscription.body.dossier.id;

    const initiation = await request(API_URL)
      .post('/api/paiements/initier')
      .set(headers)
      .send({ dossier_id: dossierId });

    const webhookBody = {
      order_ngser: initiation.body.data.order_ngser,
      transaction_id: `TXN-FALSIFIE-${Date.now()}`,
      status: 'SUCCESS',
      code_ngser: '1',
      amount: 1, // falsification
    };
    const signature = signWebhookNgser(webhookBody);

    const ipnResponse = await request(API_URL)
      .post('/webhooks/paiement')
      .set({ 'x-webhook-signature': signature })
      .send(webhookBody);

    // L'endpoint répond 200 immédiatement
    expect(ipnResponse.status).toBe(200);
    expect(ipnResponse.body.data.accepted).toBe(true);

    // Attendre un peu que le worker traite
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Vérifier que le paiement reste PENDING (worker a rejeté le montant)
    const paiement = await prisma.paiement.findUnique({
      where: { order_ngser: webhookBody.order_ngser },
    });
    expect(paiement.statut).toBe('PENDING');
  });

  test('RM-158.3: IPN FAIL passe en ECHOUE + ANNULE', async () => {
    const apprenant = await createApprenantAccount('ipn-fail');
    const headers = await auth(apprenant);

    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    const dossierId = inscription.body.dossier.id;

    const initiation = await request(API_URL)
      .post('/api/paiements/initier')
      .set(headers)
      .send({ dossier_id: dossierId });

    const webhookBody = {
      order_ngser: initiation.body.data.order_ngser,
      transaction_id: `TXN-FAIL-${Date.now()}`,
      status: 'FAIL',
      code_ngser: '0',
      amount: initiation.body.data.montant_initie,
    };
    const signature = signWebhookNgser(webhookBody);

    const ipnResponse = await request(API_URL)
      .post('/webhooks/paiement')
      .set({ 'x-webhook-signature': signature })
      .send(webhookBody);

    expect(ipnResponse.status).toBe(200);

    await waitForIpnWorker({ order_ngser: webhookBody.order_ngser, expectedStatus: 'ECHOUE' });

    const dossier = await prisma.dossier.findUnique({
      where: { id: dossierId },
      include: { paiement: true },
    });

    expect(dossier.statut).toBe('ANNULE');
    expect(dossier.paiement.statut).toBe('ECHOUE');
  });

  test('RM-158.4: IPN PENDING reste PENDING', async () => {
    const apprenant = await createApprenantAccount('ipn-pending');
    const headers = await auth(apprenant);

    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    const dossierId = inscription.body.dossier.id;

    const initiation = await request(API_URL)
      .post('/api/paiements/initier')
      .set(headers)
      .send({ dossier_id: dossierId });

    const webhookBody = {
      order_ngser: initiation.body.data.order_ngser,
      transaction_id: `TXN-PENDING-${Date.now()}`,
      status: 'PENDING',
      code_ngser: '3',
      amount: initiation.body.data.montant_initie,
    };
    const signature = signWebhookNgser(webhookBody);

    const ipnResponse = await request(API_URL)
      .post('/webhooks/paiement')
      .set({ 'x-webhook-signature': signature })
      .send(webhookBody);

    expect(ipnResponse.status).toBe(200);

    await waitForIpnWorker({ order_ngser: webhookBody.order_ngser, expectedStatus: 'PENDING' });

    const paiement = await prisma.paiement.findUnique({
      where: { order_ngser: webhookBody.order_ngser },
    });

    expect(paiement.statut).toBe('PENDING');
    expect(paiement.ngser_payload_last).toBeDefined();
  });

  test('RM-158.5: Signature HMAC invalide rejetée', async () => {
    const webhookBody = {
      order_ngser: 'FRG-2026-999-FAKE',
      transaction_id: `TXN-FAKE-${Date.now()}`,
      status: 'SUCCESS',
      amount: 150000,
    };

    // Signature invalide
    const fakeSignature = 'invalid-signature';

    const ipnResponse = await request(API_URL)
      .post('/webhooks/paiement')
      .set({ 'x-webhook-signature': fakeSignature })
      .send(webhookBody);

    expect(ipnResponse.status).toBe(401);
    expect(ipnResponse.body.error).toBe('INVALID_SIGNATURE');
  });

  test('RM-158.6: IPN avec code_ngser numérique', async () => {
    const apprenant = await createApprenantAccount('ipn-code-numeric');
    const headers = await auth(apprenant);

    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    const dossierId = inscription.body.dossier.id;

    const initiation = await request(API_URL)
      .post('/api/paiements/initier')
      .set(headers)
      .send({ dossier_id: dossierId });

    const webhookBody = {
      order_ngser: initiation.body.data.order_ngser,
      transaction_id: `TXN-CODE-${Date.now()}`,
      status: 'SUCCESS',
      code_ngser: 1, // numérique au lieu de string
      amount: initiation.body.data.montant_initie,
    };
    const signature = signWebhookNgser(webhookBody);

    const ipnResponse = await request(API_URL)
      .post('/webhooks/paiement')
      .set({ 'x-webhook-signature': signature })
      .send(webhookBody);

    expect(ipnResponse.status).toBe(200);

    await waitForIpnWorker({ order_ngser: webhookBody.order_ngser, expectedStatus: 'CONFIRME' });

    const paiement = await prisma.paiement.findUnique({
      where: { order_ngser: webhookBody.order_ngser },
    });

    expect(paiement.statut).toBe('CONFIRME');
    expect(paiement.code_ngser).toBe('1'); // stocké en string
  });
});
