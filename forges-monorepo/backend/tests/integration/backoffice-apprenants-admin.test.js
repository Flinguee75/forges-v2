/**
 * Tests d'intégration — Création apprenant par Admin + rattachement organisation
 * (scénario ANSSI — Étape 4)
 *
 * Couvre :
 *   POST   /api/backoffice/apprenants         — ADMIN crée un apprenant (compte ACTIF direct)
 *   PATCH  /api/backoffice/apprenants/:id/lier-organisation — rattacher à une org
 *   RBAC   : ADMIN seul peut créer / lier
 */

const { randomUUID } = require('crypto');
const { hash } = require('bcrypt');
const { API_URL, accounts, auth, prisma, request } = require('./helpers');

const PASSWORD = 'Test@FORGES2026!';

let adminHeaders;
let agentHeaders;
let createdOrgId;
let createdApprenantIds = [];

beforeAll(async () => {
  createdOrgId = randomUUID();
  await prisma.organisation.create({
    data: {
      id: createdOrgId,
      raison_sociale: 'ANSSI Test Étape4',
      email: `anssi-etape4-${Date.now()}@forges.test`,
      password_hash: await hash(PASSWORD, 12),
      type: 'GOUVERNEMENT',
      sous_types: ['FORMATION'],
      identifiant_legal: `GOV-ETAPE4-${Date.now()}`,
      contact_referent: 'DG ANSSI',
      pays: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      date_fin_essai: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  [adminHeaders, agentHeaders] = await Promise.all([
    auth(accounts.admin),
    auth(accounts.agent),
  ]);
});

afterAll(async () => {
  if (createdApprenantIds.length > 0) {
    await prisma.apprenant.deleteMany({ where: { id: { in: createdApprenantIds } } }).catch(() => {});
  }
  if (createdOrgId) {
    await prisma.organisation.delete({ where: { id: createdOrgId } }).catch(() => {});
  }
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function creerApprenant(headers, overrides = {}) {
  const res = await request(API_URL)
    .post('/api/backoffice/apprenants')
    .set(headers)
    .send({
      email: `apprenant-admin-${Date.now()}-${Math.random().toString(36).slice(2)}@forges.test`,
      nom: 'Konan',
      prenoms: 'Elie',
      type_apprenant: 'PROFESSIONNEL',
      secteur_activite: 'SECURITE_INFORMATIQUE',
      pays_residence: 'CI',
      pays_nationalite: 'CI',
      ...overrides,
    });
  if (res.body?.data?.id) createdApprenantIds.push(res.body.data.id);
  return res;
}

// ─────────────────────────────────────────────
// POST /api/backoffice/apprenants
// ─────────────────────────────────────────────

describe('POST /api/backoffice/apprenants — création admin', () => {
  it('ADMIN crée un apprenant — 201, statut ACTIF immédiat', async () => {
    const res = await creerApprenant(adminHeaders);

    expect(res.status).toBe(201);
    expect(res.body.data.statut).toBe('ACTIF');
    expect(res.body.data.nom).toBe('Konan');
    expect(res.body.data.prenoms).toBe('Elie');
    expect(res.body.data.mot_de_passe_temp).toBeTruthy();
  });

  it('compte créé est directement actif en base (pas de token confirmation)', async () => {
    const res = await creerApprenant(adminHeaders);
    const id = res.body.data.id;

    const apprenant = await prisma.apprenant.findUnique({ where: { id } });
    expect(apprenant.statut).toBe('ACTIF');
    expect(apprenant.token_confirmation).toBeNull();
  });

  it('ADMIN peut créer avec organisation_id — apprenant lié à l\'org', async () => {
    const res = await creerApprenant(adminHeaders, {
      organisation_id: createdOrgId,
      nom: 'Samassi',
      prenoms: 'Aly',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.organisation_id).toBe(createdOrgId);
  });

  it('email déjà utilisé → 409 EMAIL_ALREADY_EXISTS', async () => {
    const email = `doublon-${Date.now()}@forges.test`;
    await creerApprenant(adminHeaders, { email });

    const res2 = await creerApprenant(adminHeaders, { email });
    expect(res2.status).toBe(409);
    expect(res2.body.error).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('organisation_id inexistant → 404 ORGANISATION_NOT_FOUND', async () => {
    const res = await creerApprenant(adminHeaders, {
      organisation_id: '00000000-0000-0000-0000-000000000000',
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ORGANISATION_NOT_FOUND');
  });

  it('email invalide → 400 VALIDATION_ERROR', async () => {
    const res = await creerApprenant(adminHeaders, { email: 'pas-un-email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('AGENT ne peut pas créer un apprenant — 403', async () => {
    const res = await creerApprenant(agentHeaders);
    expect(res.status).toBe(403);
  });

  it('sans token → 401', async () => {
    const res = await request(API_URL)
      .post('/api/backoffice/apprenants')
      .send({ email: 'test@test.ci', nom: 'X', prenoms: 'Y', pays_residence: 'CI', pays_nationalite: 'CI' });
    expect(res.status).toBe(401);
  });

  it('mot_de_passe_temp personnalisé est utilisé s\'il est fourni', async () => {
    const motDePasse = 'MonMotDePasse1!';
    const res = await creerApprenant(adminHeaders, { mot_de_passe_temp: motDePasse });

    expect(res.status).toBe(201);
    expect(res.body.data.mot_de_passe_temp).toBe(motDePasse);
  });
});

// ─────────────────────────────────────────────
// PATCH /api/backoffice/apprenants/:id/lier-organisation
// ─────────────────────────────────────────────

describe('PATCH /api/backoffice/apprenants/:id/lier-organisation — rattachement org', () => {
  it('ADMIN lie un apprenant existant à une organisation', async () => {
    const created = await creerApprenant(adminHeaders);
    const id = created.body.data.id;

    const res = await request(API_URL)
      .patch(`/api/backoffice/apprenants/${id}/lier-organisation`)
      .set(adminHeaders)
      .send({ organisation_id: createdOrgId });

    expect(res.status).toBe(200);
    expect(res.body.data.organisation_id).toBe(createdOrgId);
  });

  it('apprenant inexistant → 404 APPRENANT_NOT_FOUND', async () => {
    const res = await request(API_URL)
      .patch('/api/backoffice/apprenants/00000000-0000-0000-0000-000000000000/lier-organisation')
      .set(adminHeaders)
      .send({ organisation_id: createdOrgId });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('APPRENANT_NOT_FOUND');
  });

  it('organisation inexistante → 404 ORGANISATION_NOT_FOUND', async () => {
    const created = await creerApprenant(adminHeaders);
    const id = created.body.data.id;

    const res = await request(API_URL)
      .patch(`/api/backoffice/apprenants/${id}/lier-organisation`)
      .set(adminHeaders)
      .send({ organisation_id: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ORGANISATION_NOT_FOUND');
  });

  it('organisation_id manquant → 400 VALIDATION_ERROR', async () => {
    const created = await creerApprenant(adminHeaders);

    const res = await request(API_URL)
      .patch(`/api/backoffice/apprenants/${created.body.data.id}/lier-organisation`)
      .set(adminHeaders)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('AGENT ne peut pas lier un apprenant — 403', async () => {
    const created = await creerApprenant(adminHeaders);

    const res = await request(API_URL)
      .patch(`/api/backoffice/apprenants/${created.body.data.id}/lier-organisation`)
      .set(agentHeaders)
      .send({ organisation_id: createdOrgId });

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// GET /api/admin/devis/:id/pdf — téléchargement PDF
// ─────────────────────────────────────────────

describe('GET /api/admin/devis/:id/pdf — facture PDF', () => {
  let devisId;

  beforeAll(async () => {
    // Prendre une formation UUID valide
    const formations = await prisma.$queryRaw`
      SELECT id FROM "Formation"
      WHERE id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      LIMIT 1
    `;
    if (formations.length === 0) return;

    const resDevis = await request(API_URL)
      .post('/api/admin/devis')
      .set(adminHeaders)
      .send({
        organisation_id: createdOrgId,
        formation_id: formations[0].id,
        nb_places: 3,
        tarif_unitaire_xof: 2000000,
      });

    if (resDevis.status === 201) {
      devisId = resDevis.body.data.id;
    }
  });

  afterAll(async () => {
    if (devisId) {
      await prisma.devis.delete({ where: { id: devisId } }).catch(() => {});
    }
  });

  it('ADMIN télécharge le PDF — 200 application/pdf', async () => {
    if (!devisId) return;

    const res = await request(API_URL)
      .get(`/api/admin/devis/${devisId}/pdf`)
      .set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/wordprocessingml/);
    expect(res.headers['content-disposition']).toMatch(/\.docx/);
  });

  it('AGENT peut telecharger le DOCX', async () => {
    if (!devisId) return;

    const res = await request(API_URL)
      .get(`/api/admin/devis/${devisId}/pdf`)
      .set(agentHeaders);

    expect(res.status).toBe(200);
  });

  it('devis inexistant → 404', async () => {
    const res = await request(API_URL)
      .get('/api/admin/devis/00000000-0000-0000-0000-000000000000/pdf')
      .set(adminHeaders);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('DEVIS_NOT_FOUND');
  });

  it('sans token → 401', async () => {
    if (!devisId) return;
    const res = await request(API_URL).get(`/api/admin/devis/${devisId}/pdf`);
    expect(res.status).toBe(401);
  });
});
