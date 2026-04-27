import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { API_BASE_URL, authHeaders, loginViaUi, postJson } from './helpers';

test('UCS14 RM-92/RM-94: un abonné accède à une formation Standard à la demande', async ({ page, request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantStd);
  const response = await postJson(request, `/formations/${E2E_SCENARIO.demandeFormationId}/acceder`, {}, headers);

  expect(response.ok).toBeTruthy();
  // Le controller retourne { statusCode, data: acces, message }
  const acces = response.payload.data;
  expect(acces).toBeDefined();
  expect(acces.statut).toBe('ACTIF');
  expect(acces.source_financement).toBe('ABONNEMENT');

  await loginViaUi(page, E2E_ACCOUNTS.apprenantStd, /\/apprenant\/dashboard$/);
  await page.goto(`/apprenant/formations-a-la-demande/${acces.id}`);
  await expect(page.getByText(/ACTIF/i)).toBeVisible();
});

test('UCS14 RM-92: un accès expiré retourne EXPIRE/ACCES_EXPIRE', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantDossier);
  const response = await request.get(`${API_BASE_URL}/espace-apprenant/formations-demande/${E2E_SCENARIO.accesExpiredId}`, { headers });

  expect(response.status()).toBe(410);
  expect((await response.json()).error).toBe('ACCES_EXPIRE');
});
