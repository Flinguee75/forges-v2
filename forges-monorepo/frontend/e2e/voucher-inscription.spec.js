import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { authHeaders, postJson, findDossier, loginAsOrganisation } from './helpers';

test('voucher inscription flow stays outside paiement endpoints', async ({ page, request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantVoucher);

  const result = await postJson(request, `/sessions/${E2E_SCENARIO.sessionId}/inscrire`, {
    source_financement: 'VOUCHER',
    voucher_code: E2E_SCENARIO.voucherCode,
  }, headers);

  expect(result.ok).toBeTruthy();
  expect(result.payload?.dossier).toBeTruthy();
  expect(result.payload?.dossier?.statut).toBe('PAYE_DIRECTEMENT');
  expect(result.payload?.dossier?.source_financement).toBe('VOUCHER');
  expect(result.payload?.dossier?.voucher_code).toBe(E2E_SCENARIO.voucherCode);

  const createdDossier = await findDossier(request, headers, (dossier) => (
    dossier.session_id === E2E_SCENARIO.sessionId
    && dossier.voucher_code === E2E_SCENARIO.voucherCode
  ));

  expect(createdDossier).toBeTruthy();
  expect(createdDossier.statut).toBe('PAYE_DIRECTEMENT');

  await loginAsOrganisation(page);
  await page.goto('/organisation/vouchers');
  await expect(page).toHaveURL(/\/organisation\/vouchers$/);
  const activeVoucherRow = page.getByRole('row', { name: /ORG-E2E-VOUCHER-01/ });
  await expect(activeVoucherRow).toContainText('Formation standard E2E');
  await expect(activeVoucherRow).toContainText(/\d+\s*\/\s*5/);
});
