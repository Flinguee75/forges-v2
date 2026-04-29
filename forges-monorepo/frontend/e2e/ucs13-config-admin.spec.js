import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { authHeaders, dataOf, getJson, loginAsAdmin, putJson } from './helpers';

test('UCS13: Admin consulte et met à jour la configuration globale', async ({ page, request }) => {
  await loginAsAdmin(page);
  await page.goto('/backoffice/config');

  await expect(page.getByText(/configuration|commission|seuil|bot/i).first()).toBeVisible();

  const headers = await authHeaders(request, E2E_ACCOUNTS.admin);
  const config = await getJson(request, '/backoffice/config', headers);
  expect(dataOf(config).default_commission_forges_pct).toBeGreaterThanOrEqual(0);
  expect(dataOf(config).seuil_reversement_apporteur_xof).toBeGreaterThanOrEqual(0);

  const update = await putJson(request, '/backoffice/config', {
    DEFAULT_COMMISSION_FORGES_PCT: 20,
    DEFAULT_COMMISSION_APPORTEUR_PCT: 5,
    SEUIL_REVERSEMENT_PARTENAIRE_XOF: 50000,
    SEUIL_REVERSEMENT_APPORTEUR_XOF: 5000,
    VALIDATION_PARTENAIRE_DELAI_JOURS: 5,
  }, headers);

  expect(update.ok).toBeTruthy();
  expect(dataOf(update.payload).default_commission_apporteur_pct).toBe(5);
});

test('UCS13 RM-124: Admin accède au backoffice des enquêtes catalogue bot', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.admin);
  const enquetes = await getJson(request, '/bot/backoffice/enquetes', headers);
  const feedbacks = await getJson(request, '/bot/backoffice/feedbacks', headers);

  expect(dataOf(enquetes).meta.total).toBeGreaterThanOrEqual(0);
  expect(dataOf(feedbacks).meta.total).toBeGreaterThanOrEqual(0);
});
