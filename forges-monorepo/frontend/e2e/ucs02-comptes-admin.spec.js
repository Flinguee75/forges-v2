import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { authHeaders, dataOf, getJson, postJson, putJson, uniqueEmail } from './helpers';

test('UCS02: Admin crée, désactive et réactive un compte interne', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.admin);
  const email = uniqueEmail('agent-e2e-ucs02');

  const created = await postJson(request, '/admin/users', {
    email,
    role: 'AGENT',
    nom: 'Agent',
    prenoms: 'UCS02',
  }, headers);

  expect(created.ok).toBeTruthy();
  const user = dataOf(created.payload);
  expect(user.email).toBe(email);
  expect(user.role).toBe('AGENT');

  const disabled = await putJson(request, `/admin/users/${user.id}/status`, { statut: 'INACTIF' }, headers);
  expect(disabled.ok).toBeTruthy();

  const reactivated = await putJson(request, `/admin/users/${user.id}/status`, { statut: 'ACTIF' }, headers);
  expect(reactivated.ok).toBeTruthy();
});

test('UCS02 RM-126/RM-141/RM-142: Admin invite un partenaire et crée un apporteur', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.admin);

  const partenaireEmail = uniqueEmail('partenaire-e2e-ucs02');
  const invitation = await postJson(request, '/admin/partenaires', {
    email: partenaireEmail,
    raison_sociale: 'Partenaire UCS02',
    type: 'UNIVERSITE',
    commission_forges_pct: 20,
  }, headers);

  expect(invitation.ok).toBeTruthy();
  expect(dataOf(invitation.payload).partenaire_id).toBeTruthy();

  const invited = dataOf(invitation.payload);
  const details = await getJson(request, `/admin/partenaires/${invited.partenaire_id}`, headers);
  expect(dataOf(details).email_principal).toBe(partenaireEmail);

  const apporteurEmail = uniqueEmail('apporteur-e2e-ucs02');
  const apporteur = await postJson(request, '/admin/apporteurs', {
    email: apporteurEmail,
    nom: 'Apporteur UCS02',
    type: 'INDIVIDU',
    taux_commission_pct: 5,
  }, headers);

  expect(apporteur.ok).toBeTruthy();
  expect(dataOf(apporteur.payload).apporteur_id).toBeTruthy();
  expect(dataOf(apporteur.payload).code_apporteur).toMatch(/[0-9a-f-]{20,}/i);
});
