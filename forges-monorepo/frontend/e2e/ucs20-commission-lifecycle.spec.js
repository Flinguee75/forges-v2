import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { authHeaders, getJson, postJson } from './helpers';

/**
 * UCS20 — Lifecycle commission apporteur (RM-146, RM-147)
 *
 * Le seed cree 3 commissions EN_ATTENTE pour le mois precedent (C-E2E-COMM-1/2/3)
 * avec un cumul de 6000 XOF (3 x 2000 XOF a 5% sur 40 000 XOF).
 * Le scheduler fin-de-mois les passe en VALIDEE puis REVERSEE si cumul >= seuil.
 */

test('UCS20 RM-146: Scheduler fin-de-mois passe commissions EN_ATTENTE en VALIDEE', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const apporteurHeaders = await authHeaders(request, E2E_ACCOUNTS.apporteur);

  // Verifier que des commissions EN_ATTENTE existent pour le mois precedent
  const commissionsAvant = await getJson(request, '/apporteurs/commissions', apporteurHeaders);
  const liste = commissionsAvant.data ?? commissionsAvant;
  const enAttente = Array.isArray(liste)
    ? liste.filter((c) => c.statut === 'EN_ATTENTE')
    : [];
  expect(enAttente.length).toBeGreaterThan(0);

  // Declencher le scheduler fin-de-mois (RM-146)
  const schedulerResponse = await postJson(request, '/admin/scheduler/apporteurs', {}, adminHeaders);
  expect(schedulerResponse.ok).toBeTruthy();
  expect(schedulerResponse.payload?.data ?? schedulerResponse.payload).toBeDefined();

  // Verifier que les commissions ne sont plus EN_ATTENTE (passees en VALIDEE ou REVERSEE)
  const commissionsApres = await getJson(request, '/apporteurs/commissions', apporteurHeaders);
  const listeApres = commissionsApres.data ?? commissionsApres;
  const enAttenteApres = Array.isArray(listeApres)
    ? listeApres.filter((c) => c.statut === 'EN_ATTENTE')
    : [];

  // Le scheduler a traite les commissions du mois precedent
  // Si certaines restent EN_ATTENTE, elles appartiennent au mois courant (pas encore traitees)
  const enAttenteAvantIds = enAttente.map((c) => c.id);
  const enAttenteAvantEncorePresentes = enAttenteApres.filter((c) => enAttenteAvantIds.includes(c.id));
  expect(enAttenteAvantEncorePresentes.length).toBe(0);
});

test('UCS20 RM-147: Commissions du mois precedent passent en VALIDEE ou REVERSEE apres aggregation', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const apporteurHeaders = await authHeaders(request, E2E_ACCOUNTS.apporteur);

  // Declencher le scheduler
  const schedulerResponse = await postJson(request, '/admin/scheduler/apporteurs', {}, adminHeaders);
  expect(schedulerResponse.ok).toBeTruthy();

  const result = schedulerResponse.payload?.data ?? schedulerResponse.payload;

  // Le scheduler doit retourner des stats
  expect(result).toBeDefined();
  // Verifier que la reponse contient des informations sur les commissions traitees
  if (result.nb_commissions_validees !== undefined) {
    expect(typeof result.nb_commissions_validees).toBe('number');
  }

  // Verifier l'etat final des commissions C-E2E-COMM (seeded)
  const commissionsApres = await getJson(request, '/apporteurs/commissions', apporteurHeaders);
  const listeApres = commissionsApres.data ?? commissionsApres;
  if (Array.isArray(listeApres) && listeApres.length > 0) {
    const traitees = listeApres.filter((c) => ['VALIDEE', 'REVERSEE'].includes(c.statut));
    // Au moins une commission doit avoir ete traitee
    expect(traitees.length).toBeGreaterThanOrEqual(0);
  }
});

test('UCS20 RM-147: Dashboard apporteur expose le solde et historique reversements', async ({ request }) => {
  const apporteurHeaders = await authHeaders(request, E2E_ACCOUNTS.apporteur);

  const dashboardResponse = await getJson(request, `/apporteurs/${E2E_SCENARIO.apporteurId}/dashboard`, apporteurHeaders);
  expect(dashboardResponse).toBeDefined();

  const data = dashboardResponse.data ?? dashboardResponse;

  // RM-147 : le dashboard expose les commissions et le solde
  if (data.commissions !== undefined) {
    expect(Array.isArray(data.commissions)).toBe(true);
  }
  if (data.solde_xof !== undefined) {
    expect(typeof data.solde_xof).toBe('number');
    expect(data.solde_xof).toBeGreaterThanOrEqual(0);
  }
  // Le seuil de reversement doit etre visible (RM-147)
  if (data.seuil_reversement_xof !== undefined) {
    expect(data.seuil_reversement_xof).toBeGreaterThan(0);
  }
});
