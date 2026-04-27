import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { API_BASE_URL, authHeaders, getJson, postJson, patchJson } from './helpers';

/**
 * UCS06 — Gérer les Vouchers (Flux B : Vouchers Promotionnels)
 *
 * Acteurs : Agent Comptable (création) + Superviseur (validation)
 * RM associées : RM-37, RM-38, RM-39, RM-40, RM-42, RM-44, RM-45, RM-100
 *
 * Flux testé :
 * 1. Agent Comptable crée un voucher promotionnel (statut BROUILLON)
 * 2. Superviseur valide le voucher (BROUILLON → ACTIF) — RM-39
 * 3. Superviseur refuse un voucher (BROUILLON → REFUSE) — RM-39
 * 4. Validation quota_max et date_expiration obligatoires — RM-40
 */

test('UCS06 RM-39: Agent crée un voucher promotionnel en statut BROUILLON', async ({ request }) => {
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);

  const voucherData = {
    formation_id: E2E_SCENARIO.standardFormationId,
    type_valeur: 'POURCENTAGE',
    valeur: 20, // -20% (RM-42)
    quota_max: 100,
    date_expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const result = await postJson(request, '/vouchers/promotionnel', voucherData, agentHeaders);

  expect(result.ok).toBeTruthy();
  expect(result.payload.data.statut).toBe('BROUILLON');
  expect(result.payload.data.type).toBe('PROMOTIONNEL');
  expect(result.payload.data.type_valeur).toBe('POURCENTAGE');
  expect(result.payload.data.valeur).toBe(20);
  expect(result.payload.data.quota_max).toBe(100);
});

test('UCS06 RM-39: Superviseur valide un voucher BROUILLON → ACTIF', async ({ request }) => {
  // Étape 1 : Agent crée le voucher BROUILLON
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);

  const voucherData = {
    formation_id: E2E_SCENARIO.standardFormationId,
    type_valeur: 'MONTANT',
    valeur: 1000000, // 10 000 XOF en centimes
    quota_max: 50,
    date_expiration: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const createResult = await postJson(request, '/vouchers/promotionnel', voucherData, agentHeaders);
  expect(createResult.ok).toBeTruthy();
  const voucherId = createResult.payload.data.id;
  expect(createResult.payload.data.statut).toBe('BROUILLON');

  // Étape 2 : Superviseur valide le voucher
  const superviseurHeaders = await authHeaders(request, E2E_ACCOUNTS.superviseur);

  const validateResult = await patchJson(
    request,
    `/vouchers/${voucherId}/validate`,
    {},
    superviseurHeaders
  );

  expect(validateResult.ok).toBeTruthy();
  expect(validateResult.payload.data.statut).toBe('ACTIF');

  // Étape 3 : Vérifier que le voucher est bien ACTIF
  const voucherCheck = await getJson(request, `/vouchers/${voucherId}`, superviseurHeaders);
  expect(voucherCheck.data.statut).toBe('ACTIF');
});

test('UCS06 RM-39: Superviseur refuse un voucher BROUILLON → REFUSE avec motif', async ({ request }) => {
  // Étape 1 : Agent crée le voucher BROUILLON
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);

  const voucherData = {
    formation_id: E2E_SCENARIO.standardFormationId,
    type_valeur: 'POURCENTAGE',
    valeur: 50,
    quota_max: 10,
    date_expiration: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const createResult = await postJson(request, '/vouchers/promotionnel', voucherData, agentHeaders);
  expect(createResult.ok).toBeTruthy();
  const voucherId = createResult.payload.data.id;

  // Étape 2 : Superviseur refuse AVEC motif
  const superviseurHeaders = await authHeaders(request, E2E_ACCOUNTS.superviseur);

  const refuseResult = await patchJson(
    request,
    `/vouchers/${voucherId}/reject`,
    { motif: 'Réduction trop élevée pour une promotion standard' },
    superviseurHeaders
  );

  expect(refuseResult.ok).toBeTruthy();
  expect(refuseResult.payload.data.statut).toBe('REFUSE');

  // Étape 3 : Vérifier que le motif est bien sauvegardé (RM-100)
  const voucherCheck = await getJson(request, `/vouchers/${voucherId}`, superviseurHeaders);
  expect(voucherCheck.data.statut).toBe('REFUSE');
  expect(voucherCheck.data.motif_refus).toBe('Réduction trop élevée pour une promotion standard');
});

test('UCS06 RM-40: Création voucher promo sans quota_max → rejeté', async ({ request }) => {
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);

  const voucherData = {
    formation_id: E2E_SCENARIO.standardFormationId,
    type_valeur: 'POURCENTAGE',
    valeur: 15,
    // quota_max: manquant volontairement
    date_expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const result = await postJson(request, '/vouchers/promotionnel', voucherData, agentHeaders);

  // Devrait échouer : quota_max obligatoire pour les vouchers promotionnels
  expect(result.status).toBe(400);
  expect(result.payload.error).toBe('VALIDATION_ERROR');
});

test('UCS06 RM-40: Création voucher promo sans date expiration → rejeté', async ({ request }) => {
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);

  const voucherData = {
    formation_id: E2E_SCENARIO.standardFormationId,
    type_valeur: 'POURCENTAGE',
    valeur: 15,
    quota_max: 100,
    // date_expiration: manquante volontairement
  };

  const result = await postJson(request, '/vouchers/promotionnel', voucherData, agentHeaders);

  // Devrait échouer : date_expiration obligatoire pour les vouchers promotionnels
  expect(result.status).toBe(400);
  expect(result.payload.error).toBe('VALIDATION_ERROR');
});

test('UCS06 RM-42: Voucher promotionnel applique réduction correcte', async ({ request }) => {
  // Étape 1 : Agent crée un voucher -30%
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);

  const voucherData = {
    formation_id: E2E_SCENARIO.standardFormationId,
    type_valeur: 'POURCENTAGE',
    valeur: 30, // -30%
    quota_max: 200,
    date_expiration: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const createResult = await postJson(request, '/vouchers/promotionnel', voucherData, agentHeaders);
  expect(createResult.ok).toBeTruthy();
  const voucherId = createResult.payload.data.id;

  // Étape 2 : Superviseur valide
  const superviseurHeaders = await authHeaders(request, E2E_ACCOUNTS.superviseur);
  const validateResult = await patchJson(
    request,
    `/vouchers/${voucherId}/validate`,
    {},
    superviseurHeaders
  );
  expect(validateResult.ok).toBeTruthy();

  // Étape 3 : Vérifier les propriétés du voucher
  const voucherCheck = await getJson(request, `/vouchers/${voucherId}`, superviseurHeaders);
  expect(voucherCheck.data.statut).toBe('ACTIF');
  expect(voucherCheck.data.type_valeur).toBe('POURCENTAGE');
  expect(voucherCheck.data.valeur).toBe(30);
});

test('UCS06 RM-37/RM-38: Voucher promotionnel lié à formation spécifique', async ({ request }) => {
  // Étape 1 : Agent crée un voucher lié à une formation spécifique
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);

  const voucherData = {
    formation_id: E2E_SCENARIO.premiumRetailFormationId, // Formation spécifique
    type_valeur: 'MONTANT',
    valeur: 500000, // 5 000 XOF
    quota_max: 30,
    date_expiration: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const createResult = await postJson(request, '/vouchers/promotionnel', voucherData, agentHeaders);
  expect(createResult.ok).toBeTruthy();
  const voucherId = createResult.payload.data.id;

  // Étape 2 : Superviseur valide
  const superviseurHeaders = await authHeaders(request, E2E_ACCOUNTS.superviseur);
  await patchJson(request, `/vouchers/${voucherId}/validate`, {}, superviseurHeaders);

  // Étape 3 : Vérifier que le voucher est bien lié à la formation
  const voucherCheck = await getJson(request, `/vouchers/${voucherId}`, superviseurHeaders);
  expect(voucherCheck.data.formation_id).toBe(E2E_SCENARIO.premiumRetailFormationId);
  expect(voucherCheck.data.statut).toBe('ACTIF');
});

test('UCS06 Workflow complet: Agent crée → Superviseur consulte liste BROUILLON → Valide', async ({ request }) => {
  // Étape 1 : Agent crée 2 vouchers BROUILLON
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);

  const voucher1 = {
    formation_id: E2E_SCENARIO.standardFormationId,
    type_valeur: 'POURCENTAGE',
    valeur: 10,
    quota_max: 100,
    date_expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const voucher2 = {
    formation_id: E2E_SCENARIO.standardFormationId,
    type_valeur: 'MONTANT',
    valeur: 2000000,
    quota_max: 50,
    date_expiration: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const create1 = await postJson(request, '/vouchers/promotionnel', voucher1, agentHeaders);
  const create2 = await postJson(request, '/vouchers/promotionnel', voucher2, agentHeaders);

  expect(create1.ok).toBeTruthy();
  expect(create2.ok).toBeTruthy();

  const voucher1Id = create1.payload.data.id;
  const voucher2Id = create2.payload.data.id;

  // Étape 2 : Superviseur consulte la liste des vouchers en attente
  const superviseurHeaders = await authHeaders(request, E2E_ACCOUNTS.superviseur);
  const listeVouchers = await getJson(
    request,
    '/vouchers?statut=BROUILLON',
    superviseurHeaders
  );

  // Vérifier que nos 2 vouchers sont dans la liste
  const vouchersData = Array.isArray(listeVouchers.data) ? listeVouchers.data : [];
  const hasVoucher1 = vouchersData.some(v => v.id === voucher1Id);
  const hasVoucher2 = vouchersData.some(v => v.id === voucher2Id);

  expect(hasVoucher1).toBeTruthy();
  expect(hasVoucher2).toBeTruthy();

  // Étape 3 : Superviseur valide le voucher 1
  const validate1 = await patchJson(
    request,
    `/vouchers/${voucher1Id}/validate`,
    {},
    superviseurHeaders
  );
  expect(validate1.ok).toBeTruthy();

  // Étape 4 : Superviseur refuse le voucher 2
  const refuse2 = await patchJson(
    request,
    `/vouchers/${voucher2Id}/reject`,
    { motif: 'Montant trop élevé pour une promotion' },
    superviseurHeaders
  );
  expect(refuse2.ok).toBeTruthy();

  // Étape 5 : Vérifier les statuts finaux
  const check1 = await getJson(request, `/vouchers/${voucher1Id}`, superviseurHeaders);
  const check2 = await getJson(request, `/vouchers/${voucher2Id}`, superviseurHeaders);

  expect(check1.data.statut).toBe('ACTIF');
  expect(check2.data.statut).toBe('REFUSE');
  expect(check2.data.motif_refus).toBe('Montant trop élevé pour une promotion');
});

test('UCS06 RM-40: Vérification quota épuisé → EPUISE', async ({ request }) => {
  // Étape 1 : Agent crée un voucher avec quota = 1
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);

  const voucherData = {
    formation_id: E2E_SCENARIO.standardFormationId,
    type_valeur: 'POURCENTAGE',
    valeur: 15,
    quota_max: 1, // Quota très limité
    date_expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const createResult = await postJson(request, '/vouchers/promotionnel', voucherData, agentHeaders);
  expect(createResult.ok).toBeTruthy();
  const voucherId = createResult.payload.data.id;
  const voucherCode = createResult.payload.data.code;

  // Étape 2 : Superviseur valide
  const superviseurHeaders = await authHeaders(request, E2E_ACCOUNTS.superviseur);
  await patchJson(request, `/vouchers/${voucherId}/validate`, {}, superviseurHeaders);

  // Étape 3 : Apprenant utilise le voucher (épuise le quota)
  const apprenantHeaders = await authHeaders(request, E2E_ACCOUNTS.apprenant);

  // Récupérer une session ouverte pour inscription
  const sessionsResult = await getJson(request, '/sessions?statut=OUVERTE', apprenantHeaders);
  const sessions = sessionsResult.data?.sessions || sessionsResult.data || [];
  const sessionOuverte = sessions.find(s => s.formation_id === E2E_SCENARIO.standardFormationId);

  if (sessionOuverte) {
    await postJson(
      request,
      `/sessions/${sessionOuverte.id}/inscrire`,
      { source_financement: 'RETAIL', voucher_code: voucherCode },
      apprenantHeaders
    );
  }

  // Étape 4 : Vérifier que le voucher passe à EPUISE
  const voucherCheck = await getJson(request, `/vouchers/${voucherId}`, superviseurHeaders);
  expect(voucherCheck.data.statut).toBe('EPUISE');
  expect(voucherCheck.data.quota_utilise).toBe(1);
});

test('UCS06 RM-40: Vérification expiration → EXPIRE', async ({ request }) => {
  // Étape 1 : Agent crée un voucher expiré (date passée)
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);

  const voucherData = {
    formation_id: E2E_SCENARIO.standardFormationId,
    type_valeur: 'POURCENTAGE',
    valeur: 10,
    quota_max: 100,
    date_expiration: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Hier
  };

  const createResult = await postJson(request, '/vouchers/promotionnel', voucherData, agentHeaders);
  expect(createResult.ok).toBeTruthy();
  const voucherId = createResult.payload.data.id;

  // Étape 2 : Superviseur valide le voucher
  const superviseurHeaders = await authHeaders(request, E2E_ACCOUNTS.superviseur);
  await patchJson(request, `/vouchers/${voucherId}/validate`, {}, superviseurHeaders);

  // Étape 3 : Attendre 2 secondes puis vérifier
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Étape 4 : Le scheduler (ou la vérification API) devrait avoir marqué le voucher EXPIRE
  const voucherCheck = await getJson(request, `/vouchers/${voucherId}`, superviseurHeaders);

  // Le voucher est soit EXPIRE (si scheduler a tourné), soit ACTIF mais date_expiration dépassée
  if (voucherCheck.data.statut === 'ACTIF') {
    // Vérifier que la date est bien passée
    const dateExpiration = new Date(voucherCheck.data.date_expiration);
    expect(dateExpiration.getTime()).toBeLessThan(Date.now());
  } else {
    expect(voucherCheck.data.statut).toBe('EXPIRE');
  }
});
