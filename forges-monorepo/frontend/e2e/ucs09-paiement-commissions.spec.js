import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import {
  authHeaders,
  createPaiementAndConfirm,
  findDossier,
  getJson,
  loginAsApporteur,
  postJson,
} from './helpers';

test('UCS09 RM-09: webhook SUCCESS confirme le paiement et passe le dossier en PAYE', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantDossier);
  const dossierId = E2E_SCENARIO.dossierRetenuId;

  // Initier paiement NGSER
  const paiementResponse = await postJson(request, '/paiements/initier', {
    dossier_id: dossierId,
  }, headers);
  expect(paiementResponse.ok).toBeTruthy();

  // Envoyer webhook SUCCESS
  const webhookBody = {
    transaction_id: `tx-ucs09-partenaire-${Date.now()}`,
    dossier_id: dossierId,
    statut: 'SUCCESS',
    montant: 250000,
  };

  const webhookResponse = await postJson(request, '/paiements/webhook', webhookBody, {});
  expect(webhookResponse.ok).toBeTruthy();

  const updated = await findDossier(request, headers, (item) => item.id === dossierId);
  expect(updated?.statut).toBe('PAYE');
  expect(updated?.paiement?.statut).toBe('CONFIRME');
});

test('UCS09 RM-129: paiement partenaire génère une commission nette partenaire', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantMismatch2);
  const inscription = await postJson(request, `/sessions/${E2E_SCENARIO.partenaireSessionId}/inscrire`, {
    source_financement: 'RETAIL',
  }, headers);
  expect(inscription.ok).toBeTruthy();

  const dossierId = inscription.payload.dossier.id;
  const paiementResponse = await postJson(request, '/paiements/initier', {
    dossier_id: dossierId,
  }, headers);
  expect(paiementResponse.ok).toBeTruthy();

  const webhookResponse = await postJson(request, '/paiements/webhook', {
    transaction_id: `tx-ucs09-partenaire-${Date.now()}`,
    dossier_id: dossierId,
    statut: 'SUCCESS',
    montant: 250000,
  }, {});
  expect(webhookResponse.ok).toBeTruthy();

  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);
  const response = await getJson(request, '/agent/reversements/partenaires', agentHeaders);
  const rows = Array.isArray(response?.data) ? response.data : response;
  const partenaireReversement = rows.find((item) => item.partenaire_id === 'part-e2e-01');

  expect(partenaireReversement).toBeTruthy();
  expect(JSON.stringify(partenaireReversement)).not.toContain('commission_forges_pct');
});

test('UCS09 RM-145: paiement avec code apporteur crée une commission visible côté apporteur', async ({ page, request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantMismatch1);
  const inscription = await postJson(request, `/sessions/${E2E_SCENARIO.standardSessionId}/inscrire`, {
    source_financement: 'RETAIL',
    code_apporteur: E2E_SCENARIO.apporteurCode,
  }, headers);
  expect(inscription.ok).toBeTruthy();

  const dossierId = inscription.payload.dossier.id;

  // Initier paiement NGSER
  const paiementResponse = await postJson(request, '/paiements/initier', {
    dossier_id: dossierId,
  }, headers);
  expect(paiementResponse.ok).toBeTruthy();

  // Envoyer webhook SUCCESS
  const transactionId = `tx-ucs09-apporteur-${Date.now()}`;
  const webhookBody = {
    transaction_id: transactionId,
    dossier_id: dossierId,
    statut: 'SUCCESS',
    montant: 150000,
  };

  const webhookResponse = await postJson(request, '/paiements/webhook', webhookBody, {});
  expect(webhookResponse.ok).toBeTruthy();

  await loginAsApporteur(page);
  await page.goto('/apporteur/commissions');

  const commissionRow = page.getByRole('row', { name: new RegExp(transactionId) });
  await expect(commissionRow).toBeVisible();
  await expect(commissionRow).toContainText('1 500 FCFA');
  await expect(commissionRow).toContainText('75 FCFA');
  await expect(commissionRow).toContainText('En attente');
});

/**
 * RM-157 NGSER - Initiation paiement backend-only
 * Montant recalculé côté backend, order_ngser généré
 */
test('UCS09 RM-157 NGSER: Initiation paiement crée order_ngser et payment_url', async ({ request }) => {
  // 1. Créer une inscription
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantRecon1);
  const inscription = await postJson(request, `/sessions/${E2E_SCENARIO.standardSessionId}/inscrire`, {
    source_financement: 'RETAIL',
  }, headers);
  if (!inscription.ok) {
    console.log('RM-157 INSCRIPTION FAILED:', JSON.stringify(inscription, null, 2));
  }
  expect(inscription.ok).toBeTruthy();

  const dossier = inscription.payload.dossier;
  const dossierId = dossier.id;

  // 2. Initier paiement NGSER (nouveau endpoint RM-157)
  const paiementResponse = await postJson(request, '/paiements/initier', {
    dossier_id: dossierId,
  }, headers);

  expect(paiementResponse.ok).toBeTruthy();
  const paiementData = paiementResponse.payload?.data || paiementResponse.payload;

  // 3. Vérifier que order_ngser est créé au format FRG-YYYY-SEQ-XXXXXX
  expect(paiementData.order_ngser).toBeTruthy();
  expect(paiementData.order_ngser).toMatch(/^FRG-\d{4}-\d+-\w+$/);

  // 4. Vérifier que payment_url est présent (redirection vers NGSER ou mock en test)
  expect(paiementData.payment_url).toBeTruthy();
  // En environnement test, peut être mock-ngser.forges.ci ou securetest.crossroad-africa.net
  expect(paiementData.payment_url).toMatch(/(mock-ngser\.forges\.ci|securetest\.crossroad-africa\.net)/);

  // 5. Vérifier que paiement est créé avec statut PENDING
  const dossierAfter = await findDossier(request, headers, (item) => item.id === dossierId);
  expect(dossierAfter?.paiement?.statut).toBe('PENDING');
  // Provider peut être présent ou non dans la réponse
  if (dossierAfter?.paiement?.provider) {
    expect(dossierAfter.paiement.provider).toBe('NGSER');
  }

  console.log(`✅ RM-157 OK: order_ngser=${paiementData.order_ngser}`);
});
