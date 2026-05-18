import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { API_BASE_URL, authHeaders, dataOf, getJson, postJson } from './helpers';
import {
  PARTENAIRE_EXPECTED_NET_XOF,
  createActivePartenaireForE2E,
  createPaidPartnerReversement,
  createPendingPartnerCommission,
  createRejectedPartnerFormation,
  executePartnerReversement,
  submitValidateAndOpenPartnerFormation,
} from './partenaire-e2e-helpers';

const PAYLOAD_FORMATION_VALIDE = {
  intitule: 'Formation negative test',
  description_courte: 'Test negatif',
  description_longue: 'Test negatif description longue',
  duree_jours: 2,
  mode_formation: 'AVEC_SESSION',
  langues_disponibles: ['FR'],
  certification_delivree: false,
  objectifs_pedagogiques: ['Objectif test'],
  prix_coutant_propose: 100000,
};

function expectNoForbiddenPartnerFields(payload) {
  const serialized = JSON.stringify(payload);
  expect(serialized).not.toContain('commission_forges_pct');
  expect(serialized).not.toContain('cout_catalogue');
  expect(serialized).not.toContain('prix_catalogue');
  expect(serialized).not.toContain('taux_commission_forges');
}

test('partenaire API contract: endpoints exposent les infos autorisees et masquent les donnees FORGES', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const responsableHeaders = await authHeaders(request, E2E_ACCOUNTS.responsable);
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);
  const apprenantHeaders = await authHeaders(request, E2E_ACCOUNTS.apprenantRecon2);

  const partenaire = await createActivePartenaireForE2E(request, adminHeaders, 'Partenaire API Contract');
  const formation = await submitValidateAndOpenPartnerFormation(request, {
    partenaireHeaders: partenaire.headers,
    responsableHeaders,
    adminHeaders,
    titlePrefix: 'Formation API Contract',
  });
  const rejected = await createRejectedPartnerFormation(request, {
    partenaireHeaders: partenaire.headers,
    responsableHeaders,
  });
  await createPaidPartnerReversement(request, {
    partenaireId: partenaire.id,
    formation,
    apprenantHeaders,
    agentHeaders,
  });

  const dashboard = dataOf(await getJson(request, '/partenaires/dashboard', partenaire.headers));
  expectNoForbiddenPartnerFields(dashboard);
  expect(dashboard.formations.some((item) => item.id === formation.formationId)).toBe(true);
  expect(dashboard.reversements.percus_xof).toBe(PARTENAIRE_EXPECTED_NET_XOF);

  const formationsPayload = await getJson(request, '/partenaires/formations', partenaire.headers);
  const formations = dataOf(formationsPayload);
  expectNoForbiddenPartnerFields(formationsPayload);
  const visibleFormation = formations.find((item) => item.id === formation.formationId);
  expect(visibleFormation).toMatchObject({
    id: formation.formationId,
    intitule: formation.intitule,
    statut_validation: 'VALIDE',
    prix_coutant_valide: PARTENAIRE_EXPECTED_NET_XOF,
  });

  const rejectedDetail = dataOf(await getJson(request, `/partenaires/formations/${rejected.formationId}`, partenaire.headers));
  expectNoForbiddenPartnerFields(rejectedDetail);
  expect(rejectedDetail.statut_validation).toBe('REJETE');
  expect(rejectedDetail.commentaire_responsable).toContain('Programme trop vague');
  expect(rejectedDetail.corrections_suggeres).toContain('objectifs pédagogiques');

  const reversementsPayload = await getJson(request, '/partenaires/reversements', partenaire.headers);
  expectNoForbiddenPartnerFields(reversementsPayload);
  const reversements = dataOf(reversementsPayload).reversements;
  const reversement = reversements.find((item) => item.formation_intitule === formation.intitule);
  expect(reversement).toMatchObject({
    montant_reverse_xof: PARTENAIRE_EXPECTED_NET_XOF,
    statut: 'REVERSE',
    formation_intitule: formation.intitule,
  });
  expect(dataOf(reversementsPayload).totaux.reverses_xof).toBe(PARTENAIRE_EXPECTED_NET_XOF);
});

test('partenaire API contract: soumission rejette les champs reserves FORGES', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.partenaire);

  const response = await postJson(request, '/partenaires/formations', {
    intitule: 'Formation interdite contract',
    description_courte: 'Test champs interdits',
    description_longue: 'Test champs interdits',
    duree_jours: 3,
    mode_formation: 'AVEC_SESSION',
    langues_disponibles: ['FR'],
    certification_delivree: true,
    public_cible: 'Professionnels',
    objectifs_pedagogiques: ['Verifier RM-127'],
    prerequis: 'Aucun',
    prix_coutant_propose: 100000,
    type_formation: 'PREMIUM',
    pilier_abonnement: 'RETAIL',
    commission_forges_pct: 20,
  }, headers);

  expect(response.status).toBe(400);
  expect(response.payload.error).toBe('TYPE_FORMATION_READONLY');
  expect(response.payload.details.fields).toEqual(expect.arrayContaining([
    'type_formation',
    'pilier_abonnement',
    'commission_forges_pct',
  ]));
});

test('partenaire API contract: reversement multi-formations cumule les bons montants nets', async ({ request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const responsableHeaders = await authHeaders(request, E2E_ACCOUNTS.responsable);
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);
  const apprenantHeaders = await authHeaders(request, E2E_ACCOUNTS.apprenantRecon4);

  const partenaire = await createActivePartenaireForE2E(request, adminHeaders, 'Partenaire API Multi Reversement');
  const formationA = await submitValidateAndOpenPartnerFormation(request, {
    partenaireHeaders: partenaire.headers,
    responsableHeaders,
    adminHeaders,
    titlePrefix: 'Formation API Reversement A',
    prixCoutant: 200000,
  });
  const formationB = await submitValidateAndOpenPartnerFormation(request, {
    partenaireHeaders: partenaire.headers,
    responsableHeaders,
    adminHeaders,
    titlePrefix: 'Formation API Reversement B',
    prixCoutant: 150000,
  });

  await createPendingPartnerCommission(request, { formation: formationA, apprenantHeaders });
  await createPendingPartnerCommission(request, { formation: formationB, apprenantHeaders });

  const expectedTotal = 350000;
  const executed = await executePartnerReversement(request, {
    partenaireId: partenaire.id,
    formation: formationA,
    agentHeaders,
    expectedAmount: expectedTotal,
  });
  expect(executed.nb_commissions).toBe(2);

  const reversementsPayload = await getJson(request, '/partenaires/reversements', partenaire.headers);
  expectNoForbiddenPartnerFields(reversementsPayload);
  const reversements = dataOf(reversementsPayload).reversements;
  expect(reversements.filter((item) => item.statut === 'REVERSE')).toHaveLength(2);
  expect(dataOf(reversementsPayload).totaux.reverses_xof).toBe(expectedTotal);
  expect(reversements.map((item) => item.formation_intitule)).toEqual(expect.arrayContaining([
    formationA.intitule,
    formationB.intitule,
  ]));
});

test('partenaire API negatif: soumission incomplète retourne 400', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.partenaire);

  const response = await postJson(request, '/partenaires/formations', {
    intitule: 'Formation sans champs requis',
  }, headers);

  expect(response.status).toBe(400);
});

test('partenaire API negatif: prix coutant invalide (0) retourne 400', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.partenaire);

  const response = await postJson(request, '/partenaires/formations', {
    ...PAYLOAD_FORMATION_VALIDE,
    prix_coutant_propose: 0,
  }, headers);

  expect(response.status).toBe(400);
});

test('partenaire API negatif: token absent retourne 401', async ({ request }) => {
  const response = await request.get(`${API_BASE_URL}/partenaires/dashboard`);

  expect(response.status()).toBe(401);
});

test('partenaire API negatif: token malformé retourne 401', async ({ request }) => {
  const response = await request.get(`${API_BASE_URL}/partenaires/dashboard`, {
    headers: { Authorization: 'Bearer token-invalide' },
  });

  expect(response.status()).toBe(401);
});

test('partenaire API negatif: partenaire SUSPENDU ne peut pas soumettre de formation', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.partenaireSuspendu);

  const response = await postJson(request, '/partenaires/formations', PAYLOAD_FORMATION_VALIDE, headers);

  expect(response.status).toBe(403);
  expect(response.payload.error).toBe('PARTENAIRE_INACTIF');
});
