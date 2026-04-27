import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { API_BASE_URL, authHeaders, getJson, loginAsPartenaire, postJson, putJson } from './helpers';

test('UCS17 RM-126: Flux A active un partenaire invité avec token 48h', async ({ request }) => {
  const response = await postJson(request, '/partenaires/activate', {
    token: 'token-partenaire-e2e',
    password: E2E_ACCOUNTS.partenaire.password,
  });

  expect(response.ok).toBeTruthy();
  expect(response.payload.data?.partenaire?.statut || response.payload.data?.statut).toBe('ACTIF');
});

test('UCS17 RM-126: Flux B crée une auto-inscription partenaire en attente', async ({ request }) => {
  const email = `partenaire-auto-${Date.now()}@forges.ci`;
  const response = await postJson(request, '/partenaires/register', {
    raison_sociale: 'Partenaire auto E2E',
    type: 'UNIVERSITE',
    pays: 'CI',
    email_principal: email,
    password: E2E_ACCOUNTS.partenaire.password,
  });

  expect(response.ok).toBeTruthy();
  expect(response.payload.data?.statut).toBe('EN_ATTENTE_VERIFICATION');
});

test('UCS17 RM-127: le formulaire partenaire n’expose pas type_formation ni pilier_abonnement', async ({ page }) => {
  await loginAsPartenaire(page);
  await page.goto('/partenaire/soumettre-formation');

  await expect(page.locator('[name="type_formation"], [data-testid="type-formation"]')).toHaveCount(0);
  await expect(page.locator('[name="pilier_abonnement"], [data-testid="pilier-abonnement"]')).toHaveCount(0);
  await expect(page.getByText(/assignés par FORGES|classification/i).first()).toBeVisible();
});

test('UCS18 RM-127/RM-137: Responsable valide, assigne le type et calcule le prix catalogue', async ({ request }) => {
  const responsableHeaders = await authHeaders(request, E2E_ACCOUNTS.responsable);
  const validation = await putJson(request, `/responsable/validations/${E2E_SCENARIO.formationPartenaireMetaId}/valider`, {
    type_formation: 'STANDARD',
    pilier_abonnement: 'RETAIL',
    prix_coutant_valide: 200000,
  }, responsableHeaders);

  expect(validation.ok).toBeTruthy();
  expect(validation.payload.data.type_formation).toBe('STANDARD');
  expect(validation.payload.data.prix_catalogue).toBe(250000);
  expect(validation.payload.data.inclus_abonnement).toBe(true);

  const formation = await getJson(request, `/formations/${E2E_SCENARIO.partenaireFormationId}`, responsableHeaders);
  expect(formation.data?.type_formation || formation.type_formation).toBe('STANDARD');
  expect(formation.data?.cout_catalogue || formation.cout_catalogue).toBe(250000);
});
