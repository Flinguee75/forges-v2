const crypto = require('crypto');
const { accounts, auth, prisma, request, API_URL } = require('./helpers');

describe('Backoffice Organisations API — Routes GET', () => {
  test('GET /api/backoffice/organisations — ADMIN peut lister les organisations avec pagination', async () => {
    const headers = await auth(accounts.admin);
    const res = await request(API_URL)
      .get('/api/backoffice/organisations')
      .set(headers)
      .query({ page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toHaveProperty('page');
    expect(res.body.meta).toHaveProperty('totalPages');
  });

  test('GET /api/backoffice/organisations — Sans authentification retourne 401', async () => {
    const res = await request(API_URL).get('/api/backoffice/organisations');
    expect(res.status).toBe(401);
  });

  test('GET /api/backoffice/organisations — Recherche par nom fonctionne', async () => {
    const testNom = `OrgTest-${crypto.randomUUID()}`;

    await prisma.organisation.create({
      data: {
        id: `org-search-${crypto.randomUUID()}`,
        email: `org-${crypto.randomUUID()}@forges.ci`,
        password_hash: 'hashed',
        raison_sociale: testNom,
        type: 'ENTREPRISE',
        sous_types: ['FORMATION'],
        identifiant_legal: `CI-TEST-${crypto.randomUUID().substring(0, 8)}`,
        contact_referent: 'Dupont Jean',
        pays: 'CI',
        langue_preferee: 'FR',
        statut: 'ACTIVE',
      },
    });

    const headers = await auth(accounts.admin);
    const res = await request(API_URL)
      .get('/api/backoffice/organisations')
      .set(headers)
      .query({ search: testNom });

    expect(res.status).toBe(200);
    const found = res.body.data.find((o) => o.nom_organisation === testNom);
    expect(found).toBeDefined();
  });

  test('PATCH /api/backoffice/organisations/:id/suspension — ADMIN peut suspendre une organisation', async () => {
    const orgId = `org-suspend-${crypto.randomUUID()}`;

    await prisma.organisation.create({
      data: {
        id: orgId,
        email: `org-suspend-${crypto.randomUUID()}@forges.ci`,
        password_hash: 'hashed',
        raison_sociale: 'Suspend SARL',
        type: 'ENTREPRISE',
        sous_types: ['FORMATION'],
        identifiant_legal: `CI-SUSP-${crypto.randomUUID().substring(0, 8)}`,
        contact_referent: 'Test User',
        pays: 'CI',
        langue_preferee: 'FR',
        statut: 'ACTIVE',
      },
    });

    const headers = await auth(accounts.admin);
    const res = await request(API_URL)
      .patch(`/api/backoffice/organisations/${orgId}/suspension`)
      .set(headers)
      .send({ suspended: true });

    expect(res.status).toBe(200);
    expect(res.body.data.suspended).toBe(true);
  });

  test('GET /api/backoffice/organisations/:id/membres — Retourne les membres', async () => {
    const orgId = `org-membres-${crypto.randomUUID()}`;

    await prisma.organisation.create({
      data: {
        id: orgId,
        email: `org-membres-${crypto.randomUUID()}@forges.ci`,
        password_hash: 'hashed',
        raison_sociale: 'Membres SARL',
        type: 'ENTREPRISE',
        sous_types: ['FORMATION'],
        identifiant_legal: `CI-MEMB-${crypto.randomUUID().substring(0, 8)}`,
        contact_referent: 'Test User',
        pays: 'CI',
        langue_preferee: 'FR',
        statut: 'ACTIVE',
      },
    });

    const headers = await auth(accounts.admin);
    const res = await request(API_URL)
      .get(`/api/backoffice/organisations/${orgId}/membres`)
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
