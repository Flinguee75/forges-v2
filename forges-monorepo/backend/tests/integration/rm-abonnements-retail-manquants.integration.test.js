const {
  auth,
  createApprenantAccount,
  ids,
  prisma,
  request,
  API_URL,
} = require('./helpers');

function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

describe('Wave 1 - Abonnements Retail manquants', () => {
  let premiumDemandeId;

  afterAll(async () => {
    if (premiumDemandeId) {
      await prisma.accesFormationDemande.deleteMany({ where: { formation_id: premiumDemandeId } });
      await prisma.formation.deleteMany({ where: { id: premiumDemandeId } });
    }
  });

  test('RM-71 - les formations Premium restent hors abonnement Retail, meme avec une offre Premium', async () => {
    const apprenant = await createApprenantAccount('rm71');
    const headers = await auth(apprenant);
    premiumDemandeId = uniqueId('F-RM71-PREMIUM-DEMANDE');

    await request(API_URL)
      .post('/api/abonnements/retail')
      .set(headers)
      .send({ offre: 'PREMIUM' })
      .expect(201);

    await prisma.formation.create({
      data: {
        id: premiumDemandeId,
        intitule: 'Formation Premium hors abonnement RM-71',
        description_courte: 'Fixture integration RM-71',
        description_longue: 'Formation Premium a la demande non incluse dans les abonnements Retail.',
        duree_jours: 3,
        cout_catalogue: 180000,
        responsable_id: ids.responsable,
        type_formation: 'PREMIUM',
        mode_formation: 'A_LA_DEMANDE',
        statut: 'ACTIVE',
        inclus_abonnement: false,
        pilier_abonnement: 'RETAIL',
        duree_acces_jours: 365,
        prerequis: 'Aucun',
        objectifs_pedagogiques: ['Verifier RM-71'],
        certification_delivree: true,
        public_cible: 'Apprenants',
        langues_disponibles: ['FR'],
      },
    });

    const incluses = await request(API_URL)
      .get('/api/abonnements/retail/formations-incluses')
      .set(headers)
      .expect(200);

    expect(incluses.body.data.every((formation) => formation.type_formation !== 'PREMIUM')).toBe(true);
    expect(incluses.body.data.map((formation) => formation.id)).not.toContain(premiumDemandeId);

    const access = await request(API_URL)
      .post(`/api/formations/${premiumDemandeId}/acceder`)
      .set(headers)
      .send({});

    expect(access.status).toBe(402);
    expect(access.body.error).toBe('NOT_INCLUDED_IN_SUBSCRIPTION');

    const formation = await prisma.formation.findUnique({ where: { id: premiumDemandeId } });
    expect(formation.inclus_abonnement).toBe(false);
  });
});
