const { auth, createApprenantAccount, ids, prisma, request, API_URL } = require('./helpers');

describe('RM-01 & RM-15 — Unicité Apprenant/Session & Formation (Criticité 5)', () => {

  test('RM-01.1 — Apprenant ne peut s\'inscrire deux fois à la même session', async () => {
    const apprenant = await createApprenantAccount('rm01-1');
    const headers = await auth(apprenant);

    // Première inscription
    const res1 = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    expect(res1.status).toBe(201);

    // RM-01 : Seconde inscription à la même session → rejet 409
    const res2 = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    if (res2.status !== 409) {
      console.log('RM-01.1 error:', res2.status, res2.body);
    }
    expect(res2.status).toBe(409);
    expect(res2.body.error).toMatch(/ALREADY_ENROLLED|DUPLICATE/i);
  });

  test('RM-01.2 — Apprenant peut s\'inscrire à la même session après annulation', async () => {
    const apprenant = await createApprenantAccount('rm01-2');
    const headers = await auth(apprenant);

    // Première inscription
    const res1 = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    expect(res1.status).toBe(201);
    const dossierId = res1.body.dossier?.id || res1.body.data?.id || res1.body.id;

    // Annuler le dossier
    await prisma.dossier.update({
      where: { id: dossierId },
      data: { statut: 'ANNULE' },
    });

    // RM-01 : Réinscription après annulation → autorisée
    const res2 = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    expect(res2.status).toBe(201);
  });

  test('RM-15.1 — Apprenant ne peut s\'inscrire deux fois à la même formation (sessions différentes)', async () => {
    const apprenant = await createApprenantAccount('rm15-1');
    const headers = await auth(apprenant);

    // Créer deux sessions différentes pour la même formation Standard
    const now = Date.now();
    const session1Id = `S-RM15-${now}-1`;
    const session2Id = `S-RM15-${now}-2`;

    const ouverture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2); // +2j
    const cloture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10); // +10j
    const debut = new Date(Date.now() + 1000 * 60 * 60 * 24 * 15); // +15j
    const fin = new Date(Date.now() + 1000 * 60 * 60 * 24 * 20); // +20j

    await prisma.session.create({
      data: {
        id: session1Id,
        formation_id: ids.standardFormation,
        statut: 'OUVERTE',
        capacite: 50,
        places_restantes: 50,
        date_ouverture: ouverture,
        date_cloture: cloture,
        date_debut: debut,
        date_fin: fin,
      },
    });

    const ouverture2 = new Date(Date.now() + 1000 * 60 * 60 * 24 * 25); // +25j
    const cloture2 = new Date(Date.now() + 1000 * 60 * 60 * 24 * 35); // +35j
    const debut2 = new Date(Date.now() + 1000 * 60 * 60 * 24 * 40); // +40j
    const fin2 = new Date(Date.now() + 1000 * 60 * 60 * 24 * 45); // +45j

    await prisma.session.create({
      data: {
        id: session2Id,
        formation_id: ids.standardFormation, // Même formation
        statut: 'OUVERTE',
        capacite: 50,
        places_restantes: 50,
        date_ouverture: ouverture2,
        date_cloture: cloture2,
        date_debut: debut2,
        date_fin: fin2,
      },
    });

    // Inscription à la session 1
    const res1 = await request(API_URL)
      .post(`/api/sessions/${session1Id}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    expect(res1.status).toBe(201);

    // RM-15 : Inscription à la session 2 (même formation) → rejet 409
    const res2 = await request(API_URL)
      .post(`/api/sessions/${session2Id}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    if (res2.status !== 409) {
      console.log('RM-15.1 error:', res2.status, res2.body);
    }
    expect(res2.status).toBe(409);
    expect(res2.body.error).toMatch(/FORMATION|ALREADY/i);

    // Cleanup: RM-140 crée un paiement direct, il doit être supprimé avant le dossier.
    await prisma.commissionPartenaire.deleteMany({
      where: { paiement: { dossier: { session_id: { in: [session1Id, session2Id] } } } },
    });
    await prisma.commissionApporteur.deleteMany({
      where: { paiement: { dossier: { session_id: { in: [session1Id, session2Id] } } } },
    });
    await prisma.paiement.deleteMany({ where: { dossier: { session_id: { in: [session1Id, session2Id] } } } });
    await prisma.dossier.deleteMany({ where: { session_id: { in: [session1Id, session2Id] } } });
    await prisma.session.deleteMany({ where: { id: { in: [session1Id, session2Id] } } });
  });

  test('RM-15.2 — Apprenant peut s\'inscrire à plusieurs formations différentes', async () => {
    const apprenant = await createApprenantAccount('rm15-2');
    const headers = await auth(apprenant);

    // Inscription à formation Standard
    const res1 = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    expect(res1.status).toBe(201);

    // RM-15 : Inscription à formation Premium Retail (différente) → autorisée
    const res2 = await request(API_URL)
      .post(`/api/sessions/${ids.premiumRetailSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    expect(res2.status).toBe(201);
  });
});
