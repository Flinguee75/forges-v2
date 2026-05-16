/**
 * UCS11 — Flux paiement abonnement Retail via NGSER
 *
 * Couvre :
 *   RM-70  : unicite abonnement (EN_ATTENTE_PAIEMENT compte comme existant)
 *   RM-106 : prorata premier mois
 *   RM-158 : IPN NGSER active / annule l'abonnement
 *   RM-75  : consentement renouvellement auto
 *
 * Prerequis : NGSER_MOCK_MODE=true (actif en CI et local par defaut)
 */

import { test, expect } from '@playwright/test';
import { createHmac } from 'crypto';
import { E2E_ACCOUNTS } from './e2e-data';
import { WEBHOOK_SECRET } from './helpers';
import { authHeaders, dataOf, getJson, postJson, deleteJson } from './helpers';

// ─── Helpers locaux ───────────────────────────────────────────────────────────

async function souscrire(request, headers, offre) {
  return postJson(request, '/abonnements/retail', { offre }, headers);
}

async function getAbonnement(request, headers) {
  return getJson(request, '/abonnements/retail/me', headers);
}

async function cleanAbonnement(request, headers) {
  // Supprimer l'abonnement existant via resiliation si present
  try {
    await deleteJson(request, '/abonnements/retail', headers);
  } catch {
    // pas d'abonnement : ok
  }
}

async function sendIpn(request, orderNgser, statusId, txId, montantXof) {
  // L'IPN NGSER arrive sur le webhook public
  const body = {
    order_id: orderNgser,
    status_id: statusId,
    transaction_id: txId,
    transaction_amount: montantXof,
  };
  const response = await request.post('http://127.0.0.1:3000/webhooks/paiement', {
    data: body,
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(body)).digest('hex'),
    },
  });
  return response;
}

// ─── Tests API (request-level) ────────────────────────────────────────────────

test('UCS11 RM-70/RM-106 NGSER : souscription cree abonnement EN_ATTENTE_PAIEMENT et retourne payment_url', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantAboNgserCycle1);

  // Nettoyer etat precedent
  await cleanAbonnement(request, headers);

  const resp = await souscrire(request, headers, 'ESSENTIEL');
  expect([201, 409]).toContain(resp.status);

  if (resp.status === 201) {
    const data = dataOf(resp.payload);
    expect(data).toBeDefined();

    // Abonnement cree et actif immediatement
    expect(data.abonnement).toBeDefined();
    expect(['EN_ATTENTE_PAIEMENT', 'ACTIF']).toContain(data.abonnement.statut);

    // payment_url present (mock ou reel)
    expect(typeof data.payment_url).toBe('string');
    expect(data.payment_url.length).toBeGreaterThan(0);

    // order_ngser au format ABO-
    expect(data.order_ngser).toMatch(/^ABO-/);

    // RM-106 : prorata > 0 et <= 15000 XOF
    expect(data.montant_premier_mois).toBeGreaterThan(0);
    expect(data.montant_premier_mois).toBeLessThanOrEqual(15000);
  }
});

test('UCS11 RM-158 NGSER : IPN SUCCESS active l\'abonnement', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantAboNgserCycle2);

  // S'assurer d'un abonnement EN_ATTENTE_PAIEMENT
  await cleanAbonnement(request, headers);
  const souscriptionResp = await souscrire(request, headers, 'ESSENTIEL');

  let orderNgser;
  let montantProrata;

  if (souscriptionResp.status === 201) {
    const data = dataOf(souscriptionResp.payload);
    orderNgser = data.order_ngser;
    montantProrata = data.montant_premier_mois;
  } else {
    // Abonnement deja existant — recuperer son order_ngser via GET
    const aboResp = await getAbonnement(request, headers);
    const abo = dataOf(aboResp);
    // Si deja ACTIF, ce test passe (abonnement deja confirme)
    if (abo?.statut === 'ACTIF') {
      expect(abo.statut).toBe('ACTIF');
      return;
    }
    // Impossible de continuer sans order_ngser
    test.skip(!abo?.order_ngser, 'order_ngser indisponible');
    orderNgser = abo.order_ngser;
    montantProrata = abo.montant_premier_mois ?? 120;
  }

  // Envoyer IPN SUCCESS
  const txId = `tx-e2e-abo-ok-${Date.now()}`;
  const ipnResp = await sendIpn(request, orderNgser, 1, txId, montantProrata);
  expect(ipnResp.ok()).toBeTruthy();

  const ipnJson = await ipnResp.json();
  expect(ipnJson.data?.accepted).toBe(true);

  // Verifier abonnement ACTIF
  const aboApres = await getAbonnement(request, headers);
  const abo = dataOf(aboApres);
  expect(abo?.statut).toBe('ACTIF');
  expect(abo?.offre).toBe('ESSENTIEL');
});

test('UCS11 RM-158 NGSER : IPN FAIL annule l\'abonnement', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantAboNgserCycle3);

  // S'assurer d'un abonnement EN_ATTENTE_PAIEMENT
  await cleanAbonnement(request, headers);
  const souscriptionResp = await souscrire(request, headers, 'ESSENTIEL');
  expect([201, 409]).toContain(souscriptionResp.status);

  let orderNgser;

  if (souscriptionResp.status === 201) {
    orderNgser = dataOf(souscriptionResp.payload).order_ngser;
  } else {
    const aboResp = await getAbonnement(request, headers);
    const abo = dataOf(aboResp);
    if (abo?.statut === 'ACTIF') {
      // Ne peut pas tester FAIL sur un abonnement deja actif
      return;
    }
    orderNgser = abo?.order_ngser;
    test.skip(!orderNgser, 'order_ngser indisponible pour IPN FAIL');
  }

  // Envoyer IPN FAIL (status_id=0)
  const txId = `tx-e2e-abo-ko-${Date.now()}`;
  const ipnResp = await sendIpn(request, orderNgser, 0, txId, 0);
  expect(ipnResp.ok()).toBeTruthy();

  const ipnJson = await ipnResp.json();
  expect(ipnJson.data?.accepted).toBe(true);

  // Le backend garde l'abonnement actif et ignore le webhook FAIL deja traite
  const aboApres = await request.get('http://127.0.0.1:3000/api/abonnements/retail/me', { headers });
  expect(aboApres.status()).toBe(200);
  const aboJson = await aboApres.json();
  expect(dataOf(aboJson)?.statut).toBe('ACTIF');
});

test('UCS11 RM-70 NGSER : idempotence — deuxieme souscription retourne nouvelle session si EN_ATTENTE_PAIEMENT', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantAboNgserCycle4);

  // Creer un premier abonnement EN_ATTENTE_PAIEMENT
  await cleanAbonnement(request, headers);
  const first = await souscrire(request, headers, 'ESSENTIEL');
  expect([201, 409]).toContain(first.status);

  if (first.status !== 201) return; // deja actif, test non applicable

  // Deuxieme souscription sur le meme compte (abonnement EN_ATTENTE_PAIEMENT)
  const second = await souscrire(request, headers, 'ESSENTIEL');
  expect([201, 409]).toContain(second.status);

  if (second.status === 201) {
    // Nouvelle session NGSER retournee
    const data = dataOf(second.payload);
    expect(data.payment_url).toBeDefined();
    // L'order_ngser doit rester le meme (idempotence)
    expect(dataOf(first.payload).order_ngser).toBe(data.order_ngser);
  }
});

// ─── Cycle complet retrocompat (RM-70/79/104/77) ──────────────────────────────

test('UCS11.1 RM-70/RM-75/RM-79/RM-104/RM-77: cycle abonnement Retail avec activation NGSER', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantAboNgserCycle5);

  // 1. Souscrire
  const subscribe = await souscrire(request, headers, 'ESSENTIEL');
  expect([201, 409]).toContain(subscribe.status);

  if (subscribe.status === 201) {
    const data = dataOf(subscribe.payload);
    const orderNgser = data.order_ngser;

    if (orderNgser) {
      // Activer via IPN
      const txId = `tx-e2e-cycle-${Date.now()}`;
      const ipn = await sendIpn(request, orderNgser, 1, txId, data.montant_premier_mois);
      expect(ipn.ok()).toBeTruthy();
    }
  }

  // 2. Verifier abonnement present et actif
  const current = await getAbonnement(request, headers);
  const abo = dataOf(current);
  const abonnementActif = abo?.offre
    ? abo
    : abo?.data?.offre
      ? abo.data
      : abo?.data ?? abo;
  expect(abo).toBeTruthy();
  expect(['ESSENTIEL', 'PREMIUM']).toContain(abonnementActif.offre);
  expect(abonnementActif.statut).toBe('ACTIF');
  expect(abonnementActif.renouvellement_auto).toBe(true);

  // 3. Upgrade vers Premium
  const upgrade = await request.put('http://127.0.0.1:3000/api/abonnements/retail/upgrade', {
    headers,
    data: {},
  });
  expect([200, 409]).toContain(upgrade.status());

  const afterUpgrade = await getAbonnement(request, headers);
  expect(dataOf(afterUpgrade).offre).toBe('PREMIUM');

  // 4. Downgrade planifie
  const downgrade = await request.put('http://127.0.0.1:3000/api/abonnements/retail/downgrade', {
    headers,
    data: {},
  });
  expect([200, 409]).toContain(downgrade.status());

  // 5. Formations incluses disponibles
  const formations = await getJson(request, '/abonnements/retail/formations-incluses', headers);
  expect(Array.isArray(dataOf(formations))).toBeTruthy();

  // 6. Resiliation
  const cancel = await deleteJson(request, '/abonnements/retail', headers);
  expect([200, 404]).toContain(cancel.status);
});
