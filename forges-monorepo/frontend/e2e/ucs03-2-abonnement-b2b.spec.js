import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { authHeaders, getJson, loginAsOrganisation, putJson } from './helpers';

test('UCS03.2: Organisation voit son palier B2B STARTER et sa limite de 5 apprenants', async ({ page, request }) => {
  await loginAsOrganisation(page);
  await page.goto('/organisation/b2b');

  await expect(page.getByText(/STARTER|Starter/i).first()).toBeVisible();
  await expect(page.getByText(/1\s*\/\s*5|5 apprenants/i).first()).toBeVisible();

  const headers = await authHeaders(request, E2E_ACCOUNTS.organisation);
  const status = await getJson(request, '/abonnements/b2b/me', headers);
  expect(status.data?.palier).toBe('STARTER');
  expect(status.data?.nb_max).toBe(5);
});

test('UCS03.2 RM-102: le catalogue expose les formations Standard incluses abonnement', async ({ request }) => {
  const payload = await getJson(request, '/formations');
  const formations = Array.isArray(payload.data) ? payload.data : (payload.data?.formations || payload.formations || []);
  const standard = formations.find((formation) => formation.id === 'F-E2E-STD-01');

  expect(standard).toBeTruthy();
  expect(standard.inclus_abonnement).toBe(true);
  expect(standard.type_formation).toBe('STANDARD');
});

test('UCS03.2: montée BUSINESS recalcule la capacité B2B', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.organisation);
  const upgrade = await putJson(request, '/abonnements/b2b/monter-palier', {
    nouveau_palier: 'BUSINESS',
  }, headers);

  expect(upgrade.ok).toBeTruthy();

  const status = await getJson(request, '/abonnements/b2b/me', headers);
  expect(status.data?.palier).toBe('BUSINESS');
  expect(status.data?.nb_max).toBe(50);
});
