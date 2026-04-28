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
        nom_organisation: testNom,
        type_organisation: 'ENTREPRISE',
        raison_sociale: 'Test SARL',
        numero_legal: `CI-TEST-${crypto.randomUUID().substring(0, 8)}`,
        responsable_nom: 'Dupont',
        responsable_prenom: 'Jean',
        responsable_fonction: 'DRH',
        telephone: '+2250700000010',
        adresse: '123 Rue Test',
        ville: 'Abidjan',
        pays: 'CI',
        langue: 'FR',
        email_confirme: true,
        suspended: false,
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
        nom_organisation: 'ToSuspend Org',
        type_organisation: 'ENTREPRISE',
        raison_sociale: 'Suspend SARL',
        numero_legal: `CI-SUSP-${crypto.randomUUID().substring(0, 8)}`,
        responsable_nom: 'Test',
        responsable_prenom: 'User',
        responsable_fonction: 'CEO',
        telephone: '+2250700000011',
        adresse: '456 Rue Test',
        ville: 'Abidjan',
        pays: 'CI',
        langue: 'FR',
        email_confirme: true,
        suspended: false,
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
        nom_organisation: 'Membres Test Org',
        type_organisation: 'ENTREPRISE',
        raison_sociale: 'Membres SARL',
        numero_legal: `CI-MEMB-${crypto.randomUUID().substring(0, 8)}`,
        responsable_nom: 'Test',
        responsable_prenom: 'User',
        responsable_fonction: 'CEO',
        telephone: '+2250700000012',
        adresse: '789 Rue Test',
        ville: 'Abidjan',
        pays: 'CI',
        langue: 'FR',
        email_confirme: true,
        suspended: false,
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
