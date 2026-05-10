const {
  auth,
  createApprenantAccount,
  ids,
  prisma,
  request,
  API_URL,
} = require('./helpers');

describe('J3 v4.9 — Initiation paiement NGSER mock', () => {
  beforeEach(() => {
    process.env.NGSER_MOCK_MODE = 'true';
  });

  async function createDossierFixture(prefix, overrides = {}) {
    const account = await createApprenantAccount(prefix);
    const dossierId = `D-J3-${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await prisma.dossier.create({
      data: {
        id: dossierId,
        apprenant_id: account.id,
        formation_id: overrides.formation_id || ids.standardFormation,
        session_id: overrides.session_id === undefined ? ids.standardSession : overrides.session_id,
        statut: overrides.statut || 'RETENU',
        source_financement: overrides.source_financement || 'RETAIL',
      },
    });
    return { account, dossierId };
  }

  test('ignore le montant client, genere order_ngser conforme et stocke les champs NGSER', async () => {
    const { account, dossierId } = await createDossierFixture('ngser-init');
    const headers = await auth(account);
    const formation = await prisma.formation.findUnique({ where: { id: ids.standardFormation } });

    const res = await request(API_URL)
      .post('/api/paiements/initier')
      .set(headers)
      .send({ dossier_id: dossierId, montant: 1 });

    expect(res.status).toBe(201);
    expect(res.body.data.order_ngser).toMatch(/^FRG-\d{4}-\d{3}-[A-F0-9]{6}$/);
    expect(res.body.data.order_ngser.length).toBeLessThanOrEqual(25);
    const expectedBase = (process.env.FRONTEND_URL || 'https://dev.forges-group.com').replace(/\/$/, '');
    expect(res.body.data.payment_url).toBe(
      `${expectedBase}/mock-checkout/${res.body.data.order_ngser}`
    );
    expect(res.body.data.montant_initie).toBe(formation.cout_catalogue);

    const paiement = await prisma.paiement.findUnique({ where: { dossier_id: dossierId } });
    expect(paiement.provider).toBe('NGSER');
    expect(paiement.payment_token_ngser).toMatch(/^mock-token-/);
    expect(paiement.order_ngser).toBe(res.body.data.order_ngser);
    expect(paiement.montant_initie).toBe(formation.cout_catalogue);
    expect(paiement.statut).toBe('PENDING');
  });

  test('garantit l unicite de order_ngser sur deux initiations', async () => {
    const fixture1 = await createDossierFixture('ngser-uniq-a');
    const fixture2 = await createDossierFixture('ngser-uniq-b');
    const headers1 = await auth(fixture1.account);
    const headers2 = await auth(fixture2.account);

    const res1 = await request(API_URL)
      .post('/api/paiements/initier')
      .set(headers1)
      .send({ dossier_id: fixture1.dossierId });
    const res2 = await request(API_URL)
      .post('/api/paiements/initier')
      .set(headers2)
      .send({ dossier_id: fixture2.dossierId });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(res1.body.data.order_ngser).not.toBe(res2.body.data.order_ngser);
  });

  test('rejette un dossier inexistant ou deja paye', async () => {
    const { account, dossierId } = await createDossierFixture('ngser-paid', { statut: 'PAYE' });
    const headers = await auth(account);

    const missing = await request(API_URL)
      .post('/api/paiements/initier')
      .set(headers)
      .send({ dossier_id: 'D-J3-MISSING' });
    expect(missing.status).toBe(404);

    const paid = await request(API_URL)
      .post('/api/paiements/initier')
      .set(headers)
      .send({ dossier_id: dossierId });
    expect(paid.status).toBe(409);
  });

  test('conserve la reduction Premium -15% deja applicable', async () => {
    const { account, dossierId } = await createDossierFixture('ngser-premium', {
      formation_id: ids.premiumRetailFormation,
      session_id: ids.premiumRetailSession,
      statut: 'RETENU',
    });
    await prisma.abonnementRetail.create({
      data: {
        apprenant_id: account.id,
        offre: 'PREMIUM',
        statut: 'ACTIF',
        date_debut: new Date(Date.now() - 24 * 3600 * 1000),
        date_fin: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        montant_mensuel: 2500000,
      },
    });

    const headers = await auth(account);
    const formation = await prisma.formation.findUnique({ where: { id: ids.premiumRetailFormation } });
    const expected = Math.floor(formation.cout_catalogue * 0.85);

    const res = await request(API_URL)
      .post('/api/paiements/initier')
      .set(headers)
      .send({ dossier_id: dossierId, montant: formation.cout_catalogue });

    expect(res.status).toBe(201);
    expect(res.body.data.montant_initie).toBe(expected);

    const paiement = await prisma.paiement.findUnique({ where: { dossier_id: dossierId } });
    expect(paiement.montant_catalogue).toBe(formation.cout_catalogue);
    expect(paiement.montant_final).toBe(expected);
    expect(paiement.montant_initie).toBe(expected);
    expect(paiement.reduction_appliquee).toBe(formation.cout_catalogue - expected);
  });
});
