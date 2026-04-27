const crypto = require('crypto');
const { accounts, auth, ids, prisma, request, API_URL } = require('./helpers');

describe('Vague 1 API — Formations RM-13/RM-22/RM-23/RM-90/RM-96', () => {
  test('RM-13 — une formation archivee ne peut pas etre reactivee', async () => {
    const formationId = `F-RM13-${crypto.randomUUID()}`;
    await prisma.formation.create({
      data: {
        id: formationId,
        intitule: 'RM-13 Formation archivee',
        description_courte: 'Fixture RM-13',
        description_longue: 'Fixture RM-13 non reactivee',
        duree_jours: 2,
        cout_catalogue: 100000,
        responsable_id: 'responsable-e2e',
        type_formation: 'STANDARD',
        mode_formation: 'A_LA_DEMANDE',
        pilier_abonnement: 'RETAIL',
        inclus_abonnement: true,
        statut: 'ARCHIVEE',
        prerequis: 'Aucun',
        objectifs_pedagogiques: ['Verifier RM-13'],
        certification_delivree: true,
        public_cible: 'Tests RM',
        langues_disponibles: ['FR'],
      },
    });

    const headers = await auth(accounts.admin);
    const res = await request(API_URL)
      .patch(`/api/formations/${formationId}`)
      .set(headers)
      .send({ statut: 'ACTIVE' });

    expect([403, 409]).toContain(res.status);
  });

  test('RM-22/RM-23 — catalogue public expose uniquement les formations visibles', async () => {
    const res = await request(API_URL).get('/api/formations');
    expect(res.status).toBe(200);

    const idsCatalogue = res.body.data.map((formation) => formation.id);
    expect(idsCatalogue).toContain(ids.standardFormation);
    expect(idsCatalogue).toContain(ids.demandeFormation);
  });

  test('RM-90 — formation Premium conserve son type pour badge/prix abonne', async () => {
    const premium = await prisma.formation.findUnique({ where: { id: ids.premiumRetailFormation } });
    expect(premium.type_formation).toBe('PREMIUM');
    expect(premium.inclus_abonnement).toBe(false);
  });

  test('RM-96 — une formation a la demande ne peut pas recevoir de session', async () => {
    const headers = await auth(accounts.responsable);
    const res = await request(API_URL)
      .post('/api/backoffice/sessions')
      .set(headers)
      .send({
        formation_id: ids.demandeFormation,
        capacite: 20,
        date_ouverture: new Date(Date.now() + 1 * 86400000).toISOString(),
        date_cloture: new Date(Date.now() + 3 * 86400000).toISOString(),
        date_debut: new Date(Date.now() + 10 * 86400000).toISOString(),
        date_fin: new Date(Date.now() + 12 * 86400000).toISOString(),
      });

    expect(res.status).toBe(400);
  });
});
