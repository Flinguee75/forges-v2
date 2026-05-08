'use strict';
// Seed minimal pour les tests E2E (Newman + Playwright) sur dev
// Usage:
//   node seed-e2e.js          — upsert tous les comptes
//   node seed-e2e.js --check  — verifie que les comptes existent
//   node seed-e2e.js --reset  — supprime puis recrée les comptes

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const PASS = 'Test@FORGES2026!';
const BCRYPT_ROUNDS = 12;
const MODE = process.argv[2] || '--upsert';

async function hash() {
  return bcrypt.hash(PASS, BCRYPT_ROUNDS);
}

// ---------------------------------------------------------------------------
// Comptes backoffice (ADMIN, RESPONSABLE, SUPERVISEUR, AGENT) → model Apprenant
// ---------------------------------------------------------------------------
const BACKOFFICE = [
  { email: 'admin@forges.ci',          role: 'ADMIN',       nom: 'Admin',       prenoms: 'FORGES' },
  { email: 'responsable-e2e@forges.ci', role: 'RESPONSABLE', nom: 'Responsable', prenoms: 'E2E' },
  { email: 'superviseur-e2e@forges.ci', role: 'SUPERVISEUR', nom: 'Superviseur',  prenoms: 'E2E' },
  { email: 'agent-e2e@forges.ci',       role: 'AGENT',       nom: 'Agent',        prenoms: 'E2E' },
];

// ---------------------------------------------------------------------------
// Apprenants → model Apprenant
// ---------------------------------------------------------------------------
const APPRENANTS = [
  { email: 'apprenant@forges.ci',                  nom: 'Apprenant',   prenoms: 'Principal' },
  { email: 'apprenant-auth-e2e@forges.ci',          nom: 'Apprenant',   prenoms: 'Auth' },
  { email: 'apprenant-dossier-e2e@forges.ci',       nom: 'Apprenant',   prenoms: 'Dossier' },
  { email: 'apprenant-std-e2e@forges.ci',           nom: 'Apprenant',   prenoms: 'Standard' },
  { email: 'apprenant-premium-retail-e2e@forges.ci',nom: 'Apprenant',   prenoms: 'PremiumRetail' },
  { email: 'apprenant-premium-b2b-e2e@forges.ci',   nom: 'Apprenant',   prenoms: 'PremiumB2B' },
  { email: 'apprenant-retail-e2e@forges.ci',        nom: 'Apprenant',   prenoms: 'Retail' },
  { email: 'apprenant-rm145@forges.ci',             nom: 'Apprenant',   prenoms: 'RM145' },
  { email: 'apprenant-idempotence-1@forges.ci',     nom: 'Apprenant',   prenoms: 'Idempotence1' },
  { email: 'apprenant-idempotence-2@forges.ci',     nom: 'Apprenant',   prenoms: 'Idempotence2' },
  { email: 'apprenant-mismatch-1@forges.ci',        nom: 'Apprenant',   prenoms: 'Mismatch1' },
  { email: 'apprenant-mismatch-2@forges.ci',        nom: 'Apprenant',   prenoms: 'Mismatch2' },
  { email: 'apprenant-mismatch-3@forges.ci',        nom: 'Apprenant',   prenoms: 'Mismatch3' },
  { email: 'apprenant-recon-1@forges.ci',           nom: 'Apprenant',   prenoms: 'Recon1' },
  { email: 'apprenant-recon-2@forges.ci',           nom: 'Apprenant',   prenoms: 'Recon2' },
  { email: 'apprenant-recon-3@forges.ci',           nom: 'Apprenant',   prenoms: 'Recon3' },
  { email: 'apprenant-recon-4@forges.ci',           nom: 'Apprenant',   prenoms: 'Recon4' },
  { email: 'apprenant-recon-5@forges.ci',           nom: 'Apprenant',   prenoms: 'Recon5' },
  { email: 'apprenant-ngser-1@forges.ci',           nom: 'Apprenant',   prenoms: 'Ngser1' },
  { email: 'apprenant-abo-ngser-ok@forges.ci',      nom: 'Apprenant',   prenoms: 'AboNgserOk' },
  { email: 'apprenant-abo-ngser-ko@forges.ci',      nom: 'Apprenant',   prenoms: 'AboNgserKo' },
  { email: 'apprenant3@forges.ci',                  nom: 'Apprenant',   prenoms: 'Trois' },
];

async function upsertBackoffice(pwd) {
  for (const u of BACKOFFICE) {
    await prisma.apprenant.upsert({
      where: { email: u.email },
      update: { password_hash: pwd, statut: 'ACTIF', role: u.role },
      create: {
        email: u.email,
        password_hash: pwd,
        nom: u.nom,
        prenoms: u.prenoms,
        type_apprenant: 'INDIVIDUEL',
        pays_residence: 'CI',
        pays_nationalite: 'CI',
        role: u.role,
        statut: 'ACTIF',
        consentement_rgpd: true,
        consentement_timestamp: new Date(),
        consentement_version_cgu: '1.0',
      },
    });
    console.log(`  [OK] ${u.role.padEnd(12)} ${u.email}`);
  }
}

async function upsertApprenants(pwd) {
  for (const u of APPRENANTS) {
    await prisma.apprenant.upsert({
      where: { email: u.email },
      update: { password_hash: pwd, statut: 'ACTIF' },
      create: {
        email: u.email,
        password_hash: pwd,
        nom: u.nom,
        prenoms: u.prenoms,
        type_apprenant: 'INDIVIDUEL',
        pays_residence: 'CI',
        pays_nationalite: 'CI',
        role: 'APPRENANT',
        statut: 'ACTIF',
        consentement_rgpd: true,
        consentement_timestamp: new Date(),
        consentement_version_cgu: '1.0',
      },
    });
    console.log(`  [OK] APPRENANT    ${u.email}`);
  }
}

async function upsertOrganisation(pwd) {
  for (const org of [
    { email: 'org@forges.ci',  raison: 'Organisation E2E' },
    { email: 'org2@forges.ci', raison: 'Organisation E2E B2B' },
  ]) {
    await prisma.organisation.upsert({
      where: { email: org.email },
      update: { password_hash: pwd, statut: 'ACTIF' },
      create: {
        email: org.email,
        password_hash: pwd,
        raison_sociale: org.raison,
        type: 'ENTREPRISE',
        sous_types: [],
        contact_referent: 'Contact E2E',
        pays: 'CI',
        statut: 'ACTIF',
      },
    });
    console.log(`  [OK] ORGANISATION  ${org.email}`);
  }
}

async function upsertPartenaire(pwd) {
  await prisma.partenaire.upsert({
    where: { email_principal: 'partenaire-e2e@forges.ci' },
    update: { password_hash: pwd, statut: 'ACTIF' },
    create: {
      email_principal: 'partenaire-e2e@forges.ci',
      password_hash: pwd,
      raison_sociale: 'Partenaire E2E',
      type: 'ORGANISME_FORMATION',
      pays: 'CI',
      statut: 'ACTIF',
      mode_inscription: 'INVITATION',
    },
  });
  console.log(`  [OK] PARTENAIRE    partenaire-e2e@forges.ci`);
}

async function upsertApporteur(pwd) {
  await prisma.apporteur.upsert({
    where: { email: 'apporteur-e2e@forges.ci' },
    update: { password_hash: pwd, statut: 'ACTIF' },
    create: {
      email: 'apporteur-e2e@forges.ci',
      password_hash: pwd,
      nom: 'Apporteur E2E',
      type: 'INDIVIDUEL',
      pays: 'CI',
      statut: 'ACTIF',
    },
  });
  console.log(`  [OK] APPORTEUR     apporteur-e2e@forges.ci`);
}

async function check() {
  console.log('\nVerification des comptes E2E...\n');
  const allEmails = [
    ...BACKOFFICE.map(u => u.email),
    ...APPRENANTS.map(u => u.email),
  ];

  let ok = 0, ko = 0;

  for (const email of allEmails) {
    const found = await prisma.apprenant.findUnique({ where: { email } });
    if (found && found.statut === 'ACTIF') {
      console.log(`  [OK] ${found.role.padEnd(12)} ${email}`);
      ok++;
    } else {
      console.log(`  [KO] MANQUANT     ${email}`);
      ko++;
    }
  }

  for (const email of ['org@forges.ci']) {
    const found = await prisma.organisation.findUnique({ where: { email } });
    found && found.statut === 'ACTIF'
      ? (console.log(`  [OK] ORGANISATION  ${email}`), ok++)
      : (console.log(`  [KO] MANQUANT      ${email}`), ko++);
  }

  for (const email of ['partenaire-e2e@forges.ci']) {
    const found = await prisma.partenaire.findUnique({ where: { email_principal: email } });
    found && found.statut === 'ACTIF'
      ? (console.log(`  [OK] PARTENAIRE    ${email}`), ok++)
      : (console.log(`  [KO] MANQUANT      ${email}`), ko++);
  }

  for (const email of ['apporteur-e2e@forges.ci']) {
    const found = await prisma.apporteur.findUnique({ where: { email } });
    found && found.statut === 'ACTIF'
      ? (console.log(`  [OK] APPORTEUR     ${email}`), ok++)
      : (console.log(`  [KO] MANQUANT      ${email}`), ko++);
  }

  console.log(`\nResultat : ${ok} OK / ${ko} manquants`);
  if (ko > 0) process.exit(1);
}

// ---------------------------------------------------------------------------
// IDs stables pour Newman (hardcodes pour etre injectes dans l'env)
// ---------------------------------------------------------------------------
const IDS = {
  formationStandard:  'e2e-formation-standard-0001',
  formationPremium:   'e2e-formation-premium-0001',
  sessionStandard:    'e2e-session-standard-0001',
  sessionPremium:     'e2e-session-premium-0001',
  sessionCloturee:    'e2e-session-cloturee-0001',
  dossierEnAttente:   'e2e-dossier-en-attente-0001',
  dossierARejecter:   'e2e-dossier-a-rejecter-0001',
  dossierRetenu:      'D-E2E-RETENU-01',
  dossierAttestation: 'e2e-dossier-attestation-0001',
  formationPartenaire1: 'e2e-fp-validate-0001',
  formationPartenaire2: 'e2e-fp-reject-0001',
  fpRecord1: 'e2e-fprec-validate-0001',
  fpRecord2: 'e2e-fprec-reject-0001',
};

async function upsertMetier() {
  console.log('\nCreation des donnees metier...\n');

  // Recuperer les IDs des comptes necessaires
  const responsable = await prisma.apprenant.findUnique({ where: { email: 'responsable-e2e@forges.ci' } });
  const apprenant   = await prisma.apprenant.findUnique({ where: { email: 'apprenant@forges.ci' } });
  const apprenant3  = await prisma.apprenant.findUnique({ where: { email: 'apprenant3@forges.ci' } });
  const partenaire  = await prisma.partenaire.findUnique({ where: { email_principal: 'partenaire-e2e@forges.ci' } });

  if (!responsable || !apprenant || !apprenant3 || !partenaire) {
    throw new Error('Comptes necessaires manquants — lancer le seed comptes dabord');
  }

  const now = new Date();
  const future = (days) => new Date(now.getTime() + days * 86400000);
  const past = (days) => new Date(now.getTime() - days * 86400000);

  // --- Formations ---
  await prisma.formation.upsert({
    where: { id: IDS.formationStandard },
    update: {},
    create: {
      id: IDS.formationStandard,
      intitule: 'Formation Standard E2E',
      description_courte: 'Formation standard pour tests E2E Newman',
      duree_jours: 3,
      cout_catalogue: 150000,
      responsable_id: responsable.id,
      type_formation: 'STANDARD',
      mode_formation: 'AVEC_SESSION',
      statut: 'PUBLIEE',
      inclus_abonnement: false,
      objectifs_pedagogiques: ['Tester les endpoints'],
      langues_disponibles: ['FR'],
    },
  });
  console.log('  [OK] Formation STANDARD');

  await prisma.formation.upsert({
    where: { id: IDS.formationPremium },
    update: {},
    create: {
      id: IDS.formationPremium,
      intitule: 'Formation Premium E2E',
      description_courte: 'Formation premium pour tests E2E Newman',
      duree_jours: 5,
      cout_catalogue: 500000,
      responsable_id: responsable.id,
      type_formation: 'PREMIUM',
      mode_formation: 'AVEC_SESSION',
      statut: 'PUBLIEE',
      inclus_abonnement: false,
      objectifs_pedagogiques: ['Tester bifurcation RM-140'],
      langues_disponibles: ['FR'],
    },
  });
  console.log('  [OK] Formation PREMIUM');

  // --- Sessions ---
  await prisma.session.upsert({
    where: { id: IDS.sessionStandard },
    update: {},
    create: {
      id: IDS.sessionStandard,
      formation_id: IDS.formationStandard,
      date_ouverture: past(10),
      date_cloture: future(10),
      date_debut: future(5),
      date_fin: future(8),
      capacite: 20,
      places_restantes: 18,
      statut: 'OUVERTE',
    },
  });
  console.log('  [OK] Session STANDARD (ouverte)');

  await prisma.session.upsert({
    where: { id: IDS.sessionPremium },
    update: {},
    create: {
      id: IDS.sessionPremium,
      formation_id: IDS.formationPremium,
      date_ouverture: past(10),
      date_cloture: future(10),
      date_debut: future(5),
      date_fin: future(8),
      capacite: 20,
      places_restantes: 18,
      statut: 'OUVERTE',
    },
  });
  console.log('  [OK] Session PREMIUM (ouverte)');

  await prisma.session.upsert({
    where: { id: IDS.sessionCloturee },
    update: { statut: 'CLOTUREE' },
    create: {
      id: IDS.sessionCloturee,
      formation_id: IDS.formationStandard,
      date_ouverture: past(60),
      date_cloture: past(30),
      date_debut: past(28),
      date_fin: past(25),
      capacite: 10,
      places_restantes: 0,
      statut: 'CLOTUREE',
    },
  });
  console.log('  [OK] Session CLOTUREE (pour attestation)');

  // --- Dossiers ---

  // EN_ATTENTE_VERIFICATION — pour retenir
  await prisma.dossier.upsert({
    where: { id: IDS.dossierEnAttente },
    update: { statut: 'EN_ATTENTE_VERIFICATION', expires_at: future(3) },
    create: {
      id: IDS.dossierEnAttente,
      apprenant_id: apprenant.id,
      formation_id: IDS.formationPremium,
      session_id: IDS.sessionPremium,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
      expires_at: future(3),
    },
  });
  console.log('  [OK] Dossier EN_ATTENTE_VERIFICATION (pour retenir)');

  // EN_ATTENTE_VERIFICATION — pour rejeter
  await prisma.dossier.upsert({
    where: { id: IDS.dossierARejecter },
    update: { statut: 'EN_ATTENTE_VERIFICATION', expires_at: future(3) },
    create: {
      id: IDS.dossierARejecter,
      apprenant_id: apprenant3.id,
      formation_id: IDS.formationPremium,
      session_id: IDS.sessionPremium,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
      expires_at: future(3),
    },
  });
  console.log('  [OK] Dossier EN_ATTENTE_VERIFICATION (pour rejeter)');

  // RETENU — pour webhook paiement + Fineo + NGSER
  await prisma.dossier.upsert({
    where: { id: IDS.dossierRetenu },
    update: { statut: 'RETENU', expires_at: future(3) },
    create: {
      id: IDS.dossierRetenu,
      apprenant_id: apprenant.id,
      formation_id: IDS.formationPremium,
      session_id: IDS.sessionPremium,
      statut: 'RETENU',
      source_financement: 'RETAIL',
      expires_at: future(3),
    },
  });
  console.log('  [OK] Dossier RETENU (pour webhook/Fineo/NGSER)');

  // PAYE — pour attestation (session CLOTUREE)
  const existingAttestation = await prisma.dossier.findUnique({ where: { id: IDS.dossierAttestation } });
  if (!existingAttestation) {
    await prisma.dossier.create({
      data: {
        id: IDS.dossierAttestation,
        apprenant_id: apprenant.id,
        formation_id: IDS.formationStandard,
        session_id: IDS.sessionCloturee,
        statut: 'PAYE',
        source_financement: 'RETAIL',
      },
    });
    // Paiement associe requis pour attestation
    await prisma.paiement.create({
      data: {
        dossier_id: IDS.dossierAttestation,
        montant_catalogue: 150000,
        montant_final: 150000,
        methode: 'MOBILE_MONEY',
        statut: 'PAYE',
        transaction_id: 'TXN-E2E-ATTESTATION-001',
        confirmed_at: past(25),
      },
    });
    console.log('  [OK] Dossier PAYE + Paiement (pour attestation)');
  } else {
    console.log('  [OK] Dossier attestation existe deja');
  }

  // --- Formations Partenaire (EN_ATTENTE validation) ---
  const fp1 = await prisma.formation.upsert({
    where: { id: IDS.formationPartenaire1 },
    update: {},
    create: {
      id: IDS.formationPartenaire1,
      intitule: 'Formation Partenaire A Valider E2E',
      description_courte: 'Test validation responsable Newman',
      duree_jours: 2,
      cout_catalogue: 0,
      responsable_id: responsable.id,
      type_formation: 'STANDARD',
      mode_formation: 'AVEC_SESSION',
      statut: 'EN_ATTENTE_VALIDATION',
      partenaire_id: partenaire.id,
      objectifs_pedagogiques: [],
      langues_disponibles: ['FR'],
    },
  });
  await prisma.formationPartenaire.upsert({
    where: { formation_id: IDS.formationPartenaire1 },
    update: {},
    create: { id: IDS.fpRecord1, formation_id: IDS.formationPartenaire1, partenaire_id: partenaire.id, statut_validation: 'EN_ATTENTE', prix_coutant_soumis: 80000 },
  });
  console.log('  [OK] FormationPartenaire a valider');

  const fp2 = await prisma.formation.upsert({
    where: { id: IDS.formationPartenaire2 },
    update: {},
    create: {
      id: IDS.formationPartenaire2,
      intitule: 'Formation Partenaire A Rejeter E2E',
      description_courte: 'Test rejet responsable Newman',
      duree_jours: 2,
      cout_catalogue: 0,
      responsable_id: responsable.id,
      type_formation: 'STANDARD',
      mode_formation: 'AVEC_SESSION',
      statut: 'EN_ATTENTE_VALIDATION',
      partenaire_id: partenaire.id,
      objectifs_pedagogiques: [],
      langues_disponibles: ['FR'],
    },
  });
  await prisma.formationPartenaire.upsert({
    where: { formation_id: IDS.formationPartenaire2 },
    update: {},
    create: { id: IDS.fpRecord2, formation_id: IDS.formationPartenaire2, partenaire_id: partenaire.id, statut_validation: 'EN_ATTENTE', prix_coutant_soumis: 80000 },
  });
  console.log('  [OK] FormationPartenaire a rejeter');

  console.log('\n  IDs a injecter dans Newman env:');
  console.log(`  formation_id_test              = ${IDS.formationStandard}`);
  console.log(`  session2_id_test               = ${IDS.sessionPremium}`);
  console.log(`  dossier_id_test                = ${IDS.dossierEnAttente}`);
  console.log(`  dossier_premium_rejeter_id     = ${IDS.dossierARejecter}`);
  console.log(`  dossier_retenu_id              = ${IDS.dossierRetenu}`);
  console.log(`  dossier_webhook_id             = ${IDS.dossierRetenu}`);
  console.log(`  dossier_id_attestation         = ${IDS.dossierAttestation}`);
  console.log(`  formation_partenaire_id_validate = ${IDS.formationPartenaire1}`);
  console.log(`  formation_partenaire_id_reject   = ${IDS.formationPartenaire2}`);
}

async function reset() {
  console.log('\nSuppression des comptes E2E...');
  const emails = [...BACKOFFICE.map(u => u.email), ...APPRENANTS.map(u => u.email)];

  // Supprimer tous les dossiers/paiements des apprenants E2E (seed + Newman)
  // On supprime d'abord par IDs stables, puis par apprenant_id pour couvrir les dossiers Newman
  const stableDossierIds = Object.values(IDS).filter(id => typeof id === 'string');
  await prisma.paiement.deleteMany({ where: { dossier_id: { in: stableDossierIds } } });
  await prisma.dossier.deleteMany({ where: { id: { in: stableDossierIds } } });
  // Puis nettoyer les dossiers dynamiques créés par Newman
  const allEmails = [...BACKOFFICE.map(u => u.email), ...APPRENANTS.map(u => u.email)];
  const apprenantsPre = await prisma.apprenant.findMany({ where: { email: { in: allEmails } }, select: { id: true } });
  const apprenantIdsPre = apprenantsPre.map(a => a.id);
  if (apprenantIdsPre.length > 0) {
    const dossiersAll = await prisma.dossier.findMany({ where: { apprenant_id: { in: apprenantIdsPre } }, select: { id: true } });
    const dynIds = dossiersAll.map(d => d.id);
    await prisma.paiement.deleteMany({ where: { dossier_id: { in: dynIds } } });
    await prisma.dossier.deleteMany({ where: { apprenant_id: { in: apprenantIdsPre } } });
  }
  await prisma.formationPartenaire.deleteMany({ where: { formation_id: { in: [IDS.formationPartenaire1, IDS.formationPartenaire2] } } });
  await prisma.session.deleteMany({ where: { id: { in: [IDS.sessionStandard, IDS.sessionPremium, IDS.sessionCloturee] } } });
  await prisma.formation.deleteMany({ where: { id: { in: [IDS.formationStandard, IDS.formationPremium, IDS.formationPartenaire1, IDS.formationPartenaire2] } } });
  console.log('  Donnees metier supprimees');

  // Nettoyer toutes les FK liees aux apprenants E2E avant suppression
  const apprenantRecords = await prisma.apprenant.findMany({ where: { email: { in: emails } }, select: { id: true } });
  const apprenantIds = apprenantRecords.map(a => a.id);
  await prisma.abonnementRetail.deleteMany({ where: { apprenant_id: { in: apprenantIds } } });
  await prisma.commissionApporteur.deleteMany({ where: { apprenant_id: { in: apprenantIds } } }).catch(() => {});
  await prisma.conversationBot.deleteMany({ where: { apprenant_id: { in: apprenantIds } } }).catch(() => {});
  await prisma.auditLog.deleteMany({ where: { user_id: { in: apprenantIds } } }).catch(() => {});

  const { count } = await prisma.apprenant.deleteMany({ where: { email: { in: emails } } });
  console.log(`  ${count} apprenants supprimes`);

  // Nettoyer FK organisations
  const orgRecords = await prisma.organisation.findMany({ where: { email: { in: ['org@forges.ci', 'org2@forges.ci'] } }, select: { id: true } });
  const orgIds = orgRecords.map(o => o.id);
  await prisma.abonnementOrganisation.deleteMany({ where: { organisation_id: { in: orgIds } } }).catch(() => {});
  await prisma.abonnementB2B.deleteMany({ where: { organisation_id: { in: orgIds } } }).catch(() => {});
  await prisma.voucherOrganisation.deleteMany({ where: { organisation_id: { in: orgIds } } }).catch(() => {});
  await prisma.auditLog.deleteMany({ where: { user_id: { in: orgIds } } }).catch(() => {});

  await prisma.organisation.deleteMany({ where: { email: { in: ['org@forges.ci', 'org2@forges.ci'] } } });
  const partenaireRecord = await prisma.partenaire.findFirst({ where: { email_principal: 'partenaire-e2e@forges.ci' }, select: { id: true } });
  if (partenaireRecord) {
    await prisma.formationPartenaire.deleteMany({ where: { partenaire_id: partenaireRecord.id } }).catch(() => {});
    await prisma.commissionPartenaire.deleteMany({ where: { partenaire_id: partenaireRecord.id } }).catch(() => {});
  }
  await prisma.partenaire.deleteMany({ where: { email_principal: 'partenaire-e2e@forges.ci' } });
  await prisma.apporteur.deleteMany({ where: { email: 'apporteur-e2e@forges.ci' } });
  console.log('  Organisation / Partenaire / Apporteur supprimes');
}

async function main() {
  console.log('\n=== FORGES — Seed E2E ===\n');

  if (MODE === '--check') {
    await check();
    return;
  }

  if (MODE === '--reset') {
    await reset();
  }

  console.log('\nCreation des comptes (upsert)...\n');
  const pwd = await hash();
  await upsertBackoffice(pwd);
  await upsertApprenants(pwd);
  await upsertOrganisation(pwd);
  await upsertPartenaire(pwd);
  await upsertApporteur(pwd);

  await upsertMetier();

  console.log('\nVerification post-seed...');
  await check();
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
