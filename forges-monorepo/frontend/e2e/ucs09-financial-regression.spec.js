import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import {
  authHeaders,
  dataOf,
  getJson,
  listOf,
  postJson,
  postSignedWebhook,
  putJson,
  uniqueEmail,
} from './helpers';

const PASSWORD = E2E_ACCOUNTS.partenaire.password;

function isoInDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function createActivePartenaire(request, adminHeaders, commissionForgesPct = 20) {
  const email = uniqueEmail('partenaire-finance-regression');
  const invited = await postJson(request, '/admin/partenaires', {
    email,
    raison_sociale: 'Partenaire Finance Regression',
    type: 'UNIVERSITE',
    commission_forges_pct: commissionForgesPct,
  }, adminHeaders);
  expect(invited.ok, JSON.stringify(invited.payload)).toBeTruthy();

  const partenaireId = dataOf(invited.payload).partenaire_id;
  const details = dataOf(await getJson(request, `/admin/partenaires/${partenaireId}`, adminHeaders));
  expect(details.token_invitation).toBeTruthy();

  const activation = await postJson(request, '/partenaires/activate', {
    token: details.token_invitation,
    password: PASSWORD,
  });
  expect(activation.ok, JSON.stringify(activation.payload)).toBeTruthy();

  const headers = await authHeaders(request, { email, password: PASSWORD });
  return { id: partenaireId, email, headers };
}

async function createApporteur(request, adminHeaders, taux = 5) {
  const created = await postJson(request, '/admin/apporteurs', {
    email: uniqueEmail('apporteur-finance-regression'),
    nom: 'Apporteur Finance Regression',
    type: 'INDIVIDU',
    taux_commission_pct: taux,
  }, adminHeaders);
  expect(created.ok, JSON.stringify(created.payload)).toBeTruthy();
  return dataOf(created.payload);
}

async function submitValidateAndOpenSession(request, {
  partenaireHeaders,
  responsableHeaders,
  adminHeaders,
  typeFormation = 'STANDARD',
  prixCoutant = 200000,
}) {
  const submitted = await postJson(request, '/partenaires/formations', {
    intitule: `Formation finance ${typeFormation.toLowerCase()} ${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    description_courte: 'Formation partenaire pour regression financiere E2E.',
    description_longue: 'Parcours E2E couvrant paiement, statut dossier, commissions et reversements.',
    duree_jours: 5,
    mode_formation: 'AVEC_SESSION',
    langues_disponibles: ['FR'],
    certification_delivree: true,
    organisme_certificateur: 'FORGES',
    public_cible: 'Professionnels',
    objectifs_pedagogiques: ['Valider le paiement', 'Verifier les commissions'],
    prerequis: 'Aucun',
    programme_syllabus: 'Paiement, commissions, reversement',
    modalite: 'HYBRIDE',
    nb_places_max_session: 20,
    prix_coutant_propose: prixCoutant,
  }, partenaireHeaders);
  expect(submitted.ok, JSON.stringify(submitted.payload)).toBeTruthy();

  const { formation_id: formationId, fp_id: formationPartenaireId } = dataOf(submitted.payload);
  const validation = await putJson(request, `/responsable/validations/${formationPartenaireId}/valider`, {
    type_formation: typeFormation,
    pilier_abonnement: 'RETAIL',
    prix_coutant_valide: prixCoutant,
  }, responsableHeaders);
  expect(validation.ok, JSON.stringify(validation.payload)).toBeTruthy();

  const expectedCatalogue = Math.ceil(prixCoutant / 0.8);
  expect(dataOf(validation.payload).prix_catalogue).toBe(expectedCatalogue);

  const session = await postJson(request, '/backoffice/sessions', {
    formation_id: formationId,
    date_ouverture: isoInDays(10),
    date_cloture: isoInDays(20),
    date_debut: isoInDays(30),
    date_fin: isoInDays(35),
    capacite: 20,
  }, adminHeaders);
  expect(session.ok, JSON.stringify(session.payload)).toBeTruthy();

  return {
    formationId,
    formationPartenaireId,
    sessionId: dataOf(session.payload).id,
    prixCatalogue: expectedCatalogue,
    prixCoutant,
  };
}

async function initierEtConfirmerPaiement(request, apprenantHeaders, dossierId, montant, transactionId) {
  const paiement = await postJson(request, '/paiements/initier', { dossier_id: dossierId }, apprenantHeaders);
  expect(paiement.ok, JSON.stringify(paiement.payload)).toBeTruthy();
  expect(dataOf(paiement.payload).montant_initie).toBe(montant);

  const webhook = await postSignedWebhook(request, '/paiements/webhook', {
    transaction_id: transactionId,
    dossier_id: dossierId,
    statut: 'SUCCESS',
    montant,
  });
  expect(webhook.ok, JSON.stringify(webhook.payload)).toBeTruthy();
  return dataOf(paiement.payload);
}

test('UCS09/RM-140: Premium Retail exige RETENU avant paiement et cree les commissions apres webhook signe', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const responsableHeaders = await authHeaders(request, E2E_ACCOUNTS.responsable);
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);
  const apprenantHeaders = await authHeaders(request, E2E_ACCOUNTS.apprenantRecon1);

  const partenaire = await createActivePartenaire(request, adminHeaders);
  const apporteur = await createApporteur(request, adminHeaders);
  const formation = await submitValidateAndOpenSession(request, {
    partenaireHeaders: partenaire.headers,
    responsableHeaders,
    adminHeaders,
    typeFormation: 'PREMIUM',
  });

  const inscription = await postJson(request, `/sessions/${formation.sessionId}/inscrire`, {
    source_financement: 'RETAIL',
    code_apporteur: apporteur.code_apporteur,
  }, apprenantHeaders);
  expect(inscription.ok, JSON.stringify(inscription.payload)).toBeTruthy();

  const dossierId = inscription.payload.dossier.id;
  expect(inscription.payload.dossier.statut).toBe('EN_ATTENTE_VERIFICATION');

  const paiementAvantRetenu = await postJson(request, '/paiements/initier', { dossier_id: dossierId }, apprenantHeaders);
  expect(paiementAvantRetenu.ok).toBeFalsy();
  expect(paiementAvantRetenu.status).toBe(400);
  expect(paiementAvantRetenu.payload.error).toBe('DOSSIER_STATUT_INVALIDE');

  const retenu = await postJson(request, `/dossiers/${dossierId}/retenir`, {}, responsableHeaders);
  expect(retenu.ok, JSON.stringify(retenu.payload)).toBeTruthy();

  const transactionId = `tx-premium-retail-${Date.now()}`;
  await initierEtConfirmerPaiement(request, apprenantHeaders, dossierId, formation.prixCatalogue, transactionId);

  const dossierPaye = dataOf(await getJson(request, `/dossiers/${dossierId}`, apprenantHeaders));
  expect(dossierPaye.statut).toBe('PAYE');
  expect(dossierPaye.paiement.statut).toBe('CONFIRME');
  expect(dossierPaye.paiement.transaction_id).toBe(transactionId);

  const reversementsPartenaires = await getJson(request, '/agent/reversements/partenaires', agentHeaders);
  const partenaireReversement = listOf(reversementsPartenaires)
    .find((item) => item.partenaire_id === partenaire.id);
  expect(partenaireReversement).toBeTruthy();
  expect(partenaireReversement.montant_total_xof).toBe(formation.prixCoutant);

  const apporteurDetail = dataOf(await getJson(request, `/admin/apporteurs/${apporteur.apporteur_id}`, adminHeaders));
  expect(apporteurDetail._count.commissions).toBe(1);
  expect(apporteurDetail.commissions[0].montant_base).toBe(formation.prixCatalogue);
  expect(apporteurDetail.commissions[0].montant_commission).toBe(Math.floor(formation.prixCatalogue * 0.05));
  expect(apporteurDetail.commissions[0].statut).toBe('EN_ATTENTE');
});

test('UCS09/RM-158: double webhook SUCCESS ne duplique ni commission partenaire ni commission apporteur', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const responsableHeaders = await authHeaders(request, E2E_ACCOUNTS.responsable);
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);
  const apprenantHeaders = await authHeaders(request, E2E_ACCOUNTS.apprenantRecon2);

  const partenaire = await createActivePartenaire(request, adminHeaders);
  const apporteur = await createApporteur(request, adminHeaders);
  const formation = await submitValidateAndOpenSession(request, {
    partenaireHeaders: partenaire.headers,
    responsableHeaders,
    adminHeaders,
  });

  const inscription = await postJson(request, `/sessions/${formation.sessionId}/inscrire`, {
    source_financement: 'RETAIL',
    code_apporteur: apporteur.code_apporteur,
  }, apprenantHeaders);
  expect(inscription.ok, JSON.stringify(inscription.payload)).toBeTruthy();

  const dossierId = inscription.payload.dossier.id;
  const transactionId = `tx-idempotence-${Date.now()}`;
  await initierEtConfirmerPaiement(request, apprenantHeaders, dossierId, formation.prixCatalogue, transactionId);

  const retrySameTransaction = await postSignedWebhook(request, '/paiements/webhook', {
    transaction_id: transactionId,
    dossier_id: dossierId,
    statut: 'SUCCESS',
    montant: formation.prixCatalogue,
  });
  expect(retrySameTransaction.ok, JSON.stringify(retrySameTransaction.payload)).toBeTruthy();

  const retryDifferentTransaction = await postSignedWebhook(request, '/paiements/webhook', {
    transaction_id: `${transactionId}-retry`,
    dossier_id: dossierId,
    statut: 'SUCCESS',
    montant: formation.prixCatalogue,
  });
  expect(retryDifferentTransaction.ok, JSON.stringify(retryDifferentTransaction.payload)).toBeTruthy();

  const dossierPaye = dataOf(await getJson(request, `/dossiers/${dossierId}`, apprenantHeaders));
  expect(dossierPaye.statut).toBe('PAYE');
  expect(dossierPaye.paiement.statut).toBe('CONFIRME');
  expect(dossierPaye.paiement.transaction_id).toBe(transactionId);

  const reversementsPartenaires = await getJson(request, '/agent/reversements/partenaires', agentHeaders);
  const partenaireReversement = listOf(reversementsPartenaires)
    .find((item) => item.partenaire_id === partenaire.id);
  expect(partenaireReversement).toBeTruthy();
  expect(partenaireReversement.nb_commissions).toBe(1);
  expect(partenaireReversement.montant_total_xof).toBe(formation.prixCoutant);

  const apporteurDetail = dataOf(await getJson(request, `/admin/apporteurs/${apporteur.apporteur_id}`, adminHeaders));
  expect(apporteurDetail._count.commissions).toBe(1);
  expect(apporteurDetail.commissions[0].montant_commission).toBe(Math.floor(formation.prixCatalogue * 0.05));
});

test('UCS09/RM-160: montant mismatch rejette le reglement et ne cree aucune commission', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const responsableHeaders = await authHeaders(request, E2E_ACCOUNTS.responsable);
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);
  const apprenantHeaders = await authHeaders(request, E2E_ACCOUNTS.apprenantRecon3);

  const partenaire = await createActivePartenaire(request, adminHeaders);
  const apporteur = await createApporteur(request, adminHeaders);
  const formation = await submitValidateAndOpenSession(request, {
    partenaireHeaders: partenaire.headers,
    responsableHeaders,
    adminHeaders,
  });

  const inscription = await postJson(request, `/sessions/${formation.sessionId}/inscrire`, {
    source_financement: 'RETAIL',
    code_apporteur: apporteur.code_apporteur,
  }, apprenantHeaders);
  expect(inscription.ok, JSON.stringify(inscription.payload)).toBeTruthy();

  const dossierId = inscription.payload.dossier.id;
  const paiement = await postJson(request, '/paiements/initier', { dossier_id: dossierId }, apprenantHeaders);
  expect(paiement.ok, JSON.stringify(paiement.payload)).toBeTruthy();

  const mismatch = await postSignedWebhook(request, '/paiements/webhook', {
    transaction_id: `tx-mismatch-${Date.now()}`,
    dossier_id: dossierId,
    statut: 'SUCCESS',
    montant: formation.prixCatalogue - 1000,
  });
  expect(mismatch.ok, JSON.stringify(mismatch.payload)).toBeTruthy();
  expect(dataOf(mismatch.payload).message).toBe('MONTANT_INVALIDE');

  const dossierApres = dataOf(await getJson(request, `/dossiers/${dossierId}`, apprenantHeaders));
  expect(dossierApres.statut).not.toBe('PAYE');
  expect(dossierApres.paiement.statut).not.toBe('CONFIRME');

  const reversementsPartenaires = await getJson(request, '/agent/reversements/partenaires', agentHeaders);
  expect(listOf(reversementsPartenaires).find((item) => item.partenaire_id === partenaire.id)).toBeUndefined();

  const apporteurDetail = dataOf(await getJson(request, `/admin/apporteurs/${apporteur.apporteur_id}`, adminHeaders));
  expect(apporteurDetail._count.commissions).toBe(0);
});

test('UCS09/RM-09: webhook FAILED annule le dossier et ne cree aucune commission', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const responsableHeaders = await authHeaders(request, E2E_ACCOUNTS.responsable);
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);
  const apprenantHeaders = await authHeaders(request, E2E_ACCOUNTS.apprenantRecon4);

  const partenaire = await createActivePartenaire(request, adminHeaders);
  const apporteur = await createApporteur(request, adminHeaders);
  const formation = await submitValidateAndOpenSession(request, {
    partenaireHeaders: partenaire.headers,
    responsableHeaders,
    adminHeaders,
  });

  const inscription = await postJson(request, `/sessions/${formation.sessionId}/inscrire`, {
    source_financement: 'RETAIL',
    code_apporteur: apporteur.code_apporteur,
  }, apprenantHeaders);
  expect(inscription.ok, JSON.stringify(inscription.payload)).toBeTruthy();

  const dossierId = inscription.payload.dossier.id;
  const paiement = await postJson(request, '/paiements/initier', { dossier_id: dossierId }, apprenantHeaders);
  expect(paiement.ok, JSON.stringify(paiement.payload)).toBeTruthy();

  const failed = await postSignedWebhook(request, '/paiements/webhook', {
    transaction_id: `tx-failed-${Date.now()}`,
    dossier_id: dossierId,
    statut: 'FAILED',
    montant: formation.prixCatalogue,
  });
  expect(failed.ok, JSON.stringify(failed.payload)).toBeTruthy();

  const dossierApres = dataOf(await getJson(request, `/dossiers/${dossierId}`, apprenantHeaders));
  expect(dossierApres.statut).toBe('ANNULE');
  expect(dossierApres.paiement.statut).toBe('ECHOUE');

  const reversementsPartenaires = await getJson(request, '/agent/reversements/partenaires', agentHeaders);
  expect(listOf(reversementsPartenaires).find((item) => item.partenaire_id === partenaire.id)).toBeUndefined();

  const apporteurDetail = dataOf(await getJson(request, `/admin/apporteurs/${apporteur.apporteur_id}`, adminHeaders));
  expect(apporteurDetail._count.commissions).toBe(0);
});
