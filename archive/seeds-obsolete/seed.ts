import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

const PASSWORD = 'Test@FORGES2026!';
const RESET = process.argv.includes('--reset');
const CHECK = process.argv.includes('--check');

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

type ApprenantSeed = {
  email: string;
  role: 'ADMIN' | 'RESPONSABLE' | 'APPRENANT';
  nom: string;
  prenoms: string;
  type_apprenant: 'PROFESSIONNEL' | 'APPRENANT';
  secteur_activite?: string | null;
  niveau_etude?: string | null;
};

async function seedApprenant(hashPassword: string, seed: ApprenantSeed) {
  return prisma.apprenant.upsert({
    where: { email: seed.email },
    update: {
      password_hash: hashPassword,
      nom: seed.nom,
      prenoms: seed.prenoms,
      role: seed.role,
      type_apprenant: seed.type_apprenant,
      secteur_activite: seed.secteur_activite ?? null,
      niveau_etude: seed.niveau_etude ?? null,
      pays_residence: 'CI',
      pays_nationalite: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      consentement_rgpd: true,
      consentement_timestamp: new Date(),
      consentement_version_cgu: '1.0',
    },
    create: {
      email: seed.email,
      password_hash: hashPassword,
      nom: seed.nom,
      prenoms: seed.prenoms,
      role: seed.role,
      type_apprenant: seed.type_apprenant,
      secteur_activite: seed.secteur_activite ?? null,
      niveau_etude: seed.niveau_etude ?? null,
      pays_residence: 'CI',
      pays_nationalite: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      consentement_rgpd: true,
      consentement_timestamp: new Date(),
      consentement_version_cgu: '1.0',
    },
  });
}

async function resetDatabase() {
  const tables = [
    'AuditLog',
    'CommissionApporteur',
    'CommissionPartenaire',
    'CommissionPartenaireAbonnement',
    'FeedbackFormation',
    'EnqueteCatalogue',
    'ConversationBot',
    'AccesFormationDemande',
    'Paiement',
    'Dossier',
    'AbonnementRetail',
    'AbonnementB2B',
    'AbonnementOrganisation',
    'ContratInstitutionnel',
    'FormationPartenaire',
    'Session',
    'Formation',
    'VoucherApporteur',
    'Apporteur',
    'Partenaire',
    'Organisation',
    'Apprenant',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
    } catch {
      // Ignore missing tables in environments that do not include the full audit/log schema.
    }
  }
}

async function main() {
  if (CHECK) {
    const counts = await Promise.all([
      prisma.apprenant.count(),
      prisma.organisation.count(),
      prisma.partenaire.count(),
      prisma.apporteur.count(),
      prisma.formation.count(),
      prisma.session.count(),
    ]);

    console.log(`Counts -> apprenants:${counts[0]} organisations:${counts[1]} partenaires:${counts[2]} apporteurs:${counts[3]} formations:${counts[4]} sessions:${counts[5]}`);
    return;
  }

  if (RESET) {
    console.log('🗑️  Reset de la base...');
    await resetDatabase();
    console.log('✅ Base vidée');
  }

  const passwordHash = await hash(PASSWORD, 12);

  console.log('🌱 Seed FORGES v4.8 - démarrage');

  const admin = await seedApprenant(passwordHash, {
    email: 'admin@forges.ci',
    role: 'ADMIN',
    nom: 'Admin',
    prenoms: 'Super',
    type_apprenant: 'PROFESSIONNEL',
    secteur_activite: 'Administration',
  });

  const responsable = await seedApprenant(passwordHash, {
    email: 'responsable@forges.ci',
    role: 'RESPONSABLE',
    nom: 'Responsable',
    prenoms: 'Formation',
    type_apprenant: 'PROFESSIONNEL',
    secteur_activite: 'Formation',
  });

  const apprenant = await seedApprenant(passwordHash, {
    email: 'apprenant@forges.ci',
    role: 'APPRENANT',
    nom: 'KONE',
    prenoms: 'Amadou',
    type_apprenant: 'APPRENANT',
    niveau_etude: 'Licence / Bac+3',
  });

  const organisation = await prisma.organisation.upsert({
    where: { email: 'org@forges.ci' },
    update: {
      password_hash: passwordHash,
      raison_sociale: 'TechCorp CI Seed',
      type: 'ENTREPRISE',
      sous_types: ['FORMATION', 'RH'],
      identifiant_legal: 'CI-RCCM-SEED-2026',
      contact_referent: 'Directeur RH Seed',
      pays: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      date_fin_essai: daysFromNow(30),
    },
    create: {
      email: 'org@forges.ci',
      password_hash: passwordHash,
      raison_sociale: 'TechCorp CI Seed',
      type: 'ENTREPRISE',
      sous_types: ['FORMATION', 'RH'],
      identifiant_legal: 'CI-RCCM-SEED-2026',
      contact_referent: 'Directeur RH Seed',
      pays: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      date_fin_essai: daysFromNow(30),
    },
  });

  const partenaire = await prisma.partenaire.upsert({
    where: { email_principal: 'partenaire@forges.ci' },
    update: {
      raison_sociale: 'Institut Tech Seed CI',
      type: 'UNIVERSITE',
      pays: 'CI',
      password_hash: passwordHash,
      commission_forges_pct: 20,
      statut: 'ACTIF',
      mode_inscription: 'INVITATION',
      responsable_designe_id: responsable.id,
    },
    create: {
      raison_sociale: 'Institut Tech Seed CI',
      type: 'UNIVERSITE',
      pays: 'CI',
      email_principal: 'partenaire@forges.ci',
      password_hash: passwordHash,
      commission_forges_pct: 20,
      statut: 'ACTIF',
      mode_inscription: 'INVITATION',
      responsable_designe_id: responsable.id,
    },
  });

  const apporteur = await prisma.apporteur.upsert({
    where: { email: 'apporteur@forges.ci' },
    update: {
      nom: 'Traore Mamadou Seed',
      type: 'INDIVIDU',
      telephone: '+22501020304',
      pays: 'CI',
      code_apporteur: 'APT-SEED-2026-001',
      taux_commission_pct: 5,
      statut: 'ACTIF',
    },
    create: {
      nom: 'Traore Mamadou Seed',
      type: 'INDIVIDU',
      email: 'apporteur@forges.ci',
      telephone: '+22501020304',
      pays: 'CI',
      code_apporteur: 'APT-SEED-2026-001',
      taux_commission_pct: 5,
      statut: 'ACTIF',
    },
  });

  const formationStd = await prisma.formation.upsert({
    where: { id: 'F-SEED-STD-01' },
    update: {
      intitule: 'Gestion de projet IT - Certification PMP',
      description_courte: 'Formation standard seed pour le catalogue et les abonnements.',
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
    },
    create: {
      id: 'F-SEED-STD-01',
      intitule: 'Gestion de projet IT - Certification PMP',
      description_courte: 'Formation standard seed pour le catalogue et les abonnements.',
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
    },
  });

  const formationPrem = await prisma.formation.upsert({
    where: { id: 'F-SEED-PREM-01' },
    update: {
      intitule: 'Cybersecurite avancée seed',
      description_courte: 'Formation premium seed pour validation et paiement.',
      duree_jours: 180,
      cout_catalogue: 1200000,
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
      id: 'F-SEED-PREM-01',
      intitule: 'Cybersecurite avancée seed',
      description_courte: 'Formation premium seed pour validation et paiement.',
      duree_jours: 180,
      cout_catalogue: 1200000,
      responsable_id: responsable.id,
      type_formation: 'PREMIUM',
      mode_formation: 'AVEC_SESSION',
      pilier_abonnement: 'B2B',
      inclus_abonnement: false,
      langues_disponibles: ['FR', 'EN'],
      certification_delivree: true,
      statut: 'ACTIVE',
    },
  });

  const formationDem = await prisma.formation.upsert({
    where: { id: 'F-SEED-DEM-01' },
    update: {
      intitule: 'Introduction a l' + "'Intelligence Artificielle",
      description_courte: "Découverte des concepts fondamentaux de l'IA et de ses usages métier.",
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
    },
    create: {
      id: 'F-SEED-DEM-01',
      intitule: 'Introduction a l' + "'Intelligence Artificielle",
      description_courte: "Découverte des concepts fondamentaux de l'IA et de ses usages métier.",
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
    },
  });

  const formationPartenaire = await prisma.formation.upsert({
    where: { id: 'F-SEED-PART-01' },
    update: {
      intitule: 'Pilotage de projets Data seed',
      description_courte: 'Formation partenaire seed pour validation responsable.',
      description_longue: 'Formation seedée pour la validation de formation partenaire.',
      duree_jours: 45,
      cout_catalogue: 6000000,
      responsable_id: responsable.id,
      type_formation: 'STANDARD',
      mode_formation: 'AVEC_SESSION',
      pilier_abonnement: 'RETAIL',
      inclus_abonnement: false,
      langues_disponibles: ['FR'],
      certification_delivree: false,
      statut: 'EN_ATTENTE_VALIDATION',
      partenaire_id: partenaire.id,
    },
    create: {
      id: 'F-SEED-PART-01',
      intitule: 'Pilotage de projets Data seed',
      description_courte: 'Formation partenaire seed pour validation responsable.',
      description_longue: 'Formation seedée pour la validation de formation partenaire.',
      duree_jours: 45,
      cout_catalogue: 6000000,
      responsable_id: responsable.id,
      type_formation: 'STANDARD',
      mode_formation: 'AVEC_SESSION',
      pilier_abonnement: 'RETAIL',
      inclus_abonnement: false,
      langues_disponibles: ['FR'],
      certification_delivree: false,
      statut: 'EN_ATTENTE_VALIDATION',
      partenaire_id: partenaire.id,
    },
  });

  const formationPartenaireDetail = await prisma.formationPartenaire.upsert({
    where: { formation_id: formationPartenaire.id },
    update: {
      partenaire_id: partenaire.id,
      responsable_validateur_id: responsable.id,
      prix_coutant_soumis: 6000000,
      statut_validation: 'EN_ATTENTE',
      version: 1,
      date_soumission: new Date(),
      date_validation: null,
      commentaire_responsable: null,
      corrections_suggeres: null,
      type_formation_assigne: 'STANDARD',
      pilier_abonnement_assigne: 'RETAIL',
      inclus_abonnement: false,
      duree_mois: 6,
    },
    create: {
      formation_id: formationPartenaire.id,
      partenaire_id: partenaire.id,
      responsable_validateur_id: responsable.id,
      prix_coutant_soumis: 6000000,
      statut_validation: 'EN_ATTENTE',
      version: 1,
      date_soumission: new Date(),
      type_formation_assigne: 'STANDARD',
      pilier_abonnement_assigne: 'RETAIL',
      inclus_abonnement: false,
      duree_mois: 6,
    },
  });

  const sessionOuverte = await prisma.session.upsert({
    where: { id: 'S-SEED-OPEN-01' },
    update: {
      formation_id: formationStd.id,
      date_ouverture: daysFromNow(-5),
      date_cloture: daysFromNow(25),
      date_debut: daysFromNow(30),
      date_fin: daysFromNow(120),
      capacite: 20,
      places_restantes: 18,
      statut: 'OUVERTE',
    },
    create: {
      id: 'S-SEED-OPEN-01',
      formation_id: formationStd.id,
      date_ouverture: daysFromNow(-5),
      date_cloture: daysFromNow(25),
      date_debut: daysFromNow(30),
      date_fin: daysFromNow(120),
      capacite: 20,
      places_restantes: 18,
      statut: 'OUVERTE',
    },
  });

  const sessionCloturee = await prisma.session.upsert({
    where: { id: 'S-SEED-CLOSED-01' },
    update: {
      formation_id: formationStd.id,
      date_ouverture: daysFromNow(-120),
      date_cloture: daysFromNow(-90),
      date_debut: daysFromNow(-85),
      date_fin: daysFromNow(-10),
      capacite: 20,
      places_restantes: 0,
      statut: 'CLOTUREE',
    },
    create: {
      id: 'S-SEED-CLOSED-01',
      formation_id: formationStd.id,
      date_ouverture: daysFromNow(-120),
      date_cloture: daysFromNow(-90),
      date_debut: daysFromNow(-85),
      date_fin: daysFromNow(-10),
      capacite: 20,
      places_restantes: 0,
      statut: 'CLOTUREE',
    },
  });

  const sessionPartenaire = await prisma.session.upsert({
    where: { id: 'S-SEED-PART-01' },
    update: {
      formation_id: formationPartenaire.id,
      date_ouverture: daysFromNow(-15),
      date_cloture: daysFromNow(10),
      date_debut: daysFromNow(20),
      date_fin: daysFromNow(60),
      capacite: 15,
      places_restantes: 14,
      statut: 'OUVERTE',
    },
    create: {
      id: 'S-SEED-PART-01',
      formation_id: formationPartenaire.id,
      date_ouverture: daysFromNow(-15),
      date_cloture: daysFromNow(10),
      date_debut: daysFromNow(20),
      date_fin: daysFromNow(60),
      capacite: 15,
      places_restantes: 14,
      statut: 'OUVERTE',
    },
  });

  const dossierPaye = await prisma.dossier.upsert({
    where: { id: 'D-SEED-PAYE-01' },
    update: {
      apprenant_id: apprenant.id,
      formation_id: formationStd.id,
      session_id: sessionCloturee.id,
      statut: 'PAYE',
      source_financement: 'RETAIL',
      type_fenetre: 'NORMAL',
      montant_remise: 0,
      voucher_code: null,
      code_apporteur: null,
    },
    create: {
      id: 'D-SEED-PAYE-01',
      apprenant_id: apprenant.id,
      formation_id: formationStd.id,
      session_id: sessionCloturee.id,
      statut: 'PAYE',
      source_financement: 'RETAIL',
      type_fenetre: 'NORMAL',
      montant_remise: 0,
    },
  });

  const dossierRetenu = await prisma.dossier.upsert({
    where: { id: 'D-SEED-RETENU-01' },
    update: {
      apprenant_id: apprenant.id,
      formation_id: formationPrem.id,
      session_id: sessionPartenaire.id,
      statut: 'RETENU',
      source_financement: 'RETAIL',
      type_fenetre: 'NORMAL',
      montant_remise: 0,
      code_apporteur: 'APT-SEED-2026-001',
    },
    create: {
      id: 'D-SEED-RETENU-01',
      apprenant_id: apprenant.id,
      formation_id: formationPrem.id,
      session_id: sessionPartenaire.id,
      statut: 'RETENU',
      source_financement: 'RETAIL',
      type_fenetre: 'NORMAL',
      montant_remise: 0,
      code_apporteur: 'APT-SEED-2026-001',
    },
  });

  const dossierAttente = await prisma.dossier.upsert({
    where: { id: 'D-SEED-ATTENTE-01' },
    update: {
      apprenant_id: apprenant.id,
      formation_id: formationDem.id,
      session_id: null,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'ABONNEMENT',
      type_fenetre: 'NORMAL',
      montant_remise: 0,
    },
    create: {
      id: 'D-SEED-ATTENTE-01',
      apprenant_id: apprenant.id,
      formation_id: formationDem.id,
      session_id: null,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'ABONNEMENT',
      type_fenetre: 'NORMAL',
      montant_remise: 0,
    },
  });

  const abonnementRetail = await prisma.abonnementRetail.upsert({
    where: { apprenant_id: apprenant.id },
    update: {
      offre: 'PREMIUM',
      statut: 'ACTIF',
      montant_mensuel: 2500000,
      methode_paiement: 'MOBILE_MONEY',
      date_debut: daysFromNow(-1),
      date_fin: daysFromNow(364),
      consentement_auto: true,
      consentement_timestamp: new Date(),
      renouvellement_auto: true,
      nb_formations_actives: 1,
    },
    create: {
      apprenant_id: apprenant.id,
      offre: 'PREMIUM',
      statut: 'ACTIF',
      montant_mensuel: 2500000,
      methode_paiement: 'MOBILE_MONEY',
      date_debut: daysFromNow(-1),
      date_fin: daysFromNow(364),
      consentement_auto: true,
      consentement_timestamp: new Date(),
      renouvellement_auto: true,
      nb_formations_actives: 1,
    },
  });

  const accesDemande = await prisma.accesFormationDemande.upsert({
    where: { id: 'AFD-SEED-01' },
    update: {
      apprenant_id: apprenant.id,
      formation_id: formationDem.id,
      source_financement: 'ABONNEMENT',
      statut: 'ACTIF',
      date_activation: new Date(),
      date_expiration: daysFromNow(365),
      progression: 35,
      last_access_at: new Date(),
    },
    create: {
      id: 'AFD-SEED-01',
      apprenant_id: apprenant.id,
      formation_id: formationDem.id,
      source_financement: 'ABONNEMENT',
      statut: 'ACTIF',
      date_activation: new Date(),
      date_expiration: daysFromNow(365),
      progression: 35,
      last_access_at: new Date(),
    },
  });

  const abonnementOrg = await prisma.abonnementOrganisation.upsert({
    where: { organisation_id: organisation.id },
    update: {
      offre: 'PRO',
      statut: 'ACTIF',
      montant_annuel: 15000000,
      perimetre_fonctionnel: ['gestion_apprenants', 'vouchers', 'reports'],
      date_debut: daysFromNow(-2),
      date_fin: daysFromNow(363),
      renouvellement_auto: true,
    },
    create: {
      organisation_id: organisation.id,
      offre: 'PRO',
      statut: 'ACTIF',
      montant_annuel: 15000000,
      perimetre_fonctionnel: ['gestion_apprenants', 'vouchers', 'reports'],
      date_debut: daysFromNow(-2),
      date_fin: daysFromNow(363),
      renouvellement_auto: true,
    },
  });

  const abonnementB2B = await prisma.abonnementB2B.upsert({
    where: { id: 'AB2B-SEED-01' },
    update: {
      organisation_id: organisation.id,
      palier: 'BUSINESS',
      nb_max: 50,
      nb_actifs: 5,
      date_debut: daysFromNow(-2),
      date_fin: daysFromNow(363),
      prix_annuel: 40000000,
      premium_inclus_par_an: 10,
      premium_consommes: 2,
      statut: 'ACTIF',
      compteur_premium_used: 2,
      descente_planifiee: false,
    },
    create: {
      id: 'AB2B-SEED-01',
      organisation_id: organisation.id,
      palier: 'BUSINESS',
      nb_max: 50,
      nb_actifs: 5,
      date_debut: daysFromNow(-2),
      date_fin: daysFromNow(363),
      prix_annuel: 40000000,
      premium_inclus_par_an: 10,
      premium_consommes: 2,
      statut: 'ACTIF',
      compteur_premium_used: 2,
      descente_planifiee: false,
    },
  });

  const contratInstitutionnel = await prisma.contratInstitutionnel.upsert({
    where: { numero_contrat: 'CI-SEED-2026-001' },
    update: {
      institution_nom: 'Ministère Seed',
      programme_id: 'PG-SEED-2026-001',
      bailleur: 'Bailleur Seed',
      date_debut: daysFromNow(-30),
      date_fin: daysFromNow(335),
      montant_saas_annuel: 50000000,
      fee_par_certifie: 25000,
      seuil_facturation_fees: 25000,
      cumul_fees_reportes: 0,
      statut: 'ACTIF',
      gestionnaires_ids: [responsable.id],
      avenants: [],
    },
    create: {
      numero_contrat: 'CI-SEED-2026-001',
      institution_nom: 'Ministère Seed',
      programme_id: 'PG-SEED-2026-001',
      bailleur: 'Bailleur Seed',
      date_debut: daysFromNow(-30),
      date_fin: daysFromNow(335),
      montant_saas_annuel: 50000000,
      fee_par_certifie: 25000,
      seuil_facturation_fees: 25000,
      cumul_fees_reportes: 0,
      statut: 'ACTIF',
      gestionnaires_ids: [responsable.id],
      avenants: [],
    },
  });

  const voucherOrg = await prisma.voucherApporteur.upsert({
    where: { code: 'VCH-ORG-SEED-01' },
    update: {
      organisation_id: organisation.id,
      formation_id: formationStd.id,
      type: 'PROMOTIONNEL',
      statut: 'ACTIF',
      quota_max: 10,
      quota_utilise: 2,
      date_expiration: daysFromNow(365),
      nb_utilisations: 2,
    },
    create: {
      code: 'VCH-ORG-SEED-01',
      organisation_id: organisation.id,
      formation_id: formationStd.id,
      type: 'PROMOTIONNEL',
      statut: 'ACTIF',
      quota_max: 10,
      quota_utilise: 2,
      date_expiration: daysFromNow(365),
      nb_utilisations: 2,
    },
  });

  const voucherApporteur = await prisma.voucherApporteur.upsert({
    where: { code: 'VCH-APP-SEED-01' },
    update: {
      apporteur_id: apporteur.id,
      formation_id: formationPrem.id,
      type: 'APPORT',
      statut: 'ACTIF',
      quota_max: 1,
      quota_utilise: 0,
      date_expiration: daysFromNow(365),
      nb_utilisations: 0,
    },
    create: {
      code: 'VCH-APP-SEED-01',
      apporteur_id: apporteur.id,
      formation_id: formationPrem.id,
      type: 'APPORT',
      statut: 'ACTIF',
      quota_max: 1,
      quota_utilise: 0,
      date_expiration: daysFromNow(365),
      nb_utilisations: 0,
    },
  });

  const paiement = await prisma.paiement.upsert({
    where: { dossier_id: dossierPaye.id },
    update: {
      montant_catalogue: 100000,
      montant_final: 100000,
      methode: 'MOBILE_MONEY',
      statut: 'CONFIRME',
      transaction_id: 'TXN-SEED-001',
      tentatives: 0,
      reduction_appliquee: 0,
      confirmed_at: new Date(),
      expires_at: daysFromNow(1),
      code_apporteur_id: voucherApporteur.id,
    },
    create: {
      dossier_id: dossierPaye.id,
      montant_catalogue: 100000,
      montant_final: 100000,
      methode: 'MOBILE_MONEY',
      statut: 'CONFIRME',
      transaction_id: 'TXN-SEED-001',
      tentatives: 0,
      reduction_appliquee: 0,
      confirmed_at: new Date(),
      expires_at: daysFromNow(1),
      code_apporteur_id: voucherApporteur.id,
    },
  });

  const commissionApporteur = await prisma.commissionApporteur.upsert({
    where: { paiement_id: paiement.id },
    update: {
      apporteur_id: apporteur.id,
      dossier_id: dossierPaye.id,
      montant_base: 100000,
      montant_base_xof: 100000,
      taux_commission_pct: 5,
      montant_commission: 5000,
      montant_commission_xof: 5000,
      statut: 'VALIDEE',
      date_generation: new Date(),
    },
    create: {
      apporteur_id: apporteur.id,
      paiement_id: paiement.id,
      dossier_id: dossierPaye.id,
      montant_base: 100000,
      montant_base_xof: 100000,
      taux_commission_pct: 5,
      montant_commission: 5000,
      montant_commission_xof: 5000,
      statut: 'VALIDEE',
      date_generation: new Date(),
    },
  });

  const commissionPartenaire = await prisma.commissionPartenaire.upsert({
    where: { paiement_id: paiement.id },
    update: {
      partenaire_id: partenaire.id,
      formation_id: formationPartenaire.id,
      montant_catalogue: 100000,
      commission_forges_pct: 20,
      montant_reverse: 20000,
      statut: 'EN_ATTENTE',
    },
    create: {
      paiement_id: paiement.id,
      partenaire_id: partenaire.id,
      formation_id: formationPartenaire.id,
      montant_catalogue: 100000,
      commission_forges_pct: 20,
      montant_reverse: 20000,
      statut: 'EN_ATTENTE',
    },
  });

  const conversationBot = await prisma.conversationBot.upsert({
    where: { id: 'CONV-SEED-01' },
    update: {
      apprenant_id: apprenant.id,
      type_utilisateur: 'APPRENANT',
      flux_actif: 'ORIENTATION',
      statut: 'ACTIVE',
      historique: [],
      langue: 'FR',
    },
    create: {
      id: 'CONV-SEED-01',
      apprenant_id: apprenant.id,
      type_utilisateur: 'APPRENANT',
      flux_actif: 'ORIENTATION',
      statut: 'ACTIVE',
      historique: [],
      langue: 'FR',
    },
  });

  console.log('  ✅ Comptes seedés: admin, responsable, apprenant, organisation, partenaire, apporteur');
  console.log('  ✅ Formations seedées: standard, premium, a la demande, partenaire');
  console.log('  ✅ Sessions seedées: ouverte, cloturee, partenaire');
  console.log('  ✅ Dossiers seedés: paye, retenu, attente');
  console.log('  ✅ Vouchers seedés: organisation, apporteur');
  console.log('  ✅ Abonnements seedés: retail, b2b, organisation');
  console.log('  ✅ Commissions seedées: apporteur, partenaire');
  console.log('  ✅ Contrat institutionnel, accès formation demandée et conversation bot seedés');
  console.log(`  ✅ Admin: ${admin.email}`);
  console.log(`  ✅ Responsable: ${responsable.email}`);
  console.log(`  ✅ Apprenant: ${apprenant.email}`);
  console.log(`  ✅ Organisation: ${organisation.email}`);
  console.log(`  ✅ Partenaire: ${partenaire.email_principal}`);
  console.log(`  ✅ Apporteur: ${apporteur.email}`);
  console.log(`  ✅ Voucher apporteur: ${voucherApporteur.code}`);
  console.log(`  ✅ Voucher organisation: ${voucherOrg.code}`);
  console.log(`  ✅ Progression accès formation: ${accesDemande.progression}%`);
  console.log(`  ✅ Commission apporteur: ${commissionApporteur.montant_commission_xof} FCFA`);
  console.log(`  ✅ Commission partenaire: ${commissionPartenaire.montant_reverse} FCFA`);
  console.log('Seed terminé');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
