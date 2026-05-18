import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import { authHeaders, dataOf, getJson, loginAsOrganisation, postJson, uniqueEmail } from './helpers';

/**
 * UCS12.2 — Inscrire un beneficiaire a une formation (organisation)
 *
 * Parcours couvert :
 *   1. L'org inscrit un employe via l'API (B2B) — dossier PAYE cree
 *   2. L'employe voit le dossier PAYE dans son espace apprenant
 *   3. Le badge "Inscrit par l'org" apparait dans la liste inscriptions de l'org
 *   4. L'org inscrit un employe via un VoucherOrganisation — dossier PAYE cree
 *   5. Parcours UI : modale 3 etapes sur la fiche formation
 */

test('UCS12.2 — API B2B : org inscrit un employe, dossier PAYE visible cote apprenant', async ({ request }) => {
  const orgHeaders = await authHeaders(request, E2E_ACCOUNTS.organisation);

  // Recuperer le membre seed authentifiable cote apprenant.
  const membresRes = await getJson(request, '/espace-organisation/membres', orgHeaders);
  const membres = dataOf(membresRes)?.membres ?? dataOf(membresRes)?.data ?? dataOf(membresRes) ?? [];
  const beneficiaire = membres.find(
    (m) => m.email === E2E_ACCOUNTS.apprenantBeneficiaireOrg.email
  );
  expect(beneficiaire, 'Le beneficiaire doit etre membre de l\'organisation').toBeTruthy();

  // Inscrire le beneficiaire via B2B
  const inscriptionRes = await postJson(request, '/espace-organisation/inscrire-beneficiaire', {
    beneficiaire_id: beneficiaire.id,
    session_id: E2E_SCENARIO.standardSessionId,
    source_financement: 'B2B',
  }, orgHeaders);

  expect([201, 409]).toContain(inscriptionRes.status);
  const payload = dataOf(inscriptionRes.payload);
  const dossierId = inscriptionRes.status === 201 ? payload.dossier_id : null;
  if (dossierId) {
    expect(payload.statut).toBe('PAYE');
  }

  // Verifier que l'employe voit le dossier dans son espace apprenant
  const apprenantHeaders = await authHeaders(request, E2E_ACCOUNTS.apprenantBeneficiaireOrg);
  const dossiersRes = await getJson(request, '/espace-apprenant/dossiers', apprenantHeaders);
  const dossiers = dataOf(dossiersRes)?.dossiers ?? dataOf(dossiersRes) ?? [];
  const dossier = (Array.isArray(dossiers) ? dossiers : []).find((d) => (
    dossierId ? d.id === dossierId : (
      d.session_id === E2E_SCENARIO.standardSessionId
      || d.session?.id === E2E_SCENARIO.standardSessionId
    )
  ));

  expect(dossier, 'Le dossier doit etre visible dans l\'espace apprenant').toBeTruthy();
  expect(dossier.statut).toBe('PAYE');
});

test('UCS12.2 — API : dossier B2B visible dans les inscriptions de l\'org avec badge', async ({ request }) => {
  const orgHeaders = await authHeaders(request, E2E_ACCOUNTS.organisation);

  const membresRes = await getJson(request, '/espace-organisation/membres', orgHeaders);
  const membres = dataOf(membresRes)?.membres ?? dataOf(membresRes)?.data ?? dataOf(membresRes) ?? [];
  const beneficiaire = membres.find(
    (m) => m.email === E2E_ACCOUNTS.apprenantBeneficiaireOrg.email
  );
  expect(beneficiaire).toBeTruthy();

  // Inscrire (peut deja exister depuis le test precedent — ignorer 409)
  await postJson(request, '/espace-organisation/inscrire-beneficiaire', {
    beneficiaire_id: beneficiaire.id,
    session_id: E2E_SCENARIO.standardSessionId,
    source_financement: 'B2B',
  }, orgHeaders);

  // L'inscription doit apparaitre dans la liste inscriptions de l'org
  const inscriptionsRes = await getJson(request, '/espace-organisation/inscriptions', orgHeaders);
  const dossiers = dataOf(inscriptionsRes)?.dossiers ?? dataOf(inscriptionsRes) ?? [];
  const dossierInscrit = (Array.isArray(dossiers) ? dossiers : []).find(
    (d) => d.apprenant?.email === E2E_ACCOUNTS.apprenantBeneficiaireOrg.email
      || d.etudiant?.email === E2E_ACCOUNTS.apprenantBeneficiaireOrg.email
  );

  expect(dossierInscrit, 'L\'inscription doit apparaitre dans la liste org').toBeTruthy();
  expect(dossierInscrit.organisation_inscriptrice_id).toBeTruthy();
  expect(dossierInscrit.statut).toBe('PAYE');
});

test('UCS12.2 — API VOUCHER : org inscrit via VoucherOrganisation, dossier PAYE', async ({ request }) => {
  const orgHeaders = await authHeaders(request, E2E_ACCOUNTS.organisation);

  const membresRes = await getJson(request, '/espace-organisation/membres', orgHeaders);
  const membres = dataOf(membresRes)?.membres ?? dataOf(membresRes)?.data ?? dataOf(membresRes) ?? [];
  const beneficiaire = membres.find(
    (m) => m.email === E2E_ACCOUNTS.apprenantBeneficiaireOrg.email
  );
  expect(beneficiaire).toBeTruthy();

  // Creer un nouveau membre dedie pour tester le path VOUCHER sans conflit de session
  const emailVoucher = uniqueEmail('beneficiaire-voucher-ucs12');
  const createRes = await postJson(request, '/espace-organisation/membres', {
    email: emailVoucher,
    nom: 'VoucherTest',
    prenom: 'UCS12',
    secteur_activite: 'Formation',
    niveau_etude: 'Master',
  }, orgHeaders);
  expect([201, 200]).toContain(createRes.status);
  const newMember = dataOf(createRes.payload)?.apprenant ?? dataOf(createRes.payload);
  expect(newMember?.id).toBeTruthy();

  const voucherRes = await postJson(request, '/espace-organisation/inscrire-beneficiaire', {
    beneficiaire_id: newMember.id,
    session_id: E2E_SCENARIO.standardSessionId,
    source_financement: 'VOUCHER',
    voucher_organisation_id: E2E_SCENARIO.voucherOrganisationUcs12Id,
  }, orgHeaders);

  expect(voucherRes.ok, `Inscription VOUCHER echouee (${voucherRes.status}): ${JSON.stringify(voucherRes.payload)}`).toBeTruthy();
  expect(voucherRes.status).toBe(201);
  expect(dataOf(voucherRes.payload).statut).toBe('PAYE');
});

test('UCS12.2 — API : rejet si beneficiaire non membre de l\'org', async ({ request }) => {
  const orgHeaders = await authHeaders(request, E2E_ACCOUNTS.organisation);

  // Utiliser un ID d'apprenant qui n'est pas dans l'org
  const res = await postJson(request, '/espace-organisation/inscrire-beneficiaire', {
    beneficiaire_id: 'app-e2e-apprenant-01',
    session_id: E2E_SCENARIO.standardSessionId,
    source_financement: 'B2B',
  }, orgHeaders);

  expect(res.status).toBe(403);
});

test('UCS12.2 — UI : modale inscription employe 3 etapes (B2B)', async ({ page, request }) => {
  const orgHeaders = await authHeaders(request, E2E_ACCOUNTS.organisation);
  const emailB2B = uniqueEmail('beneficiaire-b2b-ui-ucs12');
  const createRes = await postJson(request, '/espace-organisation/membres', {
    email: emailB2B,
    nom: 'B2BUi',
    prenom: 'UCS12',
    secteur_activite: 'Formation',
    niveau_etude: 'Master',
  }, orgHeaders);
  expect([201, 200]).toContain(createRes.status);
  const newMember = dataOf(createRes.payload)?.apprenant ?? dataOf(createRes.payload);
  expect(newMember?.id).toBeTruthy();

  await loginAsOrganisation(page);

  // Navigation directe vers la fiche de la formation standard (ID stable du seed)
  await page.goto(`/organisation/catalogue/${E2E_SCENARIO.standardFormationId}`);
  await expect(page).toHaveURL(new RegExp(E2E_SCENARIO.standardFormationId));

  // Ouvrir la modale
  const btnInscrire = page.getByTestId('btn-inscrire-employe');
  await expect(btnInscrire).toBeVisible();
  await btnInscrire.click();

  // --- Etape 1 : Choisir le beneficiaire ---
  const selectBeneficiaire = page.getByTestId('select-beneficiaire');
  await expect(selectBeneficiaire).toBeVisible();
  // Selectionner le membre dedie a ce test pour eviter les doublons d'inscription.
  await selectBeneficiaire.selectOption(newMember.id);
  // Verifier que la selection est effective avant de continuer
  await expect(selectBeneficiaire).toHaveValue(newMember.id);
  await page.getByRole('button', { name: 'Suivant' }).click();

  // --- Etape 2 : Choisir la session ---
  const selectSession = page.getByTestId('select-session');
  await expect(selectSession).toBeVisible();
  // Selectionner la premiere session disponible (index 1, apres l'option vide)
  const sessionOptions = await selectSession.locator('option').all();
  const firstSessionValue = await sessionOptions[1]?.getAttribute('value');
  expect(firstSessionValue, 'Au moins une session ouverte doit etre disponible').toBeTruthy();
  await selectSession.selectOption(firstSessionValue);
  await expect(selectSession).toHaveValue(firstSessionValue);
  await page.getByRole('button', { name: 'Suivant' }).click();

  // --- Etape 3 : Choisir le financement B2B ---
  const radioB2B = page.locator('input[type="radio"][value="B2B"]');
  await expect(radioB2B).toBeVisible();
  await radioB2B.check();
  await expect(radioB2B).toBeChecked();

  await page.getByTestId('btn-confirmer-inscription-employe').click();

  // Message de confirmation
  await expect(page.getByText(/inscription enregistree avec succes/i)).toBeVisible({ timeout: 10000 });
});

test('UCS12.2 — UI : modale inscription employe etape 3 avec VoucherOrganisation', async ({ page, request }) => {
  const orgHeaders = await authHeaders(request, E2E_ACCOUNTS.organisation);
  const emailVoucher = uniqueEmail('beneficiaire-voucher-ui-ucs12');
  const createRes = await postJson(request, '/espace-organisation/membres', {
    email: emailVoucher,
    nom: 'VoucherUi',
    prenom: 'UCS12',
    secteur_activite: 'Formation',
    niveau_etude: 'Master',
  }, orgHeaders);
  expect([201, 200]).toContain(createRes.status);
  const newMember = dataOf(createRes.payload)?.apprenant ?? dataOf(createRes.payload);
  expect(newMember?.id).toBeTruthy();

  await loginAsOrganisation(page);

  await page.goto(`/organisation/catalogue/${E2E_SCENARIO.standardFormationId}`);
  await page.getByTestId('btn-inscrire-employe').click();

  // Etape 1 — membre dedie au test pour eviter les doublons d'inscription.
  const selectBeneficiaire = page.getByTestId('select-beneficiaire');
  await expect(selectBeneficiaire).toBeVisible();
  await selectBeneficiaire.selectOption(newMember.id);
  await expect(selectBeneficiaire).toHaveValue(newMember.id);
  await page.getByRole('button', { name: 'Suivant' }).click();

  // Etape 2 — premiere session
  const selectSession = page.getByTestId('select-session');
  await expect(selectSession).toBeVisible();
  const sessionOptions = await selectSession.locator('option').all();
  const firstSessionValue = await sessionOptions[1]?.getAttribute('value');
  expect(firstSessionValue).toBeTruthy();
  await selectSession.selectOption(firstSessionValue);
  await page.getByRole('button', { name: 'Suivant' }).click();

  // Etape 3 — choisir VOUCHER
  const radioVoucher = page.locator('input[type="radio"][value="VOUCHER"]');
  await expect(radioVoucher).toBeVisible();
  await radioVoucher.check();
  await expect(radioVoucher).toBeChecked();

  // Le select voucher doit apparaitre
  const selectVoucher = page.getByTestId('select-voucher');
  await expect(selectVoucher).toBeVisible();
  // Selectionner le voucher du seed par ID stable
  await selectVoucher.selectOption(E2E_SCENARIO.voucherOrganisationUcs12Id);
  await expect(selectVoucher).toHaveValue(E2E_SCENARIO.voucherOrganisationUcs12Id);

  await page.getByTestId('btn-confirmer-inscription-employe').click();
  await expect(page.getByText(/inscription enregistree avec succes/i)).toBeVisible({ timeout: 10000 });
});
