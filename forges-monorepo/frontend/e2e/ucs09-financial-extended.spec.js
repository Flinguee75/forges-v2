import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { authHeaders, dataOf, findDossier, getJson, listOf, postJson } from './helpers';

test('UCS20/RM-146/RM-147: commissions apporteur du mois precedent deviennent reversables puis REVERSEE', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);

  const scheduler = await postJson(request, '/apporteurs/scheduler/fin-mois', {}, adminHeaders);
  expect(scheduler.ok, JSON.stringify(scheduler.payload)).toBeTruthy();

  const schedulerData = dataOf(scheduler.payload);
  expect(schedulerData.nb_apporteurs_traites).toBeGreaterThan(0);
  expect(schedulerData['montant_total_agregé_xof']).toBeGreaterThanOrEqual(6000);

  const pending = await getJson(request, '/agent/reversements/apporteurs', agentHeaders);
  const apporteurRow = listOf(pending)
    .find((item) => item.apporteur_id === E2E_SCENARIO.apporteurId);
  expect(apporteurRow).toBeTruthy();
  expect(apporteurRow.montant_total_xof).toBe(6000);
  expect(apporteurRow.nb_commissions).toBe(3);

  const reversement = await postJson(
    request,
    `/agent/reversements/apporteurs/${E2E_SCENARIO.apporteurId}/execute`,
    {},
    agentHeaders
  );
  expect(reversement.ok, JSON.stringify(reversement.payload)).toBeTruthy();
  expect(dataOf(reversement.payload).montant_total_xof).toBe(6000);

  const pendingAfter = await getJson(request, '/agent/reversements/apporteurs', agentHeaders);
  expect(listOf(pendingAfter).find((item) => item.apporteur_id === E2E_SCENARIO.apporteurId)).toBeUndefined();

  const apporteurDetail = dataOf(await getJson(request, `/admin/apporteurs/${E2E_SCENARIO.apporteurId}`, adminHeaders));
  const seededCommissions = apporteurDetail.commissions.filter((commission) =>
    commission.montant_base === 40000 &&
    commission.montant_commission === 2000
  );
  expect(seededCommissions).toHaveLength(3);
  expect(seededCommissions.every((commission) => commission.statut === 'REVERSEE')).toBeTruthy();
});

test('UCS09/RM-144: code apporteur et voucher ne sont pas cumulables et ne creent aucun dossier', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantMismatch3);

  const result = await postJson(request, `/sessions/${E2E_SCENARIO.standardSessionId}/inscrire`, {
    source_financement: 'RETAIL',
    code_apporteur: E2E_SCENARIO.apporteurCode,
    voucher_code: E2E_SCENARIO.voucherCode,
  }, headers);

  expect(result.ok).toBeFalsy();
  expect(result.status).toBe(422);
  expect(result.payload.error).toBe('VOUCHER_CUMUL_INTERDIT');

  const dossier = await findDossier(request, headers, (item) =>
    item.session?.id === E2E_SCENARIO.standardSessionId ||
    item.session_id === E2E_SCENARIO.standardSessionId
  );
  expect(dossier).toBeUndefined();
});

test('UCS09/RM-41: voucher organisation couvre le paiement immediatement et incremente le quota', async ({ request }) => {
  const apprenantHeaders = await authHeaders(request, E2E_ACCOUNTS.apprenantMismatch1);
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);

  const before = dataOf(await getJson(request, `/vouchers/code/${E2E_SCENARIO.voucherOrganisationUcs12Code}`, adminHeaders));
  expect(before.statut).toBe('ACTIF');
  expect(before.quota_utilise).toBe(0);

  const result = await postJson(request, `/sessions/${E2E_SCENARIO.standardSessionId}/inscrire`, {
    source_financement: 'VOUCHER',
    voucher_code: E2E_SCENARIO.voucherOrganisationUcs12Code,
  }, apprenantHeaders);
  expect(result.ok, JSON.stringify(result.payload)).toBeTruthy();

  const dossier = result.payload.dossier;
  expect(dossier.statut).toBe('PAYE');
  expect(dossier.source_financement).toBe('VOUCHER');

  const dossierDetail = dataOf(await getJson(request, `/dossiers/${dossier.id}`, apprenantHeaders));
  expect(dossierDetail.statut).toBe('PAYE');
  expect(dossierDetail.paiement.statut).toBe('CONFIRME');
  expect(dossierDetail.paiement.methode).toBe('VOUCHER_ORG');
  expect(dossierDetail.paiement.transaction_id).toBe(`VOUCHER_ORG-${dossier.id}`);

  const after = dataOf(await getJson(request, `/vouchers/code/${E2E_SCENARIO.voucherOrganisationUcs12Code}`, adminHeaders));
  expect(after.quota_utilise).toBe(before.quota_utilise + 1);
});
