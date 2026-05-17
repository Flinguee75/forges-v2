import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { API_BASE_URL, authHeaders, dataOf, getJson, loginAsAdmin } from './helpers';

test('UCS10: Admin consulte dashboards et exports rapports', async ({ page, request }) => {
  await loginAsAdmin(page);
  await page.goto('/backoffice/dashboard');

  await expect(page.getByText(/dashboard|tableau de bord|formations|apprenants/i).first()).toBeVisible();

  const headers = await authHeaders(request, E2E_ACCOUNTS.admin);
  const stats = await getJson(request, '/dashboard/stats/global', headers);
  expect(dataOf(stats)).toBeTruthy();

  const rapports = await getJson(request, '/dashboard/rapports', headers);
  expect(dataOf(rapports)).toBeTruthy();

  const csv = await request.get(`${API_BASE_URL}/dashboard/rapports/export/csv`, { headers });
  expect(csv.ok()).toBeTruthy();
  expect(await csv.text()).toMatch(/formation|paiement|dossier|rapport/i);

  const pdf = await request.get(`${API_BASE_URL}/dashboard/rapports/export/pdf`, { headers });
  expect(pdf.ok()).toBeTruthy();
});
