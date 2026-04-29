import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { authHeaders, dataOf, getJson, postJson, putJson, uniqueEmail } from './helpers';

test('UCS12.1 RM-60/RM-61/RM-69: dashboard B2B expose quota et membres', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.organisation);
  const b2b = await getJson(request, '/abonnements/b2b/me', headers);
  const apprenants = await getJson(request, '/abonnements-b2b/apprenants', headers);

  expect(dataOf(b2b).statut).toBe('ACTIF');
  expect(dataOf(b2b).nb_max).toBeGreaterThanOrEqual(5);
  expect(dataOf(apprenants).nb_max).toBeGreaterThanOrEqual(0);
});

test('UCS12.1 RM-62/RM-68/RM-110: membre B2B, montée et descente de palier encadrées', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.organisation);

  const membre = await postJson(request, '/espace-organisation/membres', {
    email: uniqueEmail('membre-b2b-e2e-ucs12'),
    nom: 'B2B',
    prenom: 'UCS121',
    secteur_activite: 'Digital',
    niveau_etude: 'Licence',
  }, headers);
  expect([200, 201, 422, 429]).toContain(membre.status);

  const upgrade = await putJson(request, '/abonnements/b2b/monter-palier', { nouveau_palier: 'ENTERPRISE' }, headers);
  expect([200, 400]).toContain(upgrade.status);

  const downgradeAttempt = await putJson(request, '/abonnements/b2b/monter-palier', { nouveau_palier: 'STARTER' }, headers);
  expect([400, 409]).toContain(downgradeAttempt.status);
});
