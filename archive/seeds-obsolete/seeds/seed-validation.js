/**
 * seed-validation.js — Données campagne de validation FORGES Plan v1.1
 * Schéma : conforme Specs v4.8 (Apprenant autonome, intitule, cout_catalogue)
 * Référence : Plan de Validation v1.1 — 72 tests UCS00→UCS20
 *
 * Usage :
 *   node prisma/seed-validation.js
 *   node prisma/seed-validation.js --reset
 *   node prisma/seed-validation.js --check
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
  console.log('🌱 Seed VALIDATION — FORGES Plan v1.1\n');

  if (CHECK) {
    const counts = await Promise.all([
      prisma.apprenant.count(),
      prisma.organisation.count(),
      prisma.partenaire.count(),
      prisma.formation.count(),
      prisma.session.count(),
      prisma.dossier.count(),
      prisma.voucher.count(),
    ]);
    console.log(`Apprenants: ${counts[0]} | Orgs: ${counts[1]} | Partenaires: ${counts[2]}`);
    console.log(`Formations: ${counts[3]} | Sessions: ${counts[4]} | Dossiers: ${counts[5]} | Vouchers: ${counts[6]}`);
    return;
  }

  if (RESET) {
    console.log('🗑️  Reset BDD...');
    await prisma.$executeRaw`TRUNCATE TABLE "Dossier", "Paiement", "CommissionPartenaire", "CommissionApporteur", "Voucher", "AccesFormationDemande", "FeedbackFormation", "EnqueteCatalogue", "ConversationBot", "AbonnementRetail", "AbonnementB2B", "AbonnementOrganisation", "Session", "FormationPartenaire", "Formation", "Apprenant", "Organisation", "Partenaire", "Apporteur" CASCADE`;
    console.log('✅ BDD vidée\n');
  }

  const hash = await bcrypt.hash(PASS, SALT_ROUNDS);

  // ═══════════════════════════════════════════════════════════════════════
  // 1. COMPTES BACKOFFICE
  // ═══════════════════════════════════════════════════════════════════════
  console.log('👤 Création comptes backoffice...');

  const admin = await prisma.apprenant.upsert({
    where: { email: 'admin@forges-test.ci' },
    update: {},
    create: {
      email: 'admin@forges-test.ci', password_hash: hash,
      nom: 'Admin', prenoms: 'FORGES Test',
      type_apprenant: 'PROFESSIONNEL', pays_residence: 'CI', pays_nationalite: 'CI',
      langue_preferee: 'FR', statut: 'ACTIF',
      consentement_rgpd: true, consentement_timestamp: new Date(), consentement_version_cgu: '1.0',
    }
  });

  const responsable = await prisma.apprenant.upsert({
    where: { email: 'responsable@forges-test.ci' },
    update: {},
    create: {
      email: 'responsable@forges-test.ci', password_hash: hash,
      nom: 'Responsable', prenoms: 'Formation Test',
      type_apprenant: 'PROFESSIONNEL', pays_residence: 'CI', pays_nationalite: 'CI',
      langue_preferee: 'FR', statut: 'ACTIF',
      consentement_rgpd: true, consentement_timestamp: new Date(), consentement_version_cgu: '1.0',
    }
  });

  const superviseur = await prisma.apprenant.upsert({
    where: { email: 'superviseur@forges-test.ci' },
    update: {},
    create: {
      email: 'superviseur@forges-test.ci', password_hash: hash,
      nom: 'Superviseur', prenoms: 'Test',
      type_apprenant: 'PROFESSIONNEL', pays_residence: 'CI', pays_nationalite: 'CI',
      langue_preferee: 'FR', statut: 'ACTIF',
      consentement_rgpd: true, consentement_timestamp: new Date(), consentement_version_cgu: '1.0',
    }
  });

  const agent = await prisma.apprenant.upsert({
    where: { email: 'agent@forges-test.ci' },
    update: {},
    create: {
      email: 'agent@forges-test.ci', password_hash: hash,
      nom: 'Agent', prenoms: 'Comptable Test',
      type_apprenant: 'PROFESSIONNEL', pays_residence: 'CI', pays_nationalite: 'CI',
      langue_preferee: 'FR', statut: 'ACTIF',
      consentement_rgpd: true, consentement_timestamp: new Date(), consentement_version_cgu: '1.0',
    }
  });

  console.log('  ✅ Admin, Responsable, Superviseur, Agent créés');

  // ═══════════════════════════════════════════════════════════════════════
  // 2. APPRENANTS TEST
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🎓 Création apprenants test...');

  const apprenant1 = await prisma.apprenant.upsert({
    where: { email: 'apprenant1@forges-test.ci' },
    update: {},
    create: {
      email: 'apprenant1@forges-test.ci', password_hash: hash,
      nom: 'KOUASSI', prenoms: 'Yao Jean',
      type_apprenant: 'PROFESSIONNEL', secteur_activite: 'IT & Cybersécurité',
      pays_residence: 'CI', pays_nationalite: 'CI',
      langue_preferee: 'FR', statut: 'ACTIF',
      consentement_rgpd: true, consentement_timestamp: new Date(), consentement_version_cgu: '1.0',
    }
  });

  const apprenant2 = await prisma.apprenant.upsert({
    where: { email: 'apprenant2@forges-test.ci' },
    update: {},
    create: {
      email: 'apprenant2@forges-test.ci', password_hash: hash,
      nom: 'DIALLO', prenoms: 'Fatima',
      type_apprenant: 'PROFESSIONNEL', secteur_activite: 'Finance',
      pays_residence: 'CI', pays_nationalite: 'GN',
      langue_preferee: 'FR', statut: 'ACTIF',
      consentement_rgpd: true, consentement_timestamp: new Date(), consentement_version_cgu: '1.0',
    }
  });

  console.log('  ✅ apprenant1 (Koné Yao Jean) + apprenant2 (Diallo Fatima) créés');

  // ═══════════════════════════════════════════════════════════════════════
  // 3. ORGANISATION TEST
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🏢 Création organisation test...');

  const org = await prisma.organisation.upsert({
    where: { email: 'org@forges-test.ci' },
    update: {},
    create: {
      email: 'org@forges-test.ci', password_hash: hash,
      raison_sociale: 'TechCorp CI',
      type: 'ENTREPRISE',
      identifiant_legal: 'CI-RCCM-TEST-2026-001',
      contact_referent: 'Directeur RH Test',
      pays: 'CI', langue_preferee: 'FR',
      statut: 'ACTIF',
      date_fin_essai: new Date(Date.now() + 25 * 24 * 3600 * 1000),
    }
  });

  console.log('  ✅ Organisation TechCorp CI créée (essai 25j restants)');

  // ═══════════════════════════════════════════════════════════════════════
  // 4. PARTENAIRE TEST
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🤝 Création partenaire test...');

  const partenaire = await prisma.partenaire.upsert({
    where: { email_principal: 'partenaire@forges-test.ci' },
    update: {},
    create: {
      email_principal: 'partenaire@forges-test.ci',
      raison_sociale: 'Institut Tech Test CI',
      type: 'UNIVERSITE',
      pays: 'CI',
      commission_forges_pct: 20,
      statut: 'ACTIF',
      mode_inscription: 'INVITATION_ADMIN',
      responsable_designe_id: responsable.id,
    }
  });

  console.log('  ✅ Partenaire Institut Tech Test CI créé (commission 20%)');

  // ═══════════════════════════════════════════════════════════════════════
  // 5. APPORTEUR TEST
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🔗 Création apporteur test...');

  const CODE_APPORTEUR = '550e8400-e29b-41d4-a716-446655440001';
  const apporteur = await prisma.apporteur.upsert({
    where: { email: 'apporteur@forges-test.ci' },
    update: {},
    create: {
      email: 'apporteur@forges-test.ci',
      nom: 'TRAORE Mamadou',
      type: 'INDIVIDU',
      code_apporteur: CODE_APPORTEUR,
      taux_commission_pct: 5,
      statut: 'ACTIF',
    }
  });

  console.log(`  ✅ Apporteur créé — code: ${CODE_APPORTEUR}`);

  // ═══════════════════════════════════════════════════════════════════════
  // 6. FORMATIONS TEST
  // ═══════════════════════════════════════════════════════════════════════
  console.log('📚 Création formations test...');

  const fStd = await prisma.formation.upsert({
    where: { id: 'F-STD-01-TEST' },
    update: {},
    create: {
      id: 'F-STD-01-TEST',
      intitule: 'Gestion de Projet IT',
      description_courte: 'Formation certifiante en gestion de projets informatiques. Prépare à la certification PMP.',
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

  const fPrem = await prisma.formation.upsert({
    where: { id: 'F-PREM-01-TEST' },
    update: {},
    create: {
      id: 'F-PREM-01-TEST',
      intitule: 'Cybersécurité Avancée GWU',
      description_courte: 'Programme Premium de cybersécurité en partenariat avec George Washington University.',
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

  const fDem = await prisma.formation.upsert({
    where: { id: 'F-DEM-01-TEST' },
    update: {},
    create: {
      id: 'F-DEM-01-TEST',
      intitule: 'Introduction à l\'IA pour Managers',
      description_courte: 'Découvrez l\'intelligence artificielle et ses applications concrètes en entreprise.',
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

  // Formation partenaire EN_ATTENTE_VALIDATION
  const fPart = await prisma.formation.upsert({
    where: { id: 'F-PART-01-TEST' },
    update: {},
    create: {
      id: 'F-PART-01-TEST',
      intitule: 'Data Science Appliquée',
      description_courte: 'Formation partenaire en science des données appliquée aux métiers africains.',
      duree_jours: 60,
      cout_catalogue: 0, // calculé à validation (RM-137)
      responsable_id: responsable.id,
      type_formation: 'STANDARD', // sera assigné à validation
      mode_formation: 'AVEC_SESSION',
      langues_disponibles: ['FR'],
      certification_delivree: true,
      partenaire_id: partenaire.id,
      statut: 'EN_ATTENTE_VALIDATION',
      inclus_abonnement: false,
    }
  });

  // FormationPartenaire liée — prix coûtant 80 000 XOF
  await prisma.formationPartenaire.upsert({
    where: { formation_id: 'F-PART-01-TEST' },
    update: {},
    create: {
      formation_id: 'F-PART-01-TEST',
      partenaire_id: partenaire.id,
      responsable_validateur_id: responsable.id,
      statut_validation: 'EN_ATTENTE',
      version: 1,
      prix_coutant_soumis: 80000,
      date_soumission: new Date(),
    }
  });

  // Formation archivée (pour test RM-13)
  await prisma.formation.upsert({
    where: { id: 'F-ARCH-01-TEST' },
    update: {},
    create: {
      id: 'F-ARCH-01-TEST',
      intitule: 'Formation Archivée Test',
      description_courte: 'Formation archivée pour test RM-13.',
      duree_jours: 10, cout_catalogue: 50000,
      responsable_id: responsable.id,
      type_formation: 'STANDARD', mode_formation: 'AVEC_SESSION',
      langues_disponibles: ['FR'], statut: 'ARCHIVEE',
      inclus_abonnement: false,
    }
  });

  console.log('  ✅ 5 formations créées (STD, PREM, DEM, PART-ATTENTE, ARCHIVEE)');

  // ═══════════════════════════════════════════════════════════════════════
  // 7. SESSIONS TEST
  // ═══════════════════════════════════════════════════════════════════════
  console.log('📅 Création sessions test...');

  const sOpen = await prisma.session.upsert({
    where: { id: 'S-OPEN-01-TEST' },
    update: {},
    create: {
      id: 'S-OPEN-01-TEST',
      formation_id: 'F-STD-01-TEST',
      date_ouverture: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      date_cloture: new Date(Date.now() + 25 * 24 * 3600 * 1000),
      date_debut: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      date_fin: new Date(Date.now() + 120 * 24 * 3600 * 1000),
      capacite: 20, places_restantes: 18, statut: 'OUVERTE',
    }
  });

  const sPrem = await prisma.session.upsert({
    where: { id: 'S-PREM-01-TEST' },
    update: {},
    create: {
      id: 'S-PREM-01-TEST',
      formation_id: 'F-PREM-01-TEST',
      date_ouverture: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      date_cloture: new Date(Date.now() + 28 * 24 * 3600 * 1000),
      date_debut: new Date(Date.now() + 35 * 24 * 3600 * 1000),
      date_fin: new Date(Date.now() + 400 * 24 * 3600 * 1000),
      capacite: 15, places_restantes: 13, statut: 'OUVERTE',
    }
  });

  const sClosed = await prisma.session.upsert({
    where: { id: 'S-CLOSED-01-TEST' },
    update: {},
    create: {
      id: 'S-CLOSED-01-TEST',
      formation_id: 'F-STD-01-TEST',
      date_ouverture: new Date(Date.now() - 150 * 24 * 3600 * 1000),
      date_cloture: new Date(Date.now() - 120 * 24 * 3600 * 1000),
      date_debut: new Date(Date.now() - 115 * 24 * 3600 * 1000),
      date_fin: new Date(Date.now() - 25 * 24 * 3600 * 1000),
      capacite: 20, places_restantes: 0, statut: 'CLOTUREE',
    }
  });

  // Session future (pour test scheduler RM-20)
  await prisma.session.upsert({
    where: { id: 'S-FUTURE-01-TEST' },
    update: {},
    create: {
      id: 'S-FUTURE-01-TEST',
      formation_id: 'F-STD-01-TEST',
      date_ouverture: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      date_cloture: new Date(Date.now() + 35 * 24 * 3600 * 1000),
      date_debut: new Date(Date.now() + 40 * 24 * 3600 * 1000),
      date_fin: new Date(Date.now() + 130 * 24 * 3600 * 1000),
      capacite: 20, places_restantes: 20, statut: 'PLANIFIEE',
    }
  });

  console.log('  ✅ 4 sessions créées (OUVERTE×2, CLOTUREE, PLANIFIEE)');

  // ═══════════════════════════════════════════════════════════════════════
  // 8. DOSSIERS TEST
  // ═══════════════════════════════════════════════════════════════════════
  console.log('📁 Création dossiers test...');

  // Dossier PAYÉ sur session clôturée (test attestation RM-26)
  await prisma.dossier.upsert({
    where: { id: 'D-PAYE-01-TEST' },
    update: {},
    create: {
      id: 'D-PAYE-01-TEST',
      apprenant_id: apprenant1.id,
      formation_id: 'F-STD-01-TEST',
      session_id: 'S-CLOSED-01-TEST',
      statut: 'PAYE',
      source_financement: 'RETAIL',
    }
  });

  // Dossier EN_ATTENTE (test annulation RM-27)
  await prisma.dossier.upsert({
    where: { id: 'D-ATTENTE-01-TEST' },
    update: {},
    create: {
      id: 'D-ATTENTE-01-TEST',
      apprenant_id: apprenant1.id,
      formation_id: 'F-PREM-01-TEST',
      session_id: 'S-PREM-01-TEST',
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
    }
  });

  // Dossier RETENU (test paiement RM-07)
  await prisma.dossier.upsert({
    where: { id: 'D-RETENU-01-TEST' },
    update: {},
    create: {
      id: 'D-RETENU-01-TEST',
      apprenant_id: apprenant2.id,
      formation_id: 'F-PREM-01-TEST',
      session_id: 'S-PREM-01-TEST',
      statut: 'RETENU',
      source_financement: 'RETAIL',
      expires_at: new Date(Date.now() + 48 * 3600 * 1000),
    }
  });

  // Dossier RETENU expiré (test scheduler RM-07)
  await prisma.dossier.upsert({
    where: { id: 'D-RETENU-EXP-TEST' },
    update: {},
    create: {
      id: 'D-RETENU-EXP-TEST',
      apprenant_id: apprenant2.id,
      formation_id: 'F-PREM-01-TEST',
      session_id: 'S-PREM-01-TEST',
      statut: 'RETENU',
      source_financement: 'RETAIL',
      expires_at: new Date(Date.now() - 1 * 3600 * 1000), // expiré
    }
  });

  console.log('  ✅ 4 dossiers créés (PAYE, EN_ATTENTE, RETENU×2)');

  // ═══════════════════════════════════════════════════════════════════════
  // 9. VOUCHERS TEST
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🎫 Création vouchers test...');

  // Voucher promo ACTIF -20% (test RM-39,40)
  await prisma.voucher.upsert({
    where: { id: 'VCH-PROMO-01-TEST' },
    update: {},
    create: {
      id: 'VCH-PROMO-01-TEST',
      code: uuidv4(),
      type: 'PROMOTIONNEL',
      formation_id: 'F-STD-01-TEST',
      valeur: 20,
      type_valeur: 'POURCENTAGE',
      quota_max: 10,
      quota_utilise: 2,
      date_expiration: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      statut: 'ACTIF',
      cree_par: agent.id,
      valide_par: superviseur.id,
      valide_le: new Date(),
    }
  });

  // Voucher ÉPUISÉ (test quota RM-40)
  await prisma.voucher.upsert({
    where: { id: 'VCH-EPUISE-01-TEST' },
    update: {},
    create: {
      id: 'VCH-EPUISE-01-TEST',
      code: uuidv4(),
      type: 'PROMOTIONNEL',
      formation_id: 'F-STD-01-TEST',
      valeur: 10,
      type_valeur: 'POURCENTAGE',
      quota_max: 5,
      quota_utilise: 5,
      date_expiration: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      statut: 'EPUISE',
      cree_par: agent.id,
      valide_par: superviseur.id,
      valide_le: new Date(),
    }
  });

  console.log('  ✅ 2 vouchers créés (ACTIF -20%, EPUISE)');

  // ═══════════════════════════════════════════════════════════════════════
  // 10. ABONNEMENT RETAIL apprenant1 (pour tests RM-88, RM-102)
  // ═══════════════════════════════════════════════════════════════════════
  await prisma.abonnementRetail.upsert({
    where: { id: 'ABO-RET-01-TEST' },
    update: {},
    create: {
      id: 'ABO-RET-01-TEST',
      apprenant_id: apprenant1.id,
      offre: 'ESSENTIEL',
      montant_mensuel: 15000,
      montant_premier_mois: 15000,
      date_debut: new Date(Date.now() - 15 * 24 * 3600 * 1000),
      date_fin: new Date(Date.now() + 15 * 24 * 3600 * 1000),
      statut: 'ACTIF',
      consentement_auto: true,
      consentement_timestamp: new Date(),
      suspension_count: 0,
    }
  });

  // AccèsFormationDemande source=ABONNEMENT (pour test RM-103)
  await prisma.accesFormationDemande.upsert({
    where: { id: 'AFD-01-TEST' },
    update: {},
    create: {
      id: 'AFD-01-TEST',
      apprenant_id: apprenant1.id,
      formation_id: 'F-DEM-01-TEST',
      source: 'ABONNEMENT',
      statut: 'ACTIF',
      date_expiration: new Date(Date.now() + 365 * 24 * 3600 * 1000),
    }
  });

  console.log('  ✅ AbonnementRetail ESSENTIEL + AccèsFormationDemande créés');

  // Résumé final
  console.log('\n✅ Seed VALIDATION terminé !\n');
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│  COMPTES VALIDATION — Mot de passe : Test@FORGES2026!        │');
  console.log('├──────────────────────────────────────────────────────────────┤');
  console.log('│  admin@forges-test.ci          → ADMIN                      │');
  console.log('│  responsable@forges-test.ci    → RESPONSABLE                │');
  console.log('│  superviseur@forges-test.ci    → SUPERVISEUR                │');
  console.log('│  agent@forges-test.ci          → AGENT_COMPTABLE            │');
  console.log('│  apprenant1@forges-test.ci     → APPRENANT (abonné Retail)  │');
  console.log('│  apprenant2@forges-test.ci     → APPRENANT                  │');
  console.log('│  org@forges-test.ci            → ORGANISATION (essai 25j)   │');
  console.log('│  partenaire@forges-test.ci     → PARTENAIRE                 │');
  console.log('│  apporteur@forges-test.ci      → APPORTEUR (taux 5%)        │');
  console.log('├──────────────────────────────────────────────────────────────┤');
  console.log('│  CODE APPORTEUR APT-01 : 550e8400-e29b-41d4-a716-446655440001│');
  console.log('└──────────────────────────────────────────────────────────────┘');
}

main().catch(e => { console.error(e); process.exit(1); })
      .finally(() => prisma.$disconnect());
