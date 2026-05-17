import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { API_BASE_URL, authHeaders, loginAsPartenaire } from './helpers';

const MOIS_TEST = '2025-04';

test('RM-155: PARTENAIRE peut exporter son CSV anonymisé', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.partenaire);

  const res = await request.get(`${API_BASE_URL}/partenaires/export-csv?mois=${MOIS_TEST}`, { headers });

  expect(res.ok()).toBeTruthy();
  expect(res.headers()['content-type']).toContain('text/csv');
  expect(res.headers()['content-disposition']).toContain('attachment');
  expect(res.headers()['content-disposition']).toContain('.csv');
});

test('RM-155: en-tête CSV contient les 7 colonnes du spec v4.9', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.partenaire);

  const res = await request.get(`${API_BASE_URL}/partenaires/export-csv?mois=${MOIS_TEST}`, { headers });
  expect(res.ok()).toBeTruthy();

  const text = await res.text();
  const header = text.split('\n')[0];
  expect(header).toBe(
    'identifiant_anonymise,formation_intitule,activation_confirmee_le,statut_acces,certification_obtenue,url_verification_certificat,langue_formation'
  );
});

test('RM-155 MT-02: CSV sans PII — pas d\'email ni d\'UUID brut', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.partenaire);

  const res = await request.get(`${API_BASE_URL}/partenaires/export-csv?mois=${MOIS_TEST}`, { headers });
  expect(res.ok()).toBeTruthy();

  const text = await res.text();
  expect(text).not.toMatch(/@/);

  const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('identifiant'));
  for (const line of lines) {
    const firstCol = line.split(',')[0];
    if (firstCol) {
      expect(firstCol).toMatch(/^[a-f0-9]{64}$/);
    }
  }
});

test('RM-155: sans mois → 400 MOIS_REQUIS', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.partenaire);

  const res = await request.get(`${API_BASE_URL}/partenaires/export-csv`, { headers });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.error).toBe('MOIS_REQUIS');
});

test('RM-155: ADMIN ne peut pas accéder au CSV partenaire (403)', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);

  const res = await request.get(`${API_BASE_URL}/partenaires/export-csv?mois=${MOIS_TEST}`, { headers: adminHeaders });
  expect(res.status()).toBe(403);
});

test('RM-155: page Export CSV accessible depuis l\'espace partenaire', async ({ page }) => {
  await loginAsPartenaire(page);
  await page.goto('/partenaire/export-csv');
  await expect(page.getByText(/export|csv|exporter/i).first()).toBeVisible();
});
