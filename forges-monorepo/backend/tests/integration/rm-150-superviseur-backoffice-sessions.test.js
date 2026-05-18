const { accounts, auth, ids, prisma, request, API_URL } = require('./helpers');

describe('RM-150 — Alias backoffice Superviseur pour la planification annuelle', () => {
  test('SUPERVISEUR peut planifier des sessions via /api/backoffice/sessions/planification-annuelle', async () => {
    const headers = await auth(accounts.superviseur);
    const base = Date.now();
    const formationId = `F-RM150-${base}`;

    await prisma.formation.create({
      data: {
        id: formationId,
        intitule: 'Formation RM-150 planification annuelle',
        description_courte: 'Formation dédiée au test de planification annuelle.',
        duree_jours: 5,
        cout_catalogue: 150000,
        responsable_id: ids.responsable,
        type_formation: 'STANDARD',
        mode_formation: 'AVEC_SESSION',
        statut: 'ACTIVE',
        objectifs_pedagogiques: ['Tester la planification annuelle'],
        langues_disponibles: ['FR'],
      },
    });

    const sessions = [
      {
        formation_id: formationId,
        capacite: 20,
        date_ouverture: new Date(base + 30 * 24 * 60 * 60 * 1000),
        date_cloture: new Date(base + 35 * 24 * 60 * 60 * 1000),
        date_debut: new Date(base + 37 * 24 * 60 * 60 * 1000),
        date_fin: new Date(base + 42 * 24 * 60 * 60 * 1000),
      },
      {
        formation_id: formationId,
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

    await prisma.session.deleteMany({ where: { formation_id: formationId } });
    await prisma.formation.delete({ where: { id: formationId } });
  });
});
