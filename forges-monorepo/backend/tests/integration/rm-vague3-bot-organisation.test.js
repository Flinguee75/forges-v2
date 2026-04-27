const {
  accounts,
  auth,
  createApprenantAccount,
  createOrganisationAccount,
  prisma,
  request,
  API_URL,
} = require('./helpers');
const { hash } = require('bcrypt');

const PALIER_B2B_CAPACITE = {
  STARTER: 20,
  BUSINESS: 100,
  ENTERPRISE: 500,
};

async function loginOrganisation(email) {
  const response = await request(API_URL)
    .post('/api/auth/login')
    .send({ email, password: 'Test@FORGES2026!' });
  return { Authorization: `Bearer ${response.body.data.accessToken}` };
}

async function setupOrganisationWithB2B(palier, tauxRemplissagePct) {
  const org = await createOrganisationAccount(`bot-${palier.toLowerCase()}`);
  const capaciteMax = PALIER_B2B_CAPACITE[palier];
  const nbActifs = Math.ceil((capaciteMax * tauxRemplissagePct) / 100);

  await prisma.abonnementB2B.create({
    data: {
      organisation_id: org.id,
      palier,
      statut: 'ACTIF',
      date_debut: new Date(),
      date_fin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      nb_max: capaciteMax,
      nb_actifs: nbActifs,
      prix_annuel: palier === 'STARTER' ? 500000 : palier === 'BUSINESS' ? 2000000 : 5000000,
    },
  });

  const passwordHash = await hash('Test@FORGES2026!', 12);
  const apprenantIds = [];
  for (let i = 0; i < nbActifs; i++) {
    const appId = `app-${palier.toLowerCase()}-${Date.now()}-${i}`;
    await prisma.apprenant.create({
      data: {
        id: appId,
        email: `${appId}@forges.test`,
        password_hash: passwordHash,
        nom: `BotApp${i}`,
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
        organisation_id: org.id,
      },
    });
    apprenantIds.push(appId);
  }

  return { organisation: org, apprenantIds, capaciteMax };
}

async function cleanupOrganisation(organisationId, apprenantIds = []) {
  await prisma.conversationBot.deleteMany({ where: { utilisateur_id: organisationId } });
  await prisma.abonnementB2B.deleteMany({ where: { organisation_id: organisationId } });
  if (apprenantIds.length > 0) {
    await prisma.conversationBot.deleteMany({ where: { utilisateur_id: { in: apprenantIds } } });
  }
}

describe('Vague 3 API — Bot Conseiller Organisation RM-115/116/118/121', () => {

  // ===== RM-115 / RM-116 : déclenchement automatique flux UPGRADE =====

  test('RM-115/116 — palier B2B >80% déclenche le flux UPGRADE', async () => {
    const { organisation, apprenantIds } = await setupOrganisationWithB2B('BUSINESS', 85);
    const orgHeaders = await loginOrganisation(organisation.email);

    const res = await request(API_URL)
      .post('/api/bot/session')
      .set(orgHeaders)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.data.flux).toBe('UPGRADE');
    expect(res.body.data.question).toBeDefined();
    expect(res.body.data.question.texte || res.body.data.question).toMatch(/BUSINESS|ENTERPRISE|collaborateurs|saturation/i);

    await cleanupOrganisation(organisation.id, apprenantIds);
  });

  // ===== RM-121 : cooldown 7 jours après refus upgrade =====

  test('RM-121 — refus upgrade enregistre dernier_refus et nb_refus_upgrade', async () => {
    const { organisation, apprenantIds } = await setupOrganisationWithB2B('STARTER', 85);
    const orgHeaders = await loginOrganisation(organisation.email);

    // Démarrer session UPGRADE
    const sessionRes = await request(API_URL)
      .post('/api/bot/session')
      .set(orgHeaders)
      .send({});
    expect(sessionRes.status).toBe(201);
    expect(sessionRes.body.data.flux).toBe('UPGRADE');

    const sessionId = sessionRes.body.data.session_id;

    // Refuser (valeur stricte 'Non' — RM-118)
    const refusRes = await request(API_URL)
      .post(`/api/bot/session/${sessionId}/reponse`)
      .set(orgHeaders)
      .send({ question_id: 1, valeur: 'Non' });

    expect(refusRes.status).toBe(200);
    expect(refusRes.body.data.fin).toBe(true);
    expect(refusRes.body.data.message).toMatch(/7 jours/i);

    // Vérifier l'enregistrement du refus dans conversationBot
    const conversation = await prisma.conversationBot.findFirst({
      where: {
        utilisateur_id: organisation.id,
        flux_actif: 'UPGRADE',
        dernier_refus_upgrade_le: { not: null },
      },
      orderBy: { date_debut: 'desc' },
    });
    expect(conversation).toBeTruthy();
    expect(conversation.dernier_refus_upgrade_le).toBeTruthy();
    expect(conversation.nb_refus_upgrade).toBeGreaterThan(0);

    await cleanupOrganisation(organisation.id, apprenantIds);
  });

  test('RM-121 — cooldown actif : nouvelle session ne propose PAS UPGRADE avant 7 jours', async () => {
    const { organisation, apprenantIds } = await setupOrganisationWithB2B('STARTER', 85);
    const orgHeaders = await loginOrganisation(organisation.email);

    // Enregistrer un refus daté d'hier (dans le cooldown)
    await prisma.conversationBot.create({
      data: {
        utilisateur_id: organisation.id,
        type_utilisateur: 'ORGANISATION',
        flux_actif: 'UPGRADE',
        statut: 'TERMINEE',
        langue: 'FR',
        dernier_refus_upgrade_le: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        nb_refus_upgrade: 1,
      },
    });

    // Démarrer nouvelle session : ne doit PAS proposer UPGRADE
    const res = await request(API_URL)
      .post('/api/bot/session')
      .set(orgHeaders)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.data.flux).not.toBe('UPGRADE');
    expect(['IDLE', 'FEEDBACK']).toContain(res.body.data.flux);

    await cleanupOrganisation(organisation.id, apprenantIds);
  });

  test('RM-121 — cooldown expiré : nouvelle session propose à nouveau UPGRADE après 7 jours', async () => {
    const { organisation, apprenantIds } = await setupOrganisationWithB2B('STARTER', 85);
    const orgHeaders = await loginOrganisation(organisation.email);

    // Enregistrer un refus daté de 8 jours (hors cooldown)
    await prisma.conversationBot.create({
      data: {
        utilisateur_id: organisation.id,
        type_utilisateur: 'ORGANISATION',
        flux_actif: 'UPGRADE',
        statut: 'TERMINEE',
        langue: 'FR',
        dernier_refus_upgrade_le: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        nb_refus_upgrade: 1,
      },
    });

    const res = await request(API_URL)
      .post('/api/bot/session')
      .set(orgHeaders)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.data.flux).toBe('UPGRADE');

    await cleanupOrganisation(organisation.id, apprenantIds);
  });

  // ===== RM-121 cooldown Apprenant (déjà implémenté) =====

  test('RM-121 — cooldown 7 jours également actif pour l Apprenant', async () => {
    const apprenant = await createApprenantAccount('bot-cooldown');
    const appHeaders = await loginOrganisation(apprenant.email);

    // Refus datant d'aujourd'hui → cooldown actif
    await prisma.conversationBot.create({
      data: {
        utilisateur_id: apprenant.id,
        type_utilisateur: 'APPRENANT',
        flux_actif: 'UPGRADE',
        statut: 'TERMINEE',
        langue: 'FR',
        dernier_refus_upgrade_le: new Date(),
        nb_refus_upgrade: 1,
      },
    });

    const res = await request(API_URL)
      .post('/api/bot/session')
      .set(appHeaders)
      .send({});

    expect(res.status).toBe(201);
    // Le flux ne doit pas être UPGRADE pendant le cooldown
    expect(res.body.data.flux).not.toBe('UPGRADE');

    await prisma.conversationBot.deleteMany({ where: { utilisateur_id: apprenant.id } });
  });

  // ===== RM-118 : validation réponse hors liste =====

  test('RM-118 — réponse hors liste rejetée avec code REPONSE_HORS_LISTE', async () => {
    const { organisation, apprenantIds } = await setupOrganisationWithB2B('STARTER', 85);
    const orgHeaders = await loginOrganisation(organisation.email);

    const sessionRes = await request(API_URL)
      .post('/api/bot/session')
      .set(orgHeaders)
      .send({});
    expect(sessionRes.status).toBe(201);
    expect(sessionRes.body.data.flux).toBe('UPGRADE');

    const sessionId = sessionRes.body.data.session_id;

    const invalidRes = await request(API_URL)
      .post(`/api/bot/session/${sessionId}/reponse`)
      .set(orgHeaders)
      .send({ question_id: 1, valeur: 'Reponse personnalisee hors liste' });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error).toBe('REPONSE_HORS_LISTE');

    await cleanupOrganisation(organisation.id, apprenantIds);
  });

  // ===== RM-121 : compteur nb_refus_upgrade incrémenté =====

  test('RM-121 — compteur nb_refus_upgrade incrémenté à chaque refus', async () => {
    const { organisation, apprenantIds } = await setupOrganisationWithB2B('STARTER', 85);
    const orgHeaders = await loginOrganisation(organisation.email);

    // Premier refus via le bot
    const session1 = await request(API_URL)
      .post('/api/bot/session')
      .set(orgHeaders)
      .send({});
    expect(session1.body.data.flux).toBe('UPGRADE');

    await request(API_URL)
      .post(`/api/bot/session/${session1.body.data.session_id}/reponse`)
      .set(orgHeaders)
      .send({ question_id: 1, valeur: 'Non' });

    const afterRefus1 = await prisma.conversationBot.findFirst({
      where: { utilisateur_id: organisation.id, nb_refus_upgrade: { gt: 0 } },
      orderBy: { date_debut: 'desc' },
    });
    expect(afterRefus1.nb_refus_upgrade).toBe(1);

    await cleanupOrganisation(organisation.id, apprenantIds);
  });

});
