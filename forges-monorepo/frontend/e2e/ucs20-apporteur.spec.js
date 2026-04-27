import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { API_BASE_URL, authHeaders, getJson, loginAsApporteur, postJson } from './helpers';

test('UCS20 RM-142: le dashboard affiche le code apporteur permanent', async ({ page }) => {
  await loginAsApporteur(page);
  await page.goto('/apporteur/dashboard');

  await expect(page.getByRole('textbox').first()).toHaveValue(E2E_SCENARIO.apporteurCode);
});

test('UCS20 RM-146/RM-147: trois commissions du mois précédent sont validées puis reversables', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const scheduler = await postJson(request, '/apporteurs/scheduler/fin-mois', {}, adminHeaders);

  expect(scheduler.ok).toBeTruthy();
  expect(scheduler.payload.data?.nb_eligibles_reversement ?? scheduler.payload.nb_eligibles_reversement).toBeGreaterThanOrEqual(1);

  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);
  const pending = await getJson(request, '/agent/reversements/apporteurs', agentHeaders);
  const rows = Array.isArray(pending?.data) ? pending.data : pending;
  const apporteurRow = rows.find((item) => item.apporteur_id === 'apt-e2e-rm145-01');

  expect(apporteurRow).toBeTruthy();
  expect(apporteurRow.montant_total_xof).toBeGreaterThanOrEqual(5000);

  const reversement = await request.post(`${API_BASE_URL}/agent/reversements/apporteurs/apt-e2e-rm145-01/execute`, {
    headers: agentHeaders,
  });
  expect(reversement.ok()).toBeTruthy();
});
