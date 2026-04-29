const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const request = require('supertest');
const { hash } = require('bcrypt');

require('ts-node/register/transpile-only');
const { prisma } = require('../../src/shared/prisma/prisma.client');

const backendRoot = path.resolve(__dirname, '..', '..');
if (process.env.DATABASE_URL) {
  const databaseUrl = new URL(process.env.DATABASE_URL);
  databaseUrl.searchParams.set('connection_limit', '1');
  process.env.DATABASE_URL = databaseUrl.toString();
}
const seedRunToken = process.env.FORGES_E2E_SEED_TOKEN || `${process.pid}-${Date.now()}`;
process.env.FORGES_E2E_SEED_TOKEN = seedRunToken;
const seedSentinel = path.join(backendRoot, `.jest-e2e-seeded-${seedRunToken}`);
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-secret';
const PASSWORD = 'Test@FORGES2026!';

if (!fs.existsSync(seedSentinel)) {
  execFileSync(
    process.execPath,
    ['-r', 'ts-node/register/transpile-only', path.join(backendRoot, 'prisma', 'seed.e2e.ts')],
    {
      cwd: backendRoot,
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
      stdio: 'inherit',
    }
  );
  fs.writeFileSync(seedSentinel, new Date().toISOString(), 'utf8');
}

const app = require('../../src/app').default;
const API_URL = app;

const accounts = {
  admin: { email: 'admin@forges.ci', password: PASSWORD },
  responsable: { email: 'responsable-e2e@forges.ci', password: PASSWORD },
  superviseur: { email: 'superviseur-e2e@forges.ci', password: PASSWORD },
  agent: { email: 'agent-e2e@forges.ci', password: PASSWORD },
  apprenant: { email: 'apprenant@forges.ci', password: PASSWORD },
  apprenantStd: { email: 'apprenant-std-e2e@forges.ci', password: PASSWORD },
  apprenantPremiumRetail: { email: 'apprenant-premium-retail-e2e@forges.ci', password: PASSWORD },
  apprenantPremiumB2b: { email: 'apprenant-premium-b2b-e2e@forges.ci', password: PASSWORD },
  apprenantRm145: { email: 'apprenant-rm145@forges.ci', password: PASSWORD },
  apprenantDossier: { email: 'apprenant-dossier-e2e@forges.ci', password: PASSWORD },
  organisation: { email: 'org@forges.ci', password: PASSWORD },
  partenaire: { email: 'partenaire-e2e@forges.ci', password: PASSWORD },
  apporteur: { email: 'apporteur-e2e@forges.ci', password: PASSWORD },
};

const ids = {
  responsable: 'responsable-e2e',
  partenaire: 'part-e2e-01',
  standardFormation: 'F-E2E-STD-01',
  premiumRetailFormation: 'F-E2E-PREM-RETAIL-01',
  premiumB2bFormation: 'F-E2E-PREM-B2B-01',
  demandeFormation: 'F-E2E-DEMANDE-01',
  partenaireFormation: 'F-E2E-PART-01',
  partenaireFormationMeta: 'FP-E2E-01',
  standardSession: 'S-E2E-STD-OPEN-01',
  premiumRetailSession: 'S-E2E-PREM-RETAIL-OPEN-01',
  premiumB2bSession: 'S-E2E-PREM-B2B-OPEN-01',
  partenaireSession: 'S-E2E-PART-OPEN-01',
  sessionPlanifiee: 'S-E2E-PLANIFIEE-01',
  dossierEnAttente: 'D-E2E-EN-ATTENTE-01',
  dossierRetenu: 'D-E2E-RETENU-01',
  dossierPaye: 'D-E2E-PAYE-01',
  dossierExpire: 'D-E2E-EXPIRE-01',
  dossierGris: 'D-E2E-GRIS-01',
  dossierException: 'D-E2E-EXCEPTION-FENETRE-01',
  accesExpired: 'A-E2E-EXPIRED-01',
  apporteur: 'apt-e2e-rm145-01',
  apporteurCode: 'APT-E2E-RM145-001',
  orgVoucherCode: 'ORG-E2E-VOUCHER-01',
  expiredVoucherCode: 'ORG-E2E-VOUCHER-EXPIRE',
};

const createdApprenantIds = [];
const createdOrganisationIds = [];

if (typeof afterAll === 'function') {
  afterAll(async () => {
    if (createdApprenantIds.length > 0) {
      const dossiers = await prisma.dossier.findMany({
        where: { apprenant_id: { in: createdApprenantIds } },
        select: { id: true, paiement: { select: { id: true } } },
      });
      const dossierIds = dossiers.map((dossier) => dossier.id);
      const paiementIds = dossiers.map((dossier) => dossier.paiement?.id).filter(Boolean);

      if (paiementIds.length > 0) {
        await prisma.commissionApporteur.deleteMany({ where: { paiement_id: { in: paiementIds } } });
        await prisma.commissionPartenaire.deleteMany({ where: { paiement_id: { in: paiementIds } } });
        await prisma.paiement.deleteMany({ where: { id: { in: paiementIds } } });
      }
      if (dossierIds.length > 0) {
        await prisma.commissionApporteur.deleteMany({ where: { dossier_id: { in: dossierIds } } });
      }
      await prisma.dossier.deleteMany({ where: { apprenant_id: { in: createdApprenantIds } } });
      await prisma.abonnementRetail.deleteMany({ where: { apprenant_id: { in: createdApprenantIds } } }).catch(() => {});
      await prisma.apprenant.deleteMany({ where: { id: { in: createdApprenantIds } } });
    }
    if (createdOrganisationIds.length > 0) {
      await prisma.abonnementB2B.deleteMany({ where: { organisation_id: { in: createdOrganisationIds } } });
      await prisma.abonnementOrganisation.deleteMany({ where: { organisation_id: { in: createdOrganisationIds } } });
      await prisma.organisation.deleteMany({ where: { id: { in: createdOrganisationIds } } });
    }
    await prisma.$disconnect();
  });
}

async function login(account) {
  const response = await request(API_URL).post('/api/auth/login').send({
    email: account.email,
    password: account.password,
  });

  expect(response.status).toBe(200);
  return response.body.data.accessToken;
}

async function auth(account) {
  return { Authorization: `Bearer ${await login(account)}` };
}

async function createApprenantAccount(prefix = 'rm') {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const id = `app-${prefix}-${suffix}`;
  const email = `${prefix}-${suffix}@forges.test`;
  await prisma.apprenant.create({
    data: {
      id,
      email,
      password_hash: await hash(PASSWORD, 12),
      nom: 'RM',
      prenoms: 'Test',
      role: 'APPRENANT',
      statut: 'ACTIF',
      type_apprenant: 'APPRENANT',
      niveau_etude: 'LICENCE',
      pays_residence: 'CI',
      pays_nationalite: 'CI',
      langue_preferee: 'FR',
      consentement_rgpd: true,
      consentement_timestamp: new Date(),
      consentement_version_cgu: '1.0',
    },
  });
  createdApprenantIds.push(id);
  return { id, email, password: PASSWORD };
}

async function createOrganisationAccount(prefix = 'rmorg') {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const id = `org-${prefix}-${suffix}`;
  const email = `${prefix}-${suffix}@forges.test`;
  await prisma.organisation.create({
    data: {
      id,
      raison_sociale: `Organisation ${prefix}`,
      email,
      password_hash: await hash(PASSWORD, 12),
      type: 'ENTREPRISE',
      sous_types: ['FORMATION'],
      identifiant_legal: `LEGAL-${suffix}`,
      contact_referent: 'Contact RH',
      pays: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      date_fin_essai: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  createdOrganisationIds.push(id);
  return { id, email, password: PASSWORD };
}

function signedWebhook(body) {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(body)).digest('hex');
}

async function createPaiementAndConfirm(headers, dossierId, transactionPrefix, montant) {
  const paiement = await request(API_URL)
    .post('/api/paiements')
    .set(headers)
    .send({ dossier_id: dossierId, methode: 'MOBILE_MONEY' });
  expect(paiement.status).toBe(201);

  const webhook = {
    transaction_id: `${transactionPrefix}-${Date.now()}`,
    dossier_id: dossierId,
    statut: 'SUCCESS',
    montant,
  };

  const confirm = await request(API_URL)
    .post('/api/paiements/webhook')
    .set('x-webhook-signature', signedWebhook(webhook))
    .send(webhook);
  expect(confirm.status).toBe(200);

  return { paiement: paiement.body.data, webhook };
}

module.exports = {
  API_URL,
  accounts,
  auth,
  createApprenantAccount,
  createOrganisationAccount,
  createPaiementAndConfirm,
  ids,
  prisma,
  request,
};
