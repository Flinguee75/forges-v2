import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { authHeaders, dataOf, getJson } from './helpers';

/**
 * Smoke test: golden path partenaire
 * login → dashboard → formations → reversements
 * Asserts HTTP 200 + minimal structure on each endpoint.
 */
test('partenaire smoke: login → dashboard → formations → reversements retournent 200 avec structure minimale', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.partenaire);
  expect(headers.Authorization).toMatch(/^Bearer .+/);

  const dashboardPayload = await getJson(request, '/partenaires/dashboard', headers);
  const dashboard = dataOf(dashboardPayload);
  expect(dashboard).toHaveProperty('formations');
  expect(dashboard).toHaveProperty('reversements');
  expect(Array.isArray(dashboard.formations)).toBe(true);

  const formationsPayload = await getJson(request, '/partenaires/formations', headers);
  const formations = dataOf(formationsPayload);
  expect(Array.isArray(formations)).toBe(true);
  if (formations.length > 0) {
    expect(formations[0]).toHaveProperty('id');
    expect(formations[0]).toHaveProperty('statut_validation');
  }

  const reversementsPayload = await getJson(request, '/partenaires/reversements', headers);
  const reversementsData = dataOf(reversementsPayload);
  expect(reversementsData).toHaveProperty('reversements');
  expect(reversementsData).toHaveProperty('totaux');
  expect(Array.isArray(reversementsData.reversements)).toBe(true);
});
