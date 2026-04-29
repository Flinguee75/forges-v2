import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { authHeaders, runAbonnementScheduler } from './helpers';

test('UCS09.1: le scheduler abonnements traite renouvellements, grâces, downgrades et expirations', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.admin);
  const result = await runAbonnementScheduler(request, headers);

  expect(result.ok).toBeTruthy();
  expect(result.payload.data).toEqual(expect.objectContaining({
    renouvellements: expect.anything(),
    graces: expect.anything(),
    downgrades: expect.anything(),
    b2b_expires: expect.anything(),
    organisations: expect.anything(),
  }));
});
