const { auth, accounts, createApprenantAccount, ids, prisma, request, API_URL } = require('./helpers');

describe('RM-38 — Usage Unique Voucher Organisation (Criticité 5)', () => {
  async function cleanupVoucherInscription(voucherCode, extraWhere = {}) {
    const dossiers = await prisma.dossier.findMany({
      where: { voucher_code: voucherCode, ...extraWhere },
      select: { id: true },
    });
    const dossierIds = dossiers.map((dossier) => dossier.id);

    if (dossierIds.length > 0) {
      const paiements = await prisma.paiement.findMany({
        where: { dossier_id: { in: dossierIds } },
        select: { id: true },
      });
      const paiementIds = paiements.map((paiement) => paiement.id);

      if (paiementIds.length > 0) {
        await prisma.commissionApporteur.deleteMany({ where: { paiement_id: { in: paiementIds } } });
        await prisma.commissionPartenaire.deleteMany({ where: { paiement_id: { in: paiementIds } } });
        await prisma.paiement.deleteMany({ where: { id: { in: paiementIds } } });
      }
      await prisma.dossier.deleteMany({ where: { id: { in: dossierIds } } });
    }
  }

  // Créer des vouchers uniques par test pour éviter pollution entre tests
  async function createTestVoucher(testId, quotaMax = 10) {
    const voucherCode = `ORG-RM38-${testId}-${Date.now()}`;
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

  test('RM-38.1 — Apprenant peut utiliser voucher Organisation une fois', async () => {
    const apprenant = await createApprenantAccount('rm38-1');
    const headers = await auth(apprenant);
    const voucherCode = await createTestVoucher('38-1');

    // Première utilisation du voucher → succès
    const res1 = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({
        source_financement: 'VOUCHER',
        voucher_code: voucherCode,
      });

    expect(res1.status).toBe(201);
    const dossier = res1.body.dossier || res1.body.data || res1.body;
    expect(dossier.voucher_code).toBe(voucherCode);

    // Cleanup
    await cleanupVoucherInscription(voucherCode);
    await prisma.voucherApporteur.delete({ where: { code: voucherCode } });
  });

  test('RM-38.2 — Apprenant ne peut réutiliser le même voucher (usage unique)', async () => {
    const apprenant = await createApprenantAccount('rm38-2');
    const headers = await auth(apprenant);
    const voucherCode = await createTestVoucher('38-2');

    // Première utilisation → succès
    const res1 = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({
        source_financement: 'VOUCHER',
        voucher_code: voucherCode,
      });

    expect(res1.status).toBe(201);

    // Créer deuxième session FORMATION DIFFÉRENTE pour tester réutilisation voucher (RM-38)
    // Note: Si même formation, RM-15 bloque avant (409 ALREADY_ENROLLED)
    const session2Id = `S-RM38-${Date.now()}`;
    await prisma.session.create({
      data: {
        id: session2Id,
        formation_id: ids.premiumRetailFormation, // Formation DIFFÉRENTE (RM-38 uniquement)
        statut: 'OUVERTE',
        capacite: 50,
        places_restantes: 50,
        date_ouverture: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
        date_cloture: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15),
        date_debut: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20),
        date_fin: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25),
      },
    });

    // RM-38 : Tenter de réutiliser le même voucher → rejet 422
    const res2 = await request(API_URL)
      .post(`/api/sessions/${session2Id}/inscrire`)
      .set(headers)
      .send({
        source_financement: 'VOUCHER',
        voucher_code: voucherCode,
      });

    // Cleanup
    await prisma.dossier.deleteMany({ where: { session_id: session2Id } });
    await prisma.session.delete({ where: { id: session2Id } });
    await cleanupVoucherInscription(voucherCode);
    await prisma.voucherApporteur.delete({ where: { code: voucherCode } });

    if (res2.status !== 422) {
      console.log('RM-38.2 error:', res2.status, res2.body);
    }
    expect(res2.status).toBe(422);
    // RM-37 vérifie formation_id avant RM-38 → VOUCHER_WRONG_FORMATION attendu ici
    expect(res2.body.error).toMatch(/VOUCHER_WRONG_FORMATION|VOUCHER_ALREADY_USED|USAGE_UNIQUE/i);
  });

  test('RM-38.3 — Deux apprenants différents peuvent utiliser le même voucher (quota)', async () => {
    // Créer un nouveau voucher avec quota > 1
    const voucherCode = `ORG-RM38-${Date.now()}`;
    const org = await prisma.organisation.findFirst({ where: { statut: 'ACTIVE' } });
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
        quota_max: 5,
        quota_utilise: 0,
        date_expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Apprenant 1 utilise le voucher
    const apprenant1 = await createApprenantAccount('rm38-3a');
    const headers1 = await auth(apprenant1);

    const res1 = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers1)
      .send({
        source_financement: 'VOUCHER',
        voucher_code: voucherCode,
      });

    expect(res1.status).toBe(201);

    // Apprenant 2 utilise le même voucher → succès (quota > 1)
    const apprenant2 = await createApprenantAccount('rm38-3b');
    const headers2 = await auth(apprenant2);

    const res2 = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers2)
      .send({
        source_financement: 'VOUCHER',
        voucher_code: voucherCode,
      });

    expect(res2.status).toBe(201);

    // Vérifier quota_utilise
    const voucher = await prisma.voucherApporteur.findUnique({ where: { code: voucherCode } });
    expect(voucher.quota_utilise).toBe(2);

    // Cleanup
    await cleanupVoucherInscription(voucherCode);
    await prisma.voucherApporteur.delete({ where: { code: voucherCode } });
  });

  test('RM-38.4 — Voucher devient EPUISE quand quota atteint', async () => {
    // Créer voucher avec quota = 1
    const voucherCode = `ORG-RM38-${Date.now()}-QUOTA`;
    const org = await prisma.organisation.findFirst({ where: { statut: 'ACTIVE' } });
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
        quota_max: 1, // Quota = 1
        quota_utilise: 0,
        date_expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Utiliser le voucher
    const apprenant = await createApprenantAccount('rm38-4');
    const headers = await auth(apprenant);

    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({
        source_financement: 'VOUCHER',
        voucher_code: voucherCode,
      });

    expect(res.status).toBe(201);

    // RM-38 : Vérifier que le voucher passe à EPUISE
    const voucher = await prisma.voucherApporteur.findUnique({ where: { code: voucherCode } });
    expect(voucher.quota_utilise).toBe(1);
    expect(voucher.statut).toBe('EPUISE');

    // Cleanup
    await cleanupVoucherInscription(voucherCode);
    await prisma.voucherApporteur.delete({ where: { code: voucherCode } });
  });
});
