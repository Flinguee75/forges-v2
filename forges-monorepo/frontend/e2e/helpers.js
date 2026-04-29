import { expect } from '@playwright/test';
import { createHmac } from 'crypto';
import { E2E_ACCOUNTS } from './e2e-data';

export const API_BASE_URL = process.env.E2E_API_URL || 'http://127.0.0.1:3000/api';
export const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-secret';

export async function loginViaUi(page, account, expectedUrl) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Mot de passe').fill(account.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(expectedUrl);
}

export async function loginAsApprenant(page) {
  await loginViaUi(page, E2E_ACCOUNTS.apprenant, /\/apprenant\/dashboard$/);
}

export async function loginAsRm145Apprenant(page) {
  await loginViaUi(page, E2E_ACCOUNTS.apprenantRm145, /\/apprenant\/dashboard$/);
}

export async function loginAsAdmin(page) {
  await loginViaUi(page, E2E_ACCOUNTS.admin, /\/backoffice\/dashboard$/);
}

export async function loginAsResponsable(page) {
  await loginViaUi(page, E2E_ACCOUNTS.responsable, /\/backoffice\/dashboard$/);
}

export async function loginAsSuperviseur(page) {
  await loginViaUi(page, E2E_ACCOUNTS.superviseur, /\/backoffice\/dashboard$/);
}

export async function loginAsAgent(page) {
  await loginViaUi(page, E2E_ACCOUNTS.agent, /\/backoffice\/dashboard$/);
}

export async function loginAsOrganisation(page) {
  await loginViaUi(page, E2E_ACCOUNTS.organisation, /\/organisation\/dashboard$/);
}

export async function loginAsPartenaire(page) {
  await loginViaUi(page, E2E_ACCOUNTS.partenaire, /\/partenaire\/dashboard$/);
}

export async function loginAsApporteur(page) {
  await loginViaUi(page, E2E_ACCOUNTS.apporteur, /\/apporteur\/dashboard$/);
}

export async function getAccessToken(page) {
  return page.evaluate(() => window.sessionStorage.getItem('access_token'));
}

export async function apiLogin(request, account) {
  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      email: account.email,
      password: account.password,
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload.data;
}

export async function authHeaders(request, account) {
  const session = await apiLogin(request, account);
  return {
    Authorization: `Bearer ${session.accessToken}`,
  };
}

export async function getJson(request, url, headers = {}) {
  const response = await request.get(`${API_BASE_URL}${url}`, { headers });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function postJson(request, url, data, headers = {}) {
  const response = await request.post(`${API_BASE_URL}${url}`, { data, headers });
  return {
    ok: response.ok(),
    status: response.status(),
    payload: await response.json().catch(() => ({})),
  };
}

export async function putJson(request, url, data, headers = {}) {
  const response = await request.put(`${API_BASE_URL}${url}`, { data, headers });
  return {
    ok: response.ok(),
    status: response.status(),
    payload: await response.json().catch(() => ({})),
  };
}

export async function patchJson(request, url, data, headers = {}) {
  const response = await request.patch(`${API_BASE_URL}${url}`, { data, headers });
  return {
    ok: response.ok(),
    status: response.status(),
    payload: await response.json().catch(() => ({})),
  };
}

export async function deleteJson(request, url, headers = {}) {
  const response = await request.delete(`${API_BASE_URL}${url}`, { headers });
  return {
    ok: response.ok(),
    status: response.status(),
    payload: await response.json().catch(() => ({})),
  };
}

export function dataOf(payload) {
  return payload?.data ?? payload;
}

export function listOf(payload, key) {
  const data = dataOf(payload);
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@forges.ci`;
}

export async function runAbonnementScheduler(request, headers) {
  return postJson(request, '/abonnements/admin/scheduler', {}, headers);
}

export async function createPaiementAndConfirm(request, headers, dossierId, transactionPrefix, montant = 150000) {
  const paiement = await postJson(request, '/paiements', {
    dossier_id: dossierId,
    methode: 'MOBILE_MONEY',
  }, headers);
  expect(paiement.ok).toBeTruthy();

  const webhookBody = {
    transaction_id: `${transactionPrefix}-${Date.now()}`,
    dossier_id: dossierId,
    statut: 'SUCCESS',
    montant,
  };
  const signature = createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(webhookBody))
    .digest('hex');

  const webhookResponse = await request.post(`${API_BASE_URL}/paiements/webhook`, {
    headers: { 'x-webhook-signature': signature },
    data: webhookBody,
  });
  expect(webhookResponse.ok()).toBeTruthy();

  return {
    paiement: paiement.payload?.data,
    webhook: webhookBody,
  };
}

export async function findDossier(request, headers, predicate) {
  const payload = await getJson(request, '/espace-apprenant/dossiers', headers);
  const dossiers = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
  return dossiers.find(predicate);
}
