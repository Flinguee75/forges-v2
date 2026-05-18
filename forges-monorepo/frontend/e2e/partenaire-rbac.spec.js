import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { API_BASE_URL, authHeaders, getJson, postJson, putJson } from './helpers';

test('partenaire RBAC API: les roles ne franchissent pas les frontieres critiques', async ({ request }) => {
  const partenaireHeaders = await authHeaders(request, E2E_ACCOUNTS.partenaire);
  const apprenantHeaders = await authHeaders(request, E2E_ACCOUNTS.apprenant);
  const responsableHeaders = await authHeaders(request, E2E_ACCOUNTS.responsable);
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);

  const apprenantDashboard = await request.get(`${API_BASE_URL}/partenaires/dashboard`, { headers: apprenantHeaders });
  expect(apprenantDashboard.status()).toBe(403);

  const partenaireBackofficeValidation = await putJson(request, '/responsable/validations/fp-rbac/valider', {
    type_formation: 'STANDARD',
    pilier_abonnement: 'RETAIL',
    prix_coutant_valide: 200000,
  }, partenaireHeaders);
  expect(partenaireBackofficeValidation.status).toBe(403);

  const agentValidation = await putJson(request, '/responsable/validations/fp-rbac/valider', {
    type_formation: 'STANDARD',
    pilier_abonnement: 'RETAIL',
    prix_coutant_valide: 200000,
  }, agentHeaders);
  expect(agentValidation.status).toBe(403);

  const responsableReversement = await postJson(
    request,
    '/agent/reversements/partenaires/part-rbac/execute',
    { reference: 'RBAC-REFUS' },
    responsableHeaders
  );
  expect(responsableReversement.status).toBe(403);

  const partenaireReversementAgent = await request.get(`${API_BASE_URL}/agent/reversements/partenaires`, { headers: partenaireHeaders });
  expect(partenaireReversementAgent.status()).toBe(403);

  await expect(getJson(request, '/agent/reversements/partenaires', agentHeaders)).resolves.toBeDefined();
});
