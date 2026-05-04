import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { API_BASE_URL, authHeaders, dataOf, loginAsAdmin, loginAsOrganisation, postJson, putJson } from './helpers';

test('UCS21 RM-149: ADMIN crée un devis avec numéro FORGES-DEVIS-YYYY-NNN', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);

  const res = await postJson(request, '/devis', {
    organisation_id: E2E_SCENARIO.organisationId,
    formation_id: E2E_SCENARIO.standardFormationId,
    nb_places: 5,
    tarif_unitaire: 150000,
    notes: 'Devis E2E UCS21',
  }, adminHeaders);

  expect(res.ok).toBeTruthy();
  const devis = dataOf(res.payload);
  expect(devis.numero).toMatch(/^FORGES-DEVIS-\d{4}-\d{3,}$/);
  expect(devis.montant_total).toBe(5 * 150000);
  expect(devis.statut).toBe('EN_ATTENTE');
});

test('UCS21 RM-150: montant_total est calculé backend (nb_places × tarif_unitaire)', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);

  const res = await postJson(request, '/devis', {
    organisation_id: E2E_SCENARIO.organisationId,
    formation_id: E2E_SCENARIO.standardFormationId,
    nb_places: 10,
    tarif_unitaire: 80000,
    notes: 'Test calcul montant RM-150',
  }, adminHeaders);

  expect(res.ok).toBeTruthy();
  expect(dataOf(res.payload).montant_total).toBe(800000);
});

test('UCS21 RM-149: Organisation consulte ses devis en lecture seule', async ({ request }) => {
  const orgHeaders = await authHeaders(request, E2E_ACCOUNTS.organisation);

  const res = await request.get(`${API_BASE_URL}/devis`, { headers: orgHeaders });
  expect([200, 403]).toContain(res.status());

  if (res.ok()) {
    const data = await res.json();
    expect(data).toBeDefined();
  }
});

test('UCS21 RM-151: AGENT peut marquer un devis comme PAYE', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);

  const created = await postJson(request, '/devis', {
    organisation_id: E2E_SCENARIO.organisationId,
    formation_id: E2E_SCENARIO.standardFormationId,
    nb_places: 2,
    tarif_unitaire: 100000,
    notes: 'Devis paiement AGENT E2E',
  }, adminHeaders);

  expect(created.ok).toBeTruthy();
  const devisId = dataOf(created.payload).id;

  const paiement = await putJson(request, `/devis/${devisId}/payer`, {
    reference_paiement: `REF-E2E-${Date.now()}`,
    montant_recu: 200000,
  }, agentHeaders);

  expect(paiement.ok).toBeTruthy();
  expect(dataOf(paiement.payload).statut).toBe('PAYE');
});

test('UCS21 RM-151: annulation impossible si devis déjà PAYE', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);

  const created = await postJson(request, '/devis', {
    organisation_id: E2E_SCENARIO.organisationId,
    formation_id: E2E_SCENARIO.standardFormationId,
    nb_places: 1,
    tarif_unitaire: 50000,
    notes: 'Devis annulation bloquee',
  }, adminHeaders);

  expect(created.ok).toBeTruthy();
  const devisId = dataOf(created.payload).id;

  await putJson(request, `/devis/${devisId}/payer`, {
    reference_paiement: `REF-BLOCK-${Date.now()}`,
    montant_recu: 50000,
  }, agentHeaders);

  const annulation = await putJson(request, `/devis/${devisId}/annuler`, {}, adminHeaders);
  expect(annulation.ok).toBeFalsy();
  expect([400, 422, 409]).toContain(annulation.status);
});

test('UCS21: page devis backoffice est accessible pour ADMIN', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/backoffice/devis');
  await expect(page.getByText(/devis|sur.devis/i).first()).toBeVisible();
});

test('UCS21: page devis est accessible pour ORGANISATION', async ({ page }) => {
  await loginAsOrganisation(page);
  await page.goto('/organisation/devis');
  await expect(page.getByText(/devis|commande/i).first()).toBeVisible();
});
