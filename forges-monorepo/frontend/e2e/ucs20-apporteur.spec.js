import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { API_BASE_URL, authHeaders, getJson, loginAsApporteur, postJson } from './helpers';

test('UCS20 RM-142: le dashboard affiche le code apporteur permanent', async ({ page }) => {
  await loginAsApporteur(page);
  await page.goto('/apporteur/dashboard');

  await expect(page.getByRole('textbox').first()).toHaveValue(E2E_SCENARIO.apporteurCode);
});

test('UCS20 RM-145/RM-147: l apporteur consulte commissions et profil', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apporteur);
  const dashboard = await getJson(request, '/apporteurs/dashboard', headers);
  const commissions = await getJson(request, '/apporteurs/commissions', headers);
  const profil = await getJson(request, '/apporteurs/profil', headers);

  expect(dashboard.data?.code_apporteur || dashboard.data?.apporteur?.code_apporteur).toBe(E2E_SCENARIO.apporteurCode);
  expect(Array.isArray(commissions.data) || Array.isArray(commissions.data?.commissions)).toBeTruthy();
  expect(profil.data?.email).toBe(E2E_ACCOUNTS.apporteur.email);
});

test('UCS20 RM-146/RM-147: trois commissions du mois précédent sont validées puis reversables', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const scheduler = await postJson(request, '/apporteurs/scheduler/fin-mois', {}, adminHeaders);

  expect(scheduler.ok).toBeTruthy();

  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);
  const pending = await getJson(request, '/agent/reversements/apporteurs', agentHeaders);
  const rows = Array.isArray(pending?.data) ? pending.data : pending;
  const apporteurRow = rows.find((item) => item.apporteur_id === E2E_SCENARIO.apporteurId);

  expect(apporteurRow).toBeTruthy();
  expect(apporteurRow.montant_total_xof).toBeGreaterThanOrEqual(5000);

  const reversement = await request.post(`${API_BASE_URL}/agent/reversements/apporteurs/${E2E_SCENARIO.apporteurId}/execute`, {
    headers: agentHeaders,
  });
  expect(reversement.ok()).toBeTruthy();
});
