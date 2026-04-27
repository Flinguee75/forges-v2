const { auth, accounts, prisma, request, API_URL } = require('./helpers');

describe('RM-22 & RM-23 — Visibilité Formation Catalogue (Criticité 5)', () => {

  const createFormation = async (id, intitule, mode_formation, statut) => {
    return await prisma.formation.create({
      data: {
        id,
        intitule,
        description_courte: `Test ${intitule}`,
        responsable_id: 'responsable-e2e',
        type_formation: 'STANDARD',
        mode_formation,
        pilier_abonnement: 'RETAIL',
        inclus_abonnement: true,
        cout_catalogue: 5000000,
        duree_jours: 5,
        statut,
        objectifs_pedagogiques: ['Test'],
        langues_disponibles: ['FR'],
      },
    });
  };

  test('RM-22.1 — Formation AVEC_SESSION visible SI session À venir', async () => {
    const formationId = `F-RM22-${Date.now()}-1`;
    const sessionId = `S-RM22-${Date.now()}-1`;

    await createFormation(formationId, 'Formation RM-22 Avec Session', 'AVEC_SESSION', 'ACTIVE');

    const now = Date.now();
    await prisma.session.create({
      data: {
        id: sessionId,
        formation_id: formationId,
        statut: 'PLANIFIEE',
        capacite: 50,
        date_ouverture: new Date(now + 1000 * 60 * 60 * 24 * 2),
        date_cloture: new Date(now + 1000 * 60 * 60 * 24 * 10),
        places_restantes: 50,
        date_debut: new Date(now + 1000 * 60 * 60 * 24 * 15),
        date_fin: new Date(now + 1000 * 60 * 60 * 24 * 20),
      },
    });

    // RM-22 : Formation visible dans catalogue
    const res = await request(API_URL).get('/api/formations');

    expect(res.status).toBe(200);
    const formations = res.body.data.formations || res.body.data;
    const formationVisible = formations.find(f => f.id === formationId);

    expect(formationVisible).toBeDefined();

    // Cleanup
    await prisma.session.delete({ where: { id: sessionId } });
    await prisma.formation.delete({ where: { id: formationId } });
  });

  test('RM-22.2 — Formation AVEC_SESSION visible SI session OUVERTE', async () => {
    const formationId = `F-RM22-${Date.now()}-2`;
    const sessionId = `S-RM22-${Date.now()}-2`;

    await createFormation(formationId, 'Formation RM-22 Session Ouverte', 'AVEC_SESSION', 'ACTIVE');

    const now = Date.now();
    await prisma.session.create({
      data: {
        id: sessionId,
        formation_id: formationId,
        statut: 'OUVERTE',
        capacite: 50,
        date_ouverture: new Date(now - 1000 * 60 * 60 * 24), // Hier
        date_cloture: new Date(now + 1000 * 60 * 60 * 24 * 10),
        places_restantes: 50,
        date_debut: new Date(now + 1000 * 60 * 60 * 24 * 15),
        date_fin: new Date(now + 1000 * 60 * 60 * 24 * 20),
      },
    });

    // RM-22 : Formation visible
    const res = await request(API_URL).get('/api/formations');

    expect(res.status).toBe(200);
    const formations = res.body.data.formations || res.body.data;
    const formationVisible = formations.find(f => f.id === formationId);

    expect(formationVisible).toBeDefined();

    // Cleanup
    await prisma.session.delete({ where: { id: sessionId } });
    await prisma.formation.delete({ where: { id: formationId } });
  });

  test('RM-22.3 — Formation A_LA_DEMANDE visible SI statut ACTIVE', async () => {
    const formationId = `F-RM22-${Date.now()}-3`;

    await createFormation(formationId, 'Formation RM-22 À la demande', 'A_LA_DEMANDE', 'ACTIVE');

    // RM-22 : Formation visible
    const res = await request(API_URL).get('/api/formations');

    expect(res.status).toBe(200);
    const formations = res.body.data.formations || res.body.data;
    const formationVisible = formations.find(f => f.id === formationId);

    expect(formationVisible).toBeDefined();

    // Cleanup
    await prisma.formation.delete({ where: { id: formationId } });
  });

  test('RM-22.4 — Formation EN_ATTENTE_VALIDATION invisible', async () => {
    const formationId = `F-RM22-${Date.now()}-4`;

    await createFormation(formationId, 'Formation RM-22 En Attente', 'AVEC_SESSION', 'EN_ATTENTE_VALIDATION');

    // RM-22 : Formation invisible
    const res = await request(API_URL).get('/api/formations');

    expect(res.status).toBe(200);
    const formations = res.body.data.formations || res.body.data;
    const formationInvisible = formations.find(f => f.id === formationId);

    expect(formationInvisible).toBeUndefined();

    // Cleanup
    await prisma.formation.delete({ where: { id: formationId } });
  });

  test('RM-23.1 — Formation AVEC_SESSION sans session reste EN_ATTENTE_PLANIFICATION (invisible)', async () => {
    const formationId = `F-RM23-${Date.now()}-1`;

    await createFormation(formationId, 'Formation RM-23 Sans Session', 'AVEC_SESSION', 'EN_ATTENTE_PLANIFICATION');

    // RM-23 : Formation invisible car EN_ATTENTE_PLANIFICATION
    const res = await request(API_URL).get('/api/formations');

    expect(res.status).toBe(200);
    const formations = res.body.data.formations || res.body.data;
    const formationInvisible = formations.find(f => f.id === formationId);

    expect(formationInvisible).toBeUndefined();

    // Cleanup
    await prisma.formation.delete({ where: { id: formationId } });
  });

  test('RM-23.2 — Formation AVEC_SESSION devient visible après ajout session', async () => {
    const formationId = `F-RM23-${Date.now()}-2`;
    const sessionId = `S-RM23-${Date.now()}-2`;

    await createFormation(formationId, 'Formation RM-23 Transition', 'AVEC_SESSION', 'EN_ATTENTE_PLANIFICATION');

    // RM-23 : Invisible au départ
    const res1 = await request(API_URL).get('/api/formations');
    const formations1 = res1.body.data.formations || res1.body.data;
    expect(formations1.find(f => f.id === formationId)).toBeUndefined();

    // Ajouter une session et passer en ACTIVE
    const now = Date.now();
    await prisma.session.create({
      data: {
        id: sessionId,
        formation_id: formationId,
        statut: 'PLANIFIEE',
        capacite: 50,
        date_ouverture: new Date(now + 1000 * 60 * 60 * 24 * 2),
        date_cloture: new Date(now + 1000 * 60 * 60 * 24 * 10),
        places_restantes: 50,
        date_debut: new Date(now + 1000 * 60 * 60 * 24 * 15),
        date_fin: new Date(now + 1000 * 60 * 60 * 24 * 20),
      },
    });

    await prisma.formation.update({
      where: { id: formationId },
      data: { statut: 'ACTIVE' },
    });

    // RM-23 : Maintenant visible
    const res2 = await request(API_URL).get('/api/formations');
    const formations2 = res2.body.data.formations || res2.body.data;
    expect(formations2.find(f => f.id === formationId)).toBeDefined();

    // Cleanup
    await prisma.session.delete({ where: { id: sessionId } });
    await prisma.formation.delete({ where: { id: formationId } });
  });
});
