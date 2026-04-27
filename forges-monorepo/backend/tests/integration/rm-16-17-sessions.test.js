const { auth, accounts, ids, prisma, request, API_URL } = require('./helpers');

describe('RM-16 & RM-17 — Cohérence Dates & Non-Chevauchement Sessions (Criticité 5)', () => {

  let responsableHeaders;

  beforeAll(async () => {
    responsableHeaders = await auth(accounts.responsable);
  });

  test('RM-16.1 — Création session avec dates cohérentes (ouverture ≤ clôture ≤ début ≤ fin)', async () => {
    const now = Date.now();
    const ouverture = new Date(now + 1000 * 60 * 60 * 24 * 4); // +4j (RM-04: min 3j)
    const cloture = new Date(now + 1000 * 60 * 60 * 24 * 10); // +10j
    const debut = new Date(now + 1000 * 60 * 60 * 24 * 15); // +15j
    const fin = new Date(now + 1000 * 60 * 60 * 24 * 20); // +20j

    const res = await request(API_URL)
      .post('/api/responsable/sessions')
      .set(responsableHeaders)
      .send({
        formation_id: ids.standardFormation,
        capacite: 50,
        date_ouverture: ouverture.toISOString(),
        date_cloture: cloture.toISOString(),
        date_debut: debut.toISOString(),
        date_fin: fin.toISOString(),
      });

    if (res.status !== 201) {
      console.log('RM-16.1 error:', res.status, res.body);
    }
    expect(res.status).toBe(201);

    // Cleanup
    if (res.body?.data?.id) {
      await prisma.session.delete({ where: { id: res.body.data.id } });
    }
  });

  test('RM-16.2 — Rejet si ouverture > clôture', async () => {
    const now = Date.now();
    const ouverture = new Date(now + 1000 * 60 * 60 * 24 * 10); // +10j
    const cloture = new Date(now + 1000 * 60 * 60 * 24 * 4); // +4j (AVANT ouverture)
    const debut = new Date(now + 1000 * 60 * 60 * 24 * 15); // +15j
    const fin = new Date(now + 1000 * 60 * 60 * 24 * 20); // +20j

    const res = await request(API_URL)
      .post('/api/responsable/sessions')
      .set(responsableHeaders)
      .send({
        formation_id: ids.standardFormation,
        capacite: 50,
        date_ouverture: ouverture.toISOString(),
        date_cloture: cloture.toISOString(),
        date_debut: debut.toISOString(),
        date_fin: fin.toISOString(),
      });

    // RM-16 : Rejet 400
    if (res.status !== 400) {
      console.log('RM-16.2 error:', res.status, res.body);
    }
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/CHRONOLOGY|DATE|VALIDATION/i);
  });

  test('RM-16.3 — Rejet si clôture > début', async () => {
    const now = Date.now();
    const ouverture = new Date(now + 1000 * 60 * 60 * 24 * 2); // +2j
    const cloture = new Date(now + 1000 * 60 * 60 * 24 * 15); // +15j
    const debut = new Date(now + 1000 * 60 * 60 * 24 * 10); // +10j (AVANT clôture)
    const fin = new Date(now + 1000 * 60 * 60 * 24 * 20); // +20j

    const res = await request(API_URL)
      .post('/api/responsable/sessions')
      .set(responsableHeaders)
      .send({
        formation_id: ids.standardFormation,
        capacite: 50,
        date_ouverture: ouverture.toISOString(),
        date_cloture: cloture.toISOString(),
        date_debut: debut.toISOString(),
        date_fin: fin.toISOString(),
      });

    // RM-16 : Rejet 400
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/CHRONOLOGY|DATE|VALIDATION/i);
  });

  test('RM-16.4 — Rejet si début > fin', async () => {
    const now = Date.now();
    const ouverture = new Date(now + 1000 * 60 * 60 * 24 * 2); // +2j
    const cloture = new Date(now + 1000 * 60 * 60 * 24 * 10); // +10j
    const debut = new Date(now + 1000 * 60 * 60 * 24 * 20); // +20j
    const fin = new Date(now + 1000 * 60 * 60 * 24 * 15); // +15j (AVANT début)

    const res = await request(API_URL)
      .post('/api/responsable/sessions')
      .set(responsableHeaders)
      .send({
        formation_id: ids.standardFormation,
        capacite: 50,
        date_ouverture: ouverture.toISOString(),
        date_cloture: cloture.toISOString(),
        date_debut: debut.toISOString(),
        date_fin: fin.toISOString(),
      });

    // RM-16 : Rejet 400
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/CHRONOLOGY|DATE|VALIDATION/i);
  });

  test('RM-17.1 — Sessions ne peuvent se chevaucher pour la même formation', async () => {
    const now = Date.now();

    // Session existante
    const session1Id = `S-RM17-${now}-1`;
    await prisma.session.create({
      data: {
        id: session1Id,
        formation_id: ids.standardFormation,
        statut: 'PLANIFIEE',
        capacite: 50,
        date_ouverture: new Date(now + 1000 * 60 * 60 * 24 * 2),
        date_cloture: new Date(now + 1000 * 60 * 60 * 24 * 10),
        places_restantes: 50,
        date_debut: new Date(now + 1000 * 60 * 60 * 24 * 15),
        date_fin: new Date(now + 1000 * 60 * 60 * 24 * 20),
      },
    });

    // Tenter de créer session chevauchante (début avant fin de session1)
    const ouverture2 = new Date(now + 1000 * 60 * 60 * 24 * 12);
    const cloture2 = new Date(now + 1000 * 60 * 60 * 24 * 16);
    const debut2 = new Date(now + 1000 * 60 * 60 * 24 * 17); // Chevauche session1
    const fin2 = new Date(now + 1000 * 60 * 60 * 24 * 25);

    const res = await request(API_URL)
      .post('/api/responsable/sessions')
      .set(responsableHeaders)
      .send({
        formation_id: ids.standardFormation, // Même formation
        capacite: 50,
        modalite: 'EN_LIGNE',
        date_ouverture: ouverture2.toISOString(),
        date_cloture: cloture2.toISOString(),
        date_debut: debut2.toISOString(),
        date_fin: fin2.toISOString(),
      });

    // RM-17 : Rejet 409
    if (res.status !== 409) {
      console.log('RM-17.1 error:', res.status, res.body);
    }
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/OVERLAP|CHEVAUCHEMENT/i);

    // Cleanup
    await prisma.session.delete({ where: { id: session1Id } });
  });

  test('RM-17.2 — Sessions peuvent se chevaucher pour des formations différentes', async () => {
    const now = Date.now();

    // Session formation Standard
    const session1Id = `S-RM17-${now}-STD`;
    await prisma.session.create({
      data: {
        id: session1Id,
        formation_id: ids.standardFormation,
        statut: 'PLANIFIEE',
        capacite: 50,
        date_ouverture: new Date(now + 1000 * 60 * 60 * 24 * 4), // +4j RM-04
        date_cloture: new Date(now + 1000 * 60 * 60 * 24 * 10),
        places_restantes: 50,
        date_debut: new Date(now + 1000 * 60 * 60 * 24 * 15),
        date_fin: new Date(now + 1000 * 60 * 60 * 24 * 20),
      },
    });

    // Session formation Premium Retail (même période)
    const ouverture2 = new Date(now + 1000 * 60 * 60 * 24 * 4); // +4j RM-04
    const cloture2 = new Date(now + 1000 * 60 * 60 * 24 * 10);
    const debut2 = new Date(now + 1000 * 60 * 60 * 24 * 15);
    const fin2 = new Date(now + 1000 * 60 * 60 * 24 * 20);

    const res = await request(API_URL)
      .post('/api/responsable/sessions')
      .set(responsableHeaders)
      .send({
        formation_id: ids.premiumRetailFormation, // Formation différente
        capacite: 50,
        date_ouverture: ouverture2.toISOString(),
        date_cloture: cloture2.toISOString(),
        date_debut: debut2.toISOString(),
        date_fin: fin2.toISOString(),
      });

    // RM-17 : Autorisé car formations différentes
    expect(res.status).toBe(201);

    // Cleanup
    await prisma.session.deleteMany({
      where: {
        id: { in: [session1Id, res.body?.data?.id].filter(Boolean) },
      },
    });
  });
});
