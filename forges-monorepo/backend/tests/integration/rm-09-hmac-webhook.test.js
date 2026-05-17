const crypto = require('crypto');
const {
  createApprenantAccount,
  ids,
  prisma,
  request,
  API_URL,
} = require('./helpers');

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-secret';

function sign(payload) {
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
}

async function creerDossierPaiement(prefix) {
  const apprenant = await createApprenantAccount(prefix);
  const dossier = await prisma.dossier.create({
    data: {
      apprenant_id: apprenant.id,
      formation_id: ids.standardFormation,
      session_id: ids.standardSession,
      statut: 'PAYE_DIRECTEMENT',
      source_financement: 'RETAIL',
    },
  });
  const formation = await prisma.formation.findUnique({
    where: { id: ids.standardFormation },
  });
  const paiement = await prisma.paiement.create({
    data: {
      dossier_id: dossier.id,
      montant_catalogue: formation.cout_catalogue,
      montant_final: formation.cout_catalogue,
      montant_initie: formation.cout_catalogue,
      methode: 'MOBILE_MONEY',
      statut: 'EN_ATTENTE',
      tentatives: 0,
      provider: 'LEGACY',
    },
  });
  return { dossier, paiement, formation };
}

describe('RM-09 — Securite HMAC webhook paiement', () => {

  test('HMAC-1 — signature valide -> 200', async () => {
    const { dossier, paiement } = await creerDossierPaiement('hmac1');
    const payload = {
      transaction_id: `TX-HMAC1-${Date.now()}`,
      dossier_id: dossier.id,
      statut: 'SUCCESS',
      montant: paiement.montant_final,
    };
    const res = await request(API_URL)
      .post('/api/paiements/webhook')
      .set('x-webhook-signature', sign(payload))
      .send(payload);

    expect(res.status).toBe(200);
  });

  test('HMAC-2 — signature invalide -> 401', async () => {
    const { dossier, paiement } = await creerDossierPaiement('hmac2');
    const payload = {
      transaction_id: `TX-HMAC2-${Date.now()}`,
      dossier_id: dossier.id,
      statut: 'SUCCESS',
      montant: paiement.montant_final,
    };
    const res = await request(API_URL)
      .post('/api/paiements/webhook')
      .set('x-webhook-signature', 'mauvaise-signature')
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/INVALID_SIGNATURE/);
  });

  test('HMAC-3 — signature absente -> 401 (RM-09)', async () => {
    const { dossier, paiement } = await creerDossierPaiement('hmac3');
    const payload = {
      transaction_id: `TX-HMAC3-${Date.now()}`,
      dossier_id: dossier.id,
      statut: 'SUCCESS',
      montant: paiement.montant_final,
    };
    const res = await request(API_URL)
      .post('/api/paiements/webhook')
      .send(payload);

    expect(res.status).toBe(401);
  });

  test('HMAC-4 — NGSER : signature absente -> 401', async () => {
    const payload = { reference: 'TX-NGSER-TEST', statut: 'SUCCESS' };
    const res = await request(API_URL)
      .post('/webhooks/paiement')
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/SIGNATURE_MANQUANTE/);
  });

  test('HMAC-5 — NGSER : signature invalide -> 401', async () => {
    const payload = { reference: 'TX-NGSER-TEST', statut: 'SUCCESS' };
    const res = await request(API_URL)
      .post('/webhooks/paiement')
      .set('x-webhook-signature', 'fausse')
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/INVALID_SIGNATURE/);
  });
});
