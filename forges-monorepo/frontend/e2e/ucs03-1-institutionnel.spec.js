import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { authHeaders, getJson, loginAsAdmin } from './helpers';

test('UCS03.1: le backoffice expose l’écran contrat institutionnel et la vue abonnements consolidée', async ({ page, request }) => {
  await loginAsAdmin(page);
  await page.goto('/backoffice/abonnements/contrat-institutionnel');

  await expect(page.getByRole('heading', { name: 'Contrat institutionnel', exact: true })).toBeVisible();

  const headers = await authHeaders(request, E2E_ACCOUNTS.admin);
  const abonnements = await getJson(request, '/abonnements/backoffice', headers);
  expect(abonnements.data?.meta?.total_organisation ?? abonnements.data?.organisation?.length ?? 0).toBeGreaterThanOrEqual(1);
});
