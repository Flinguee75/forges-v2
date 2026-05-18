import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { authHeaders, getJson, loginAsOrganisation, postJson, putJson } from './helpers';

test('UCS03.2: Organisation voit son palier B2B courant et sa capacité', async ({ page, request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.organisation);
  const status = await getJson(request, '/abonnements/b2b/me', headers);
  const abonnement = status.data;

  expect(abonnement?.palier).toBeTruthy();
  expect(abonnement?.nb_max).toBeGreaterThan(0);

  await loginAsOrganisation(page);
  await page.goto('/organisation/b2b');

  await expect(page.getByText(new RegExp(abonnement.palier, 'i')).first()).toBeVisible();
  await expect(page.getByText(new RegExp(`${abonnement.nb_actifs}\\s*/\\s*${abonnement.nb_max}`)).first()).toBeVisible();
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
  const current = await getJson(request, '/abonnements/b2b/me', headers);

  if (current.data?.palier !== 'BUSINESS' && current.data?.nb_max < 50) {
    const upgrade = await putJson(request, '/abonnements/b2b/monter-palier', {
      nouveau_palier: 'BUSINESS',
    }, headers);

    expect(upgrade.ok).toBeTruthy();
  }

  const status = await getJson(request, '/abonnements/b2b/me', headers);
  expect(status.data?.nb_max).toBeGreaterThanOrEqual(50);
});

test('UCS03.2: palier Sur devis et abonnement déjà actif sont encadrés', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.organisation);

  const duplicate = await postJson(request, '/abonnements/b2b', {
    palier: 'SUR_DEVIS',
  }, headers);

  expect(duplicate.status).toBe(500);
  expect(duplicate.payload?.error ?? duplicate.payload?.message).toMatch(/PALIER_SUR_DEVIS_HORS_LIGNE/i);
});
