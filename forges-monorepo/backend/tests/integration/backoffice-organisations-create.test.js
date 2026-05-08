const crypto = require('crypto');
const { accounts, auth, prisma, request, API_URL } = require('./helpers');

describe('POST /api/backoffice/organisations — Création organisation backoffice', () => {
  const createdIds = [];

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.organisation.deleteMany({ where: { id: { in: createdIds } } });
    }
  });

  function uniqueEmail() {
    return `org-create-${crypto.randomUUID()}@forges-test.ci`;
  }

  test('ADMIN peut créer une organisation avec les champs obligatoires', async () => {
    const headers = await auth(accounts.admin);
    const email = uniqueEmail();

    const res = await request(API_URL)
      .post('/api/backoffice/organisations')
      .set(headers)
      .send({
        raison_sociale: 'Organisation Test FORGES',
        email,
        type: 'ENTREPRISE',
        contact_referent: 'Dupont Jean',
        pays: 'CI',
        langue_preferee: 'FR',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.raison_sociale).toBe('Organisation Test FORGES');
    expect(res.body.data.email).toBe(email);

    createdIds.push(res.body.data.id);

    // Vérification en base
    const inDb = await prisma.organisation.findUnique({ where: { id: res.body.data.id } });
    expect(inDb).not.toBeNull();
    expect(inDb.raison_sociale).toBe('Organisation Test FORGES');
    expect(inDb.statut).toBe('ACTIVE');
  });

  test('ADMIN peut créer une organisation avec identifiant_legal', async () => {
    const headers = await auth(accounts.admin);
    const email = uniqueEmail();

    const res = await request(API_URL)
      .post('/api/backoffice/organisations')
      .set(headers)
      .send({
        raison_sociale: 'CIPREL SA',
        email,
        type: 'ENTREPRISE',
        contact_referent: 'Directeur Général',
        pays: 'CI',
        langue_preferee: 'FR',
        identifiant_legal: 'CI-ABJ-2026-CIPREL',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.identifiant_legal).toBe('CI-ABJ-2026-CIPREL');
    createdIds.push(res.body.data.id);

    const inDb = await prisma.organisation.findUnique({ where: { id: res.body.data.id } });
    expect(inDb.identifiant_legal).toBe('CI-ABJ-2026-CIPREL');
  });

  test('Retourne 409 si email déjà utilisé', async () => {
    const headers = await auth(accounts.admin);
    const email = uniqueEmail();

    const first = await request(API_URL)
      .post('/api/backoffice/organisations')
      .set(headers)
      .send({
        raison_sociale: 'Première Organisation',
        email,
        type: 'ENTREPRISE',
        contact_referent: 'Référent',
      });

    expect(first.status).toBe(201);
    createdIds.push(first.body.data.id);

    const second = await request(API_URL)
      .post('/api/backoffice/organisations')
      .set(headers)
      .send({
        raison_sociale: 'Deuxième Organisation',
        email,
        type: 'GOUVERNEMENT',
        contact_referent: 'Autre Référent',
      });

    expect(second.status).toBe(409);
    expect(second.body.error).toBe('EMAIL_DEJA_UTILISE');
  });

  test('Retourne 400 si champs obligatoires manquants', async () => {
    const headers = await auth(accounts.admin);

    const res = await request(API_URL)
      .post('/api/backoffice/organisations')
      .set(headers)
      .send({
        raison_sociale: 'Sans email',
        type: 'ENTREPRISE',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('CHAMPS_REQUIS');
  });

  test('Retourne 401 sans authentification', async () => {
    const res = await request(API_URL)
      .post('/api/backoffice/organisations')
      .send({
        raison_sociale: 'Test',
        email: uniqueEmail(),
        type: 'ENTREPRISE',
        contact_referent: 'Test',
      });

    expect(res.status).toBe(401);
  });

  test('Retourne 403 si rôle APPRENANT', async () => {
    const headers = await auth(accounts.apprenant);

    const res = await request(API_URL)
      .post('/api/backoffice/organisations')
      .set(headers)
      .send({
        raison_sociale: 'Test',
        email: uniqueEmail(),
        type: 'ENTREPRISE',
        contact_referent: 'Test',
      });

    expect(res.status).toBe(403);
  });

  test('Organisation créée a le statut ACTIVE immédiatement', async () => {
    const headers = await auth(accounts.admin);
    const email = uniqueEmail();

    const res = await request(API_URL)
      .post('/api/backoffice/organisations')
      .set(headers)
      .send({
        raison_sociale: 'Org Statut Test',
        email,
        type: 'GOUVERNEMENT',
        contact_referent: 'Ministère Test',
      });

    expect(res.status).toBe(201);
    createdIds.push(res.body.data.id);

    const inDb = await prisma.organisation.findUnique({ where: { id: res.body.data.id } });
    expect(inDb.statut).toBe('ACTIVE');
    expect(inDb.consentement_rgpd).toBe(true);
  });
});
