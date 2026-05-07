import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { authHeaders, postJson } from './helpers';

/**
 * UCS09 — Validation code apporteur (RM-143, RM-144)
 *
 * Tous les tests retournent 422 sans creer de dossier,
 * donc apprenantMismatch3 peut etre reutilise pour les 3 cas.
 */

test('UCS09 RM-143: code apporteur inexistant rejete 422 CODE_APPORTEUR_INVALIDE', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantMismatch3);

  const result = await postJson(request, `/sessions/${E2E_SCENARIO.standardSessionId}/inscrire`, {
    source_financement: 'RETAIL',
    code_apporteur: 'CODE-INEXISTANT-000',
  }, headers);

  expect(result.ok).toBeFalsy();
  expect(result.status).toBe(422);
  const error = result.payload?.error ?? result.payload?.code ?? result.payload?.message;
  expect(error).toMatch(/CODE_APPORTEUR_INVALIDE/i);
});

test('UCS09 RM-143: code apporteur suspendu rejete 422 CODE_APPORTEUR_INACTIF', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantMismatch3);

  const result = await postJson(request, `/sessions/${E2E_SCENARIO.standardSessionId}/inscrire`, {
    source_financement: 'RETAIL',
    code_apporteur: E2E_SCENARIO.apporteurSuspCode,
  }, headers);

  expect(result.ok).toBeFalsy();
  expect(result.status).toBe(422);
  const error = result.payload?.error ?? result.payload?.code ?? result.payload?.message;
  expect(error).toMatch(/CODE_APPORTEUR_INACTIF/i);
});

test('UCS09 RM-144: code apporteur + voucher organisation rejete 422 VOUCHER_CUMUL_INTERDIT', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantMismatch3);

  const result = await postJson(request, `/sessions/${E2E_SCENARIO.standardSessionId}/inscrire`, {
    source_financement: 'RETAIL',
    code_apporteur: E2E_SCENARIO.apporteurCode,
    voucher_code: E2E_SCENARIO.voucherCode,
  }, headers);

  expect(result.ok).toBeFalsy();
  expect(result.status).toBe(422);
  const error = result.payload?.error ?? result.payload?.code ?? result.payload?.message;
  expect(error).toMatch(/VOUCHER_CUMUL_INTERDIT/i);
});
