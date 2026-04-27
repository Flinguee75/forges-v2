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
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantPremiumRetail);
  const inscription = await postJson(request, `/sessions/${E2E_SCENARIO.partenaireSessionId}/inscrire`, {
    source_financement: 'RETAIL',
  }, headers);
  expect(inscription.ok).toBeTruthy();

  const dossier = inscription.payload.dossier;
  await createPaiementAndConfirm(request, headers, dossier.id, 'tx-ucs09-partenaire', 250000);

  const updated = await findDossier(request, headers, (item) => item.id === dossier.id);
  expect(updated?.statut).toBe('PAYE');
  expect(updated?.paiement?.statut).toBe('CONFIRME');
});

test('UCS09 RM-129: paiement partenaire génère une commission nette partenaire', async ({ request }) => {
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);
  const response = await getJson(request, '/agent/reversements/partenaires', agentHeaders);
  const rows = Array.isArray(response?.data) ? response.data : response;
  const partenaireReversement = rows.find((item) => item.partenaire_id === 'part-e2e-01');

  expect(partenaireReversement).toBeTruthy();
  expect(JSON.stringify(partenaireReversement)).not.toContain('commission_forges_pct');
});

test('UCS09 RM-145: paiement avec code apporteur crée une commission visible côté apporteur', async ({ page, request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantRm145);
  const inscription = await postJson(request, `/sessions/${E2E_SCENARIO.standardSessionId}/inscrire`, {
    source_financement: 'RETAIL',
    code_apporteur: E2E_SCENARIO.apporteurCode,
  }, headers);
  expect(inscription.ok).toBeTruthy();

  const { webhook } = await createPaiementAndConfirm(
    request,
    headers,
    inscription.payload.dossier.id,
    'tx-ucs09-apporteur',
    150000,
  );

  await loginAsApporteur(page);
  await page.goto('/apporteur/commissions');

  const commissionRow = page.getByRole('row', { name: new RegExp(webhook.transaction_id) });
  await expect(commissionRow).toBeVisible();
  await expect(commissionRow).toContainText('1 500 FCFA');
  await expect(commissionRow).toContainText('75 FCFA');
  await expect(commissionRow).toContainText('En attente');
});
