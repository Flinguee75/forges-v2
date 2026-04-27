import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { API_BASE_URL, authHeaders, getJson, postJson, putJson } from './helpers';

test('UCS08 RM-05/RM-07: Responsable retient un dossier Premium Retail et active le délai 72h', async ({ request }) => {
  const responsableHeaders = await authHeaders(request, E2E_ACCOUNTS.responsable);
  const result = await postJson(request, `/dossiers/${E2E_SCENARIO.dossierEnAttenteId}/retenir`, {}, responsableHeaders);

  expect(result.ok).toBeTruthy();

  const detail = await getJson(request, `/dossiers/${E2E_SCENARIO.dossierEnAttenteId}`, responsableHeaders);
  expect(detail.data.statut).toBe('RETENU');
  expect(new Date(detail.data.expires_at).getTime()).toBeGreaterThan(Date.now() + 71 * 60 * 60 * 1000);
});

test('UCS08 RM-05: un dossier RETENU ne peut pas être rejeté', async ({ request }) => {
  const responsableHeaders = await authHeaders(request, E2E_ACCOUNTS.responsable);
  const result = await putJson(request, `/dossiers/${E2E_SCENARIO.dossierRetenuId}/refuser`, {
    motif_refus: 'Refus impossible apres retention',
  }, responsableHeaders);

  expect(result.status).toBe(400);
  expect(result.payload.error).toBe('DOSSIER_ALREADY_PROCESSED');
});

test('UCS08 RM-07: le scheduler test-only annule les dossiers RETENU expirés', async ({ request }) => {
  const response = await request.post(`${API_BASE_URL}/test/schedulers/dossier-expiration`);
  expect(response.ok()).toBeTruthy();

  const responsableHeaders = await authHeaders(request, E2E_ACCOUNTS.responsable);
  const detail = await getJson(request, `/dossiers/${E2E_SCENARIO.dossierExpireId}`, responsableHeaders);
  expect(detail.data.statut).toBe('ANNULE');
});
