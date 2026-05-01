/**
 * FORGES — seed_for_test.js
 * Données de test pour le Plan de Validation v1.1 (Specs v4.8)
 * Schéma de référence : CONCEPTION v1.3 section 15 (Prisma v2)
 *
 * Usage :
 *   node seed_for_test.js           → seed normal
 *   node seed_for_test.js --reset   → supprime tout puis seed
 *   node seed_for_test.js --check   → vérifie sans modifier
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const RESET = args.includes('--reset');
const CHECK = args.includes('--check');
const ENV_TARGET = args.find((arg) => arg.startsWith('--env-'))?.replace('--env-', '') || process.env.NODE_ENV || 'local';
const BCRYPT_COST = 12;
const PWD_HASH = bcrypt.hashSync('Test@FORGES2026!', BCRYPT_COST);

// ── IDs fixes pour traçabilité des tests ─────────────────────
const IDS = {
  // Utilisateurs (rôles internes) - modèles séparés dans le schéma
  admin:         'usr-admin-0001-0000-0000-000000000001',
  responsable:   'usr-resp-0001-0000-0000-000000000002', 
  superviseur:   'usr-sup-00001-0000-0000-000000000003',
  agent:         'usr-agent-0001-0000-0000-000000000004',
  gestionnaire:  'usr-gest-0001-0000-0000-000000000005',

  // Apprenants
  apprenant1:    'apr-00001-00000-0000-0000-000000000001',
  apprenant2:    'apr-00002-00000-0000-0000-000000000002',

  // Organisation
  org_techcorp:  'org-techcorp-000-0000-0000-000000000001',

  // Partenaire
  partenaire:    'prt-instittech-000-0000-000000000001',

  // Apporteur
  apporteur:     'apt-traore-0001-0000-0000-000000000001',

  // Formations
  f_std_01:      'frm-std-00001-0000-0000-000000000001',
  f_prem_01:     'frm-prem-0001-0000-0000-000000000002',
  f_dem_01:      'frm-dem-00001-0000-0000-000000000003',
  f_part_01:     'frm-part-0001-0000-0000-000000000004',
  f_arch_01:     'frm-arch-0001-0000-0000-000000000005',

  // Sessions
  s_open_01:     'ses-open-00001-0000-0000-000000000001',
  s_prem_01:     'ses-prem-00001-0000-0000-000000000002',
  s_closed_01:   'ses-clos-00001-0000-0000-000000000003',
  s_future_01:   'ses-fut-000001-0000-0000-000000000004',

  // Dossiers
  d_attente_01:  'dos-att-000001-0000-0000-000000000001',
  d_retenu_01:   'dos-ret-000001-0000-0000-000000000002',
  d_paye_01:     'dos-pay-000001-0000-0000-000000000003',
  d_retenu_exp:  'dos-exp-000001-0000-0000-000000000004',

  // Vouchers
  vch_org_01:    'vch-org-000001-0000-0000-000000000001',
  vch_promo_01:  'vch-pro-000001-0000-0000-000000000002',
  vch_epuise:    'vch-epu-000001-0000-0000-000000000003',

  // Abonnements
  abo_ret_01:    'abo-ret-000001-0000-0000-000000000001',
  abo_b2b_01:    'abo-b2b-000001-0000-0000-000000000002',
  abo_org_01:    'abo-org-000001-0000-0000-000000000003',

  // Apporteur — VoucherApporteur
  vch_apt_01:    'vch-apt-000001-0000-0000-000000000001',

  // Contrat institutionnel
  contrat_inst:  'ctr-inst-00001-0000-0000-000000000001',

  // FormationPartenaire
  fp_part_01:    'fpa-part-00001-0000-0000-000000000001',
};

// ── Helpers date ──────────────────────────────────────────────
const now    = () => new Date();
const inH    = (h) => new Date(Date.now() + h * 3600_000);
const agoH   = (h) => new Date(Date.now() - h * 3600_000);
const inD    = (d) => new Date(Date.now() + d * 86_400_000);
const agoD   = (d) => new Date(Date.now() - d * 86_400_000);

// ── Mode CHECK ────────────────────────────────────────────────
async function check() {
  console.log('\n🔍 Vérification des données seed...\n');
  const checks = [
    { label: 'Apprenants', model: 'apprenant',
      count: await prisma.apprenant.count() },
    { label: 'Organisations', model: 'organisation',
      count: await prisma.organisation.count() },
    { label: 'Partenaires', model: 'partenaire',
      count: await prisma.partenaire.count() },
    { label: 'Formations', model: 'formation',
      count: await prisma.formation.count() },
    { label: 'Sessions', model: 'session',
      count: await prisma.session.count() },
    { label: 'Dossiers', model: 'dossier',
      count: await prisma.dossier.count() },
    { label: 'VoucherOrganisations', model: 'voucherOrganisation',
      count: await prisma.voucherOrganisation.count() },
    { label: 'AbonnementsRetail', model: 'abonnementRetail',
      count: await prisma.abonnementRetail.count() },
    { label: 'AbonnementsB2B', model: 'abonnementB2B',
      count: await prisma.abonnementB2B.count() },
    { label: 'Apporteurs', model: 'apporteur',
      count: await prisma.apporteur.count() },
    { label: 'ContratInstitutionnel', model: 'contratInstitutionnel',
      count: await prisma.contratInstitutionnel.count() },
  ];

  const expected = {
    apprenant: 2, organisation: 1, partenaire: 1,
    formation: 5, session: 4, dossier: 6, voucherOrganisation: 3,
    abonnementRetail: 1, abonnementB2B: 1, apporteur: 1,
    contratInstitutionnel: 1,
  };

  let ok = true;
  for (const c of checks) {
    const exp = expected[c.model];
    const status = c.count === exp ? '✅' : '⚠️ ';
    console.log(`  ${status} ${c.label}: ${c.count}/${exp}`);
    if (c.count !== exp) ok = false;
  }

  // Vérifications ciblées
  const dRetenuExp = await prisma.dossier.findUnique({
    where: { id: IDS.d_retenu_exp }
  });
  if (dRetenuExp) {
    const expired = dRetenuExp.expires_at < new Date();
    console.log(`  ${expired ? '✅' : '⚠️ '} D-RETENU-EXP expiré: ${expired}`);
  }

  const aboRet = await prisma.abonnementRetail.findUnique({
    where: { id: IDS.abo_ret_01 }
  });
  if (aboRet) {
    console.log(`  ${aboRet.statut === 'ACTIF' ? '✅' : '⚠️ '} ABO-RET-01 statut: ${aboRet.statut}`);
  }

  console.log(ok ? '\n✅ Seed cohérent\n' : '\n⚠️  Incohérences détectées — relancer avec --reset\n');
}

// ── Mode RESET ────────────────────────────────────────────────
async function reset() {
  console.log('🗑️  Suppression des données de test...');
  // Ordre inverse des dépendances
  await prisma.commissionApporteur.deleteMany();
  await prisma.voucherApporteur.deleteMany();
  await prisma.apporteur.deleteMany();
  await prisma.paiement.deleteMany();
  await prisma.dossier.deleteMany();
  await prisma.accesFormationDemande.deleteMany();
  await prisma.voucherOrganisation.deleteMany();
  await prisma.formationPartenaire.deleteMany();
  await prisma.session.deleteMany();
  await prisma.formation.deleteMany();
  await prisma.abonnementB2B.deleteMany();
  await prisma.abonnementOrganisation.deleteMany();
  await prisma.abonnementRetail.deleteMany();
  await prisma.contratInstitutionnel.deleteMany();
  await prisma.organisation.deleteMany();
  await prisma.partenaire.deleteMany();
  await prisma.apprenant.deleteMany();
  console.log('✅ Tables vidées\n');
}

// ── SEED PRINCIPAL ────────────────────────────────────────────
async function seed() {
  console.log('🌱 Création des données de test v4.8...\n');

  // ── 1. APPRENANTS ─────────────────────────────────────────
  console.log('  1/11 Apprenants...');
  await prisma.apprenant.createMany({ skipDuplicates: true, data: [
    {
      id: IDS.apprenant1, nom: 'KOUASSI', prenoms: 'Jean-Baptiste',
      email: 'apprenant1@forges-test.ci', password_hash: PWD_HASH,
      type_apprenant: 'PROFESSIONNEL', secteur_activite: 'Informatique',
      langue_preferee: 'FR', pays_residence: 'CI', pays_nationalite: 'CI',
      role: 'APPRENANT', statut: 'ACTIF', consentement_rgpd: true,
      consentement_timestamp: agoD(10), consentement_version_cgu: 'v1.0',
    },
    {
      id: IDS.apprenant2, nom: 'DIALLO', prenoms: 'Fatima',
      email: 'apprenant2@forges-test.ci', password_hash: PWD_HASH,
      type_apprenant: 'PROFESSIONNEL', secteur_activite: 'Finance',
      langue_preferee: 'FR', pays_residence: 'CI', pays_nationalite: 'GN',
      role: 'APPRENANT', statut: 'ACTIF', consentement_rgpd: true,
      consentement_timestamp: agoD(5), consentement_version_cgu: 'v1.0',
    },
  ]});

  // ── 2. ORGANISATION ─────────────────────────────────────────
  console.log('  2/11 Organisation TechCorp CI...');

  await prisma.organisation.create({ data: {
    id: IDS.org_techcorp,
    raison_sociale: 'TechCorp CI',
    type: 'ENTREPRISE',
    sous_types: [],
    identifiant_legal: 'CI-RCCM-TEST-2026-001',
    contact_referent: 'Directeur RH Test',
    email: 'org@forges-test.ci',
    password_hash: PWD_HASH,
    pays: 'CI',
    langue_preferee: 'FR',
    statut: 'ACTIF',
    date_fin_essai: agoD(1),
  }});

  // ── 3. ABONNEMENTS ───────────────────────────────────────────
  console.log('  3/11 Abonnements...');

  await prisma.abonnementOrganisation.create({ data: {
    id: IDS.abo_org_01,
    organisation_id: IDS.org_techcorp,
    statut: 'ACTIF',
    offre: 'PRO',
    montant_annuel: 150000,
    date_debut: agoD(30),
    date_fin: inD(335),
    renouvellement_auto: true,
  }});

  await prisma.abonnementB2B.create({ data: {
    id: IDS.abo_b2b_01,
    organisation_id: IDS.org_techcorp,
    palier: 'STARTER',
    nb_max: 20,
    nb_actifs: 5,
    prix_annuel: 500000,
    date_debut: agoD(30),
    date_fin: inD(335),
    statut: 'ACTIF',
    premium_inclus_par_an: 0,
  }});

  // Mettre à jour l'organisation avec ses abonnements
  await prisma.organisation.update({
    where: { id: IDS.org_techcorp },
    data: { 
      abonnement_org_id: IDS.abo_org_01,
      abonnement_b2b_id: IDS.abo_b2b_01,
    },
  });

  // ── 4. PARTENAIRE ─────────────────────────────────────────
  console.log('  4/11 Partenaire Institut Tech Test CI...');
  await prisma.partenaire.create({ data: {
    id: IDS.partenaire,
    raison_sociale: 'Institut Tech Test CI',
    type: 'ORGANISME',
    pays: 'CI',
    email_principal: 'partenaire@forges-test.ci',
    password_hash: PWD_HASH,
    commission_forges_pct: 30,
    statut: 'ACTIF',
    mode_inscription: 'INVITATION_ADMIN',
    responsable_designe_id: IDS.responsable,
  }});

  // ── 5. FORMATIONS ─────────────────────────────────────────
  console.log('  5/11 Formations...');
  await prisma.formation.createMany({ skipDuplicates: true, data: [
    {
      id: IDS.f_std_01,
      intitule: '[F-STD-01] Gestion de Projet IT',
      description_courte: 'Certification gestion de projet — méthodes agiles et classiques.',
      description_longue: '<p>Formation complète en gestion de projet IT.</p>',
      type_formation: 'STANDARD',
      mode_formation: 'AVEC_SESSION',
      statut: 'ACTIVE',
      cout_catalogue: 100000,
      duree_jours: 30,
      inclus_abonnement: true,
      pilier_abonnement: 'RETAIL',
      langues_disponibles: ['FR'],
      responsable_id: IDS.responsable,
    },
    {
      id: IDS.f_prem_01,
      intitule: '[F-PREM-01] Cybersécurité Avancée GWU',
      description_courte: 'Certification Premium GWU — Cybersécurité niveau expert.',
      description_longue: '<p>Formation Premium GWU/CCDL en cybersécurité.</p>',
      type_formation: 'PREMIUM',
      mode_formation: 'AVEC_SESSION',
      statut: 'ACTIVE',
      cout_catalogue: 2000000,
      duree_jours: 60,
      inclus_abonnement: false,
      pilier_abonnement: null,
      langues_disponibles: ['FR', 'EN'],
      responsable_id: IDS.responsable,
      partenaire_id: IDS.partenaire,
    },
    {
      id: IDS.f_dem_01,
      intitule: '[F-DEM-01] Introduction à l\'IA',
      description_courte: 'Formation à la demande — IA et Machine Learning.',
      description_longue: '<p>Accès 365 jours — vidéos + exercices.</p>',
      type_formation: 'STANDARD',
      mode_formation: 'A_LA_DEMANDE',
      statut: 'ACTIVE',
      cout_catalogue: 100000,
      duree_jours: 30,
      duree_acces_jours: 365,
      inclus_abonnement: true,
      pilier_abonnement: 'RETAIL',
      langues_disponibles: ['FR'],
      responsable_id: IDS.responsable,
    },
    {
      id: IDS.f_part_01,
      intitule: '[F-PART-01] DevSecOps CI/CD',
      description_courte: 'Formation partenaire en attente de validation.',
      description_longue: '<p>DevSecOps avec pipelines CI/CD.</p>',
      type_formation: 'STANDARD', // temporaire, sera assigné par FORGES lors UCS18 (RM-127)
      mode_formation: 'AVEC_SESSION',
      statut: 'EN_ATTENTE_VALIDATION',
      cout_catalogue: 100000, // obligatoire dans schéma
      duree_jours: 30,
      inclus_abonnement: false,
      langues_disponibles: ['FR'],
      responsable_id: IDS.responsable,
      partenaire_id: IDS.partenaire,
    },
    {
      id: IDS.f_arch_01,
      intitule: '[F-ARCH-01] Formation Archivée',
      description_courte: 'Formation archivée pour test RM-13.',
      description_longue: '<p>Archivée — irréversible (RM-13).</p>',
      type_formation: 'STANDARD',
      mode_formation: 'AVEC_SESSION',
      statut: 'ARCHIVEE',
      cout_catalogue: 50000,
      duree_jours: 10,
      inclus_abonnement: false,
      langues_disponibles: ['FR'],
      responsable_id: IDS.responsable,
    },
  ]});

  // ── FormationPartenaire pour F-PREM-01 et F-PART-01 ──────
  await prisma.formationPartenaire.createMany({ skipDuplicates: true, data: [
    {
      id: IDS.fp_part_01,
      formation_id: IDS.f_part_01,
      partenaire_id: IDS.partenaire,
      responsable_validateur_id: IDS.responsable,
      statut_validation: 'EN_ATTENTE',
      date_soumission: agoD(2),
      prix_coutant_soumis: 80000,
      prix_coutant_valide: null,
    },
    {
      id: uuidv4(),
      formation_id: IDS.f_prem_01,
      partenaire_id: IDS.partenaire,
      responsable_validateur_id: IDS.responsable,
      statut_validation: 'VALIDEE',
      date_soumission: agoD(30),
      date_validation: agoD(25),
      prix_coutant_soumis: 1400000,
      prix_coutant_valide: 1400000,
    },
  ]});

  // ── 5. SESSIONS ───────────────────────────────────────────
  console.log('  5/11 Sessions...');
  await prisma.session.createMany({ skipDuplicates: true, data: [
    {
      // S-OPEN-01 : ouverte, cap 5 — inscriptions actives
      id: IDS.s_open_01,
      formation_id: IDS.f_std_01,
      date_ouverture: agoD(5),
      date_cloture: inD(10),
      date_debut: inD(15),
      date_fin: inD(45),
      capacite: 5,
      nb_inscrits: 1,
      places_restantes: 4,
      statut: 'INSCRIPTIONS_OUVERTES',
    },
    {
      // S-PREM-01 : ouverte, cap 15
      id: IDS.s_prem_01,
      formation_id: IDS.f_prem_01,
      date_ouverture: agoD(3),
      date_cloture: inD(15),
      date_debut: inD(20),
      date_fin: inD(80),
      capacite: 15,
      nb_inscrits: 1,
      places_restantes: 14,
      statut: 'INSCRIPTIONS_OUVERTES',
    },
    {
      // S-CLOSED-01 : terminée — pour test attestation RM-26
      id: IDS.s_closed_01,
      formation_id: IDS.f_std_01,
      date_ouverture: agoD(120),
      date_cloture: agoD(90),
      date_debut: agoD(85),
      date_fin: agoD(55),
      capacite: 20,
      nb_inscrits: 15,
      places_restantes: 5,
      statut: 'CLOTUREE',
    },
    {
      // S-FUTURE-01 : planifiée — pour test scheduler RM-20
      id: IDS.s_future_01,
      formation_id: IDS.f_std_01,
      date_ouverture: inD(5),
      date_cloture: inD(20),
      date_debut: inD(25),
      date_fin: inD(55),
      capacite: 10,
      nb_inscrits: 0,
      places_restantes: 10,
      statut: 'PLANIFIEE',
    },
  ]});

  // ── 6. ABONNEMENT RETAIL apprenant1 ───────────────────────
  console.log('  6/11 AbonnementRetail...');
  await prisma.abonnementRetail.create({ data: {
    id: IDS.abo_ret_01,
    apprenant_id: IDS.apprenant1,
    offre: 'ESSENTIEL',
    statut: 'ACTIF',
    montant_mensuel: 15000,
    methode_paiement: 'MOBILE_MONEY',
    date_debut: agoD(15),
    date_fin: inD(15),
    renouvellement_auto: true,
    nb_formations_actives: 1,
    consentement_auto: true,
    consentement_timestamp: agoD(15),
    prorata_premier_mois: 15000,
  }});

  // Mettre à jour apprenant1 avec son abonnement
  await prisma.apprenant.update({
    where: { id: IDS.apprenant1 },
    data: { abonnement_retail: { connect: { id: IDS.abo_ret_01 } } },
  });

  // ── 7. VOUCHER ORGANISATIONS ──────────────────────────
  console.log('  7/11 VoucherOrganisations...');
  
  // Voucher pour l'organisation TechCorp
  await prisma.voucherOrganisation.create({ data: {
    id: IDS.vch_org_01,
    code: 'VCH-ORG-01',
    organisation_id: IDS.org_techcorp,
    formation_id: IDS.f_std_01,
    valeur: 100,
    type_valeur: 'POURCENTAGE',
    quota_max: 10,
    quota_utilise: 1,
    statut: 'ACTIF',
    date_expiration: inD(90),
  }});

  // Voucher promotionnel (lié à l'organisation TechCorp aussi)
  await prisma.voucherOrganisation.create({ data: {
    id: IDS.vch_promo_01,
    code: 'VCH-PROMO-01',
    organisation_id: IDS.org_techcorp, // obligatoire dans le schéma
    formation_id: IDS.f_std_01,
    valeur: 20,
    type_valeur: 'POURCENTAGE',
    quota_max: 50,
    quota_utilise: 5,
    statut: 'ACTIF',
    date_expiration: inD(60),
  }});

  // Voucher épuisé (lié à l'organisation TechCorp aussi)
  await prisma.voucherOrganisation.create({ data: {
    id: IDS.vch_epuise,
    code: 'VCH-EPUISE-01',
    organisation_id: IDS.org_techcorp, // obligatoire dans le schéma
    formation_id: IDS.f_std_01,
    valeur: 10,
    type_valeur: 'POURCENTAGE',
    quota_max: 5,
    quota_utilise: 5,  // épuisé (RM-40)
    statut: 'ACTIF',
    date_expiration: inD(30),
  }});

  // ── 8. DOSSIERS ───────────────────────────────────────────
  console.log('  8/11 Dossiers...');
  await prisma.dossier.createMany({ skipDuplicates: true, data: [
    {
      // D-ATTENTE-01 : EN_ATTENTE_VERIFICATION — apprenant1, F-PREM-01, source=RETAIL
      id: IDS.d_attente_01,
      apprenant_id: IDS.apprenant1,
      formation_id: IDS.f_prem_01,
      session_id: IDS.s_prem_01,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
      created_at: agoH(2),
      updated_at: agoH(2),
    },
    {
      // D-RETENU-01 : RETENU, expire dans 60h — apprenant2
      id: IDS.d_retenu_01,
      apprenant_id: IDS.apprenant2,
      formation_id: IDS.f_prem_01,
      session_id: IDS.s_prem_01,
      statut: 'RETENU',
      source_financement: 'RETAIL',
      expires_at: inH(60),
      created_at: agoH(12),
      updated_at: agoH(12),
    },
    {
      // D-PAYE-01 : PAYE — apprenant1, session S-CLOSED-01 (attestation disponible RM-26)
      id: IDS.d_paye_01,
      apprenant_id: IDS.apprenant1,
      formation_id: IDS.f_std_01,
      session_id: IDS.s_closed_01,
      statut: 'PAYE',
      source_financement: 'RETAIL',
      created_at: agoD(90),
      updated_at: agoD(90),
    },
    {
      // D-RETENU-EXP : RETENU expiré — pour test scheduler RM-07
      id: IDS.d_retenu_exp,
      apprenant_id: IDS.apprenant2,
      formation_id: IDS.f_std_01,
      session_id: IDS.s_open_01,
      statut: 'RETENU',
      source_financement: 'RETAIL',
      expires_at: agoH(2),   // déjà expiré
      created_at: agoH(74),
      updated_at: agoH(74),
    },
  ]});

  // ── 9. PAIEMENT pour D-PAYE-01 ───────────────────────────
  console.log('  9/11 Paiement...');
  await prisma.paiement.create({ data: {
    id: uuidv4(),
    dossier_id: IDS.d_paye_01,
    montant_catalogue: 100000,
    montant_final: 100000,
    methode: 'MOBILE_MONEY',
    statut: 'CONFIRME',
    transaction_id: 'TXN-TEST-2026-001',
    commission_partenaire_pct: null,
    montant_reverse_partenaire: null,
    confirmed_at: agoD(90),
    created_at: agoD(90),
  }});

  // ── 10. APPORTEUR + VOUCHERAPPORTEUR ──────────────────────
  console.log('  10/11 Apporteur TRAORE Mamadou...');
  await prisma.apporteur.create({ data: {
    id: IDS.apporteur,
    nom: 'TRAORE Mamadou', // combiné car pas de champ prenoms
    type: 'INDIVIDU',
    email: 'apporteur@forges-test.ci',
    password_hash: PWD_HASH,
    telephone: '+22507000003',
    pays: 'CI',
    code_apporteur: 'APT-01-' + IDS.apporteur.slice(-8),
    taux_commission_pct: 5,
    statut: 'ACTIF',
    cumul_commissions_dues: 4500,
    cumul_commissions_versees: 0,
    date_inscription: agoD(60),
  }});

  // VoucherApporteur (code = code_apporteur — RM-142)
  await prisma.voucherApporteur.create({ data: {
    id: IDS.vch_apt_01,
    apporteur_id: IDS.apporteur,
    code: 'APT-01-' + IDS.apporteur.slice(-8),
    statut: 'ACTIF',
    nb_utilisations: 3,
    date_derniere_utilisation: agoD(5),
  }});

  // Créer des dossiers et paiements fictifs pour les commissions
  const dossierComm1Id = uuidv4();
  const dossierComm2Id = uuidv4();
  const paiement1Id = uuidv4();
  const paiement2Id = uuidv4();
  
  // Dossiers fictifs pour les commissions
  await prisma.dossier.createMany({ data: [
    {
      id: dossierComm1Id,
      apprenant_id: IDS.apprenant2,
      formation_id: IDS.f_std_01,
      session_id: IDS.s_open_01,
      statut: 'PAYE',
      source_financement: 'RETAIL',
      created_at: agoD(20),
      updated_at: agoD(20),
    },
    {
      id: dossierComm2Id,
      apprenant_id: IDS.apprenant2,
      formation_id: IDS.f_std_01,
      session_id: IDS.s_open_01,
      statut: 'PAYE',
      source_financement: 'RETAIL',
      created_at: agoD(15),
      updated_at: agoD(15),
    },
  ]});
  
  // Paiements pour les commissions (liés au voucher apporteur)
  await prisma.paiement.createMany({ data: [
    {
      id: paiement1Id,
      dossier_id: dossierComm1Id,
      montant_catalogue: 40000,
      montant_final: 40000,
      methode: 'MOBILE_MONEY',
      statut: 'CONFIRME',
      transaction_id: 'TXN-COMM-1',
      code_apporteur_id: IDS.vch_apt_01, // lien vers le voucher apporteur
      confirmed_at: agoD(20),
      created_at: agoD(20),
    },
    {
      id: paiement2Id,
      dossier_id: dossierComm2Id,
      montant_catalogue: 50000,
      montant_final: 50000,
      methode: 'MOBILE_MONEY',
      statut: 'CONFIRME',
      transaction_id: 'TXN-COMM-2',
      code_apporteur_id: IDS.vch_apt_01, // lien vers le voucher apporteur
      confirmed_at: agoD(15),
      created_at: agoD(15),
    },
  ]});

  // CommissionsApporteur EN_ATTENTE (cumul 4500 XOF < seuil 5000 — pour test RM-147)
  const moisCourant = new Date().toISOString().slice(0, 7); // AAAA-MM
  await prisma.commissionApporteur.createMany({ data: [
    {
      id: uuidv4(), 
      apporteur_id: IDS.apporteur,
      paiement_id: paiement1Id,
      montant_base_xof: 40000, 
      taux_commission_pct: 5, 
      montant_commission_xof: 2000,
      date_generation: agoD(20), 
      mois_facturation: moisCourant,
      statut: 'EN_ATTENTE', 
      created_at: agoD(20),
    },
    // Deux autres commissions en attente — cumul total 4500 XOF (< 5000 seuil)
    {
      id: uuidv4(), 
      apporteur_id: IDS.apporteur,
      paiement_id: paiement2Id,
      montant_base_xof: 50000, 
      taux_commission_pct: 5, 
      montant_commission_xof: 2500,
      date_generation: agoD(15), 
      mois_facturation: moisCourant,
      statut: 'EN_ATTENTE', 
      created_at: agoD(15),
    },
  ]});

  // ── 11. CONTRAT INSTITUTIONNEL ────────────────────────────
  console.log('  11/11 ContratInstitutionnel...');
  await prisma.contratInstitutionnel.create({ data: {
    id: IDS.contrat_inst,
    numero_contrat: 'INST-2026-001',
    programme_id: 'PROG-2026-001',
    institution_nom: 'Ministère du Numérique CI',
    bailleur: 'État de Côte d\'Ivoire',
    gestionnaires_ids: [IDS.gestionnaire],
    date_debut: agoD(60),
    date_fin: inD(305),
    montant_saas_annuel: 2000000,
    fee_par_certifie: 20000,
    seuil_facturation_fees: 25000,
    statut: 'ACTIF',
  }});

  // ── AccèsFormationDemande pour apprenant1 sur F-DEM-01 ───
  await prisma.accesFormationDemande.create({ data: {
    id: uuidv4(),
    apprenant_id: IDS.apprenant1,
    formation_id: IDS.f_dem_01,
    source_financement: 'ABONNEMENT',
    date_activation: agoD(10),
    date_expiration: inD(355),
    statut: 'ACTIF',
    progression: 0,
  }});

  console.log('\n✅ Seed v4.8 terminé\n');
  console.log('  Comptes créés :');
  console.log('    apprenant1@forges-test.ci     — APPRENANT (KOUASSI Jean-Baptiste)');
  console.log('    apprenant2@forges-test.ci     — APPRENANT (DIALLO Fatima)');
  console.log('    org@forges-test.ci            — ORGANISATION (TechCorp CI)');
  console.log('    partenaire@forges-test.ci     — PARTENAIRE (Institut Tech Test CI)');
  console.log('    apporteur@forges-test.ci      — APPORTEUR (TRAORE Mamadou)');
  console.log('  Mot de passe : Test@FORGES2026!\n');
  console.log('  Données de référence :');
  console.log('    F-STD-01  F-PREM-01  F-DEM-01  F-PART-01  F-ARCH-01');
  console.log('    S-OPEN-01 (cap.5)  S-PREM-01 (cap.15)  S-CLOSED-01 (terminée)  S-FUTURE-01');
  console.log('    D-ATTENTE-01  D-RETENU-01 (60h)  D-PAYE-01  D-RETENU-EXP (expiré)');
  console.log('    VCH-ORG-01  VCH-PROMO-01 (-20%)  VCH-EPUISE-01');
  console.log('    ABO-RET-01 (Essentiel actif)  ABO-B2B-01 (Starter 5/20)');
  console.log('    APT-01 (taux 5%, cumul 4500 XOF < seuil 5000)');
  console.log('    INST-2026-001 (Ministère Numérique CI, fee 20 000 XOF/certifié)\n');
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  FORGES — Seed Validation v4.8');
  console.log('═══════════════════════════════════════');
  console.log(`Environnement cible : ${ENV_TARGET}`);

  if (CHECK) {
    await check();
    return;
  }

  if (RESET) {
    await reset();
  }

  await seed();

  if (!CHECK) {
    await check();
  }
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed :', e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
