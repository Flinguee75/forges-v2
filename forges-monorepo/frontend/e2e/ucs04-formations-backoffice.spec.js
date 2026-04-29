import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { authHeaders, dataOf, getJson, postJson } from './helpers';

test('UCS04 RM-86/RM-91/RM-93/RM-102: création formation interne à la demande', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.admin);
  const intitule = `Formation UCS04 demande ${Date.now()}`;

  const created = await postJson(request, '/formations', {
    intitule,
    description_courte: 'Formation à la demande créée par E2E UCS04',
    description_longue: 'Couverture UCS04',
    duree_jours: 3,
    cout_catalogue: 100000,
    type_formation: 'STANDARD',
    mode_formation: 'A_LA_DEMANDE',
    pilier_abonnement: 'RETAIL',
    langues_disponibles: ['FR'],
    certification_delivree: true,
    objectifs_pedagogiques: ['Valider UCS04'],
  }, headers);

  expect(created.ok).toBeTruthy();
  const formation = dataOf(created.payload);
  expect(formation.mode_formation).toBe('A_LA_DEMANDE');
  expect(formation.type_formation).toBe('STANDARD');
  expect(formation.statut).toBe('ACTIVE');
  expect(formation.inclus_abonnement).toBe(true);

  const detail = await getJson(request, `/formations/backoffice/${formation.id}`, headers);
  expect(dataOf(detail).intitule).toBe(intitule);
});

test('UCS04 RM-96: une formation à la demande ne peut pas recevoir de session', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.admin);
  const response = await postJson(request, '/backoffice/sessions', {
    formation_id: 'F-E2E-DEMANDE-01',
    date_ouverture: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(),
    date_cloture: new Date(Date.now() + 8 * 24 * 3600 * 1000).toISOString(),
    date_debut: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString(),
    date_fin: new Date(Date.now() + 16 * 24 * 3600 * 1000).toISOString(),
    capacite: 10,
  }, headers);

  expect([400, 409]).toContain(response.status);
  expect(JSON.stringify(response.payload)).toMatch(/A_LA_DEMANDE|DEMANDE|SESSION/i);
});
