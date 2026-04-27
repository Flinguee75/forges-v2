import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { API_BASE_URL, authHeaders, loginViaUi } from './helpers';

test('UCS11: l’espace apprenant affiche les dossiers avec leurs statuts', async ({ page }) => {
  await loginViaUi(page, E2E_ACCOUNTS.apprenantDossier, /\/apprenant\/dashboard$/);
  await page.goto('/apprenant/mes-dossiers');

  const dossierPaye = page.getByTestId(`dossier-card-${E2E_SCENARIO.dossierPayeId}`);
  await expect(dossierPaye).toBeVisible();
  await expect(dossierPaye).toContainText('Payé');

  const dossierRetenu = page.getByTestId(`dossier-card-${E2E_SCENARIO.dossierRetenuId}`);
  await expect(dossierRetenu).toBeVisible();
  await expect(dossierRetenu).toContainText('Retenu');
});

test('UCS11 RM-26: l’attestation est disponible uniquement pour PAYE + session CLOTUREE', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantDossier);

  const valid = await request.get(`${API_BASE_URL}/attestations/${E2E_SCENARIO.dossierPayeId}/download`, { headers });
  expect(valid.ok()).toBeTruthy();
  expect(valid.headers()['content-type']).toContain('application/pdf');

  const invalid = await request.get(`${API_BASE_URL}/attestations/${E2E_SCENARIO.dossierRetenuId}/download`, { headers });
  expect(invalid.status()).toBe(403);
  expect((await invalid.json()).error).toBe('ATTESTATION_DOSSIER_NON_PAYE');
});

test('UCS11 RM-27: annulation autorisée en attente, refusée après RETENU', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantDossier);

  const annulable = await request.delete(`${API_BASE_URL}/espace-apprenant/dossiers/${E2E_SCENARIO.dossierAnnulableId}`, { headers });
  expect(annulable.ok()).toBeTruthy();

  const retenu = await request.delete(`${API_BASE_URL}/espace-apprenant/dossiers/${E2E_SCENARIO.dossierRetenuId}`, { headers });
  expect(retenu.status()).toBe(409);
  expect((await retenu.json()).error).toBe('DOSSIER_RETENU_CONTACT_RESPONSABLE');
});
