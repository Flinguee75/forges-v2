/**
 * Tests d'intégration — Devis SUR_DEVIS (RM-149 à RM-151)
 *
 * Couvre :
 *   RM-149 : création devis avec numéro FORGES-DEVIS-YYYY-NNN
 *   RM-150 : montant_total calculé backend (nb_places × tarif_unitaire)
 *   RM-151 : annulation impossible si statut PAYE
 *   RBAC   : ADMIN crée/annule, AGENT consulte/paye, ORGANISATION lecture seule
 */

const { randomUUID } = require('crypto');
const { hash } = require('bcrypt');
const { API_URL, accounts, auth, prisma, request } = require('./helpers');

const PASSWORD = 'Test@FORGES2026!';

let adminHeaders;
let agentHeaders;
let orgHeaders;
let formationId;
let organisationId;
let orgEmail;
let createdDevisIds = [];
let createdOrgId;

beforeAll(async () => {
  // Créer une organisation avec un vrai UUID (le DTO valide uuid())
  createdOrgId = randomUUID();
  orgEmail = `org-devis-test-${Date.now()}@forges.test`;
  await prisma.organisation.create({
    data: {
      id: createdOrgId,
      raison_sociale: 'Org Devis Test',
      email: orgEmail,
      password_hash: await hash(PASSWORD, 12),
      type: 'ENTREPRISE',
      sous_types: ['FORMATION'],
      identifiant_legal: `LEGAL-DEVIS-${Date.now()}`,
      contact_referent: 'Contact Test',
      pays: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      date_fin_essai: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  organisationId = createdOrgId;

  [adminHeaders, agentHeaders, orgHeaders] = await Promise.all([
    auth(accounts.admin),
    auth(accounts.agent),
    auth({ email: orgEmail, password: PASSWORD }),
  ]);

  // Prendre une formation avec un vrai UUID (le DTO valide uuid())
  const formations = await prisma.$queryRaw`
    SELECT id FROM "Formation"
    WHERE id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    LIMIT 1
  `;
  expect(formations.length).toBeGreaterThan(0);
  formationId = formations[0].id;
});

afterAll(async () => {
  if (createdDevisIds.length > 0) {
    await prisma.devis.deleteMany({ where: { id: { in: createdDevisIds } } });
  }
  if (createdOrgId) {
    await prisma.organisation.delete({ where: { id: createdOrgId } }).catch(() => {});
  }
});

// ─────────────────────────────────────────────
// Helpers locaux
// ─────────────────────────────────────────────

async function creerDevis(headers, overrides = {}) {
  const res = await request(API_URL)
    .post('/api/admin/devis')
    .set(headers)
    .send({
      organisation_id: organisationId,
      formation_id: formationId,
      nb_places: 5,
      tarif_unitaire_xof: 40000,
      ...overrides,
    });
  if (res.body?.data?.id) createdDevisIds.push(res.body.data.id);
  return res;
}

// ─────────────────────────────────────────────
// RM-149 : création
// ─────────────────────────────────────────────

describe('POST /api/admin/devis — RM-149', () => {
  it('ADMIN crée un devis — statut 201, statut CREE', async () => {
    const res = await creerDevis(adminHeaders);

    expect(res.status).toBe(201);
    expect(res.body.data.statut).toBe('CREE');
    expect(res.body.data.organisation_id).toBe(organisationId);
    expect(res.body.data.formation_id).toBe(formationId);
  });

  it('RM-149 : numéro au format FORGES-DEVIS-YYYY-NNN', async () => {
    const res = await creerDevis(adminHeaders);

    const annee = new Date().getFullYear();
    expect(res.body.data.numero_devis).toMatch(
      new RegExp(`^FORGES-DEVIS-${annee}-\\d{3}$`)
    );
  });

  it('RM-150 : montant_total = nb_places × tarif_unitaire (jamais fourni par le client)', async () => {
    const res = await creerDevis(adminHeaders, { nb_places: 3, tarif_unitaire_xof: 60000 });

    expect(res.status).toBe(201);
    expect(res.body.data.montant_total_xof).toBe(180000); // 3 × 60000
    expect(res.body.data.nb_places).toBe(3);
    expect(res.body.data.tarif_unitaire_xof).toBe(60000);
  });

  it('AGENT ne peut pas créer un devis — 403', async () => {
    const res = await creerDevis(agentHeaders);
    expect(res.status).toBe(403);
  });

  it('ORGANISATION ne peut pas créer un devis — 403', async () => {
    const res = await creerDevis(orgHeaders);
    expect(res.status).toBe(403);
  });

  it('organisation inconnue → 404 ORGANISATION_NOT_FOUND', async () => {
    const res = await creerDevis(adminHeaders, {
      organisation_id: '00000000-0000-0000-0000-000000000000',
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ORGANISATION_NOT_FOUND');
  });

  it('formation inconnue → 404 FORMATION_NOT_FOUND', async () => {
    const res = await creerDevis(adminHeaders, {
      formation_id: '00000000-0000-0000-0000-000000000000',
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('FORMATION_NOT_FOUND');
  });

  it('nb_places manquant → 400 VALIDATION_ERROR', async () => {
    const res = await request(API_URL)
      .post('/api/admin/devis')
      .set(adminHeaders)
      .send({ organisation_id: organisationId, formation_id: formationId, tarif_unitaire_xof: 10000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('sans token → 401', async () => {
    const res = await request(API_URL)
      .post('/api/admin/devis')
      .send({ organisation_id: organisationId, formation_id: formationId, nb_places: 1, tarif_unitaire_xof: 1000 });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// Lecture
// ─────────────────────────────────────────────

describe('GET /api/admin/devis — lecture', () => {
  it('ADMIN liste les devis — 200', async () => {
    const res = await request(API_URL).get('/api/admin/devis').set(adminHeaders);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('AGENT liste les devis — 200', async () => {
    const res = await request(API_URL).get('/api/admin/devis').set(agentHeaders);
    expect(res.status).toBe(200);
  });

  it('ORGANISATION ne peut pas lister /admin/devis — 403', async () => {
    const res = await request(API_URL).get('/api/admin/devis').set(orgHeaders);
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/devis/:id — détail avec statut et montant', async () => {
    const created = await creerDevis(adminHeaders);
    const id = created.body.data.id;

    const res = await request(API_URL).get(`/api/admin/devis/${id}`).set(adminHeaders);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
    expect(res.body.data.montant_total_xof).toBe(5 * 40000);
  });

  it('GET /api/admin/devis/:id inexistant → 404', async () => {
    const res = await request(API_URL)
      .get('/api/admin/devis/00000000-0000-0000-0000-000000000000')
      .set(adminHeaders);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('DEVIS_NOT_FOUND');
  });

  it('GET /api/organisation/devis — ORGANISATION voit ses devis', async () => {
    const res = await request(API_URL).get('/api/organisation/devis').set(orgHeaders);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// RM-150 : payer
// ─────────────────────────────────────────────

describe('PATCH /api/admin/devis/:id/payer — RM-150', () => {
  it('AGENT marque un devis CREE → PAYE', async () => {
    const created = await creerDevis(adminHeaders);
    const id = created.body.data.id;

    const res = await request(API_URL)
      .patch(`/api/admin/devis/${id}/payer`)
      .set(agentHeaders)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe('PAYE');
    expect(res.body.data.paid_at).not.toBeNull();
  });

  it('ADMIN marque un devis CREE → PAYE', async () => {
    const created = await creerDevis(adminHeaders);
    const id = created.body.data.id;

    const res = await request(API_URL)
      .patch(`/api/admin/devis/${id}/payer`)
      .set(adminHeaders)
      .send({ notes_admin: 'Virement reçu le 04/05/2026' });

    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe('PAYE');
  });

  it('devis déjà PAYE → 409 DEVIS_STATUT_INVALIDE', async () => {
    const created = await creerDevis(adminHeaders);
    const id = created.body.data.id;

    await request(API_URL).patch(`/api/admin/devis/${id}/payer`).set(adminHeaders).send({});

    const res = await request(API_URL)
      .patch(`/api/admin/devis/${id}/payer`)
      .set(adminHeaders)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('DEVIS_STATUT_INVALIDE');
  });

  it('ORGANISATION ne peut pas payer — 403', async () => {
    const created = await creerDevis(adminHeaders);
    const id = created.body.data.id;

    const res = await request(API_URL)
      .patch(`/api/admin/devis/${id}/payer`)
      .set(orgHeaders)
      .send({});

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// RM-151 : annuler
// ─────────────────────────────────────────────

describe('PATCH /api/admin/devis/:id/annuler — RM-151', () => {
  it('ADMIN annule un devis CREE → ANNULE', async () => {
    const created = await creerDevis(adminHeaders);
    const id = created.body.data.id;

    const res = await request(API_URL)
      .patch(`/api/admin/devis/${id}/annuler`)
      .set(adminHeaders)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe('ANNULE');
    expect(res.body.data.cancelled_at).not.toBeNull();
  });

  it('RM-151 : devis PAYE ne peut pas être annulé → 409 DEVIS_ANNULATION_IMPOSSIBLE', async () => {
    const created = await creerDevis(adminHeaders);
    const id = created.body.data.id;

    await request(API_URL).patch(`/api/admin/devis/${id}/payer`).set(adminHeaders).send({});

    const res = await request(API_URL)
      .patch(`/api/admin/devis/${id}/annuler`)
      .set(adminHeaders)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('DEVIS_ANNULATION_IMPOSSIBLE');
  });

  it('devis déjà ANNULE ne peut pas être re-annulé → 409', async () => {
    const created = await creerDevis(adminHeaders);
    const id = created.body.data.id;

    await request(API_URL).patch(`/api/admin/devis/${id}/annuler`).set(adminHeaders).send({});

    const res = await request(API_URL)
      .patch(`/api/admin/devis/${id}/annuler`)
      .set(adminHeaders)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('DEVIS_ANNULATION_IMPOSSIBLE');
  });

  it('AGENT ne peut pas annuler — 403', async () => {
    const created = await creerDevis(adminHeaders);
    const id = created.body.data.id;

    const res = await request(API_URL)
      .patch(`/api/admin/devis/${id}/annuler`)
      .set(agentHeaders)
      .send({});

    expect(res.status).toBe(403);
  });

  it('devis inexistant → 404 DEVIS_NOT_FOUND', async () => {
    const res = await request(API_URL)
      .patch('/api/admin/devis/00000000-0000-0000-0000-000000000000/annuler')
      .set(adminHeaders)
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('DEVIS_NOT_FOUND');
  });
});
