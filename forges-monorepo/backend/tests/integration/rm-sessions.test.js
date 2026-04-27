const { accounts, auth, ids, prisma, request, API_URL } = require('./helpers');

describe('Vague 1 API — Sessions RM-14/RM-16/RM-17/RM-20/RM-21', () => {
  test('RM-14/RM-16 — les 4 dates sont obligatoires et chronologiques', async () => {
    const headers = await auth(accounts.responsable);
    const missing = await request(API_URL)
      .post('/api/backoffice/sessions')
      .set(headers)
      .send({ formation_id: ids.standardFormation, capacite: 20 });
    expect(missing.status).toBe(400);

    const chrono = await request(API_URL)
      .post('/api/backoffice/sessions')
      .set(headers)
      .send({
        formation_id: ids.standardFormation,
        capacite: 20,
        date_ouverture: new Date(Date.now() + 4 * 86400000).toISOString(),
        date_cloture: new Date(Date.now() + 2 * 86400000).toISOString(),
        date_debut: new Date(Date.now() + 10 * 86400000).toISOString(),
        date_fin: new Date(Date.now() + 12 * 86400000).toISOString(),
      });
    expect(chrono.status).toBe(400);
  });

  test('RM-17 — non-chevauchement des sessions pour une formation', async () => {
    const headers = await auth(accounts.responsable);
    const overlap = await request(API_URL)
      .post('/api/backoffice/sessions')
      .set(headers)
      .send({
        formation_id: ids.standardFormation,
        capacite: 20,
        date_ouverture: new Date(Date.now() + 1 * 86400000).toISOString(),
        date_cloture: new Date(Date.now() + 3 * 86400000).toISOString(),
        date_debut: new Date(Date.now() + 10 * 86400000).toISOString(),
        date_fin: new Date(Date.now() + 15 * 86400000).toISOString(),
      });

    expect([400, 409]).toContain(overlap.status);
  });

  test('RM-20/RM-21 — scheduler transitionne et archive', async () => {
    const headers = await auth(accounts.admin);
    const run = await request(API_URL).post('/api/backoffice/sessions/scheduler/run').set(headers).send({});
    expect(run.status).toBe(200);

    const planifiee = await prisma.session.findUnique({ where: { id: ids.sessionPlanifiee || 'S-E2E-PLANIFIEE-01' } });
    const archivable = await prisma.session.findUnique({ where: { id: 'S-E2E-ARCHIVABLE-01' } });
    expect(planifiee.statut).not.toBe('PLANIFIEE');
    expect(archivable.statut).toBe('ARCHIVEE');
  });
});
