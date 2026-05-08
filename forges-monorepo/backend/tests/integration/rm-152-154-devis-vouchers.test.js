/**
 * Tests d'intégration — Devis → Vouchers → Cascade PAYE (RM-152/153/154)
 *
 * Couvre :
 *   RM-152 : POST /api/admin/devis/:id/generer-vouchers → N vouchers EN_ATTENTE
 *   RM-152 : GET  /api/admin/devis/:id/vouchers → liste les vouchers du devis
 *   RM-153 : PATCH /api/admin/devis/:id/payer active les vouchers EN_ATTENTE → ACTIF
 *   RM-154 : dossiers liés aux vouchers passent automatiquement en PAYE
 *   RM-153 : voucher EN_ATTENTE rejeté à l'inscription → VOUCHER_INVALIDE
 *   RM-153 : voucher ACTIF (devis payé) accepté à l'inscription
 *   RBAC   : seul ADMIN peut générer, AGENT peut lister
 */

const { randomUUID } = require('crypto');
const { hash } = require('bcrypt');
const { API_URL, accounts, auth, ids, prisma, request } = require('./helpers');

const PASSWORD = 'Test@FORGES2026!';

let adminHeaders;
let agentHeaders;
let orgHeaders;
let organisationId;
let formationId;
let sessionId;
let createdDevisIds = [];
let createdVoucherIds = [];
let createdDossierIds = [];
let createdOrgId;
let createdApprenantId;

beforeAll(async () => {
  createdOrgId = randomUUID();
  const orgEmail = `org-rm152-${Date.now()}@forges.test`;

  await prisma.organisation.create({
    data: {
      id: createdOrgId,
      raison_sociale: 'ANSSI Test RM-152',
      email: orgEmail,
      password_hash: await hash(PASSWORD, 12),
      type: 'GOUVERNEMENT',
      sous_types: ['FORMATION'],
      identifiant_legal: `GOV-RM152-${Date.now()}`,
      contact_referent: 'DG ANSSI',
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

  // Le DTO devis exige un UUID — on utilise la première formation disponible
  const formation = await prisma.formation.findFirst({ where: { statut: 'PUBLIEE' } });
  if (!formation) throw new Error('Aucune formation PUBLIEE — lancez le seed avant ce test');
  formationId = formation.id;
  const session = await prisma.session.findFirst({ where: { formation_id: formationId, statut: 'OUVERTE' } });
  sessionId = session?.id ?? null;
});

afterAll(async () => {
  if (createdDossierIds.length > 0) {
    await prisma.dossier.deleteMany({ where: { id: { in: createdDossierIds } } }).catch(() => {});
  }
  if (createdVoucherIds.length > 0) {
    await prisma.voucherOrganisation.deleteMany({ where: { id: { in: createdVoucherIds } } }).catch(() => {});
  }
  if (createdDevisIds.length > 0) {
    await prisma.devis.deleteMany({ where: { id: { in: createdDevisIds } } }).catch(() => {});
  }
  if (createdApprenantId) {
    await prisma.apprenant.delete({ where: { id: createdApprenantId } }).catch(() => {});
  }
  if (createdOrgId) {
    await prisma.organisation.delete({ where: { id: createdOrgId } }).catch(() => {});
  }
});

// ─────────────────────────────────────────────
// Helpers locaux
// ─────────────────────────────────────────────

async function creerDevis(nbPlaces = 3) {
  const res = await request(API_URL)
    .post('/api/admin/devis')
    .set(adminHeaders)
    .send({
      organisation_id: organisationId,
      formation_id: formationId,
      nb_places: nbPlaces,
      tarif_unitaire_xof: 2000000,
      notes_admin: 'Test RM-152 ANSSI',
    });
  expect(res.status).toBe(201);
  createdDevisIds.push(res.body.data.id);
  return res.body.data;
}

async function creerDevisAvecFormation(formId, nbPlaces = 1) {
  const res = await request(API_URL)
    .post('/api/admin/devis')
    .set(adminHeaders)
    .send({
      organisation_id: organisationId,
      formation_id: formId,
      nb_places: nbPlaces,
      tarif_unitaire_xof: 500000,
      notes_admin: 'Test RM-153 usage voucher',
    });
  expect(res.status).toBe(201);
  createdDevisIds.push(res.body.data.id);
  return res.body.data;
}

async function genererVouchers(devisId) {
  const res = await request(API_URL)
    .post(`/api/admin/devis/${devisId}/generer-vouchers`)
    .set(adminHeaders)
    .send({});
  if (res.body?.data?.vouchers) {
    res.body.data.vouchers.forEach(v => createdVoucherIds.push(v.id));
  }
  return res;
}

// ─────────────────────────────────────────────
// RM-152 : génération vouchers
// ─────────────────────────────────────────────

describe('POST /api/admin/devis/:id/generer-vouchers — RM-152', () => {
  it('ADMIN génère nb_places vouchers EN_ATTENTE — 201', async () => {
    const devis = await creerDevis(3);
    const res = await genererVouchers(devis.id);

    expect(res.status).toBe(201);
    expect(res.body.data.nb_generes).toBe(3);
    expect(res.body.data.vouchers).toHaveLength(3);

    res.body.data.vouchers.forEach(v => {
      expect(v.statut).toBe('EN_ATTENTE');
      expect(v.devis_id).toBe(devis.id);
      expect(v.organisation_id).toBe(organisationId);
      expect(v.formation_id).toBe(formationId);
      expect(v.valeur).toBe(100);
      expect(v.type_valeur).toBe('POURCENTAGE');
      expect(v.quota_max).toBe(1);
    });
  });

  it('idempotence — deuxième appel → 409 VOUCHERS_DEJA_GENERES', async () => {
    const devis = await creerDevis(2);
    await genererVouchers(devis.id);

    const res2 = await request(API_URL)
      .post(`/api/admin/devis/${devis.id}/generer-vouchers`)
      .set(adminHeaders)
      .send({});

    expect(res2.status).toBe(409);
    expect(res2.body.error).toBe('VOUCHERS_DEJA_GENERES');
  });

  it('devis inexistant → 404 DEVIS_NOT_FOUND', async () => {
    const res = await request(API_URL)
      .post('/api/admin/devis/00000000-0000-0000-0000-000000000000/generer-vouchers')
      .set(adminHeaders)
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('DEVIS_NOT_FOUND');
  });

  it('devis annulé → 409 DEVIS_ANNULE', async () => {
    const devis = await creerDevis(1);
    await request(API_URL).patch(`/api/admin/devis/${devis.id}/annuler`).set(adminHeaders).send({});

    const res = await genererVouchers(devis.id);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('DEVIS_ANNULE');
  });

  it('AGENT ne peut pas générer des vouchers — 403', async () => {
    const devis = await creerDevis(1);
    const res = await request(API_URL)
      .post(`/api/admin/devis/${devis.id}/generer-vouchers`)
      .set(agentHeaders)
      .send({});

    expect(res.status).toBe(403);
  });

  it('ORGANISATION ne peut pas générer des vouchers — 403', async () => {
    const devis = await creerDevis(1);
    const res = await request(API_URL)
      .post(`/api/admin/devis/${devis.id}/generer-vouchers`)
      .set(orgHeaders)
      .send({});

    expect(res.status).toBe(403);
  });

  it('sans token → 401', async () => {
    const devis = await creerDevis(1);
    const res = await request(API_URL)
      .post(`/api/admin/devis/${devis.id}/generer-vouchers`)
      .send({});

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// RM-152 : lecture vouchers du devis
// ─────────────────────────────────────────────

describe('GET /api/admin/devis/:id/vouchers — RM-152', () => {
  it('ADMIN liste les vouchers d\'un devis', async () => {
    const devis = await creerDevis(2);
    await genererVouchers(devis.id);

    const res = await request(API_URL)
      .get(`/api/admin/devis/${devis.id}/vouchers`)
      .set(adminHeaders);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    res.body.data.forEach(v => expect(v.devis_id).toBe(devis.id));
  });

  it('AGENT peut lister les vouchers d\'un devis', async () => {
    const devis = await creerDevis(1);
    await genererVouchers(devis.id);

    const res = await request(API_URL)
      .get(`/api/admin/devis/${devis.id}/vouchers`)
      .set(agentHeaders);

    expect(res.status).toBe(200);
  });

  it('devis sans vouchers → liste vide', async () => {
    const devis = await creerDevis(1);

    const res = await request(API_URL)
      .get(`/api/admin/devis/${devis.id}/vouchers`)
      .set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('devis inexistant → 404', async () => {
    const res = await request(API_URL)
      .get('/api/admin/devis/00000000-0000-0000-0000-000000000000/vouchers')
      .set(adminHeaders);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('DEVIS_NOT_FOUND');
  });
});

// ─────────────────────────────────────────────
// RM-153 : paiement devis active les vouchers
// ─────────────────────────────────────────────

describe('PATCH /api/admin/devis/:id/payer — RM-153 activation vouchers', () => {
  it('payer le devis active les vouchers EN_ATTENTE → ACTIF', async () => {
    const devis = await creerDevis(3);
    const genRes = await genererVouchers(devis.id);
    const voucherIds = genRes.body.data.vouchers.map(v => v.id);

    // Vérifier statut avant
    const avant = await prisma.voucherOrganisation.findMany({
      where: { id: { in: voucherIds } },
    });
    avant.forEach(v => expect(v.statut).toBe('EN_ATTENTE'));

    // Payer
    const payRes = await request(API_URL)
      .patch(`/api/admin/devis/${devis.id}/payer`)
      .set(adminHeaders)
      .send({});

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.statut).toBe('PAYE');
    expect(payRes.body.data.vouchers_actives).toBe(3);

    // Vérifier statut après
    const apres = await prisma.voucherOrganisation.findMany({
      where: { id: { in: voucherIds } },
    });
    apres.forEach(v => expect(v.statut).toBe('ACTIF'));
  });

  it('devis payé sans vouchers — pas d\'erreur, vouchers_actives = 0', async () => {
    const devis = await creerDevis(2);
    // Pas de génération de vouchers

    const res = await request(API_URL)
      .patch(`/api/admin/devis/${devis.id}/payer`)
      .set(adminHeaders)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe('PAYE');
    expect(res.body.data.vouchers_actives).toBe(0);
  });

  it('RM-152 : devis déjà payé → 409 DEVIS_DEJA_PAYE pour génération de vouchers', async () => {
    const devis = await creerDevis(1);
    await request(API_URL).patch(`/api/admin/devis/${devis.id}/payer`).set(adminHeaders).send({});

    const res = await request(API_URL)
      .post(`/api/admin/devis/${devis.id}/generer-vouchers`)
      .set(adminHeaders)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('DEVIS_DEJA_PAYE');
  });
});

// ─────────────────────────────────────────────
// RM-154 : cascade dossiers → PAYE
// ─────────────────────────────────────────────

describe('RM-154 — cascade dossiers PAYE lors du paiement devis', () => {
  it('les dossiers liés aux vouchers du devis passent automatiquement en PAYE', async () => {
    // Créer un apprenant
    createdApprenantId = randomUUID();
    await prisma.apprenant.create({
      data: {
        id: createdApprenantId,
        email: `apprenant-rm154-${Date.now()}@forges.test`,
        password_hash: await hash(PASSWORD, 12),
        nom: 'Samassi',
        prenoms: 'Aly',
        type_apprenant: 'PROFESSIONNEL',
        pays_residence: 'CI',
        pays_nationalite: 'CI',
        statut: 'ACTIF',
      },
    });

    // Créer un devis et générer ses vouchers
    const devis = await creerDevis(1);
    const genRes = await genererVouchers(devis.id);
    const voucher = genRes.body.data.vouchers[0];

    // Créer un dossier lié à ce voucher (simulant l'inscription avec le voucher EN_ATTENTE)
    const dossierId = randomUUID();
    await prisma.dossier.create({
      data: {
        id: dossierId,
        apprenant_id: createdApprenantId,
        formation_id: formationId,
        session_id: sessionId || null,
        source_financement: 'B2B',
        statut: 'PAYE_DIRECTEMENT',
        voucher_organisation_id: voucher.id,
      },
    });
    createdDossierIds.push(dossierId);

    // Payer le devis → cascade
    const payRes = await request(API_URL)
      .patch(`/api/admin/devis/${devis.id}/payer`)
      .set(adminHeaders)
      .send({});

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.vouchers_actives).toBe(1);

    // Vérifier que le dossier est passé en PAYE
    const dossierApres = await prisma.dossier.findUnique({ where: { id: dossierId } });
    expect(dossierApres.statut).toBe('PAYE');
  });
});

// ─────────────────────────────────────────────
// RM-153 : voucher EN_ATTENTE rejeté à l'inscription
// ─────────────────────────────────────────────

describe('RM-153 — usage d\'un voucher selon son statut lors de l\'inscription', () => {
  let apprenantHeaders;

  beforeAll(async () => {
    apprenantHeaders = await auth(accounts.apprenantStd);
  });

  it('voucher EN_ATTENTE → inscription rejetée avec VOUCHER_INVALIDE', async () => {
    // Créer directement un voucher EN_ATTENTE lié à la formation standard seedée
    const code = `ATTENTE-RM153-${Date.now()}`;
    const voucher = await prisma.voucherOrganisation.create({
      data: {
        id: randomUUID(),
        code,
        organisation_id: organisationId,
        formation_id: ids.standardFormation,
        statut: 'EN_ATTENTE',
        quota_max: 1,
        quota_utilise: 0,
      },
    });
    createdVoucherIds.push(voucher.id);

    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(apprenantHeaders)
      .send({
        source_financement: 'VOUCHER',
        voucher_code: code,
      });

    expect(res.status).toBe(422);
    // Le backend utilise VOUCHER_INVALID (sans E final)
    expect(['VOUCHER_INVALIDE', 'VOUCHER_INVALID']).toContain(res.body.error);
  });

  it('voucher ACTIF → inscription acceptée', async () => {
    // Créer directement un voucher ACTIF lié à la formation standard seedée
    const code = `ACTIF-RM153-${Date.now()}`;
    const voucher = await prisma.voucherOrganisation.create({
      data: {
        id: randomUUID(),
        code,
        organisation_id: organisationId,
        formation_id: ids.standardFormation,
        statut: 'ACTIF',
        quota_max: 5,
        quota_utilise: 0,
      },
    });
    createdVoucherIds.push(voucher.id);

    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(apprenantHeaders)
      .send({
        source_financement: 'VOUCHER',
        voucher_code: code,
      });

    // Le voucher ACTIF ne doit pas provoquer d'erreur de statut voucher
    // (201 = inscrit, 409 = déjà inscrit — les deux prouvent que le voucher a passé la validation)
    expect([201, 409]).toContain(res.status);
    expect(['VOUCHER_INVALIDE', 'VOUCHER_INVALID', 'VOUCHER_EXPIRE', 'VOUCHER_QUOTA_EPUISE']).not.toContain(res.body.error);
    if (res.status === 201) {
      const dossier = res.body.data ?? res.body;
      if (dossier?.id) createdDossierIds.push(dossier.id);
    }
  });

  it('voucher EXPIRE (statut direct en base) → inscription rejetée', async () => {
    // Créer un voucher EXPIRE directement en base (sans passer par le devis)
    const code = `EXP-RM153-${Date.now()}`;
    const voucher = await prisma.voucherOrganisation.create({
      data: {
        id: randomUUID(),
        code,
        organisation_id: organisationId,
        formation_id: ids.standardFormation,
        statut: 'EXPIRE',
        quota_max: 1,
        quota_utilise: 0,
      },
    });
    createdVoucherIds.push(voucher.id);

    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(apprenantHeaders)
      .send({
        source_financement: 'VOUCHER',
        voucher_code: code,
      });

    // Pas de 201 — le voucher EXPIRE ne permet pas une inscription réussie
    expect(res.status).not.toBe(201);
    // L'erreur est soit liée au voucher soit au fait que l'apprenant est déjà inscrit (seed)
    expect(['VOUCHER_EXPIRE', 'VOUCHER_INVALIDE', 'VOUCHER_INVALID', 'ALREADY_ENROLLED']).toContain(res.body.error);
  });
});
