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
    await prisma.$executeRaw`TRUNCATE TABLE "Dossier", "Session", "Formation", "Apprenant", "Organisation", "Partenaire", "Apporteur", "Voucher" CASCADE`;
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

  // ── 3b. Abonnements Organisation ──────────────────────────────────────
  console.log('🏢 Création abonnements organisation...');

  // AbonnementOrganisation PRO — 150 000 XOF/an (en centimes = 15 000 000)
  const aboOrg = await prisma.abonnementOrganisation.upsert({
    where: { id: 'ABO-ORG-DEV-01' },
    update: {
      offre: 'PRO',
      statut: 'ACTIF',
      montant_annuel: 150000, // XOF — aligné sur TARIFS_ORG.PRO
      perimetre_fonctionnel: ['DASHBOARD', 'B2B', 'VOUCHERS', 'INSCRIPTIONS', 'RAPPORTS'],
      date_debut: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      date_fin: new Date(Date.now() + 355 * 24 * 3600 * 1000),
      renouvellement_auto: true,
    },
    create: {
      id: 'ABO-ORG-DEV-01',
      organisation_id: organisation.id,
      offre: 'PRO',
      statut: 'ACTIF',
      montant_annuel: 150000, // XOF — aligné sur TARIFS_ORG.PRO
      perimetre_fonctionnel: ['DASHBOARD', 'B2B', 'VOUCHERS', 'INSCRIPTIONS', 'RAPPORTS'],
      date_debut: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      date_fin: new Date(Date.now() + 355 * 24 * 3600 * 1000),
      renouvellement_auto: true,
    }
  });

  // AbonnementB2B BUSINESS — 50 places max, prix annuel 500 000 XOF (aligné sur PALIERS_B2B.BUSINESS)
  const aboB2B = await prisma.abonnementB2B.upsert({
    where: { id: 'ABO-B2B-DEV-01' },
    update: {
      palier: 'BUSINESS',
      nb_max: 50, // PALIERS_B2B.BUSINESS = 50 places
      nb_actifs: 3,
      prix_annuel: 500000, // XOF — aligné sur PALIERS_B2B.BUSINESS
      date_debut: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      date_fin: new Date(Date.now() + 355 * 24 * 3600 * 1000),
      date_renouvellement: new Date(Date.now() + 355 * 24 * 3600 * 1000),
      statut: 'ACTIF',
    },
    create: {
      id: 'ABO-B2B-DEV-01',
      organisation_id: organisation.id,
      palier: 'BUSINESS',
      nb_max: 50, // PALIERS_B2B.BUSINESS = 50 places
      nb_actifs: 3,
      prix_annuel: 500000, // XOF — aligné sur PALIERS_B2B.BUSINESS
      date_debut: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      date_fin: new Date(Date.now() + 355 * 24 * 3600 * 1000),
      date_renouvellement: new Date(Date.now() + 355 * 24 * 3600 * 1000),
      statut: 'ACTIF',
    }
  });

  // Lier les abonnements courants à l'organisation
  await prisma.organisation.update({
    where: { id: organisation.id },
    data: {
      abonnement_org_id: aboOrg.id,
      abonnement_b2b_id: aboB2B.id,
    }
  });

  console.log('  ✅ AbonnementOrganisation PRO + AbonnementB2B BUSINESS créés et liés');

  // ── 3c. Apprenants B2B (liés à l'organisation) ────────────────────────
  console.log('👥 Création apprenants B2B...');

  const apprenantB2B1 = await prisma.apprenant.upsert({
    where: { email: 'b2b1@forges-dev.ci' },
    update: { organisation_id: organisation.id },
    create: {
      email: 'b2b1@forges-dev.ci',
      password_hash: hash,
      nom: 'Ouédraogo',
      prenoms: 'Fatou',
      type_apprenant: 'PROFESSIONNEL',
      secteur_activite: 'Finance',
      pays_residence: 'BF',
      pays_nationalite: 'BF',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      organisation_id: organisation.id,
      consentement_rgpd: true,
      consentement_timestamp: new Date(),
      consentement_version_cgu: '1.0',
    }
  });

  const apprenantB2B2 = await prisma.apprenant.upsert({
    where: { email: 'b2b2@forges-dev.ci' },
    update: { organisation_id: organisation.id },
    create: {
      email: 'b2b2@forges-dev.ci',
      password_hash: hash,
      nom: 'Coulibaly',
      prenoms: 'Ibrahim',
      type_apprenant: 'PROFESSIONNEL',
      secteur_activite: 'RH',
      pays_residence: 'CI',
      pays_nationalite: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      organisation_id: organisation.id,
      consentement_rgpd: true,
      consentement_timestamp: new Date(),
      consentement_version_cgu: '1.0',
    }
  });

  const apprenantB2B3 = await prisma.apprenant.upsert({
    where: { email: 'b2b3@forges-dev.ci' },
    update: { organisation_id: organisation.id },
    create: {
      email: 'b2b3@forges-dev.ci',
      password_hash: hash,
      nom: 'Diallo',
      prenoms: 'Mariama',
      type_apprenant: 'PROFESSIONNEL',
      secteur_activite: 'Marketing',
      pays_residence: 'SN',
      pays_nationalite: 'SN',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      organisation_id: organisation.id,
      consentement_rgpd: true,
      consentement_timestamp: new Date(),
      consentement_version_cgu: '1.0',
    }
  });

  console.log('  ✅ 3 apprenants B2B créés (Ouédraogo, Coulibaly, Diallo)');

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
    update: {
      intitule: 'Cybersécurité GWU — CCDL Advanced',
      description_courte: 'Programme avancé de cybersécurité en partenariat avec George Washington University.',
      duree_jours: 365,
      cout_catalogue: 12000000,
      responsable_id: responsable.id,
      type_formation: 'PREMIUM',
      mode_formation: 'AVEC_SESSION',
      pilier_abonnement: 'B2B',
      inclus_abonnement: false,
      langues_disponibles: ['FR', 'EN'],
      certification_delivree: true,
      statut: 'ACTIVE',
    },
    create: {
      id: 'F-DEV-PREM-01',
      intitule: 'Cybersécurité GWU — CCDL Advanced',
      description_courte: 'Programme avancé de cybersécurité en partenariat avec George Washington University.',
      duree_jours: 365,
      cout_catalogue: 12000000,
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

  const sessionOuverteTest = await prisma.session.upsert({
    where: { id: 'S-DEV-OPEN-02' },
    update: {},
    create: {
      id: 'S-DEV-OPEN-02',
      formation_id: formationStd.id,
      date_ouverture: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      date_cloture: new Date(Date.now() + 20 * 24 * 3600 * 1000),
      date_debut: new Date(Date.now() + 28 * 24 * 3600 * 1000),
      date_fin: new Date(Date.now() + 100 * 24 * 3600 * 1000),
      capacite: 25,
      places_restantes: 25,
      statut: 'OUVERTE',
    }
  });

  await prisma.dossier.deleteMany({
    where: {
      apprenant_id: apprenant.id,
      session_id: sessionOuverteTest.id,
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

  // ── 8. Dossier PAYÉ sur session clôturée (pour test attestation) ──────
  await prisma.dossier.upsert({
    where: { id: 'D-DEV-PAYE-01' },
    update: {
      apprenant_id: apprenant.id,
      formation_id: formationStd.id,
      session_id: sessionCloturee.id,
      statut: 'PAYE',
      source_financement: 'RETAIL',
    },
    create: {
      id: 'D-DEV-PAYE-01',
      apprenant_id: apprenant.id,
      formation_id: formationStd.id,
      session_id: sessionCloturee.id,
      statut: 'PAYE',
      source_financement: 'RETAIL',
    }
  });

  // ── 9. Dossier EN_ATTENTE (pour test annulation) ──────────────────────
  await prisma.dossier.upsert({
    where: { id: 'D-DEV-ATTENTE-01' },
    update: {
      apprenant_id: apprenant.id,
      formation_id: formationPrem.id,
      session_id: sessionOuverte.id,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
    },
    create: {
      id: 'D-DEV-ATTENTE-01',
      apprenant_id: apprenant.id,
      formation_id: formationPrem.id,
      session_id: sessionOuverte.id,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
    }
  });
  console.log('  ✅ 2 dossiers créés (PAYE + 1 EN_ATTENTE_VERIFICATION)');

  // ── 10. Partenaire & Apporteur (pour tests Newman UCS19/UCS20) ────────
  const partenaire = await prisma.partenaire.upsert({
    where: { email_principal: 'partenaire@forges-dev.ci' },
    update: {
      password_hash: hash,
      raison_sociale: 'Université Virtuelle CI',
      type: 'UNIVERSITE',
      pays: 'CI',
      statut: 'ACTIF',
      commission_forges_pct: 20,
      mode_inscription: 'INVITATION',
      responsable_designe_id: responsable.id,
    },
    create: {
      email_principal: 'partenaire@forges-dev.ci',
      password_hash: hash,
      raison_sociale: 'Université Virtuelle CI',
      type: 'UNIVERSITE',
      pays: 'CI',
      statut: 'ACTIF',
      commission_forges_pct: 20,
      mode_inscription: 'INVITATION',
      responsable_designe_id: responsable.id,
    }
  });

  const apporteur = await prisma.apporteur.upsert({
    where: { email: 'apporteur@forges-dev.ci' },
    update: {
      nom: 'Apporteur Test Dev',
      type: 'INDIVIDU',
      code_apporteur: 'APT-DEV-2026-001',
      taux_commission_pct: 5,
      pays: 'CI',
      statut: 'ACTIF',
    },
    create: {
      email: 'apporteur@forges-dev.ci',
      nom: 'Apporteur Test Dev',
      type: 'INDIVIDU',
      code_apporteur: 'APT-DEV-2026-001',
      taux_commission_pct: 5,
      pays: 'CI',
      statut: 'ACTIF',
    }
  });

  console.log('  ✅ Partenaire & Apporteur créés');

  await prisma.formation.update({
    where: { id: formationPrem.id },
    data: { partenaire_id: partenaire.id }
  });

  const formationPartenaireSeed = await prisma.formation.upsert({
    where: { id: 'F-DEV-PART-01' },
    update: {
      intitule: 'Pilotage de projets Data',
      description_courte: 'Formation partenaire en attente de validation.',
      description_longue: 'Formation seedée pour la validation responsable Newman.',
      duree_jours: 45,
      cout_catalogue: 0,
      responsable_id: responsable.id,
      type_formation: 'STANDARD',
      mode_formation: 'AVEC_SESSION',
      pilier_abonnement: 'RETAIL',
      inclus_abonnement: false,
      objectifs_pedagogiques: ['Valider le contrat Newman UCS18'],
      langues_disponibles: ['FR'],
      certification_delivree: false,
      statut: 'EN_ATTENTE_VALIDATION',
      partenaire_id: partenaire.id,
    },
    create: {
      id: 'F-DEV-PART-01',
      intitule: 'Pilotage de projets Data',
      description_courte: 'Formation partenaire en attente de validation.',
      description_longue: 'Formation seedée pour la validation responsable Newman.',
      duree_jours: 45,
      cout_catalogue: 0,
      responsable_id: responsable.id,
      type_formation: 'STANDARD',
      mode_formation: 'AVEC_SESSION',
      pilier_abonnement: 'RETAIL',
      inclus_abonnement: false,
      objectifs_pedagogiques: ['Valider le contrat Newman UCS18'],
      langues_disponibles: ['FR'],
      certification_delivree: false,
      statut: 'EN_ATTENTE_VALIDATION',
      partenaire_id: partenaire.id,
    }
  });

  const formationPartenaireSeedReject = await prisma.formation.upsert({
    where: { id: 'F-DEV-PART-02' },
    update: {
      intitule: 'Pilotage de projets Data - Rejet',
      description_courte: 'Formation partenaire en attente de rejet.',
      description_longue: 'Deuxième formation seedée pour le rejet Newman UCS18.',
      duree_jours: 30,
      cout_catalogue: 0,
      responsable_id: responsable.id,
      type_formation: 'STANDARD',
      mode_formation: 'AVEC_SESSION',
      pilier_abonnement: 'RETAIL',
      inclus_abonnement: false,
      objectifs_pedagogiques: ['Valider le contrat Newman UCS18 - rejet'],
      langues_disponibles: ['FR'],
      certification_delivree: false,
      statut: 'EN_ATTENTE_VALIDATION',
      partenaire_id: partenaire.id,
    },
    create: {
      id: 'F-DEV-PART-02',
      intitule: 'Pilotage de projets Data - Rejet',
      description_courte: 'Formation partenaire en attente de rejet.',
      description_longue: 'Deuxième formation seedée pour le rejet Newman UCS18.',
      duree_jours: 30,
      cout_catalogue: 0,
      responsable_id: responsable.id,
      type_formation: 'STANDARD',
      mode_formation: 'AVEC_SESSION',
      pilier_abonnement: 'RETAIL',
      inclus_abonnement: false,
      objectifs_pedagogiques: ['Valider le contrat Newman UCS18 - rejet'],
      langues_disponibles: ['FR'],
      certification_delivree: false,
      statut: 'EN_ATTENTE_VALIDATION',
      partenaire_id: partenaire.id,
    }
  });

  await prisma.formationPartenaire.upsert({
    where: { id: 'FP-DEV-01' },
    update: {
      formation_id: formationPartenaireSeed.id,
      partenaire_id: partenaire.id,
      responsable_validateur_id: responsable.id,
      prix_coutant_soumis: 6000000,
      statut_validation: 'EN_ATTENTE',
      version: 1,
      date_soumission: new Date(),
      date_validation: null,
      commentaire_responsable: null,
      corrections_suggeres: null,
    },
    create: {
      id: 'FP-DEV-01',
      formation_id: formationPartenaireSeed.id,
      partenaire_id: partenaire.id,
      responsable_validateur_id: responsable.id,
      prix_coutant_soumis: 6000000,
    }
  });

  await prisma.formationPartenaire.upsert({
    where: { id: 'FP-DEV-02' },
    update: {
      formation_id: formationPartenaireSeedReject.id,
      partenaire_id: partenaire.id,
      responsable_validateur_id: responsable.id,
      prix_coutant_soumis: 4500000,
      statut_validation: 'EN_ATTENTE',
      version: 1,
      date_soumission: new Date(),
      date_validation: null,
      commentaire_responsable: null,
      corrections_suggeres: null,
    },
    create: {
      id: 'FP-DEV-02',
      formation_id: formationPartenaireSeedReject.id,
      partenaire_id: partenaire.id,
      responsable_validateur_id: responsable.id,
      prix_coutant_soumis: 4500000,
    }
  });

  const botConversation = await prisma.conversationBot.upsert({
    where: { id: 'CONV-DEV-01' },
    update: {
      utilisateur_id: apprenant.id,
      apprenant_id: apprenant.id,
      type_utilisateur: 'APPRENANT',
      flux_actif: 'ORIENTATION',
      statut: 'EN_COURS',
      historique: [],
      langue: 'FR',
    },
    create: {
      id: 'CONV-DEV-01',
      utilisateur_id: apprenant.id,
      apprenant_id: apprenant.id,
      type_utilisateur: 'APPRENANT',
      flux_actif: 'ORIENTATION',
      statut: 'EN_COURS',
      historique: [],
      langue: 'FR',
    }
  });

  console.log('  ✅ Formation partenaire + conversation bot seedées');

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

  console.log('  ✅ 2 vouchers créés (ACTIF + EPUISE)');

  const paymentApporteur = await prisma.paiement.upsert({
    where: { dossier_id: 'D-DEV-PAYE-01' },
    update: {
      montant_catalogue: 12000000,
      montant_final: 12000000,
      methode: 'MOBILE_MONEY',
      statut: 'CONFIRME',
      transaction_id: 'TXN-DEV-APPORTEUR-01',
      tentatives: 0,
      reduction_appliquee: 0,
      expires_at: new Date(Date.now() + 24 * 3600 * 1000),
      confirmed_at: new Date(),
    },
    create: {
      dossier_id: 'D-DEV-PAYE-01',
      montant_catalogue: 12000000,
      montant_final: 12000000,
      methode: 'MOBILE_MONEY',
      statut: 'CONFIRME',
      transaction_id: 'TXN-DEV-APPORTEUR-01',
      tentatives: 0,
      reduction_appliquee: 0,
      expires_at: new Date(Date.now() + 24 * 3600 * 1000),
      confirmed_at: new Date(),
    }
  });

  await prisma.commissionApporteur.upsert({
    where: { paiement_id: paymentApporteur.id },
    update: {
      apporteur_id: apporteur.id,
      dossier_id: 'D-DEV-PAYE-01',
      montant_base: 12000000,
      montant_base_xof: 12000000,
      taux_commission_pct: 5,
      montant_commission: 600000,
      montant_commission_xof: 600000,
      statut: 'VALIDEE',
      date_generation: new Date(),
    },
    create: {
      apporteur_id: apporteur.id,
      paiement_id: paymentApporteur.id,
      dossier_id: 'D-DEV-PAYE-01',
      montant_base: 12000000,
      montant_base_xof: 12000000,
      taux_commission_pct: 5,
      montant_commission: 600000,
      montant_commission_xof: 600000,
      statut: 'VALIDEE',
      date_generation: new Date(),
    }
  });

  await prisma.commissionApporteur.update({
    where: { paiement_id: paymentApporteur.id },
    data: {
      apporteur_id: apporteur.id,
      dossier_id: 'D-DEV-PAYE-01',
      montant_base: 12000000,
      montant_base_xof: 12000000,
      taux_commission_pct: 5,
      montant_commission: 600000,
      montant_commission_xof: 600000,
      statut: 'VALIDEE',
      date_generation: new Date(),
    }
  });

  console.log('  ✅ Commission apporteur seedée pour reversement');

  // ── 12. Session Premium pour test UCS08 retenir/rejeter ───────────────
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

  await prisma.dossier.upsert({
    where: { id: 'D-DEV-ATTENTE-01' },
    update: {
      apprenant_id: apprenant.id,
      formation_id: formationPrem.id,
      session_id: sessionPremium.id,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
    },
    create: {
      id: 'D-DEV-ATTENTE-01',
      apprenant_id: apprenant.id,
      formation_id: formationPrem.id,
      session_id: sessionPremium.id,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
    }
  });

  await prisma.dossier.upsert({
    where: { id: 'D-DEV-ATTENTE-02' },
    update: {
      apprenant_id: apprenant.id,
      formation_id: formationPrem.id,
      session_id: sessionPremium.id,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
    },
    create: {
      id: 'D-DEV-ATTENTE-02',
      apprenant_id: apprenant.id,
      formation_id: formationPrem.id,
      session_id: sessionPremium.id,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
    }
  });

  await prisma.dossier.update({
    where: { id: 'D-DEV-ATTENTE-01' },
    data: {
      apprenant_id: apprenant.id,
      formation_id: formationPrem.id,
      session_id: sessionPremium.id,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
    }
  });

  console.log('  ✅ 3 dossiers créés (PAYE + 2 EN_ATTENTE_VERIFICATION)');

  // ── 13. Dossier RETENU (pour test paiement UCS09) ─────────────────────
  const paiementRetenuExistant = await prisma.paiement.findFirst({
    where: { dossier_id: 'D-DEV-RETENU-01' },
    select: { id: true }
  });
  if (paiementRetenuExistant) {
    await prisma.commissionPartenaire.deleteMany({ where: { paiement_id: paiementRetenuExistant.id } });
    await prisma.commissionApporteur.deleteMany({ where: { paiement_id: paiementRetenuExistant.id } });
    await prisma.paiement.delete({ where: { id: paiementRetenuExistant.id } });
  }

  const dossierRetenu = await prisma.dossier.upsert({
    where: { id: 'D-DEV-RETENU-01' },
    update: {
      apprenant_id: apprenant.id,
      formation_id: formationPrem.id,
      session_id: sessionPremium.id,
      statut: 'RETENU',
      source_financement: 'RETAIL',
    },
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

  // ── 14. Dossiers B2B + Paiements pour apprenants organisation ──────────
  console.log('📋 Création dossiers B2B organisation...');

  // Dossier B2B — Apprenant 1 (Ouédraogo Fatou) — Formation Standard PAYE
  const dossierB2B1 = await prisma.dossier.upsert({
    where: { id: 'D-DEV-B2B-01' },
    update: {
      apprenant_id: apprenantB2B1.id,
      formation_id: formationStd.id,
      session_id: sessionCloturee.id,
      statut: 'PAYE',
      source_financement: 'B2B',
    },
    create: {
      id: 'D-DEV-B2B-01',
      apprenant_id: apprenantB2B1.id,
      formation_id: formationStd.id,
      session_id: sessionCloturee.id,
      statut: 'PAYE',
      source_financement: 'B2B',
    }
  });

  // Dossier B2B — Apprenant 2 (Coulibaly Ibrahim) — Formation Standard PAYE
  const dossierB2B2 = await prisma.dossier.upsert({
    where: { id: 'D-DEV-B2B-02' },
    update: {
      apprenant_id: apprenantB2B2.id,
      formation_id: formationStd.id,
      session_id: sessionOuverte.id,
      statut: 'PAYE',
      source_financement: 'B2B',
    },
    create: {
      id: 'D-DEV-B2B-02',
      apprenant_id: apprenantB2B2.id,
      formation_id: formationStd.id,
      session_id: sessionOuverte.id,
      statut: 'PAYE',
      source_financement: 'B2B',
    }
  });

  // Dossier B2B — Apprenant 3 (Diallo Mariama) — Formation Standard EN_ATTENTE
  const dossierB2B3 = await prisma.dossier.upsert({
    where: { id: 'D-DEV-B2B-03' },
    update: {
      apprenant_id: apprenantB2B3.id,
      formation_id: formationStd.id,
      session_id: sessionOuverte.id,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'B2B',
    },
    create: {
      id: 'D-DEV-B2B-03',
      apprenant_id: apprenantB2B3.id,
      formation_id: formationStd.id,
      session_id: sessionOuverte.id,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'B2B',
    }
  });

  console.log('  ✅ 3 dossiers B2B créés (2 PAYE + 1 EN_ATTENTE_VERIFICATION)');

  // Paiements CONFIRME pour les dossiers B2B PAYE
  // Formation STD : cout_catalogue = 100 000 XOF = 10 000 000 centimes
  await prisma.paiement.upsert({
    where: { dossier_id: 'D-DEV-B2B-01' },
    update: {
      montant_catalogue: 10000000,
      montant_final: 10000000,
      methode: 'VOUCHER_ORG',
      statut: 'CONFIRME',
      transaction_id: 'TXN-DEV-B2B-01',
      tentatives: 1,
      reduction_appliquee: 0,
      confirmed_at: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      expires_at: new Date(Date.now() + 360 * 24 * 3600 * 1000),
    },
    create: {
      dossier_id: 'D-DEV-B2B-01',
      montant_catalogue: 10000000,
      montant_final: 10000000,
      methode: 'VOUCHER_ORG',
      statut: 'CONFIRME',
      transaction_id: 'TXN-DEV-B2B-01',
      tentatives: 1,
      reduction_appliquee: 0,
      confirmed_at: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      expires_at: new Date(Date.now() + 360 * 24 * 3600 * 1000),
    }
  });

  await prisma.paiement.upsert({
    where: { dossier_id: 'D-DEV-B2B-02' },
    update: {
      montant_catalogue: 10000000,
      montant_final: 10000000,
      methode: 'VOUCHER_ORG',
      statut: 'CONFIRME',
      transaction_id: 'TXN-DEV-B2B-02',
      tentatives: 1,
      reduction_appliquee: 0,
      confirmed_at: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      expires_at: new Date(Date.now() + 363 * 24 * 3600 * 1000),
    },
    create: {
      dossier_id: 'D-DEV-B2B-02',
      montant_catalogue: 10000000,
      montant_final: 10000000,
      methode: 'VOUCHER_ORG',
      statut: 'CONFIRME',
      transaction_id: 'TXN-DEV-B2B-02',
      tentatives: 1,
      reduction_appliquee: 0,
      confirmed_at: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      expires_at: new Date(Date.now() + 363 * 24 * 3600 * 1000),
    }
  });

  console.log('  ✅ 2 paiements B2B CONFIRME créés (budget engagé = 200 000 XOF)');

  // ── 15. Vouchers Organisation (dédiés à l'espace org) ──────────────────
  console.log('🎫 Création vouchers organisation dédiés...');

  await prisma.voucherApporteur.upsert({
    where: { code: 'ORG-VOUCHER-FORM-ACTIF-2026' },
    update: {},
    create: {
      code: 'ORG-VOUCHER-FORM-ACTIF-2026',
      organisation_id: organisation.id,
      formation_id: formationStd.id,
      type: 'PROMOTIONNEL',
      statut: 'ACTIF',
      quota_max: 15,
      quota_utilise: 2,
      date_expiration: new Date(Date.now() + 180 * 24 * 3600 * 1000),
    }
  });

  await prisma.voucherApporteur.upsert({
    where: { code: 'ORG-VOUCHER-FORM-REDUC-2026' },
    update: {},
    create: {
      code: 'ORG-VOUCHER-FORM-REDUC-2026',
      organisation_id: organisation.id,
      formation_id: formationDem.id,
      type: 'PROMOTIONNEL',
      statut: 'ACTIF',
      valeur: 20,
      type_valeur: 'POURCENTAGE',
      quota_max: 10,
      quota_utilise: 0,
      date_expiration: new Date(Date.now() + 90 * 24 * 3600 * 1000),
    }
  });

  console.log('  ✅ 2 vouchers organisation dédiés créés (ORG-VOUCHER-FORM-ACTIF + REDUC)');

  await prisma.abonnementRetail.deleteMany({
    where: { apprenant_id: apprenant.id }
  });

  console.log('\n✅ Seed DEV terminé !\n');
  console.log('┌──────────────────────────────────────────────────────────┐');
  console.log('│  COMPTES DEV — Mot de passe universel: Test@FORGES2026!   │');
  console.log('│                                                           │');
  console.log('│  admin@forges-dev.ci        → ADMIN                      │');
  console.log('│  responsable@forges-dev.ci  → RESPONSABLE                │');
  console.log('│  apprenant@forges-dev.ci    → APPRENANT                  │');
  console.log('│  org@forges-dev.ci          → ORGANISATION (PRO)         │');
  console.log('│  partenaire@forges-dev.ci   → PARTENAIRE                 │');
  console.log('│  apporteur@forges-dev.ci    → APPORTEUR                  │');
  console.log('│                                                           │');
  console.log('│  Apprenants B2B organisation:                             │');
  console.log('│  - b2b1@forges-dev.ci  (Ouédraogo Fatou  — Finance)      │');
  console.log('│  - b2b2@forges-dev.ci  (Coulibaly Ibrahim — RH)          │');
  console.log('│  - b2b3@forges-dev.ci  (Diallo Mariama   — Marketing)    │');
  console.log('│                                                           │');
  console.log('│  Organisation TechCorp Dev CI:                            │');
  console.log('│  - AbonnementOrg : PRO ACTIF (355j restants)             │');
  console.log('│  - AbonnementB2B : BUSINESS 3/50 actifs (500 000 XOF/an) │');
  console.log('│  - Dossiers B2B  : 2 PAYE + 1 EN_ATTENTE                 │');
  console.log('│  - Budget engagé : 200 000 XOF (2 paiements CONFIRME)    │');
  console.log('│  - Vouchers org  : 4 total (2 Newman + 2 dédiés org)     │');
  console.log('│                                                           │');
  console.log('│  Vouchers Newman:                                         │');
  console.log('│  - VOUCHER-TEST-ACTIF-2026      (quota 10, utilisé 0)    │');
  console.log('│  - VOUCHER-TEST-EPUISE-2026     (quota 5/5 épuisé)       │');
  console.log('│  - ORG-VOUCHER-FORM-ACTIF-2026  (quota 15, utilisé 2)    │');
  console.log('│  - ORG-VOUCHER-FORM-REDUC-2026  (quota 10, réduction 20%)│');
  console.log('└──────────────────────────────────────────────────────────┘');
}

main().catch(e => { console.error(e); process.exit(1); })
      .finally(() => prisma.$disconnect());
