import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { authHeaders, dataOf, getJson, loginAsOrganisation, postJson, uniqueEmail } from './helpers';

test('UCS12: Organisation consulte dashboard, profil, vouchers, inscriptions, paiements et rapport', async ({ page, request }) => {
  await loginAsOrganisation(page);
  await page.goto('/organisation/dashboard');

  await expect(page.getByText(/Organisation E2E|dashboard|tableau de bord/i).first()).toBeVisible();

  const headers = await authHeaders(request, E2E_ACCOUNTS.organisation);
  const dashboard = await getJson(request, '/espace-organisation/dashboard', headers);
  expect(dataOf(dashboard).organisation.raison_sociale).toContain('Organisation E2E');

  const profil = await getJson(request, '/espace-organisation/profil', headers);
  expect(dataOf(profil).email).toBe(E2E_ACCOUNTS.organisation.email);

  const vouchers = await getJson(request, '/espace-organisation/vouchers', headers);
  expect(dataOf(vouchers)).toBeTruthy();

  const inscriptions = await getJson(request, '/espace-organisation/inscriptions', headers);
  expect(dataOf(inscriptions)).toBeTruthy();

  const paiements = await getJson(request, '/espace-organisation/paiements', headers);
  expect(dataOf(paiements)).toBeTruthy();

  const rapport = await request.get(`${process.env.E2E_API_URL || 'http://127.0.0.1:3000/api'}/espace-organisation/rapport-pdf`, { headers });
  expect(rapport.ok()).toBeTruthy();
});

test('UCS12: Organisation crée un membre et commande des vouchers', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.organisation);

  const membre = await postJson(request, '/espace-organisation/membres', {
    email: uniqueEmail('membre-e2e-ucs12'),
    nom: 'Membre',
    prenom: 'UCS12',
    secteur_activite: 'Formation',
    niveau_etude: 'Master',
  }, headers);
  expect([201, 200]).toContain(membre.status);

  const commande = await postJson(request, '/espace-organisation/vouchers/commander', {
    formation_id: E2E_SCENARIO.standardFormationId,
    quantite: 1,
  }, headers);
  expect([201, 200]).toContain(commande.status);
  expect(dataOf(commande.payload).vouchers?.length).toBeGreaterThanOrEqual(1);
});
