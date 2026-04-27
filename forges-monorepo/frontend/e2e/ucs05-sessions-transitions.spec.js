import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { authHeaders, getJson, postJson } from './helpers';

test('UCS05 RM-20/RM-21: scheduler transitionne et archive les sessions de façon idempotente', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.admin);

  const before = await getJson(request, `/backoffice/sessions/${E2E_SCENARIO.sessionPlanifieeId}`, headers);
  expect(before.data?.statut || before.statut).toBe('PLANIFIEE');

  const run = await postJson(request, '/backoffice/sessions/scheduler/run', {}, headers);
  expect(run.ok).toBeTruthy();

  const planifiee = await getJson(request, `/backoffice/sessions/${E2E_SCENARIO.sessionPlanifieeId}`, headers);
  const aVenir = await getJson(request, `/backoffice/sessions/${E2E_SCENARIO.sessionAVenirId}`, headers);
  const ouverte = await getJson(request, `/backoffice/sessions/${E2E_SCENARIO.sessionOuverteId}`, headers);
  const enCours = await getJson(request, `/backoffice/sessions/${E2E_SCENARIO.sessionEnCoursId}`, headers);
  const archivable = await getJson(request, `/backoffice/sessions/${E2E_SCENARIO.sessionArchivableId}`, headers);

  expect(planifiee.data?.statut || planifiee.statut).toBe('A_VENIR');
  expect(aVenir.data?.statut || aVenir.statut).toBe('INSCRIPTIONS_OUVERTES');
  expect(ouverte.data?.statut || ouverte.statut).toBe('EN_COURS');
  expect(enCours.data?.statut || enCours.statut).toBe('CLOTUREE');
  expect(archivable.data?.statut || archivable.statut).toBe('ARCHIVEE');
});
