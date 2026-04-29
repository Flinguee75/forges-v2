import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { authHeaders, dataOf, deleteJson, getJson, postJson, putJson } from './helpers';

test('UCS11.1 RM-70/RM-75/RM-79/RM-104/RM-77: cycle abonnement Retail', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantRetail);

  const subscribe = await postJson(request, '/abonnements/retail', { offre: 'ESSENTIEL' }, headers);
  expect([201, 409]).toContain(subscribe.status);

  const current = await getJson(request, '/abonnements/retail/me', headers);
  expect(dataOf(current)).toBeTruthy();
  expect(['ESSENTIEL', 'PREMIUM']).toContain(dataOf(current).offre);
  expect(dataOf(current).renouvellement_auto).toBe(true);

  const upgrade = await putJson(request, '/abonnements/retail/upgrade', {}, headers);
  expect([200, 409]).toContain(upgrade.status);

  const afterUpgrade = await getJson(request, '/abonnements/retail/me', headers);
  expect(dataOf(afterUpgrade).offre).toBe('PREMIUM');

  const downgrade = await putJson(request, '/abonnements/retail/downgrade', {}, headers);
  expect([200, 409]).toContain(downgrade.status);

  const formations = await getJson(request, '/abonnements/retail/formations-incluses', headers);
  expect(Array.isArray(dataOf(formations))).toBeTruthy();

  const cancel = await deleteJson(request, '/abonnements/retail', headers);
  expect([200, 404]).toContain(cancel.status);
});
