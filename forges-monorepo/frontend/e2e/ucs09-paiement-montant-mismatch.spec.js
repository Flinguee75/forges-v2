import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import {
  authHeaders,
  findDossier,
  postJson,
} from './helpers';

/**
 * UCS09 - Tests de validation montant IPN NGSER
 * RM-160: Montant IPN doit correspondre exactement au montant initié
 * 
 * Scénarios:
 * 1. IPN montant < montant initié → dossier reste EN_ATTENTE_PAIEMENT
 * 2. IPN montant == montant initié → dossier passe PAYE
 * 3. IPN FAILED → dossier passe ANNULE
 */

test('UCS09 RM-160 Montant Mismatch: IPN montant invalide (insuffisant) rejette paiement', async ({ request }) => {
  // 1. Créer une inscription
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantMismatch1);
  const inscription = await postJson(request, `/sessions/${E2E_SCENARIO.partenaireSessionId}/inscrire`, {
    source_financement: 'RETAIL',
  }, headers);
  expect(inscription.ok).toBeTruthy();

  const dossier = inscription.payload.dossier;
  const dossierId = dossier.id;

  // 2. Initier paiement NGSER (montant réel = 250000 XOF)
  const paiementResponse = await postJson(request, '/paiements/initier', {
    dossier_id: dossierId,
  }, headers);
  expect(paiementResponse.ok).toBeTruthy();

  // 3. Envoyer IPN avec montant INCORRECT (100000 au lieu de 250000)
  const transactionId = `TXN-MISMATCH-${Date.now()}-001`;
  const ipnPayload = {
    transaction_id: transactionId,
    dossier_id: dossierId,
    statut: 'SUCCESS',
    montant: 100000, // ❌ Montant insuffisant
  };

  const ipn = await postJson(request, '/paiements/webhook', ipnPayload, {});
  expect(ipn.ok).toBeTruthy();

  // 4. Vérifier que dossier reste EN_ATTENTE_PAIEMENT (paiement non accepté)
  const dossierAfter = await findDossier(request, headers, (item) => item.id === dossierId);
  expect(dossierAfter?.statut).toBe('EN_ATTENTE_PAIEMENT');
  expect(dossierAfter?.paiement?.statut).not.toBe('CONFIRME');
  
  console.log(`✅ Montant mismatch OK: dossier reste EN_ATTENTE_PAIEMENT`);
});

test('UCS09 RM-160 Montant Correct: IPN montant exact confirme paiement', async ({ request }) => {
  // 1. Créer une inscription
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantMismatch2);
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

  // Récupérer le montant exact initié
  const dossierBefore = await findDossier(request, headers, (item) => item.id === dossierId);
  const montantAttendus = dossierBefore?.paiement?.montant_final || 150000;

  // 3. Envoyer IPN avec montant CORRECT
  const transactionId = `TXN-MISMATCH-${Date.now()}-002`;
  const ipnPayload = {
    transaction_id: transactionId,
    dossier_id: dossierId,
    statut: 'SUCCESS',
    montant: montantAttendus, // ✅ Montant correct
  };

  const ipn = await postJson(request, '/paiements/webhook', ipnPayload, {});
  expect(ipn.ok).toBeTruthy();

  // 4. Vérifier que dossier passe PAYE
  const dossierAfter = await findDossier(request, headers, (item) => item.id === dossierId);
  expect(dossierAfter?.statut).toBe('PAYE');
  expect(dossierAfter?.paiement?.statut).toBe('CONFIRME');
  
  console.log(`✅ Montant correct OK: dossier passe PAYE`);
});

test('UCS09 RM-160 IPN FAILED: Status FAILED fait passer dossier en ANNULE', async ({ request }) => {
  // 1. Créer une inscription
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenantMismatch3);
  const inscription = await postJson(request, `/sessions/${E2E_SCENARIO.partenaireSessionId}/inscrire`, {
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

  // 3. Envoyer IPN avec status FAILED
  const transactionId = `TXN-MISMATCH-${Date.now()}-003`;
  const ipnPayload = {
    transaction_id: transactionId,
    dossier_id: dossierId,
    statut: 'FAILED',
    montant: 250000,
  };

  const ipn = await postJson(request, '/paiements/webhook', ipnPayload, {});
  expect(ipn.ok).toBeTruthy();

  // 4. Vérifier que dossier passe ANNULE
  const dossierAfter = await findDossier(request, headers, (item) => item.id === dossierId);
  expect(dossierAfter?.statut).toBe('ANNULE');
  expect(dossierAfter?.paiement?.statut).toBe('ECHOUE');
  
  console.log(`✅ IPN FAILED OK: dossier passe ANNULE`);
});
