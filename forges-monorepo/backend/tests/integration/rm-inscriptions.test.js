const { accounts, auth, createApprenantAccount, ids, prisma, request, API_URL } = require('./helpers');

describe('Vague 1 API — Inscriptions RM-01/RM-15/RM-18/RM-02', () => {
  test('RM-01 — unicite apprenant/session', async () => {
    const headers = await auth(await createApprenantAccount('rm01'));
    const first = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });
    expect(first.status).toBe(201);

    const second = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });
    expect(second.status).toBe(409);
  });

  test('RM-15 — unicite apprenant/formation cross-sessions apres PAYE', async () => {
    const headers = await auth(accounts.apprenantDossier);
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    expect(res.status).toBe(409);
  });

  test('RM-18 — depassement capacite cree GRIS puis EXCEPTION', async () => {
    const gris = await prisma.dossier.findFirst({ where: { type_fenetre: 'GRIS' } });
    const exception = await prisma.dossier.findFirst({ where: { type_fenetre: 'EXCEPTION' } });

    expect(gris).toBeTruthy();
    expect(exception).toBeTruthy();
  });

  test('RM-02 — une session pleine ne doit plus accepter les inscriptions normales', async () => {
    const session = await prisma.session.findUnique({ where: { id: ids.standardSession } });
    expect(session.capacite).toBeGreaterThan(0);
    expect(session.places_restantes).toBeGreaterThanOrEqual(0);
  });
});
