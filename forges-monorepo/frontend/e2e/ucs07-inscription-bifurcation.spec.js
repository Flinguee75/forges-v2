import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { authHeaders, findDossier, loginViaUi, postJson } from './helpers';

test('UCS07 RM-140: Standard Retail passe en paiement direct', async ({ page, request }) => {
  await loginViaUi(page, E2E_ACCOUNTS.apprenantStd, /\/apprenant\/dashboard$/);
  await page.goto(`/apprenant/inscrire/${E2E_SCENARIO.standardFormationId}`);

  await expect(page.getByTestId(`session-option-${E2E_SCENARIO.standardSessionId}`)).toBeVisible();
  await page.getByTestId(`session-option-${E2E_SCENARIO.standardSessionId}`).check();
  await page.getByRole('radio', { name: /Paiement direct/i }).check();
  await page.getByTestId('submit-inscription').click();

  await expect(page).toHaveURL(/\/apprenant\/mes-dossiers$/);
  await expect(page.getByText('Payé directement')).toBeVisible();

  const headers = { Authorization: `Bearer ${await page.evaluate(() => window.sessionStorage.getItem('access_token'))}` };
  const dossier = await findDossier(request, headers, (item) => item.session_id === E2E_SCENARIO.standardSessionId);
  expect(dossier?.statut).toBe('PAYE_DIRECTEMENT');
  expect(dossier?.source_financement).toBe('RETAIL');
});

test('UCS07 RM-140: Premium Retail attend la vérification Responsable', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantPremiumRetail);
  const result = await postJson(request, `/sessions/${E2E_SCENARIO.premiumRetailSessionId}/inscrire`, {
    source_financement: 'RETAIL',
  }, headers);

  expect(result.ok).toBeTruthy();
  expect(result.payload?.dossier?.statut).toBe('EN_ATTENTE_VERIFICATION');
});

test('UCS07 RM-140: Premium B2B ne passe pas par la vérification Responsable', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantPremiumB2b);
  const result = await postJson(request, `/sessions/${E2E_SCENARIO.premiumB2bSessionId}/inscrire`, {
    source_financement: 'B2B',
  }, headers);

  expect(result.ok).toBeTruthy();
  expect(result.payload?.dossier?.statut).toBe('PAYE_DIRECTEMENT');
});
