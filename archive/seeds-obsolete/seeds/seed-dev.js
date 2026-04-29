/**
 * seed-dev.js — Données minimales pour démarrage développement
 * Schéma : conforme Specs v4.8 (Apprenant autonome, intitule, cout_catalogue)
 *
 * Usage :
 *   node prisma/seed-dev.js
 *   node prisma/seed-dev.js --reset   (vide la BDD avant)
 *   node prisma/seed-dev.js --check   (vérifie sans insérer)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;
const RESET = process.argv.includes('--reset');
const CHECK = process.argv.includes('--check');

const PASS = 'Test@FORGES2026!';

async function main() {
  console.log('🌱 Seed DEV — Données minimales FORGES\n');

  if (CHECK) {
    const counts = await Promise.all([
      prisma.apprenant.count(),
      prisma.formation.count(),
      prisma.session.count(),
    ]);
    console.log(`Apprenants: ${counts[0]} | Formations: ${counts[1]} | Sessions: ${counts[2]}`);
    return;
  }

  if (RESET) {
    console.log('🗑️  Reset BDD...');
    await prisma.$executeRaw`TRUNCATE TABLE "Paiement", "Dossier", "Session", "Formation", "AbonnementOrganisation", "AbonnementB2B", "Apprenant", "Organisation", "Partenaire", "Apporteur", "VoucherApporteur", "VoucherOrganisation" CASCADE`;
    console.log('✅ BDD vidée\n');
  }

  const hash = await bcrypt.hash(PASS, SALT_ROUNDS);

  // ── 1. Comptes backoffice ──────────────────────────────────────────────
  console.log('👤 Création comptes backoffice...');

  const admin = await prisma.apprenant.upsert({
    where: { email: 'admin@forges-dev.ci' },
    update: {},
    create: {
      email: 'admin@forges-dev.ci',
      password_hash: hash,
      nom: 'Admin',
      prenoms: 'FORGES',
      type_apprenant: 'PROFESSIONNEL',
      pays_residence: 'CI',
      pays_nationalite: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      consentement_rgpd: true,
      consentement_timestamp: new Date(),
      consentement_version_cgu: '1.0',
    }
  });

  const responsable = await prisma.apprenant.upsert({
    where: { email: 'responsable@forges-dev.ci' },
    update: {},
    create: {
      email: 'responsable@forges-dev.ci',
      password_hash: hash,
      nom: 'Responsable',
      prenoms: 'Formation',
      type_apprenant: 'PROFESSIONNEL',
      pays_residence: 'CI',
      pays_nationalite: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      consentement_rgpd: true,
      consentement_timestamp: new Date(),
      consentement_version_cgu: '1.0',
    }
  });

  // ── Agent Comptable ───────────────────────────────────────────────────
  await prisma.apprenant.upsert({
    where: { email: 'agent@forges-dev.ci' },
    update: {},
    create: {
      email: 'agent@forges-dev.ci',
      password_hash: hash,
      nom: 'Agent',
      prenoms: 'Comptable',
      role: 'AGENT',
      type_apprenant: 'PROFESSIONNEL',
      pays_residence: 'CI',
      pays_nationalite: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      consentement_rgpd: true,
      consentement_timestamp: new Date(),
      consentement_version_cgu: '1.0',
    }
  });

  // ── 2. Apprenant test ─────────────────────────────────────────────────
  const apprenant = await prisma.apprenant.upsert({
    where: { email: 'apprenant@forges-dev.ci' },
    update: {},
    create: {
      email: 'apprenant@forges-dev.ci',
      password_hash: hash,
      nom: 'Koné',
      prenoms: 'Amadou',
      type_apprenant: 'PROFESSIONNEL',
      secteur_activite: 'IT & Cybersécurité',
      pays_residence: 'CI',
      pays_nationalite: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      consentement_rgpd: true,
      consentement_timestamp: new Date(),
      consentement_version_cgu: '1.0',
    }
  });

  // ── 3. Organisation test ──────────────────────────────────────────────
  const organisation = await prisma.organisation.upsert({
    where: { email: 'org@forges-dev.ci' },
    update: {},
    create: {
      email: 'org@forges-dev.ci',
      password_hash: hash,
      raison_sociale: 'TechCorp Dev CI',
      type: 'ENTREPRISE',
      identifiant_legal: 'CI-RCCM-DEV-2026',
      contact_referent: 'Directeur RH',
      pays: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      date_fin_essai: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    }
  });

  console.log('  ✅ Admin, Responsable, Apprenant, Organisation créés');

  // ── 3bis. Abonnements Organisation ────────────────────────────────────
  console.log('📦 Création abonnements organisation...');

  const abonnementOrg = await prisma.abonnementOrganisation.upsert({
    where: { id: 'ABO-ORG-DEV-01' },
    update: {},
    create: {
      id: 'ABO-ORG-DEV-01',
      organisation_id: organisation.id,
      offre: 'PRO',
      montant_annuel: 150000, // 150 000 XOF
      date_debut: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      date_fin: new Date(Date.now() + 355 * 24 * 3600 * 1000),
      statut: 'ACTIF',
      renouvellement_auto: true,
    }
  });

  // Lier l'abonnement à l'organisation
  await prisma.organisation.update({
    where: { id: organisation.id },
    data: { abonnement_org_id: abonnementOrg.id }
  });

  const abonnementB2B = await prisma.abonnementB2B.upsert({
    where: { id: 'ABO-B2B-DEV-01' },
    update: {},
    create: {
      id: 'ABO-B2B-DEV-01',
      organisation_id: organisation.id,
      palier: 'BUSINESS',
      prix_annuel: 50000000, // 500 000 XOF (en centimes dans Prisma)
      nb_max: 25,
      nb_actifs: 3, // On va créer 3 apprenants B2B
      date_debut: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      date_fin: new Date(Date.now() + 355 * 24 * 3600 * 1000),
      date_renouvellement: new Date(Date.now() + 355 * 24 * 3600 * 1000),
      statut: 'ACTIF',
    }
  });

  // Lier l'abonnement B2B à l'organisation
  await prisma.organisation.update({
    where: { id: organisation.id },
    data: { abonnement_b2b_id: abonnementB2B.id }
  });

  console.log('  ✅ Abonnement ORG PRO + B2B BUSINESS créés');

  // ── 3ter. Apprenants B2B de l'organisation ────────────────────────────
  console.log('👥 Création apprenants B2B organisation...');

  const apprenantB2B1 = await prisma.apprenant.upsert({
    where: { email: 'employee1@techcorp-dev.ci' },
    update: {},
    create: {
      email: 'employee1@techcorp-dev.ci',
      password_hash: hash,
      nom: 'Traoré',
      prenoms: 'Fatou',
      type_apprenant: 'PROFESSIONNEL',
      secteur_activite: 'Finance',
      organisation_id: organisation.id, // ✅ Lié à l'organisation
      pays_residence: 'CI',
      pays_nationalite: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      consentement_rgpd: true,
      consentement_timestamp: new Date(),
      consentement_version_cgu: '1.0',
    }
  });

  const apprenantB2B2 = await prisma.apprenant.upsert({
    where: { email: 'employee2@techcorp-dev.ci' },
    update: {},
    create: {
      email: 'employee2@techcorp-dev.ci',
      password_hash: hash,
      nom: 'Diallo',
      prenoms: 'Mamadou',
      type_apprenant: 'PROFESSIONNEL',
      secteur_activite: 'Marketing',
      organisation_id: organisation.id, // ✅ Lié à l'organisation
      pays_residence: 'CI',
      pays_nationalite: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      consentement_rgpd: true,
      consentement_timestamp: new Date(),
      consentement_version_cgu: '1.0',
    }
  });

  const apprenantB2B3 = await prisma.apprenant.upsert({
    where: { email: 'employee3@techcorp-dev.ci' },
    update: {},
    create: {
      email: 'employee3@techcorp-dev.ci',
      password_hash: hash,
      nom: 'Kouassi',
      prenoms: 'Aya',
      type_apprenant: 'PROFESSIONNEL',
      secteur_activite: 'IT & Cybersécurité',
      organisation_id: organisation.id, // ✅ Lié à l'organisation
      pays_residence: 'CI',
      pays_nationalite: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      consentement_rgpd: true,
      consentement_timestamp: new Date(),
      consentement_version_cgu: '1.0',
    }
  });

  console.log('  ✅ 3 apprenants B2B créés (liés à TechCorp)');

  // ── 4. Formation Standard ─────────────────────────────────────────────
  const formationStd = await prisma.formation.upsert({
    where: { id: 'F-DEV-STD-01' },
    update: {},
    create: {
      id: 'F-DEV-STD-01',
      intitule: 'Gestion de Projet IT — Certification PMP',
      description_courte: 'Maîtrisez les fondamentaux de la gestion de projets informatiques et préparez la certification PMP.',
      duree_jours: 90,
      cout_catalogue: 100000,
      responsable_id: responsable.id,
      type_formation: 'STANDARD',
      mode_formation: 'AVEC_SESSION',
      pilier_abonnement: 'RETAIL',
      inclus_abonnement: true,
      langues_disponibles: ['FR', 'EN'],
      certification_delivree: true,
      statut: 'ACTIVE',
    }
  });

  // ── 5. Formation Premium ──────────────────────────────────────────────
  const formationPrem = await prisma.formation.upsert({
    where: { id: 'F-DEV-PREM-01' },
    update: {},
    create: {
      id: 'F-DEV-PREM-01',
      intitule: 'Cybersécurité GWU — CCDL Advanced',
      description_courte: 'Programme avancé de cybersécurité en partenariat avec George Washington University.',
      duree_jours: 365,
      cout_catalogue: 2000000,
      responsable_id: responsable.id,
      type_formation: 'PREMIUM',
      mode_formation: 'AVEC_SESSION',
      pilier_abonnement: 'B2B',
      inclus_abonnement: false,
      langues_disponibles: ['FR', 'EN'],
      certification_delivree: true,
      statut: 'ACTIVE',
    }
  });

  // ── 6. Formation À la demande ─────────────────────────────────────────
  const formationDem = await prisma.formation.upsert({
    where: { id: 'F-DEV-DEM-01' },
    update: {},
    create: {
      id: 'F-DEV-DEM-01',
      intitule: 'Introduction à l\'Intelligence Artificielle',
      description_courte: 'Découvrez les concepts fondamentaux de l\'IA et ses applications métier.',
      duree_jours: 30,
      cout_catalogue: 50000,
      responsable_id: responsable.id,
      type_formation: 'STANDARD',
      mode_formation: 'A_LA_DEMANDE',
      pilier_abonnement: 'RETAIL',
      inclus_abonnement: true,
      langues_disponibles: ['FR'],
      certification_delivree: false,
      duree_acces_jours: 365,
      statut: 'ACTIVE',
    }
  });

  console.log('  ✅ 3 formations créées (STANDARD, PREMIUM, À_LA_DEMANDE)');

  // ── 7. Sessions ───────────────────────────────────────────────────────
  const sessionOuverte = await prisma.session.upsert({
    where: { id: 'S-DEV-OPEN-01' },
    update: {},
    create: {
      id: 'S-DEV-OPEN-01',
      formation_id: formationStd.id,
      date_ouverture: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      date_cloture: new Date(Date.now() + 25 * 24 * 3600 * 1000),
      date_debut: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      date_fin: new Date(Date.now() + 120 * 24 * 3600 * 1000),
      capacite: 20,
      places_restantes: 18,
      statut: 'OUVERTE',
    }
  });

  const sessionCloturee = await prisma.session.upsert({
    where: { id: 'S-DEV-CLOSED-01' },
    update: {},
    create: {
      id: 'S-DEV-CLOSED-01',
      formation_id: formationStd.id,
      date_ouverture: new Date(Date.now() - 120 * 24 * 3600 * 1000),
      date_cloture: new Date(Date.now() - 90 * 24 * 3600 * 1000),
      date_debut: new Date(Date.now() - 85 * 24 * 3600 * 1000),
      date_fin: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      capacite: 20,
      places_restantes: 0,
      statut: 'CLOTUREE',
    }
  });

  console.log('  ✅ 2 sessions créées (OUVERTE, CLOTUREE)');

  // ── 7bis. Session Premium pour test UCS08 retenir/rejeter ─────────────
  const sessionPremium = await prisma.session.upsert({
    where: { id: 'S-DEV-PREM-01' },
    update: {},
    create: {
      id: 'S-DEV-PREM-01',
      formation_id: formationPrem.id,
      date_ouverture: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      date_cloture: new Date(Date.now() + 25 * 24 * 3600 * 1000),
      date_debut: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      date_fin: new Date(Date.now() + 395 * 24 * 3600 * 1000),
      capacite: 15,
      places_restantes: 14,
      statut: 'OUVERTE',
    }
  });

  console.log('  ✅ Session Premium créée (pour UCS08)');

  // ── 8. Dossier PAYÉ sur session clôturée (pour test attestation) ──────
  await prisma.dossier.upsert({
    where: { id: 'D-DEV-PAYE-01' },
    update: {},
    create: {
      id: 'D-DEV-PAYE-01',
      apprenant_id: apprenant.id,
      formation_id: formationStd.id,
      session_id: sessionCloturee.id,
      statut: 'PAYE',
      source_financement: 'RETAIL',
    }
  });

  // ── 9. Dossiers Premium+Retail EN_ATTENTE_VERIFICATION (pour UCS08) ──
  // Dossier 1 : pour test RETENIR
  await prisma.dossier.upsert({
    where: { id: 'D-DEV-ATTENTE-01' },
    update: {},
    create: {
      id: 'D-DEV-ATTENTE-01',
      apprenant_id: apprenant.id,
      formation_id: formationPrem.id,        // ✅ Formation PREMIUM
      session_id: sessionPremium.id,         // ✅ Session Premium OUVERTE
      statut: 'EN_ATTENTE_VERIFICATION',     // ✅ Statut correct pour retenir
      source_financement: 'RETAIL',          // ✅ RETAIL (RM-140)
    }
  });

  // Dossier 2 : pour test REJETER
  await prisma.dossier.upsert({
    where: { id: 'D-DEV-ATTENTE-02' },
    update: {},
    create: {
      id: 'D-DEV-ATTENTE-02',
      apprenant_id: apprenant.id,
      formation_id: formationPrem.id,        // ✅ Formation PREMIUM
      session_id: sessionPremium.id,         // ✅ Session Premium OUVERTE
      statut: 'EN_ATTENTE_VERIFICATION',     // ✅ Statut correct pour rejeter
      source_financement: 'RETAIL',          // ✅ RETAIL (RM-140)
    }
  });

  console.log('  ✅ 3 dossiers créés (PAYE + 2 PREMIUM EN_ATTENTE_VERIFICATION)');

  // ── 9bis. Dossiers B2B pour apprenants organisation ────────────────────
  console.log('📋 Création dossiers B2B organisation...');

  const dossierB2B1 = await prisma.dossier.upsert({
    where: { id: 'D-DEV-B2B-01' },
    update: {},
    create: {
      id: 'D-DEV-B2B-01',
      apprenant_id: apprenantB2B1.id,
      formation_id: formationStd.id,
      session_id: sessionOuverte.id,
      statut: 'PAYE', // Payé via abonnement B2B
      source_financement: 'B2B', // ✅ Source B2B
    }
  });

  const dossierB2B2 = await prisma.dossier.upsert({
    where: { id: 'D-DEV-B2B-02' },
    update: {},
    create: {
      id: 'D-DEV-B2B-02',
      apprenant_id: apprenantB2B2.id,
      formation_id: formationStd.id,
      session_id: sessionOuverte.id,
      statut: 'PAYE',
      source_financement: 'B2B', // ✅ Source B2B
    }
  });

  const dossierB2B3 = await prisma.dossier.upsert({
    where: { id: 'D-DEV-B2B-03' },
    update: {},
    create: {
      id: 'D-DEV-B2B-03',
      apprenant_id: apprenantB2B3.id,
      formation_id: formationPrem.id,
      session_id: sessionPremium.id,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'B2B', // ✅ Source B2B
    }
  });

  console.log('  ✅ 3 dossiers B2B créés (2 PAYE + 1 EN_ATTENTE_VERIFICATION)');

  // ── 9ter. Paiements pour dossiers B2B ──────────────────────────────────
  console.log('💰 Création paiements B2B...');

  await prisma.paiement.upsert({
    where: { id: 'P-DEV-B2B-01' },
    update: {},
    create: {
      id: 'P-DEV-B2B-01',
      dossier_id: dossierB2B1.id,
      montant_catalogue: 10000000, // 100 000 XOF en centimes
      montant_final: 10000000,
      methode: 'VOUCHER_ORG',
      statut: 'CONFIRME',
      confirmed_at: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    }
  });

  await prisma.paiement.upsert({
    where: { id: 'P-DEV-B2B-02' },
    update: {},
    create: {
      id: 'P-DEV-B2B-02',
      dossier_id: dossierB2B2.id,
      montant_catalogue: 10000000,
      montant_final: 10000000,
      methode: 'VOUCHER_ORG',
      statut: 'CONFIRME',
      confirmed_at: new Date(Date.now() - 3 * 24 * 3600 * 1000),
    }
  });

  console.log('  ✅ 2 paiements B2B créés');

  // ── 10. Partenaire & Apporteur (pour tests Newman UCS19/UCS20) ────────
  const partenaire = await prisma.partenaire.upsert({
    where: { email_principal: 'partenaire@forges-dev.ci' },
    update: {},
    create: {
      email_principal: 'partenaire@forges-dev.ci',
      password_hash: hash,
      raison_sociale: 'Université Virtuelle CI',
      type: 'UNIVERSITE',
      pays: 'CI',
      statut: 'ACTIF',
      commission_forges_pct: 20,
      mode_inscription: 'INVITATION',
    }
  });

  const apporteur = await prisma.apporteur.upsert({
    where: { email: 'apporteur@forges-dev.ci' },
    update: {},
    create: {
      email: 'apporteur@forges-dev.ci',
      password_hash: hash,
      nom: 'Apporteur Test Dev',
      type: 'INDIVIDU',
      code_apporteur: 'APT-DEV-2026-001',
      taux_commission_pct: 5,
      pays: 'CI',
      statut: 'ACTIF',
    }
  });

  console.log('  ✅ Partenaire & Apporteur créés');

  // ── 11. Vouchers (pour tests Newman UCS06) ────────────────────────────
  const voucherActif = await prisma.voucherApporteur.upsert({
    where: { code: 'VOUCHER-TEST-ACTIF-2026' },
    update: {},
    create: {
      code: 'VOUCHER-TEST-ACTIF-2026',
      organisation_id: organisation.id,
      formation_id: formationStd.id,
      type: 'PROMOTIONNEL',
      statut: 'ACTIF',
      quota_max: 10,
      quota_utilise: 0,
      date_expiration: new Date(Date.now() + 365 * 24 * 3600 * 1000),
    }
  });

  const voucherEpuise = await prisma.voucherApporteur.upsert({
    where: { code: 'VOUCHER-TEST-EPUISE-2026' },
    update: {},
    create: {
      code: 'VOUCHER-TEST-EPUISE-2026',
      organisation_id: organisation.id,
      formation_id: formationStd.id,
      type: 'PROMOTIONNEL',
      statut: 'ACTIF',
      quota_max: 5,
      quota_utilise: 5, // Quota épuisé
      date_expiration: new Date(Date.now() + 365 * 24 * 3600 * 1000),
    }
  });

  console.log('  ✅ 2 vouchers apporteurs créés (ACTIF + EPUISE)');

  // ── 11.1 Vouchers Organisation (pour tests RM-41) ─────────────────────
  const voucherOrg = await prisma.voucherOrganisation.upsert({
    where: { code: 'ORG-E2E-VOUCHER-01' },
    update: {},
    create: {
      code: 'ORG-E2E-VOUCHER-01',
      organisation_id: organisation.id,
      formation_id: formationStd.id,
      type: 'ORGANISATION',
      statut: 'ACTIF',
      quota_max: 10,
      quota_utilise: 0,
      date_expiration: new Date(Date.now() + 365 * 24 * 3600 * 1000),
    }
  });

  const voucherOrgExpire = await prisma.voucherOrganisation.upsert({
    where: { code: 'ORG-E2E-VOUCHER-EXPIRE' },
    update: {},
    create: {
      code: 'ORG-E2E-VOUCHER-EXPIRE',
      organisation_id: organisation.id,
      formation_id: formationStd.id,
      type: 'ORGANISATION',
      statut: 'EXPIRE',
      quota_max: 5,
      quota_utilise: 0,
      date_expiration: new Date(Date.now() - 30 * 24 * 3600 * 1000), // Expiré
    }
  });

  console.log('  ✅ 2 vouchers organisation créés (ACTIF + EXPIRE)');

  // ── 12. Dossier RETENU (pour test paiement UCS09) ─────────────────────
  const dossierRetenu = await prisma.dossier.upsert({
    where: { id: 'D-DEV-RETENU-01' },
    update: {},
    create: {
      id: 'D-DEV-RETENU-01',
      apprenant_id: apprenant.id,
      formation_id: formationPrem.id,
      session_id: sessionPremium.id,
      statut: 'RETENU',
      source_financement: 'RETAIL',
    }
  });

  console.log('  ✅ Session Premium + Dossier RETENU créés (pour tests paiement)');

  console.log('\n✅ Seed DEV terminé !\n');
  console.log('┌──────────────────────────────────────────────────────────┐');
  console.log('│  COMPTES DEV                                              │');
  console.log('│  Mot de passe universel : Test@FORGES2026!                │');
  console.log('│                                                           │');
  console.log('│  admin@forges-dev.ci            → ADMIN                  │');
  console.log('│  responsable@forges-dev.ci      → RESPONSABLE            │');
  console.log('│  apprenant@forges-dev.ci        → APPRENANT              │');
  console.log('│  org@forges-dev.ci              → ORGANISATION           │');
  console.log('│    ├─ Abonnement ORG: PRO (150 000 XOF/an)              │');
  console.log('│    ├─ Abonnement B2B: BUSINESS (25 max, 3/25 actifs)    │');
  console.log('│    ├─ 3 employés B2B actifs                             │');
  console.log('│    ├─ 3 dossiers (2 PAYE B2B + 1 EN_ATTENTE)            │');
  console.log('│    └─ 2 paiements (200 000 XOF total)                   │');
  console.log('│  employee1@techcorp-dev.ci      → APPRENANT B2B         │');
  console.log('│  employee2@techcorp-dev.ci      → APPRENANT B2B         │');
  console.log('│  employee3@techcorp-dev.ci      → APPRENANT B2B         │');
  console.log('│  partenaire@forges-dev.ci       → PARTENAIRE            │');
  console.log('│  apporteur@forges-dev.ci        → APPORTEUR             │');
  console.log('│                                                           │');
  console.log('│  Vouchers:                                                │');
  console.log('│  - VOUCHER-TEST-ACTIF-2026   (quota 10/10, TechCorp)    │');
  console.log('│  - VOUCHER-TEST-EPUISE-2026  (quota 5/5 épuisé)         │');
  console.log('└──────────────────────────────────────────────────────────┘');
}

main().catch(e => { console.error(e); process.exit(1); })
      .finally(() => prisma.$disconnect());
