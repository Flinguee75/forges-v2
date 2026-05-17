const {
  accounts,
  auth,
  createApprenantAccount,
  ids,
  request,
  API_URL,
} = require('./helpers');

describe('RM-140 — Bifurcation statut dossier a l\'inscription', () => {

  test('CAS-1 — Standard+Retail -> PAYE_DIRECTEMENT', async () => {
    const headers = await auth(await createApprenantAccount('rm140-c1'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    expect(res.status).toBe(201);
    expect(res.body.dossier.statut).toBe('PAYE_DIRECTEMENT');
    expect(res.body.dossier.statut).not.toBe('EN_ATTENTE_VERIFICATION');
  });

  test('CAS-2 — Standard+B2B -> PAYE_DIRECTEMENT', async () => {
    const headers = await auth(await createApprenantAccount('rm140-c2'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'B2B' });

    expect(res.status).toBe(201);
    expect(res.body.dossier.statut).toBe('PAYE_DIRECTEMENT');
    expect(res.body.dossier.statut).not.toBe('EN_ATTENTE_VERIFICATION');
  });

  test('CAS-3 — Standard+VoucherOrg -> PAYE', async () => {
    const headers = await auth(await createApprenantAccount('rm140-c3'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'VOUCHER', voucher_code: 'VORG-E2E-UCS12-01' });

    expect(res.status).toBe(201);
    expect(res.body.dossier.statut).toBe('PAYE');
    expect(res.body.dossier.statut).not.toBe('EN_ATTENTE_VERIFICATION');
  });

  test('CAS-4 — Standard+VoucherPromo -> PAYE_DIRECTEMENT', async () => {
    const headers = await auth(await createApprenantAccount('rm140-c4'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'VOUCHER', voucher_code: ids.orgVoucherCode });

    expect(res.status).toBe(201);
    expect(res.body.dossier.statut).toBe('PAYE_DIRECTEMENT');
    expect(res.body.dossier.statut).not.toBe('EN_ATTENTE_VERIFICATION');
  });

  test('CAS-5 — Premium+Retail -> EN_ATTENTE_VERIFICATION', async () => {
    const headers = await auth(await createApprenantAccount('rm140-c5'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.premiumRetailSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    expect(res.status).toBe(201);
    expect(res.body.dossier.statut).toBe('EN_ATTENTE_VERIFICATION');
  });

  test('CAS-6 — Premium+B2B -> PAYE_DIRECTEMENT', async () => {
    const headers = await auth(await createApprenantAccount('rm140-c6'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.premiumB2bSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'B2B' });

    expect(res.status).toBe(201);
    expect(res.body.dossier.statut).toBe('PAYE_DIRECTEMENT');
    expect(res.body.dossier.statut).not.toBe('EN_ATTENTE_VERIFICATION');
  });

  test('CAS-7 — Premium+Abonnement -> PAYE_DIRECTEMENT', async () => {
    const headers = await auth(accounts.apprenantRetail);
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.premiumRetailSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'ABONNEMENT' });

    expect(res.status).toBe(201);
    expect(res.body.dossier.statut).toBe('PAYE_DIRECTEMENT');
    expect(res.body.dossier.statut).not.toBe('EN_ATTENTE_VERIFICATION');
  });

  test('NEG — EN_ATTENTE_VERIFICATION jamais produit hors Premium+Retail', async () => {
    const cases = [
      { session: ids.standardSession, body: { source_financement: 'RETAIL' }, label: 'stdretail' },
      { session: ids.standardSession, body: { source_financement: 'B2B' }, label: 'stdb2b' },
      { session: ids.premiumB2bSession, body: { source_financement: 'B2B' }, label: 'premb2b' },
    ];

    for (const cas of cases) {
      const headers = await auth(await createApprenantAccount(`rm140-neg-${cas.label}`));
      const res = await request(API_URL)
        .post(`/api/sessions/${cas.session}/inscrire`)
        .set(headers)
        .send(cas.body);

      expect(res.status).toBe(201);
      expect(res.body.dossier.statut).not.toBe('EN_ATTENTE_VERIFICATION');
    }
  });
});
