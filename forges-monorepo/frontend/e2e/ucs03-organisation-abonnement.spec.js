import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { authHeaders, dataOf, getJson, postJson, uniqueEmail } from './helpers';

test('UCS03 RM-81: une Organisation publique peut créer son compte avec essai 30 jours', async ({ request }) => {
  const email = uniqueEmail('org-e2e-ucs03');
  const response = await postJson(request, '/organisations/register', {
    raison_sociale: 'Organisation UCS03',
    type: 'ENTREPRISE',
    sous_types: ['FORMATION'],
    identifiant_legal: `CI-UCS03-${Date.now()}`,
    contact_referent: 'Contact RH',
    pays: 'CI',
    langue_preferee: 'FR',
    email,
    password: E2E_ACCOUNTS.organisation.password,
    consentement_rgpd: true,
  });

  expect(response.ok).toBeTruthy();
  expect(dataOf(response.payload).message).toMatch(/organisation créé|Vérifiez/i);
});

test('UCS03 RM-80/RM-84: Organisation active expose son abonnement Organisation courant', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.organisation);
  const profil = await getJson(request, '/organisations/profil', headers);
  const abonnement = await getJson(request, '/abonnements/organisation/me', headers);

  expect(dataOf(profil).raison_sociale).toContain('Organisation E2E');
  expect(dataOf(abonnement).statut).toBe('ACTIF');
  expect(dataOf(abonnement).offre).toBe('BASIQUE');

  const duplicate = await postJson(request, '/abonnements/organisation', { offre: 'BASIQUE' }, headers);
  expect(duplicate.status).toBe(409);
  expect(duplicate.payload.error).toBe('ABONNEMENT_ORG_DEJA_ACTIF');
});
