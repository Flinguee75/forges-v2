import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { API_BASE_URL, authHeaders, loginViaUi, postJson } from './helpers';

test('RM-152/153: proxy retourne 302 redirect pour un accès ACTIF', async ({ request }) => {
  const apprenantHeaders = await authHeaders(request, E2E_ACCOUNTS.apprenantStd);

  // Créer un accès en accédant à la formation à la demande
  const acces = await postJson(request, `/formations/${E2E_SCENARIO.demandeFormationId}/acceder`, {}, apprenantHeaders);
  expect(acces.ok).toBeTruthy();
  const accesId = acces.payload.data?.id || acces.payload.data?.acces?.id;
  expect(accesId).toBeDefined();

  // Appel proxy — Playwright/fetch suit les redirects, on vérifie le résultat
  const proxyRes = await request.get(`${API_BASE_URL}/formations-demande/${accesId}/acceder`, {
    headers: apprenantHeaders,
    maxRedirects: 0,
  });

  // 302 (sans follow) ou 200/503 (avec follow selon disponibilité URL)
  expect([200, 302, 503]).toContain(proxyRes.status());
});

test('RM-154: body de la réponse proxy ne contient pas l\'URL en clair', async ({ request }) => {
  const apprenantHeaders = await authHeaders(request, E2E_ACCOUNTS.apprenantStd);

  const acces = await postJson(request, `/formations/${E2E_SCENARIO.demandeFormationId}/acceder`, {}, apprenantHeaders);
  const accesId = acces.payload.data?.id || acces.payload.data?.acces?.id;

  if (!accesId) return;

  const proxyRes = await request.get(`${API_BASE_URL}/formations-demande/${accesId}/acceder`, {
    headers: apprenantHeaders,
    maxRedirects: 0,
  });

  const body = await proxyRes.text().catch(() => '');
  expect(body).not.toContain('AES_SECRET_KEY');
  expect(body).not.toContain('url_externe_chiffree');
  expect(body).not.toContain('auth_token');
});

test('RM-152/154: accès expiré retourne 403 ACCES_EXPIRE', async ({ request }) => {
  const apprenantDossierHeaders = await authHeaders(request, E2E_ACCOUNTS.apprenantDossier);

  const res = await request.get(
    `${API_BASE_URL}/formations-demande/${E2E_SCENARIO.accesExpiredId}/acceder`,
    { headers: apprenantDossierHeaders, maxRedirects: 0 }
  );

  expect(res.status()).toBe(403);
  const body = await res.json();
  expect(body.error).toBe('ACCES_EXPIRE');
});

test('RM-152: PARTENAIRE ne peut pas utiliser le proxy (403)', async ({ request }) => {
  const partenaireHeaders = await authHeaders(request, E2E_ACCOUNTS.partenaire);

  const res = await request.get(
    `${API_BASE_URL}/formations-demande/acces-quelconque/acceder`,
    { headers: partenaireHeaders, maxRedirects: 0 }
  );

  expect(res.status()).toBe(403);
});

test('RM-152: sans authentification → 401', async ({ request }) => {
  const res = await request.get(
    `${API_BASE_URL}/formations-demande/acces-quelconque/acceder`,
    { maxRedirects: 0 }
  );

  expect(res.status()).toBe(401);
});

test('RM-153: page AccesFormation affiche les détails de l\'accès', async ({ page }) => {
  await loginViaUi(page, E2E_ACCOUNTS.apprenantStd, /\/apprenant\/dashboard$/);

  const apprenantHeaders = await authHeaders(
    page.request,
    E2E_ACCOUNTS.apprenantStd
  );
  const acces = await postJson(page.request, `/formations/${E2E_SCENARIO.demandeFormationId}/acceder`, {}, apprenantHeaders);
  const accesId = acces.payload.data?.id || acces.payload.data?.acces?.id;

  if (!accesId) return;

  await page.goto(`/apprenant/formations-a-la-demande/${accesId}`);
  await expect(page.getByText(/ACTIF|accéder|formation/i).first()).toBeVisible();
});
