import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { API_BASE_URL, authHeaders, getJson, loginViaUi, postJson } from './helpers';

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

test('UCS14 RM-88/RM-90/RM-95: Premium affiche réduction abonné mais reste hors accès abonnement', async ({ request }) => {
  const premiumHeaders = await authHeaders(request, E2E_ACCOUNTS.apprenantPremiumRetail);
  const detail = await getJson(request, `/formations/${E2E_SCENARIO.premiumRetailFormationId}`, premiumHeaders);

  expect(detail.data?.badge).toBe('Premium');
  expect(detail.data?.prix_affiche).toBe(Math.round(detail.data.cout_catalogue * 0.85));

  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const created = await postJson(request, '/formations', {
    intitule: `Premium demande E2E ${Date.now()}`,
    description_courte: 'Premium à la demande hors abonnement',
    description_longue: 'Couverture UCS14 RM-95',
    duree_jours: 2,
    cout_catalogue: 200000,
    type_formation: 'PREMIUM',
    mode_formation: 'A_LA_DEMANDE',
    pilier_abonnement: 'RETAIL',
    langues_disponibles: ['FR'],
    certification_delivree: true,
    objectifs_pedagogiques: ['Valider Premium payant'],
  }, adminHeaders);
  expect(created.ok).toBeTruthy();

  const premiumDemandId = created.payload.data?.id || created.payload.id;
  const access = await postJson(request, `/formations/${premiumDemandId}/acceder`, {}, premiumHeaders);
  expect(access.status).toBe(402);
  expect(access.payload.error).toBe('NOT_INCLUDED_IN_SUBSCRIPTION');
});
