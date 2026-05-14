const { accounts, auth, ids, request, API_URL } = require('./helpers');

describe('RM-150 — Alias backoffice Superviseur pour la planification annuelle', () => {
  test('SUPERVISEUR peut planifier des sessions via /api/backoffice/sessions/planification-annuelle', async () => {
    const headers = await auth(accounts.superviseur);
    const base = Date.now();

    const sessions = [
      {
        formation_id: ids.standardFormation,
        capacite: 20,
        date_ouverture: new Date(base + 30 * 24 * 60 * 60 * 1000),
        date_cloture: new Date(base + 35 * 24 * 60 * 60 * 1000),
        date_debut: new Date(base + 37 * 24 * 60 * 60 * 1000),
        date_fin: new Date(base + 42 * 24 * 60 * 60 * 1000),
      },
      {
        formation_id: ids.standardFormation,
        capacite: 20,
        date_ouverture: new Date(base + 60 * 24 * 60 * 60 * 1000),
        date_cloture: new Date(base + 65 * 24 * 60 * 60 * 1000),
        date_debut: new Date(base + 67 * 24 * 60 * 60 * 1000),
        date_fin: new Date(base + 72 * 24 * 60 * 60 * 1000),
      },
    ];

    const res = await request(API_URL)
      .post('/api/backoffice/sessions/planification-annuelle')
      .set(headers)
      .send({ sessions });

    expect([200, 201]).toContain(res.status);
    expect(res.body.data?.created || res.body.created).toBeGreaterThanOrEqual(2);
  });
});
