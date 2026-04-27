const { auth, accounts, prisma, request, API_URL } = require('./helpers');

describe('RM-13 — Archivage Irréversible Formation (Criticité 5)', () => {

  let responsableHeaders;

  beforeAll(async () => {
    responsableHeaders = await auth(accounts.responsable);
  });

  test('RM-13.1 — Formation ACTIVE peut être archivée', async () => {
    // Créer une formation ACTIVE
    const formationId = `F-RM13-${Date.now()}-1`;
    await prisma.formation.create({
      data: {
        id: formationId,
        intitule: 'Formation RM-13 Test',
        description_courte: 'Test archivage',
        responsable_id: 'responsable-e2e',
        type_formation: 'STANDARD',
        mode_formation: 'AVEC_SESSION',
        pilier_abonnement: 'RETAIL',
        inclus_abonnement: true,
        cout_catalogue: 5000000,
        duree_jours: 5,
        statut: 'ACTIVE',
        objectifs_pedagogiques: ['Test'],
        langues_disponibles: ['FR'],
      },
    });

    // Archiver la formation
    const res = await request(API_URL)
      .put(`/api/responsable/formations/${formationId}/archiver`)
      .set(responsableHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe('ARCHIVEE');

    // Cleanup
    await prisma.formation.delete({ where: { id: formationId } });
  });

  test('RM-13.2 — Formation ARCHIVEE ne peut PAS être réactivée (irréversible)', async () => {
    // Créer une formation ARCHIVEE
    const formationId = `F-RM13-${Date.now()}-2`;
    await prisma.formation.create({
      data: {
        id: formationId,
        intitule: 'Formation RM-13 Archivée',
        description_courte: 'Test irréversibilité',
        responsable_id: 'responsable-e2e',
        type_formation: 'STANDARD',
        mode_formation: 'AVEC_SESSION',
        pilier_abonnement: 'RETAIL',
        inclus_abonnement: true,
        cout_catalogue: 5000000,
        duree_jours: 5,
        statut: 'ARCHIVEE',
        objectifs_pedagogiques: ['Test'],
        langues_disponibles: ['FR'],
      },
    });

    // Tenter de réactiver → RM-13 : INTERDIT
    const res = await request(API_URL)
      .patch(`/api/formations/${formationId}`)
      .set(responsableHeaders)
      .send({ statut: 'ACTIVE' });

    // RM-13 : Rejet 400 ou 403
    if (![400, 403, 422].includes(res.status)) {
      console.log('RM-13.2 error:', res.status, res.body);
    }
    expect([400, 403, 422]).toContain(res.status);
    expect(res.body.error || res.body.message).toMatch(/ARCHIVE|IRREVERSIBLE/i);

    // Cleanup
    await prisma.formation.delete({ where: { id: formationId } });
  });

  test('RM-13.3 — Formation ARCHIVEE invisible dans catalogue', async () => {
    // Créer une formation ARCHIVEE
    const formationId = `F-RM13-${Date.now()}-3`;
    await prisma.formation.create({
      data: {
        id: formationId,
        intitule: 'Formation RM-13 Invisible',
        description_courte: 'Test visibilité',
        responsable_id: 'responsable-e2e',
        type_formation: 'STANDARD',
        mode_formation: 'AVEC_SESSION',
        pilier_abonnement: 'RETAIL',
        inclus_abonnement: true,
        cout_catalogue: 5000000,
        duree_jours: 5,
        statut: 'ARCHIVEE',
        objectifs_pedagogiques: ['Test'],
        langues_disponibles: ['FR'],
      },
    });

    // Récupérer catalogue public (sans auth)
    const res = await request(API_URL).get('/api/formations');

    expect(res.status).toBe(200);
    const formations = res.body.data.formations || res.body.data;
    const archivee = formations.find(f => f.id === formationId);

    // RM-13 : Formation archivée ne doit PAS apparaître
    expect(archivee).toBeUndefined();

    // Cleanup
    await prisma.formation.delete({ where: { id: formationId } });
  });
});
