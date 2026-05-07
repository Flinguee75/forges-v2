const { auth, createApprenantAccount, ids, prisma, request, API_URL } = require('./helpers');

describe('RM-143 — Validation Code Apporteur (Criticité 5)', () => {
  test('RM-143.1 — Code apporteur valide accepté', async () => {
    const apporteur = await prisma.apporteur.findUnique({ where: { id: ids.apporteur } });
    expect(apporteur.statut).toBe('ACTIF');

    const headers = await auth(await createApprenantAccount('rm143-1'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL', code_apporteur: ids.apporteurCode });

    expect(res.status).toBe(201);
  });

  test('RM-143.2 — Code invalide rejeté 422', async () => {
    const headers = await auth(await createApprenantAccount('rm143-2'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL', code_apporteur: 'INVALIDE' });

    expect(res.status).toBe(422);
  });

  test('RM-143.3 — Code apporteur suspendu rejeté 422', async () => {
    const susp = await prisma.apporteur.create({
      data: {
        email: `s${Date.now()}@t.com`,
        nom: 'S',
        type: 'INDIVIDU',
        password_hash: 'PENDING_ACTIVATION',
        code_apporteur: `S${Date.now()}`,
        statut: 'SUSPENDU',
      },
    });

    const headers = await auth(await createApprenantAccount('rm143-3'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL', code_apporteur: susp.code_apporteur });

    expect(res.status).toBe(422);
    await prisma.apporteur.delete({ where: { id: susp.id } });
  });
});

describe('RM-144 — Non-cumul code apporteur + voucher (Criticité 5)', () => {
  test('RM-144.1 — Code apporteur + voucher_code rejeté 422 VOUCHER_CUMUL_INTERDIT', async () => {
    const headers = await auth(await createApprenantAccount('rm144-1'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({
        source_financement: 'RETAIL',
        code_apporteur: ids.apporteurCode,
        voucher_code: ids.orgVoucherCode,
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('VOUCHER_CUMUL_INTERDIT');
  });

  test('RM-144.2 — Code apporteur seul sans voucher accepté', async () => {
    const headers = await auth(await createApprenantAccount('rm144-2'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({
        source_financement: 'RETAIL',
        code_apporteur: ids.apporteurCode,
      });

    expect(res.status).toBe(201);
  });
});
