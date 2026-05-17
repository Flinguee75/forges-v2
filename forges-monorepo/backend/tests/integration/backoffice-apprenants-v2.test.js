const crypto = require('crypto');
const { accounts, auth, prisma, request, API_URL } = require('./helpers');

describe('Backoffice Apprenants API — Routes GET', () => {
  test('GET /api/backoffice/apprenants — ADMIN peut lister les apprenants avec pagination', async () => {
    const headers = await auth(accounts.admin);
    const res = await request(API_URL)
      .get('/api/backoffice/apprenants')
      .set(headers)
      .query({ page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toHaveProperty('page');
    expect(res.body.meta).toHaveProperty('totalPages');
  });

  test('GET /api/backoffice/apprenants — Sans authentification retourne 401', async () => {
    const res = await request(API_URL).get('/api/backoffice/apprenants');
    expect(res.status).toBe(401);
  });

  test('GET /api/backoffice/apprenants — Recherche par email fonctionne', async () => {
    const testEmail = `test-search-${crypto.randomUUID()}@forges.ci`;

    await prisma.apprenant.create({
      data: {
        id: `app-search-${crypto.randomUUID()}`,
        email: testEmail,
        password_hash: 'hashed',
        nom: 'SearchTest',
        prenoms: 'User',
        type_apprenant: 'PARTICULIER',
        pays_residence: 'CI',
        pays_nationalite: 'CI',
        langue_preferee: 'FR',
        consentement_rgpd: true,
      },
    });

    const headers = await auth(accounts.admin);
    const res = await request(API_URL)
      .get('/api/backoffice/apprenants')
      .set(headers)
      .query({ search: testEmail });

    expect(res.status).toBe(200);
    const found = res.body.data.find((a) => a.email === testEmail);
    expect(found).toBeDefined();
  });

  test('PATCH /api/backoffice/apprenants/:id/suspension — ADMIN peut suspendre un apprenant', async () => {
    const apprenantId = `app-suspend-${crypto.randomUUID()}`;

    await prisma.apprenant.create({
      data: {
        id: apprenantId,
        email: `suspend-${crypto.randomUUID()}@forges.ci`,
        password_hash: 'hashed',
        nom: 'ToSuspend',
        prenoms: 'User',
        type_apprenant: 'PARTICULIER',
        pays_residence: 'CI',
        pays_nationalite: 'CI',
        langue_preferee: 'FR',
        consentement_rgpd: true,
      },
    });

    const headers = await auth(accounts.admin);
    const res = await request(API_URL)
      .patch(`/api/backoffice/apprenants/${apprenantId}/suspension`)
      .set(headers)
      .send({ suspended: true });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('suspended');
  });

  test('GET /api/backoffice/apprenants/:id/dossiers — Retourne les dossiers', async () => {
    const apprenantId = `app-dossiers-${crypto.randomUUID()}`;

    await prisma.apprenant.create({
      data: {
        id: apprenantId,
        email: `dossiers-${crypto.randomUUID()}@forges.ci`,
        password_hash: 'hashed',
        nom: 'DossierTest',
        prenoms: 'User',
        type_apprenant: 'PARTICULIER',
        pays_residence: 'CI',
        pays_nationalite: 'CI',
        langue_preferee: 'FR',
        consentement_rgpd: true,
      },
    });

    const headers = await auth(accounts.admin);
    const res = await request(API_URL)
      .get(`/api/backoffice/apprenants/${apprenantId}/dossiers`)
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
