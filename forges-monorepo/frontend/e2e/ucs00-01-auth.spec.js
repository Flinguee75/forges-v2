import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { API_BASE_URL, apiLogin } from './helpers';

test('UCS00: confirmation email active un compte apprenant en attente', async ({ request }) => {
  const confirm = await request.get(`${API_BASE_URL}/apprenants/confirm/token-e2e-auth-01`);
  expect(confirm.ok()).toBeTruthy();
  expect((await confirm.json()).data.message).toContain('activé');

  const login = await apiLogin(request, E2E_ACCOUNTS.apprenantAuth);
  expect(login.user.role).toBe('APPRENANT');
});

test('UCS01: login retourne access token et refresh token utilisable', async ({ request }) => {
  const session = await apiLogin(request, E2E_ACCOUNTS.apprenant);
  expect(session.accessToken).toBeTruthy();
  expect(session.refreshToken).toBeTruthy();
  expect(session.user.role).toBe('APPRENANT');

  const refresh = await request.post(`${API_BASE_URL}/auth/refresh`, {
    data: { refreshToken: session.refreshToken },
  });
  expect(refresh.ok()).toBeTruthy();
  expect((await refresh.json()).data.accessToken).toBeTruthy();
});
