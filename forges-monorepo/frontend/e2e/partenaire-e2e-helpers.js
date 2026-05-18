import { expect } from '@playwright/test';
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

export const PARTENAIRE_E2E_PASSWORD = E2E_ACCOUNTS.partenaire.password;
export const PARTENAIRE_EXPECTED_NET_XOF = 200000;
export const PARTENAIRE_EXPECTED_NET_LABEL = /2\s*000 FCFA/;

function isoInDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function createActivePartenaireForE2E(request, adminHeaders, label = 'Partenaire Tests Pousses') {
  const email = uniqueEmail('partenaire-tests-pousses');
  const invited = await postJson(request, '/admin/partenaires', {
    email,
    raison_sociale: label,
    type: 'UNIVERSITE',
    commission_forges_pct: 20,
  }, adminHeaders);
  expect(invited.ok, JSON.stringify(invited.payload)).toBeTruthy();

  const partenaireId = dataOf(invited.payload).partenaire_id;
  expect(partenaireId).toBeTruthy();

  const details = dataOf(await getJson(request, `/admin/partenaires/${partenaireId}`, adminHeaders));
  expect(details.token_invitation).toBeTruthy();

  const activation = await postJson(request, '/partenaires/activate', {
    token: details.token_invitation,
    password: PARTENAIRE_E2E_PASSWORD,
  });
  expect(activation.ok, JSON.stringify(activation.payload)).toBeTruthy();

  const headers = await authHeaders(request, { email, password: PARTENAIRE_E2E_PASSWORD });
  return { id: partenaireId, email, password: PARTENAIRE_E2E_PASSWORD, headers };
}

export async function submitValidateAndOpenPartnerFormation(request, {
  partenaireHeaders,
  responsableHeaders,
  adminHeaders,
  titlePrefix = 'Formation partenaire tests pousses',
  prixCoutant = PARTENAIRE_EXPECTED_NET_XOF,
}) {
  const intitule = `${titlePrefix} ${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const submitted = await postJson(request, '/partenaires/formations', {
    intitule,
    description_courte: 'Formation partenaire déterministe pour tests UI et contrat API.',
    description_longue: 'Parcours couvrant les informations formation, les paiements et les reversements nets.',
    duree_jours: 5,
    mode_formation: 'AVEC_SESSION',
    langues_disponibles: ['FR'],
    certification_delivree: true,
    organisme_certificateur: 'FORGES',
    public_cible: 'Professionnels',
    objectifs_pedagogiques: ['Verifier les informations formation', 'Verifier les reversements nets'],
    prerequis: 'Aucun',
    programme_syllabus: 'Soumission, validation, paiement, reversement',
    modalite: 'HYBRIDE',
    nb_places_max_session: 20,
    prix_coutant_propose: prixCoutant,
  }, partenaireHeaders);
  expect(submitted.ok, JSON.stringify(submitted.payload)).toBeTruthy();

  const { formation_id: formationId, fp_id: formationPartenaireId } = dataOf(submitted.payload);
  expect(formationId).toBeTruthy();
  expect(formationPartenaireId).toBeTruthy();

  const validation = await putJson(request, `/responsable/validations/${formationPartenaireId}/valider`, {
    type_formation: 'STANDARD',
    pilier_abonnement: 'RETAIL',
    prix_coutant_valide: prixCoutant,
  }, responsableHeaders);
  expect(validation.ok, JSON.stringify(validation.payload)).toBeTruthy();

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
    intitule,
    prixCoutant,
    prixCatalogue: dataOf(validation.payload).prix_catalogue,
  };
}

export async function createRejectedPartnerFormation(request, {
  partenaireHeaders,
  responsableHeaders,
}) {
  const intitule = `Formation partenaire rejetee ${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const submitted = await postJson(request, '/partenaires/formations', {
    intitule,
    description_courte: 'Formation rejetée pour vérifier les corrections visibles.',
    description_longue: 'Formation volontairement rejetée dans le scénario E2E partenaire.',
    duree_jours: 2,
    mode_formation: 'AVEC_SESSION',
    langues_disponibles: ['FR'],
    certification_delivree: false,
    public_cible: 'Professionnels',
    objectifs_pedagogiques: ['Identifier les corrections'],
    prerequis: 'Aucun',
    programme_syllabus: 'Contenu incomplet',
    modalite: 'EN_LIGNE',
    nb_places_max_session: 12,
    prix_coutant_propose: 100000,
  }, partenaireHeaders);
  expect(submitted.ok, JSON.stringify(submitted.payload)).toBeTruthy();

  const { formation_id: formationId, fp_id: formationPartenaireId } = dataOf(submitted.payload);
  const rejection = await putJson(request, `/responsable/validations/${formationPartenaireId}/rejeter`, {
    motif: 'Programme trop vague',
    corrections_suggeres: 'Ajouter les objectifs pédagogiques détaillés et les modalités d evaluation.',
  }, responsableHeaders);
  expect(rejection.ok, JSON.stringify(rejection.payload)).toBeTruthy();

  return { formationId, formationPartenaireId, intitule };
}

export async function createPaidPartnerReversement(request, {
  partenaireId,
  formation,
  apprenantHeaders,
  agentHeaders,
}) {
  await createPendingPartnerCommission(request, {
    formation,
    apprenantHeaders,
  });

  return executePartnerReversement(request, {
    partenaireId,
    formation,
    agentHeaders,
  });
}

export async function createPendingPartnerCommission(request, {
  formation,
  apprenantHeaders,
}) {
  const inscription = await postJson(request, `/sessions/${formation.sessionId}/inscrire`, {
    source_financement: 'RETAIL',
  }, apprenantHeaders);
  expect(inscription.ok, JSON.stringify(inscription.payload)).toBeTruthy();

  const dossier = inscription.payload.dossier;
  expect(dossier.id).toBeTruthy();
  expect(dossier.montant_total).toBe(formation.prixCatalogue);

  const paiement = await postJson(request, '/paiements/initier', {
    dossier_id: dossier.id,
  }, apprenantHeaders);
  expect(paiement.ok, JSON.stringify(paiement.payload)).toBeTruthy();

  const paiementData = dataOf(paiement.payload);
  const transactionId = `tx-partenaire-tests-${Date.now()}`;
  const webhook = await postSignedWebhook(request, '/paiements/webhook', {
    transaction_id: transactionId,
    dossier_id: dossier.id,
    statut: 'SUCCESS',
    montant: paiementData.montant_initie,
  });
  expect(webhook.ok, JSON.stringify(webhook.payload)).toBeTruthy();

  return { dossierId: dossier.id, transactionId };
}

export async function executePartnerReversement(request, {
  partenaireId,
  formation,
  agentHeaders,
  expectedAmount = formation.prixCoutant,
}) {
  const reversements = await getJson(request, '/agent/reversements/partenaires', agentHeaders);
  const row = listOf(reversements).find((item) => item.partenaire_id === partenaireId);
  expect(row).toBeTruthy();
  expect(row.montant_total_xof).toBe(expectedAmount);
  expect(JSON.stringify(row)).not.toContain('commission_forges_pct');

  const executed = await postJson(
    request,
    `/agent/reversements/partenaires/${partenaireId}/execute`,
    { reference: `REV-PART-TEST-${Date.now()}` },
    agentHeaders
  );
  expect(executed.ok, JSON.stringify(executed.payload)).toBeTruthy();
  expect(dataOf(executed.payload).montant_reverse_xof).toBe(expectedAmount);

  return dataOf(executed.payload);
}
