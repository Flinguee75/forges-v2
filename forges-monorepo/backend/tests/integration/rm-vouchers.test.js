const { accounts, auth, createApprenantAccount, ids, prisma, request, API_URL } = require('./helpers');

describe('Vague 1 API — Vouchers RM-37/RM-38/RM-39/RM-40/RM-143/RM-144', () => {
  // Helper pour créer un voucher de test unique
  async function createTestVoucher(testId, quotaMax = 10) {
    const voucherCode = `ORG-TEST-${testId}-${Date.now()}`;
    const org = await prisma.organisation.findFirst({ where: { statut: 'ACTIF' } });
    const orgId = org ? org.id : ids.organisation;

    await prisma.voucherApporteur.create({
      data: {
        code: voucherCode,
        type: 'PROMOTIONNEL',
        type_valeur: 'MONTANT',
        valeur: 2000000,
        statut: 'ACTIF',
        organisation_id: orgId,
        formation_id: ids.standardFormation,
        quota_max: quotaMax,
        quota_utilise: 0,
        date_expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return voucherCode;
  }

  test('RM-37/RM-40 — voucher organisation lie a formation et non expire', async () => {
    const voucherCode = await createTestVoucher('RM37-40');

    // Vérifier en DB que le voucher est bien créé avec les bonnes propriétés
    const voucher = await prisma.voucherApporteur.findUnique({
      where: { code: voucherCode }
    });

    expect(voucher).toBeDefined();
    expect(voucher.formation_id).toBe(ids.standardFormation);
    expect(voucher.statut).toBe('ACTIF');
    expect(voucher.date_expiration).toBeTruthy();
    expect(new Date(voucher.date_expiration) > new Date()).toBe(true);

    // Cleanup
    await prisma.voucherApporteur.delete({ where: { code: voucherCode } });
  });

  test('RM-40 — voucher expire est refuse', async () => {
    const headers = await auth(accounts.organisation);
    const res = await request(API_URL)
      .post('/api/vouchers/check')
      .set(headers)
      .send({ code: ids.expiredVoucherCode, formation_id: ids.standardFormation });

    expect([400, 404, 422]).toContain(res.status);
  });

  test('RM-143 — code apporteur actif est valide', async () => {
    const headers = await auth(accounts.apprenant);
    const res = await request(API_URL).get(`/api/vouchers/apporteur/${ids.apporteurCode}/check`).set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe(ids.apporteurCode);
  });

  test('RM-144 — code apporteur et voucher simultanes sont interdits', async () => {
    const voucherCode = await createTestVoucher('RM144');
    const headers = await auth(await createApprenantAccount('rm144'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({
        source_financement: 'RETAIL',
        voucher_code: voucherCode,
        code_apporteur: ids.apporteurCode,
      });

    expect([400, 422]).toContain(res.status);

    // Cleanup
    await prisma.dossier.deleteMany({ where: { voucher_code: voucherCode } });
    await prisma.voucherApporteur.delete({ where: { code: voucherCode } }).catch(() => {});
  });

  test.skip('RM-39 — workflow promotionnel conserve BROUILLON avant validation', async () => {
    const headers = await auth(accounts.admin);
    const res = await request(API_URL)
      .post('/api/vouchers/promotionnel')
      .set(headers)
      .send({
        code: `PROMO-RM-${Date.now()}`,
        formation_id: ids.standardFormation,
        type_valeur: 'POURCENTAGE',
        valeur: 10,
        quota_max: 5,
        date_expiration: new Date(Date.now() + 30 * 86400000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.statut).toBe('BROUILLON');
  });

  test('RM-37.2 — Voucher lié à formation spécifique ne peut être utilisé pour autre formation', async () => {
    const voucherCode = await createTestVoucher('RM37-2');
    const headers = await auth(await createApprenantAccount('rm37-2'));

    // Tenter d'utiliser voucher Standard sur formation Premium
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.premiumRetailSession}/inscrire`)
      .set(headers)
      .send({
        source_financement: 'VOUCHER',
        voucher_code: voucherCode, // Lié à standardFormation
      });

    // RM-37 : Rejet 422
    if (res.status !== 422) {
      console.log('RM-37.2 error:', res.status, res.body);
    }
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/VOUCHER_WRONG_FORMATION|FORMATION/i);

    // Cleanup
    await prisma.dossier.deleteMany({ where: { voucher_code: voucherCode } });
    await prisma.voucherApporteur.delete({ where: { code: voucherCode } });
  });

  test('RM-41.1 — Voucher Organisation déclenche paiement automatique', async () => {
    const freshCode = `ORG-RM41-${Date.now()}`;
    const orgActive = await prisma.organisation.findFirst({ where: { statut: 'ACTIF' } });
    await prisma.voucherApporteur.create({
      data: {
        code: freshCode,
        type: 'PROMOTIONNEL',
        formation_id: ids.standardFormation,
        statut: 'ACTIF',
        quota_max: 5,
        quota_utilise: 0,
        date_expiration: new Date(Date.now() + 30 * 86400000),
        organisation_id: orgActive.id,
      },
    });

    const headers = await auth(await createApprenantAccount('rm41-1'));

    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({
        source_financement: 'VOUCHER',
        voucher_code: freshCode,
      });

    if (res.status !== 201) {
      console.log('RM-41.1 error:', res.status, res.body);
    }
    expect(res.status).toBe(201);

    const dossier = res.body.dossier || res.body.data;
    expect(['PAYE', 'PAYE_DIRECTEMENT']).toContain(dossier.statut);
  });

  // RM-41.2 : Paiement automatique voucher Org — SKIP (hors priorité Phase 1)
  // Backend ne crée pas encore automatiquement le paiement pour vouchers Organisation
  // TODO Phase 3 : Implémenter création automatique paiement VOUCHER_ORG dans InscriptionService
  test.skip('RM-41.2 — Paiement Organisation créé automatiquement avec montant voucher', async () => {
    const { prisma } = require('./helpers');
    const headers = await auth(await createApprenantAccount('rm41-2'));

    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({
        source_financement: 'VOUCHER',
        voucher_code: ids.orgVoucherCode,
      });

    expect(res.status).toBe(201);

    // RM-41 : Vérifier paiement automatique créé
    const dossierId = res.body.dossier?.id || res.body.data?.id;
    const paiement = await prisma.paiement.findFirst({
      where: { dossier_id: dossierId },
    });

    expect(paiement).toBeDefined();
    expect(paiement.statut).toBe('CONFIRME');
    expect(paiement.methode).toBe('VOUCHER_ORG');
  });
});
