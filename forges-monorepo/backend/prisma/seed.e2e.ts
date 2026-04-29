import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

const PASSWORD = 'Test@FORGES2026!';

const IDS = {
  admin: 'admin-e2e-01',
  responsable: 'responsable-e2e',
  superviseur: 'superviseur-e2e-01',
  agent: 'agent-e2e-01',
  apprenant: 'app-e2e-01',
  apprenantRm145: 'app-e2e-rm145-01',
  apprenantStd: 'app-e2e-std-01',
  apprenantPremiumRetail: 'app-e2e-premium-retail-01',
  apprenantPremiumB2b: 'app-e2e-premium-b2b-01',
  apprenantDossier: 'app-e2e-dossier-01',
  apprenantAuth: 'app-e2e-auth-01',
  apprenantRetail: 'app-e2e-retail-01',
  apprenantGris: 'app-e2e-gris-01',
  apprenantException: 'app-e2e-exception-01',
  organisation: 'org-e2e-01',
  partenaire: 'part-e2e-01',
  partenaireInvite: 'part-e2e-invite-01',
  partenairePending: 'part-e2e-pending-01',
  apporteur: 'apt-e2e-rm145-01',
  formationStandard: 'F-E2E-STD-01',
  formationPremiumRetail: 'F-E2E-PREM-RETAIL-01',
  formationPremiumB2b: 'F-E2E-PREM-B2B-01',
  formationDemande: 'F-E2E-DEMANDE-01',
  formationPartenaire: 'F-E2E-PART-01',
  sessionStandard: 'S-E2E-STD-OPEN-01',
  sessionPremiumRetail: 'S-E2E-PREM-RETAIL-OPEN-01',
  sessionPremiumB2b: 'S-E2E-PREM-B2B-OPEN-01',
  sessionPartenaire: 'S-E2E-PART-OPEN-01',
  sessionDossier: 'S-E2E-DOSSIER-OPEN-01',
  sessionPlanifiee: 'S-E2E-PLANIFIEE-01',
  sessionAVenir: 'S-E2E-A-VENIR-01',
  sessionOuverte: 'S-E2E-OUVERTE-01',
  sessionEnCours: 'S-E2E-EN-COURS-01',
  sessionCloturee: 'S-E2E-CLOTUREE-01',
  sessionArchivable: 'S-E2E-ARCHIVABLE-01',
  dossierEnAttente: 'D-E2E-EN-ATTENTE-01',
  dossierRetenu: 'D-E2E-RETENU-01',
  dossierPaye: 'D-E2E-PAYE-01',
  dossierAnnule: 'D-E2E-ANNULE-01',
  dossierExpire: 'D-E2E-EXPIRE-01',
  dossierAnnulable: 'D-E2E-ANNULABLE-01',
  dossierGris: 'D-E2E-GRIS-01',
  dossierException: 'D-E2E-EXCEPTION-FENETRE-01',
  paiementPaye: 'P-E2E-PAYE-01',
  paiementExpire: 'P-E2E-EXPIRE-01',
  accesExpired: 'A-E2E-EXPIRED-01',
  formationPartenaireMeta: 'FP-E2E-01',
  voucher: 'V-E2E-ORG-01',
  expiredVoucher: 'V-E2E-ORG-EXPIRE-01',
};

const EMAILS = {
  admin: 'admin@forges.ci',
  responsable: 'responsable-e2e@forges.ci',
  superviseur: 'superviseur-e2e@forges.ci',
  agent: 'agent-e2e@forges.ci',
  apprenant: 'apprenant@forges.ci',
  apprenantRm145: 'apprenant-rm145@forges.ci',
  apprenantStd: 'apprenant-std-e2e@forges.ci',
  apprenantPremiumRetail: 'apprenant-premium-retail-e2e@forges.ci',
  apprenantPremiumB2b: 'apprenant-premium-b2b-e2e@forges.ci',
  apprenantDossier: 'apprenant-dossier-e2e@forges.ci',
  apprenantAuth: 'apprenant-auth-e2e@forges.ci',
  apprenantRetail: 'apprenant-retail-e2e@forges.ci',
  apprenantGris: 'apprenant-gris-e2e@forges.ci',
  apprenantException: 'apprenant-exception-e2e@forges.ci',
  organisation: 'org@forges.ci',
  partenaire: 'partenaire-e2e@forges.ci',
  partenaireInvite: 'partenaire-invite-e2e@forges.ci',
  partenairePending: 'partenaire-pending-e2e@forges.ci',
  apporteur: 'apporteur-e2e@forges.ci',
};

const CODES = {
  voucher: 'ORG-E2E-VOUCHER-01',
  expiredVoucher: 'ORG-E2E-VOUCHER-EXPIRE',
  apporteur: 'APT-E2E-RM145-001',
};

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function monthsFromNow(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
}

async function cleanupScenarioData() {
  const apprenantIds = [
    IDS.admin,
    IDS.responsable,
    IDS.superviseur,
    IDS.agent,
    IDS.apprenant,
    IDS.apprenantRm145,
    IDS.apprenantStd,
    IDS.apprenantPremiumRetail,
    IDS.apprenantPremiumB2b,
    IDS.apprenantDossier,
    IDS.apprenantAuth,
    IDS.apprenantRetail,
    IDS.apprenantGris,
    IDS.apprenantException,
    IDS.apporteur,
  ];
  const formationIds = [
    IDS.formationStandard,
    IDS.formationPremiumRetail,
    IDS.formationPremiumB2b,
    IDS.formationDemande,
    IDS.formationPartenaire,
  ];
  const partenaireIds = [IDS.partenaire, IDS.partenaireInvite, IDS.partenairePending];
  const sessionIds = [
    IDS.sessionStandard,
    IDS.sessionPremiumRetail,
    IDS.sessionPremiumB2b,
    IDS.sessionPartenaire,
    IDS.sessionDossier,
    IDS.sessionPlanifiee,
    IDS.sessionAVenir,
    IDS.sessionOuverte,
    IDS.sessionEnCours,
    IDS.sessionCloturee,
    IDS.sessionArchivable,
  ];
  const commissionDossierIds = Array.from({ length: 3 }, (_, index) => `D-E2E-COMM-${index + 1}`);
  const commissionPaiementIds = Array.from({ length: 3 }, (_, index) => `P-E2E-COMM-${index + 1}`);
  const transientDossierIds = (await prisma.dossier.findMany({
    where: {
      OR: [
        { apprenant_id: { startsWith: 'app-rm' } },
        { formation_id: { startsWith: 'F-RM' } },
      ],
    },
    select: { id: true },
  })).map((dossier) => dossier.id);

  await prisma.commissionApporteur.deleteMany({
    where: {
      OR: [
        { apporteur_id: IDS.apporteur },
        { dossier_id: { in: Object.values(IDS).filter((id) => id.startsWith('D-E2E-')) } },
        { dossier_id: { in: commissionDossierIds } },
        { dossier_id: { in: transientDossierIds } },
        { paiement: { dossier: { apprenant_id: { in: apprenantIds } } } },
        { paiement: { dossier: { apprenant_id: { startsWith: 'app-rm' } } } },
      ],
    },
  });
  await prisma.commissionPartenaire.deleteMany({
    where: {
      OR: [
        { partenaire_id: IDS.partenaire },
        { formation_id: { in: formationIds } },
        { paiement: { dossier: { apprenant_id: { in: apprenantIds } } } },
        { paiement: { dossier: { apprenant_id: { startsWith: 'app-rm' } } } },
      ],
    },
  });
  await prisma.commissionPartenaireAbonnement.deleteMany({
    where: {
      OR: [
        { partenaire_id: IDS.partenaire },
        { formation_id: IDS.formationPartenaireMeta },
      ],
    },
  });
  await prisma.paiement.deleteMany({
    where: {
      OR: [
        { id: { in: [IDS.paiementPaye, IDS.paiementExpire] } },
        { id: { in: commissionPaiementIds } },
        { dossier_id: { in: Object.values(IDS).filter((id) => id.startsWith('D-E2E-')) } },
        { dossier_id: { in: commissionDossierIds } },
        { dossier: { apprenant_id: { in: apprenantIds } } },
        { dossier: { apprenant_id: { startsWith: 'app-rm' } } },
      ],
    },
  });
  await prisma.dossier.deleteMany({
    where: {
      OR: [
        { id: { in: Object.values(IDS).filter((id) => id.startsWith('D-E2E-')) } },
        { id: { in: commissionDossierIds } },
        { apprenant_id: { in: apprenantIds } },
        { apprenant_id: { startsWith: 'app-rm' } },
        { session_id: { in: sessionIds } },
        { formation_id: { in: formationIds } },
        { formation_id: { startsWith: 'F-RM' } },
      ],
    },
  });
  await prisma.accesFormationDemande.deleteMany({
    where: {
      OR: [
        { apprenant_id: { in: apprenantIds } },
        { apprenant_id: { startsWith: 'app-rm' } },
        { formation_id: { in: formationIds } },
        { formation_id: { startsWith: 'F-RM' } },
      ],
    },
  });
  await prisma.voucherApporteur.deleteMany({
    where: {
      OR: [
        { id: { in: [IDS.voucher, IDS.expiredVoucher] } },
        { code: { in: [CODES.voucher, CODES.expiredVoucher] } },
        { code: { startsWith: 'PROMO-RM-' } },
        { apporteur_id: IDS.apporteur },
        { formation_id: { in: formationIds } },
        { formation_id: { startsWith: 'F-RM' } },
      ],
    },
  });
  await prisma.voucherOrganisation.deleteMany({
    where: {
      OR: [
        { code: { startsWith: 'ORG-VOUCHER-' } },
      ],
    },
  });
  await prisma.session.deleteMany({
    where: {
      OR: [
        { id: { in: sessionIds } },
        { formation_id: { in: formationIds } },
        { formation_id: { startsWith: 'F-RM' } },
      ],
    },
  });
  await prisma.formationPartenaire.deleteMany({
    where: {
      OR: [
        { id: IDS.formationPartenaireMeta },
        { formation_id: IDS.formationPartenaire },
        { partenaire_id: { in: partenaireIds } },
      ],
    },
  });
  await prisma.formation.deleteMany({
    where: {
      OR: [
        { id: { in: formationIds } },
        { id: { startsWith: 'F-RM' } },
        { partenaire_id: { in: partenaireIds } },
      ],
    },
  });
  await prisma.abonnementRetail.deleteMany({
    where: {
      OR: [
        { apprenant_id: { in: apprenantIds } },
        { apprenant_id: { startsWith: 'app-rm' } },
        { apprenant: { email: { contains: 'e2e-ucs' } } },
      ],
    },
  });
  await prisma.abonnementB2B.deleteMany({
    where: { OR: [{ organisation_id: IDS.organisation }, { organisation: { email: { contains: 'e2e-ucs' } } }] },
  });
  await prisma.abonnementOrganisation.deleteMany({
    where: { OR: [{ organisation_id: IDS.organisation }, { organisation: { email: { contains: 'e2e-ucs' } } }] },
  });
  await prisma.apprenant.deleteMany({
    where: { OR: [{ id: { in: apprenantIds } }, { id: { startsWith: 'app-rm' } }, { email: { contains: 'e2e-ucs' } }] },
  });
  await prisma.organisation.deleteMany({ where: { OR: [{ id: IDS.organisation }, { email: { contains: 'e2e-ucs' } }] } });
  await prisma.apporteur.deleteMany({ where: { OR: [{ id: IDS.apporteur }, { email: { contains: 'e2e-ucs' } }] } });
  await prisma.partenaire.deleteMany({
    where: { OR: [{ id: { in: partenaireIds } }, { email_principal: { contains: 'e2e-ucs' } }] },
  });
}

async function createApprenant(
  id: string,
  email: string,
  passwordHash: string,
  role = 'APPRENANT',
  extra: Record<string, unknown> = {},
) {
  const data = {
    id,
    email,
    password_hash: passwordHash,
    nom: role === 'APPRENANT' ? 'E2E' : role,
    prenoms: id,
    role: role as any,
    type_apprenant: role === 'APPRENANT' ? 'APPRENANT' : 'PROFESSIONNEL',
    niveau_etude: role === 'APPRENANT' ? 'Licence / Bac+3' : null,
    secteur_activite: role === 'APPRENANT' ? null : 'Administration',
    pays_residence: 'CI',
    pays_nationalite: 'CI',
    langue_preferee: 'FR',
    statut: 'ACTIF',
    consentement_rgpd: true,
    consentement_timestamp: new Date(),
    consentement_version_cgu: '1.0',
    ...extra,
  };
  return prisma.apprenant.upsert({
    where: { id },
    update: data,
    create: data,
  });
}

async function createFormation(data: {
  id: string;
  intitule: string;
  type_formation: string;
  mode_formation: string;
  cout_catalogue: number;
  pilier_abonnement?: string | null;
  inclus_abonnement?: boolean;
  partenaire_id?: string | null;
  prix_coutant?: number | null;
}) {
  const payload = {
    id: data.id,
    intitule: data.intitule,
    description_courte: `${data.intitule} - fixture E2E`,
    description_longue: `${data.intitule} utilisée pour la vague 2 E2E.`,
    duree_jours: 5,
    cout_catalogue: data.cout_catalogue,
    responsable_id: IDS.responsable,
    type_formation: data.type_formation,
    mode_formation: data.mode_formation,
    statut: 'ACTIVE',
    inclus_abonnement: data.inclus_abonnement ?? false,
    pilier_abonnement: data.pilier_abonnement ?? null,
    duree_acces_jours: 365,
    prix_coutant: data.prix_coutant ?? null,
    prerequis: 'Aucun prerequis',
    objectifs_pedagogiques: ['Valider le parcours E2E'],
    certification_delivree: true,
    public_cible: 'Apprenants',
    langues_disponibles: ['FR'],
    partenaire_id: data.partenaire_id ?? null,
  };
  return prisma.formation.upsert({
    where: { id: data.id },
    update: payload,
    create: payload,
  });
}

async function createSession(id: string, formation_id: string, statut: string, dates: Record<string, Date>) {
  const payload = {
    id,
    formation_id,
    date_ouverture: dates.date_ouverture,
    date_cloture: dates.date_cloture,
    date_debut: dates.date_debut,
    date_fin: dates.date_fin,
    capacite: 20,
    nb_inscrits: 0,
    places_restantes: 20,
    statut,
  };
  return prisma.session.upsert({
    where: { id },
    update: payload,
    create: payload,
  });
}

async function main() {
  const passwordHash = await hash(PASSWORD, 12);
  const now = new Date();

  await cleanupScenarioData();

  await createApprenant(IDS.admin, EMAILS.admin, passwordHash, 'ADMIN');
  await createApprenant(IDS.responsable, EMAILS.responsable, passwordHash, 'RESPONSABLE');
  await createApprenant(IDS.superviseur, EMAILS.superviseur, passwordHash, 'SUPERVISEUR');
  await createApprenant(IDS.agent, EMAILS.agent, passwordHash, 'AGENT');
  await createApprenant(IDS.apprenant, EMAILS.apprenant, passwordHash);
  await createApprenant(IDS.apprenantRm145, EMAILS.apprenantRm145, passwordHash);
  await createApprenant(IDS.apprenantStd, EMAILS.apprenantStd, passwordHash);
  await createApprenant(IDS.apprenantPremiumRetail, EMAILS.apprenantPremiumRetail, passwordHash);
  await createApprenant(IDS.apprenantPremiumB2b, EMAILS.apprenantPremiumB2b, passwordHash);
  await createApprenant(IDS.apprenantDossier, EMAILS.apprenantDossier, passwordHash);
  await createApprenant(IDS.apprenantGris, EMAILS.apprenantGris, passwordHash);
  await createApprenant(IDS.apprenantException, EMAILS.apprenantException, passwordHash);
  await createApprenant(IDS.apprenantAuth, EMAILS.apprenantAuth, passwordHash, 'APPRENANT', {
    token_confirmation: 'token-e2e-auth-01',
    token_expiration: daysFromNow(1),
    statut: 'INACTIF',
  });
  await createApprenant(IDS.apprenantRetail, EMAILS.apprenantRetail, passwordHash);

  await prisma.organisation.create({
    data: {
      id: IDS.organisation,
      email: EMAILS.organisation,
      raison_sociale: 'Organisation E2E FORGES',
      type: 'ENTREPRISE',
      sous_types: ['FORMATION'],
      identifiant_legal: 'CI-RCCM-E2E-2026',
      contact_referent: 'Responsable RH E2E',
      pays: 'CI',
      langue_preferee: 'FR',
      password_hash: passwordHash,
      statut: 'ACTIF',
      date_fin_essai: daysFromNow(30),
    },
  });

  const b2b = await prisma.abonnementB2B.create({
    data: {
      organisation_id: IDS.organisation,
      palier: 'STARTER',
      nb_max: 5,
      nb_actifs: 1,
      date_debut: daysFromNow(-10),
      date_fin: monthsFromNow(12),
      date_renouvellement: daysFromNow(1),
      prix_annuel: 12000000,
      premium_inclus_par_an: 0,
      statut: 'ACTIF',
    },
  });

  await prisma.organisation.update({
    where: { id: IDS.organisation },
    data: { abonnement_b2b_id: b2b.id },
  });

  const abonnementOrg = await prisma.abonnementOrganisation.create({
    data: {
      organisation_id: IDS.organisation,
      offre: 'BASIQUE',
      statut: 'ACTIF',
      montant_annuel: 50000,
      perimetre_fonctionnel: ['B2B'],
      date_debut: daysFromNow(-10),
      date_fin: monthsFromNow(12),
      renouvellement_auto: true,
    },
  });

  await prisma.organisation.update({
    where: { id: IDS.organisation },
    data: { abonnement_org_id: abonnementOrg.id },
  });

  await prisma.partenaire.create({
    data: {
      id: IDS.partenaire,
      raison_sociale: 'Partenaire E2E Actif',
      type: 'UNIVERSITE',
      pays: 'CI',
      email_principal: EMAILS.partenaire,
      password_hash: passwordHash,
      commission_forges_pct: 20,
      statut: 'ACTIF',
      mode_inscription: 'AUTO_INSCRIPTION',
      responsable_designe_id: IDS.responsable,
    },
  });
  await prisma.partenaire.create({
    data: {
      id: IDS.partenaireInvite,
      raison_sociale: 'Partenaire E2E Invite',
      type: 'UNIVERSITE',
      pays: 'CI',
      email_principal: EMAILS.partenaireInvite,
      password_hash: null,
      commission_forges_pct: 20,
      statut: 'INVITE',
      mode_inscription: 'INVITATION',
      token_invitation: 'token-partenaire-e2e',
      token_invitation_expiration: daysFromNow(2),
      responsable_designe_id: IDS.responsable,
    },
  });
  await prisma.partenaire.create({
    data: {
      id: IDS.partenairePending,
      raison_sociale: 'Partenaire E2E En Attente',
      type: 'UNIVERSITE',
      pays: 'CI',
      email_principal: EMAILS.partenairePending,
      password_hash: passwordHash,
      commission_forges_pct: 20,
      statut: 'EN_ATTENTE_VERIFICATION',
      mode_inscription: 'AUTO_INSCRIPTION',
      responsable_designe_id: IDS.responsable,
    },
  });

  await prisma.apporteur.create({
    data: {
      id: IDS.apporteur,
      nom: 'Apporteur E2E RM145',
      type: 'INDIVIDU',
      email: EMAILS.apporteur,
      password_hash: passwordHash,
      telephone: '+2250102030405',
      pays: 'CI',
      code_apporteur: CODES.apporteur,
      taux_commission_pct: 5,
      statut: 'ACTIF',
    },
  });
  await createApprenant(IDS.apporteur, EMAILS.apporteur, passwordHash, 'APPORTEUR');

  await createFormation({
    id: IDS.formationStandard,
    intitule: 'Formation standard E2E',
    type_formation: 'STANDARD',
    mode_formation: 'AVEC_SESSION',
    cout_catalogue: 150000,
    pilier_abonnement: 'RETAIL',
    inclus_abonnement: true,
  });
  await createFormation({
    id: IDS.formationPremiumRetail,
    intitule: 'Formation premium retail E2E',
    type_formation: 'PREMIUM',
    mode_formation: 'AVEC_SESSION',
    cout_catalogue: 250000,
    pilier_abonnement: 'RETAIL',
    inclus_abonnement: false,
  });
  await createFormation({
    id: IDS.formationPremiumB2b,
    intitule: 'Formation premium B2B E2E',
    type_formation: 'PREMIUM',
    mode_formation: 'AVEC_SESSION',
    cout_catalogue: 260000,
    pilier_abonnement: 'B2B',
    inclus_abonnement: false,
  });
  await createFormation({
    id: IDS.formationDemande,
    intitule: 'Formation demande E2E',
    type_formation: 'STANDARD',
    mode_formation: 'A_LA_DEMANDE',
    cout_catalogue: 90000,
    pilier_abonnement: 'RETAIL',
    inclus_abonnement: true,
  });
  await createFormation({
    id: IDS.formationPartenaire,
    intitule: 'Formation partenaire E2E',
    type_formation: 'STANDARD',
    mode_formation: 'AVEC_SESSION',
    cout_catalogue: 250000,
    pilier_abonnement: 'RETAIL',
    inclus_abonnement: true,
    partenaire_id: IDS.partenaire,
    prix_coutant: 200000,
  });
  await prisma.formationPartenaire.create({
    data: {
      id: IDS.formationPartenaireMeta,
      formation_id: IDS.formationPartenaire,
      partenaire_id: IDS.partenaire,
      responsable_validateur_id: IDS.responsable,
      statut_validation: 'EN_ATTENTE',
      prix_coutant_soumis: 200000,
      date_soumission: daysFromNow(-2),
    },
  });

  const openDates = {
    date_ouverture: daysFromNow(-2),
    date_cloture: daysFromNow(5),
    date_debut: daysFromNow(10),
    date_fin: daysFromNow(15),
  };
  await createSession(IDS.sessionStandard, IDS.formationStandard, 'INSCRIPTIONS_OUVERTES', openDates);
  await createSession(IDS.sessionPremiumRetail, IDS.formationPremiumRetail, 'INSCRIPTIONS_OUVERTES', openDates);
  await createSession(IDS.sessionPremiumB2b, IDS.formationPremiumB2b, 'INSCRIPTIONS_OUVERTES', openDates);
  await createSession(IDS.sessionPartenaire, IDS.formationPartenaire, 'INSCRIPTIONS_OUVERTES', openDates);
  await createSession(IDS.sessionDossier, IDS.formationPremiumRetail, 'INSCRIPTIONS_OUVERTES', openDates);
  await createSession(IDS.sessionPlanifiee, IDS.formationStandard, 'PLANIFIEE', {
    date_ouverture: daysFromNow(-1),
    date_cloture: daysFromNow(5),
    date_debut: daysFromNow(10),
    date_fin: daysFromNow(15),
  });
  await createSession(IDS.sessionAVenir, IDS.formationStandard, 'A_VENIR', {
    date_ouverture: daysFromNow(-3),
    date_cloture: daysFromNow(-1),
    date_debut: daysFromNow(2),
    date_fin: daysFromNow(5),
  });
  await createSession(IDS.sessionOuverte, IDS.formationStandard, 'INSCRIPTIONS_OUVERTES', {
    date_ouverture: daysFromNow(-10),
    date_cloture: daysFromNow(-5),
    date_debut: daysFromNow(-1),
    date_fin: daysFromNow(3),
  });
  await createSession(IDS.sessionEnCours, IDS.formationStandard, 'EN_COURS', {
    date_ouverture: daysFromNow(-20),
    date_cloture: daysFromNow(-15),
    date_debut: daysFromNow(-10),
    date_fin: daysFromNow(-1),
  });
  await createSession(IDS.sessionCloturee, IDS.formationStandard, 'CLOTUREE', {
    date_ouverture: daysFromNow(-30),
    date_cloture: daysFromNow(-25),
    date_debut: daysFromNow(-20),
    date_fin: daysFromNow(-10),
  });
  await createSession(IDS.sessionArchivable, IDS.formationStandard, 'CLOTUREE', {
    date_ouverture: daysFromNow(-120),
    date_cloture: daysFromNow(-115),
    date_debut: daysFromNow(-110),
    date_fin: daysFromNow(-100),
  });

  await prisma.dossier.create({
    data: {
      id: IDS.dossierEnAttente,
      apprenant_id: IDS.apprenantDossier,
      formation_id: IDS.formationPremiumRetail,
      session_id: IDS.sessionDossier,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
    },
  });
  await prisma.dossier.create({
    data: {
      id: IDS.dossierRetenu,
      apprenant_id: IDS.apprenantDossier,
      formation_id: IDS.formationPremiumRetail,
      session_id: IDS.sessionPremiumRetail,
      statut: 'RETENU',
      source_financement: 'RETAIL',
      expires_at: daysFromNow(3),
    },
  });
  await prisma.dossier.create({
    data: {
      id: IDS.dossierPaye,
      apprenant_id: IDS.apprenantDossier,
      formation_id: IDS.formationStandard,
      session_id: IDS.sessionCloturee,
      statut: 'PAYE',
      source_financement: 'RETAIL',
    },
  });
  await prisma.paiement.create({
    data: {
      id: IDS.paiementPaye,
      dossier_id: IDS.dossierPaye,
      montant_catalogue: 150000,
      montant_final: 150000,
      methode: 'MOBILE_MONEY',
      statut: 'CONFIRME',
      transaction_id: 'tx-e2e-paye-01',
      confirmed_at: now,
      expires_at: daysFromNow(1),
    },
  });
  await prisma.dossier.create({
    data: {
      id: IDS.dossierAnnule,
      apprenant_id: IDS.apprenantDossier,
      formation_id: IDS.formationPremiumB2b,
      session_id: IDS.sessionPremiumB2b,
      statut: 'ANNULE',
      source_financement: 'B2B',
    },
  });
  await prisma.dossier.create({
    data: {
      id: IDS.dossierAnnulable,
      apprenant_id: IDS.apprenantDossier,
      formation_id: IDS.formationStandard,
      session_id: IDS.sessionStandard,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
    },
  });
  await prisma.dossier.create({
    data: {
      id: IDS.dossierExpire,
      apprenant_id: IDS.apprenantDossier,
      formation_id: IDS.formationPremiumRetail,
      session_id: IDS.sessionPremiumRetail,
      statut: 'RETENU',
      source_financement: 'RETAIL',
      expires_at: daysFromNow(-1),
    },
  });
  await prisma.dossier.create({
    data: {
      id: IDS.dossierGris,
      apprenant_id: IDS.apprenantGris,
      formation_id: IDS.formationStandard,
      session_id: IDS.sessionStandard,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
      type_fenetre: 'GRIS',
    },
  });
  await prisma.dossier.create({
    data: {
      id: IDS.dossierException,
      apprenant_id: IDS.apprenantException,
      formation_id: IDS.formationStandard,
      session_id: IDS.sessionStandard,
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
      type_fenetre: 'EXCEPTION',
    },
  });

  await prisma.voucherApporteur.create({
    data: {
      id: IDS.voucher,
      code: CODES.voucher,
      organisation_id: IDS.organisation,
      formation_id: IDS.formationStandard,
      type: 'PROMOTIONNEL',
      valeur: 10000,
      type_valeur: 'MONTANT',
      quota_max: 5,
      quota_utilise: 0,
      date_expiration: daysFromNow(30),
      statut: 'ACTIF',
      cree_par: 'e2e-seed',
      valide_par: 'e2e-seed',
      valide_le: now,
    },
  });
  await prisma.voucherApporteur.create({
    data: {
      id: IDS.expiredVoucher,
      code: CODES.expiredVoucher,
      organisation_id: IDS.organisation,
      formation_id: IDS.formationStandard,
      type: 'PROMOTIONNEL',
      valeur: 20000,
      type_valeur: 'MONTANT',
      quota_max: 3,
      quota_utilise: 3,
      date_expiration: daysFromNow(-1),
      statut: 'EXPIRE',
      cree_par: 'e2e-seed',
      valide_par: 'e2e-seed',
      valide_le: now,
      nb_utilisations: 3,
      date_derniere_utilisation: now,
    },
  });

  await prisma.accesFormationDemande.create({
    data: {
      id: IDS.accesExpired,
      apprenant_id: IDS.apprenantDossier,
      formation_id: IDS.formationDemande,
      source_financement: 'ABONNEMENT',
      statut: 'EXPIRE',
      date_activation: daysFromNow(-370),
      date_expiration: daysFromNow(-5),
      progression: 100,
    },
  });

  // Abonnement Retail Premium pour app-e2e-premium-retail-01
  await prisma.abonnementRetail.create({
    data: {
      apprenant_id: IDS.apprenantPremiumRetail,
      offre: 'PREMIUM',
      statut: 'ACTIF',
      date_debut: new Date(now.getFullYear(), now.getMonth() - 1, 1), // Début mois dernier
      date_fin: new Date(now.getFullYear(), now.getMonth() + 1, 1), // Fin mois prochain
      montant_mensuel: 2500000, // 25 000 XOF en centimes
    },
  });

  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  for (let index = 1; index <= 3; index += 1) {
    const dossierId = `D-E2E-COMM-${index}`;
    const paiementId = `P-E2E-COMM-${index}`;
    await prisma.dossier.create({
      data: {
        id: dossierId,
        apprenant_id: IDS.apprenantDossier,
        formation_id: IDS.formationStandard,
        session_id: null,
        statut: 'PAYE',
        source_financement: 'RETAIL',
        code_apporteur: CODES.apporteur,
        created_at: previousMonth,
      },
    });
    await prisma.paiement.create({
      data: {
        id: paiementId,
        dossier_id: dossierId,
        montant_catalogue: 40000,
        montant_final: 40000,
        methode: 'MOBILE_MONEY',
        statut: 'CONFIRME',
        transaction_id: `tx-e2e-comm-${index}`,
        confirmed_at: previousMonth,
        expires_at: daysFromNow(1),
        created_at: previousMonth,
      },
    });
    await prisma.commissionApporteur.create({
      data: {
        id: `C-E2E-COMM-${index}`,
        apporteur_id: IDS.apporteur,
        paiement_id: paiementId,
        dossier_id: dossierId,
        montant_base: 40000,
        montant_base_xof: 40000,
        taux_commission_pct: 5,
        montant_commission: 2000,
        montant_commission_xof: 2000,
        statut: 'EN_ATTENTE',
        created_at: previousMonth,
        date_generation: previousMonth,
      },
    });
  }

  console.log(JSON.stringify({
    mode: process.env.E2E_SEED_MODE || 'e2e',
    accounts: EMAILS,
    ids: IDS,
    codes: CODES,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('[seed:e2e] failure', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
