import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { authHeaders, dataOf, getJson } from './helpers';

/**
 * Regression scenarios using stable seeded data from seed.e2e.ts.
 * These tests do not create or mutate data — they assert against known fixtures.
 *
 * S1 : formation FP-E2E-01 seeded as VALIDE with prix_coutant_valide=200000
 * S2 : commission CP-E2E-SEED-01 seeded as EN_ATTENTE with montant_reverse=200000
 * S4 : formation FP-E2E-REJETE-01 seeded as REJETE with corrections_suggeres
 */

test('S1 seeded: formation VALIDE apparait dans GET /partenaires/formations avec prix_coutant_valide', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.partenaire);

  const payload = await getJson(request, '/partenaires/formations', headers);
  const formations = dataOf(payload);

  const formation = formations.find((f) => f.id === E2E_SCENARIO.partenaireFormationValideId);
  expect(formation, `Formation ${E2E_SCENARIO.partenaireFormationValideId} absente de la liste`).toBeTruthy();
  expect(formation.statut_validation).toBe('VALIDE');
  expect(formation.prix_coutant_valide).toBe(200000);
  expect(JSON.stringify(formation)).not.toContain('commission_forges_pct');
  expect(JSON.stringify(formation)).not.toContain('prix_catalogue');
});

test('S2 seeded: commission EN_ATTENTE apparait dans GET /partenaires/reversements', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.partenaire);

  const payload = await getJson(request, '/partenaires/reversements', headers);
  const { reversements, totaux } = dataOf(payload);

  const commission = reversements.find((r) => r.formation_intitule === 'Formation partenaire E2E');
  expect(commission, 'Commission EN_ATTENTE absente des reversements').toBeTruthy();
  expect(commission.statut).toBe('EN_ATTENTE');
  expect(commission.montant_reverse_xof).toBe(200000);
  expect(totaux.en_attente_xof).toBeGreaterThanOrEqual(200000);
  expect(JSON.stringify(payload)).not.toContain('commission_forges_pct');
  expect(JSON.stringify(payload)).not.toContain('prix_catalogue');
});

test('S4 seeded: formation REJETEE expose statut et corrections dans GET /partenaires/formations/:id', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.partenaire);

  const payload = await getJson(
    request,
    `/partenaires/formations/${E2E_SCENARIO.partenaireFormationRejeteeId}`,
    headers
  );
  const detail = dataOf(payload);

  expect(detail.statut_validation).toBe('REJETE');
  expect(detail.corrections_suggeres).toBeTruthy();
  expect(detail.commentaire_responsable).toBeTruthy();
  expect(JSON.stringify(detail)).not.toContain('commission_forges_pct');
  expect(JSON.stringify(detail)).not.toContain('prix_catalogue');
});
