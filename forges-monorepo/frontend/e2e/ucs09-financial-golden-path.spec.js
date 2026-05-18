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

test('UCS09 finance golden path: partenaire + apporteur + paiement signé produisent les commissions attendues', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const responsableHeaders = await authHeaders(request, E2E_ACCOUNTS.responsable);
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);
  const apprenantHeaders = await authHeaders(request, E2E_ACCOUNTS.apprenantRecon5);

  const partenaireEmail = uniqueEmail('partenaire-finance-golden');
  const partenaireInvite = await postJson(request, '/admin/partenaires', {
    email: partenaireEmail,
    raison_sociale: 'Partenaire Finance Golden',
    type: 'UNIVERSITE',
    commission_forges_pct: 20,
  }, adminHeaders);
  expect(partenaireInvite.ok, JSON.stringify(partenaireInvite.payload)).toBeTruthy();

  const partenaireId = dataOf(partenaireInvite.payload).partenaire_id;
  const partenaireAdminDetail = await getJson(request, `/admin/partenaires/${partenaireId}`, adminHeaders);
  const token = dataOf(partenaireAdminDetail).token_invitation;
  expect(token).toBeTruthy();

  const activation = await postJson(request, '/partenaires/activate', {
    token,
    password: PASSWORD,
  });
  expect(activation.ok, JSON.stringify(activation.payload)).toBeTruthy();
  expect(dataOf(activation.payload).partenaire?.statut).toBe('ACTIF');

  const partenaireHeaders = await authHeaders(request, {
    email: partenaireEmail,
    password: PASSWORD,
  });

  const apporteurEmail = uniqueEmail('apporteur-finance-golden');
  const apporteurCreated = await postJson(request, '/admin/apporteurs', {
    email: apporteurEmail,
    nom: 'Apporteur Finance Golden',
    type: 'INDIVIDU',
    taux_commission_pct: 5,
  }, adminHeaders);
  expect(apporteurCreated.ok, JSON.stringify(apporteurCreated.payload)).toBeTruthy();

  const apporteur = dataOf(apporteurCreated.payload);
  expect(apporteur.apporteur_id).toBeTruthy();
  expect(apporteur.code_apporteur).toBeTruthy();

  const soumission = await postJson(request, '/partenaires/formations', {
    intitule: `Formation finance golden ${Date.now()}`,
    description_courte: 'Formation partenaire pour valider le flux financier E2E.',
    description_longue: 'Parcours E2E déterministe couvrant prix catalogue, paiement, commissions et reversement.',
    duree_jours: 5,
    mode_formation: 'AVEC_SESSION',
    langues_disponibles: ['FR'],
    certification_delivree: true,
    organisme_certificateur: 'FORGES',
    public_cible: 'Professionnels finance',
    objectifs_pedagogiques: ['Valider un paiement', 'Contrôler les commissions'],
    prerequis: 'Aucun',
    programme_syllabus: 'Paiement, commissions, reversement',
    modalite: 'HYBRIDE',
    nb_places_max_session: 20,
    prix_coutant_propose: 200000,
  }, partenaireHeaders);
  expect(soumission.ok, JSON.stringify(soumission.payload)).toBeTruthy();

  const { formation_id: formationId, fp_id: formationPartenaireId } = dataOf(soumission.payload);
  expect(formationId).toBeTruthy();
  expect(formationPartenaireId).toBeTruthy();

  const validation = await putJson(request, `/responsable/validations/${formationPartenaireId}/valider`, {
    type_formation: 'STANDARD',
    pilier_abonnement: 'RETAIL',
    prix_coutant_valide: 200000,
  }, responsableHeaders);
  expect(validation.ok, JSON.stringify(validation.payload)).toBeTruthy();

  const validationData = dataOf(validation.payload);
  expect(validationData.formation_id).toBe(formationId);
  expect(validationData.type_formation).toBe('STANDARD');
  expect(validationData.prix_catalogue).toBe(250000);
  expect(validationData.inclus_abonnement).toBe(true);

  const session = await postJson(request, '/backoffice/sessions', {
    formation_id: formationId,
    date_ouverture: isoInDays(10),
    date_cloture: isoInDays(20),
    date_debut: isoInDays(30),
    date_fin: isoInDays(35),
    capacite: 20,
  }, adminHeaders);
  expect(session.ok, JSON.stringify(session.payload)).toBeTruthy();

  const sessionId = dataOf(session.payload).id;
  expect(sessionId).toBeTruthy();

  const inscription = await postJson(request, `/sessions/${sessionId}/inscrire`, {
    source_financement: 'RETAIL',
    code_apporteur: apporteur.code_apporteur,
  }, apprenantHeaders);
  expect(inscription.ok, JSON.stringify(inscription.payload)).toBeTruthy();

  const dossier = inscription.payload.dossier;
  expect(dossier.id).toBeTruthy();
  expect(dossier.statut).toBe('PAYE_DIRECTEMENT');
  expect(dossier.montant_total).toBe(250000);

  const paiementInitie = await postJson(request, '/paiements/initier', {
    dossier_id: dossier.id,
  }, apprenantHeaders);
  expect(paiementInitie.ok, JSON.stringify(paiementInitie.payload)).toBeTruthy();

  const paiementData = dataOf(paiementInitie.payload);
  expect(paiementData.paiement_id).toBeTruthy();
  expect(paiementData.montant_initie).toBe(250000);

  const transactionId = `tx-finance-golden-${Date.now()}`;
  const webhook = await postSignedWebhook(request, '/paiements/webhook', {
    transaction_id: transactionId,
    dossier_id: dossier.id,
    statut: 'SUCCESS',
    montant: paiementData.montant_initie,
  });
  expect(webhook.ok, JSON.stringify(webhook.payload)).toBeTruthy();

  const dossierPaye = dataOf(await getJson(request, `/dossiers/${dossier.id}`, apprenantHeaders));
  expect(dossierPaye.statut).toBe('PAYE');
  expect(dossierPaye.paiement.statut).toBe('CONFIRME');
  expect(dossierPaye.paiement.transaction_id).toBe(transactionId);

  const reversementsPartenaires = await getJson(request, '/agent/reversements/partenaires', agentHeaders);
  const partenaireReversement = listOf(reversementsPartenaires)
    .find((item) => item.partenaire_id === partenaireId);
  expect(partenaireReversement).toBeTruthy();
  expect(partenaireReversement.montant_total_xof).toBe(200000);
  expect(JSON.stringify(partenaireReversement)).not.toContain('commission_forges_pct');

  const reversementPartenaire = await postJson(
    request,
    `/agent/reversements/partenaires/${partenaireId}/execute`,
    { reference: `REV-PART-${Date.now()}` },
    agentHeaders
  );
  expect(reversementPartenaire.ok, JSON.stringify(reversementPartenaire.payload)).toBeTruthy();
  expect(dataOf(reversementPartenaire.payload).montant_reverse_xof).toBe(200000);

  const apporteurAdminDetail = dataOf(await getJson(request, `/admin/apporteurs/${apporteur.apporteur_id}`, adminHeaders));
  expect(apporteurAdminDetail._count.commissions).toBeGreaterThanOrEqual(1);
  expect(apporteurAdminDetail.commissions[0].montant_base).toBe(250000);
  expect(apporteurAdminDetail.commissions[0].montant_commission).toBe(12500);
  expect(apporteurAdminDetail.commissions[0].statut).toBe('EN_ATTENTE');

  const partenaireDashboard = dataOf(await getJson(request, '/partenaires/dashboard', partenaireHeaders));
  expect(JSON.stringify(partenaireDashboard)).not.toContain('commission_forges_pct');
});
