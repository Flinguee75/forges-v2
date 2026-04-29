import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { authHeaders, dataOf, getJson, postJson, uniqueEmail } from './helpers';

test('UCS19 RM-141/RM-142: Admin crée un apporteur avec code permanent', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.admin);
  const email = uniqueEmail('apporteur-e2e-ucs19');

  const created = await postJson(request, '/admin/apporteurs', {
    email,
    nom: 'Apporteur UCS19',
    type: 'INDIVIDU',
    taux_commission_pct: 5,
  }, headers);

  expect(created.ok).toBeTruthy();
  const apporteur = dataOf(created.payload);
  expect(apporteur.apporteur_id).toBeTruthy();
  expect(apporteur.code_apporteur).toMatch(/[0-9a-f-]{20,}/i);

  const details = await getJson(request, `/admin/apporteurs/${apporteur.apporteur_id}`, headers);
  expect(dataOf(details).email).toBe(email);
  expect(dataOf(details).statut).toBe('ACTIF');
});

test('UCS19 RM-146/RM-147/RM-148: scheduler prépare les reversements apporteurs sans casser le seuil', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const scheduler = await postJson(request, '/apporteurs/scheduler/fin-mois', {}, adminHeaders);
  expect(scheduler.ok).toBeTruthy();

  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);
  const reversements = await getJson(request, '/agent/reversements/apporteurs', agentHeaders);
  const rows = Array.isArray(dataOf(reversements)) ? dataOf(reversements) : [];
  const seeded = rows.find((row) => row.apporteur_id === E2E_SCENARIO.apporteurId);

  expect(seeded).toBeTruthy();
  expect(seeded.montant_total_xof).toBeGreaterThanOrEqual(5000);
});
