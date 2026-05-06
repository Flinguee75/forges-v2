/**
 * Tests d'intégration — Réconciliation NGSER (RM-159)
 * Couvre: POST /api/admin/scheduler/reconciliation-ngser
 *
 * Le scheduler cherche les paiements PENDING depuis plus de N minutes
 * et les réconcilie via IPN mock (mode mock) ou API NGSER (mode réel).
 */

const { request, auth, accounts, createApprenantAccount, ids, prisma, API_URL } = require('./helpers');

// Force mock mode pour les tests de réconciliation
const NGSER_MOCK_MODE_ORIGINAL = process.env.NGSER_MOCK_MODE;

async function authAdmin() {
  return auth(accounts.admin);
}

async function createPaiementPending(prefix, minutesOld = 35) {
  const account = await createApprenantAccount(prefix + '-' + Date.now());
  const headers = await auth(account);

  const inscription = await request(API_URL)
    .post(`/api/sessions/${ids.standardSession}/inscrire`)
    .set(headers)
    .send({ source_financement: 'RETAIL' });

  if (inscription.status !== 201) {
    throw new Error(`Inscription échouée: ${inscription.status}`);
  }

  const dossierId = inscription.body.dossier.id;

  // Initier le paiement (créé en PENDING)
  process.env.NGSER_MOCK_MODE = 'true';
  const initiation = await request(API_URL)
    .post('/api/paiements/initier')
    .set(headers)
    .send({ dossier_id: dossierId });

  if (initiation.status !== 201) {
    throw new Error(`Initiation échouée: ${initiation.status}`);
  }

  // Rendre le paiement éligible en rétrodatant created_at
  const paiement = await prisma.paiement.findUnique({ where: { dossier_id: dossierId } });
  await prisma.paiement.update({
    where: { id: paiement.id },
    data: {
      created_at: new Date(Date.now() - minutesOld * 60 * 1000),
    },
  });

  return { account, headers, dossierId, paiement };
}

describe('RM-159 — Réconciliation NGSER (scheduler)', () => {
  beforeEach(() => {
    process.env.NGSER_MOCK_MODE = 'true';
    process.env.NGSER_RECONCILIATION_PENDING_MINUTES = '30';
  });

  afterEach(async () => {
    process.env.NGSER_MOCK_MODE = NGSER_MOCK_MODE_ORIGINAL;
    await prisma.commissionPartenaire.deleteMany({
      where: { paiement: { dossier_id: { startsWith: 'D-RECON-' } } },
    });
    await prisma.paiement.deleteMany({
      where: { dossier_id: { startsWith: 'D-RECON-' } },
    });
    await prisma.dossier.deleteMany({
      where: { id: { startsWith: 'D-RECON-' } },
    });
  });

  test('RM-159.1: scheduler confirme un paiement PENDING ancien (mode mock)', async () => {
    const { dossierId, paiement } = await createPaiementPending('recon-ok', 35);
    const adminHeaders = await authAdmin();

    const res = await request(API_URL)
      .post('/api/admin/scheduler/reconciliation-ngser')
      .set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.statusCode).toBe(200);

    // Attendre le traitement
    await new Promise((resolve) => setTimeout(resolve, 500));

    const paiementUpdated = await prisma.paiement.findUnique({ where: { id: paiement.id } });
    expect(paiementUpdated.statut).toBe('CONFIRME');

    const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } });
    expect(dossier.statut).toBe('PAYE');
  });

  test('RM-159.2: paiement PENDING trop récent (<30min) non touché', async () => {
    // Créer un paiement PENDING récent (seulement 5 minutes)
    const { paiement } = await createPaiementPending('recon-recent', 5);
    const adminHeaders = await authAdmin();

    await request(API_URL)
      .post('/api/admin/scheduler/reconciliation-ngser')
      .set(adminHeaders);

    await new Promise((resolve) => setTimeout(resolve, 300));

    // Doit rester PENDING (pas éligible)
    const paiementUpdated = await prisma.paiement.findUnique({ where: { id: paiement.id } });
    expect(paiementUpdated.statut).toBe('PENDING');
  });

  test('RM-159.3: plusieurs paiements PENDING réconciliés en batch', async () => {
    const [fix1, fix2] = await Promise.all([
      createPaiementPending('recon-batch1', 40),
      createPaiementPending('recon-batch2', 45),
    ]);

    const adminHeaders = await authAdmin();
    const res = await request(API_URL)
      .post('/api/admin/scheduler/reconciliation-ngser')
      .set(adminHeaders);

    expect(res.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 800));

    const [p1, p2] = await Promise.all([
      prisma.paiement.findUnique({ where: { id: fix1.paiement.id } }),
      prisma.paiement.findUnique({ where: { id: fix2.paiement.id } }),
    ]);

    expect(p1.statut).toBe('CONFIRME');
    expect(p2.statut).toBe('CONFIRME');
  });

  test('RM-159.4: scheduler requiert rôle ADMIN (AGENT non autorisé)', async () => {
    const agentHeaders = await auth(accounts.agent);

    const res = await request(API_URL)
      .post('/api/admin/scheduler/reconciliation-ngser')
      .set(agentHeaders);

    expect(res.status).toBe(403);
  });

  test('RM-159.5: scheduler idempotent — paiement déjà CONFIRME non retouché', async () => {
    const { dossierId, paiement } = await createPaiementPending('recon-idem', 35);
    const adminHeaders = await authAdmin();

    // Première réconciliation
    await request(API_URL)
      .post('/api/admin/scheduler/reconciliation-ngser')
      .set(adminHeaders);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const afterFirst = await prisma.paiement.findUnique({ where: { id: paiement.id } });
    expect(afterFirst.statut).toBe('CONFIRME');
    const confirmedAt = afterFirst.confirmed_at;

    // Deuxième réconciliation — ne doit pas retraiter
    await request(API_URL)
      .post('/api/admin/scheduler/reconciliation-ngser')
      .set(adminHeaders);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const afterSecond = await prisma.paiement.findUnique({ where: { id: paiement.id } });
    expect(afterSecond.statut).toBe('CONFIRME');
    // confirmed_at ne doit pas changer (idempotence)
    expect(afterSecond.confirmed_at?.toISOString()).toBe(confirmedAt?.toISOString());
  });
});
