import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { authHeaders, loginViaUi } from './helpers';
import {
  PARTENAIRE_EXPECTED_NET_LABEL,
  createActivePartenaireForE2E,
  createPaidPartnerReversement,
  createRejectedPartnerFormation,
  submitValidateAndOpenPartnerFormation,
} from './partenaire-e2e-helpers';

async function setupPartnerScenario(request) {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const responsableHeaders = await authHeaders(request, E2E_ACCOUNTS.responsable);
  const agentHeaders = await authHeaders(request, E2E_ACCOUNTS.agent);
  const apprenantHeaders = await authHeaders(request, E2E_ACCOUNTS.apprenantRecon3);

  const partenaire = await createActivePartenaireForE2E(request, adminHeaders, 'Partenaire UI Tests');
  const formation = await submitValidateAndOpenPartnerFormation(request, {
    partenaireHeaders: partenaire.headers,
    responsableHeaders,
    adminHeaders,
    titlePrefix: 'Formation UI Partner',
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

  return { partenaire, formation, rejected };
}

async function expectForbiddenPartnerInfoHidden(page) {
  await expect(page.getByText(/commission_forges_pct|commission FORGES|prix catalogue|taux FORGES|20%/i)).toHaveCount(0);
  await expect(page.locator('[name="type_formation"], [name="pilier_abonnement"], [data-testid="type-formation"], [data-testid="pilier-abonnement"]')).toHaveCount(0);
}

test('partenaire UI: acces role, dashboard, formations et reversements affichent les bonnes infos', async ({ page, request }) => {
  const { partenaire, formation, rejected } = await setupPartnerScenario(request);

  await loginViaUi(page, partenaire, /\/partenaire\/dashboard$/);
  await expect(page.getByRole('main').getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
  await expect(page.getByText('Reversements nets du mois', { exact: true })).toBeVisible();
  await expect(page.getByText(PARTENAIRE_EXPECTED_NET_LABEL).first()).toBeVisible();
  await expectForbiddenPartnerInfoHidden(page);

  await page.goto('/backoffice/dashboard');
  await expect(page).toHaveURL(/\/unauthorized$/);

  await page.goto('/partenaire/formations');
  await expect(page.getByRole('heading', { name: 'Catalogue de mes soumissions' })).toBeVisible();
  await expect(page.getByText(formation.intitule)).toBeVisible();
  await expect(page.getByText(rejected.intitule)).toBeVisible();
  await expect(page.getByText(/2\s*000 FCFA/).first()).toBeVisible();
  await expect(page.getByText('Formation rejetee')).toBeVisible();
  await expectForbiddenPartnerInfoHidden(page);

  await page.getByRole('button', { name: new RegExp(formation.intitule) }).click();
  await expect(page).toHaveURL(new RegExp(`/partenaire/formations/${formation.formationId}`));
  await expect(page.getByRole('heading', { name: formation.intitule })).toBeVisible();
  await expect(page.getByText(/2\s*000 FCFA/).first()).toBeVisible();
  await expect(page.getByText('Formation validee')).toBeVisible();
  await expectForbiddenPartnerInfoHidden(page);

  await page.goto('/partenaire/formations');
  await page.getByRole('button', { name: new RegExp(rejected.intitule) }).click();
  await expect(page).toHaveURL(new RegExp(`/partenaire/formations/${rejected.formationId}`));
  await expect(page.getByRole('heading', { name: rejected.intitule })).toBeVisible();
  await expect(page.getByText('Formation rejetee')).toBeVisible();
  await expect(page.getByText('Programme trop vague').first()).toBeVisible();
  await expect(page.getByText(/objectifs pédagogiques/i)).toBeVisible();
  await expectForbiddenPartnerInfoHidden(page);

  await page.goto('/partenaire/reversements');
  await expect(page.getByRole('heading', { name: 'Mes reversements' })).toBeVisible();
  await expect(page.getByText(formation.intitule)).toBeVisible();
  await expect(page.getByText(PARTENAIRE_EXPECTED_NET_LABEL).first()).toBeVisible();
  await expectForbiddenPartnerInfoHidden(page);
});

test('partenaire UI: soumission formation cree une demande sans champs reserves FORGES', async ({ page, request }) => {
  const adminHeaders = await authHeaders(request, E2E_ACCOUNTS.admin);
  const partenaire = await createActivePartenaireForE2E(request, adminHeaders, 'Partenaire UI Soumission');
  const title = `Formation UI soumission ${Date.now()}`;

  await loginViaUi(page, partenaire, /\/partenaire\/dashboard$/);
  await page.goto('/partenaire/soumettre-formation');

  await expect(page.getByRole('main').getByRole('heading', { name: 'Soumettre une formation' })).toBeVisible();
  await expectForbiddenPartnerInfoHidden(page);

  await page.getByLabel(/^Titre$/).fill(title);
  await page.getByLabel(/^Domaine$/).fill('Cybersécurité');
  await page.getByLabel('Public cible').fill('Responsables sécurité');
  await page.getByLabel(/^Description$/).fill('Formation E2E sur les contrôles de sécurité.');
  await page.getByLabel('Objectifs').fill('Valider un parcours partenaire');
  await page.getByLabel('Programme detaille').fill('Module 1: cadrage\nModule 2: exercices');
  await page.getByLabel('Competences visees').fill('Analyse, reporting, contrôle');
  await page.getByLabel('Modalite').selectOption('EN_LIGNE');
  await page.getByLabel('Mode de formation').selectOption('AVEC_SESSION');
  await page.getByLabel(/Duree/).fill('16');
  await page.getByLabel(/Capacite/).fill('20');
  await page.getByLabel(/Prix coutant/).fill('200000');
  await page.getByRole('button', { name: 'Soumettre pour validation' }).click();

  await expect(page).toHaveURL(/\/partenaire\/formations$/);
  await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByText('En cours d examen').first()).toBeVisible();
  await expectForbiddenPartnerInfoHidden(page);
});
