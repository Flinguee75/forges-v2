import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import {
  authHeaders,
  findDossier,
  postJson,
} from './helpers';

/**
 * UCS09 - Tests d'idempotence IPN NGSER
 * RM-158: IPN est strictement idempotente (transaction_id unique)
 * 
 * Scénarios:
 * 1. Double IPN SUCCESS → une seule commission créée
 * 2. Double IPN SUCCESS → dossier reste PAYE (pas de corruption)
 */

test('UCS09 RM-158 Idempotence: Double IPN SUCCESS crée une seule commission', async ({ request }) => {
  // 1. Créer une inscription
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantIdempotence1);
  const inscription = await postJson(request, `/sessions/${E2E_SCENARIO.partenaireSessionId}/inscrire`, {
    source_financement: 'RETAIL',
  }, headers);
  expect(inscription.ok).toBeTruthy();

  const dossier = inscription.payload.dossier;
  const dossierId = dossier.id;

  // 2. Initier un paiement NGSER
  const paiementResponse = await postJson(request, '/paiements/initier', {
    dossier_id: dossierId,
  }, headers);
  expect(paiementResponse.ok).toBeTruthy();
  
  const orderNgser = paiementResponse.payload.order_ngser;
  expect(orderNgser).toBeTruthy();
  expect(orderNgser).toMatch(/^FORGES-/);

  // 3. Envoyer IPN SUCCESS
  const transactionId = `TXN-IDEMPOTENCE-${Date.now()}-001`;
  const ipnPayload = {
    transaction_id: transactionId,
    dossier_id: dossierId,
    statut: 'SUCCESS',
    montant: 250000,
  };

  const ipn1 = await postJson(request, '/paiements/webhook', ipnPayload, {});
  expect(ipn1.ok).toBeTruthy();

  // 4. Récupérer le dossier et vérifier commission
  const dossier1 = await findDossier(request, headers, (item) => item.id === dossierId);
  expect(dossier1?.statut).toBe('PAYE');
  expect(dossier1?.paiement?.statut).toBe('CONFIRME');
  
  const commissionsCount1 = dossier1?.commissions?.length || 0;
  expect(commissionsCount1).toBeGreaterThan(0);

  // 5. Renvoyer EXACTEMENT la même IPN (simulation de double)
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const ipn2 = await postJson(request, '/paiements/webhook', ipnPayload, {});
  expect(ipn2.ok).toBeTruthy();

  // 6. Vérifier que le dossier n'a toujours qu'une commission (idempotence)
  const dossier2 = await findDossier(request, headers, (item) => item.id === dossierId);
  expect(dossier2?.statut).toBe('PAYE');
  expect(dossier2?.paiement?.statut).toBe('CONFIRME');
  
  const commissionsCount2 = dossier2?.commissions?.length || 0;
  expect(commissionsCount2).toBe(commissionsCount1);
  console.log(`✅ Idempotence OK: ${commissionsCount1} commission après 2 IPN identiques`);
});

test('UCS09 RM-158 Idempotence: Dossier reste PAYE après double IPN (pas de corruption)', async ({ request }) => {
  // 1. Créer une inscription
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantIdempotence2);
  const inscription = await postJson(request, `/sessions/${E2E_SCENARIO.standardSessionId}/inscrire`, {
    source_financement: 'RETAIL',
  }, headers);
  expect(inscription.ok).toBeTruthy();

  const dossier = inscription.payload.dossier;
  const dossierId = dossier.id;

  // 2. Initier paiement NGSER
  const paiementResponse = await postJson(request, '/paiements/initier', {
    dossier_id: dossierId,
  }, headers);
  expect(paiementResponse.ok).toBeTruthy();

  // 3. Envoyer IPN SUCCESS
  const transactionId = `TXN-IDEMPOTENCE-${Date.now()}-002`;
  const ipnPayload = {
    transaction_id: transactionId,
    dossier_id: dossierId,
    statut: 'SUCCESS',
    montant: 150000,
  };

  const ipn1 = await postJson(request, '/paiements/webhook', ipnPayload, {});
  expect(ipn1.ok).toBeTruthy();

  const dossier1 = await findDossier(request, headers, (item) => item.id === dossierId);
  expect(dossier1?.statut).toBe('PAYE');

  // 4. Renvoyer même IPN
  await new Promise(resolve => setTimeout(resolve, 500));
  const ipn2 = await postJson(request, '/paiements/webhook', ipnPayload, {});
  expect(ipn2.ok).toBeTruthy();

  // 5. Vérifier que statut reste PAYE (pas passé à ANNULE ou autre)
  const dossier2 = await findDossier(request, headers, (item) => item.id === dossierId);
  expect(dossier2?.statut).toBe('PAYE');
  expect(dossier2?.paiement?.statut).toBe('CONFIRME');

  // 6. Renvoyer une 3ème fois
  await new Promise(resolve => setTimeout(resolve, 500));
  const ipn3 = await postJson(request, '/paiements/webhook', ipnPayload, {});
  expect(ipn3.ok).toBeTruthy();

  const dossier3 = await findDossier(request, headers, (item) => item.id === dossierId);
  expect(dossier3?.statut).toBe('PAYE');
  expect(dossier3?.paiement?.statut).toBe('CONFIRME');
  
  console.log(`✅ Corruption check OK: statut reste PAYE après 3 IPN identiques`);
});
