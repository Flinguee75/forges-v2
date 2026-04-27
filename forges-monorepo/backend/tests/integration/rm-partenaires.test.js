const { hash } = require('bcrypt');
const { accounts, auth, ids, prisma, request, API_URL } = require('./helpers');

describe('Vague 1 API — Partenaires RM-126/RM-127/RM-129/RM-130/RM-137', () => {
  test('RM-126 — Flux A active un partenaire invite et Flux B cree une demande en attente', async () => {
    const suffix = Date.now();
    const token = `token-rm126-${suffix}`;
    await prisma.partenaire.create({
      data: {
        id: `part-rm126-${suffix}`,
        raison_sociale: `Partenaire RM-126 ${suffix}`,
        type: 'UNIVERSITE',
        pays: 'CI',
        email_principal: `part-rm126-${suffix}@forges.test`,
        password_hash: 'not-set',
        statut: 'EN_ATTENTE',
        token_invitation: token,
        token_invitation_expiration: new Date(Date.now() + 48 * 3600 * 1000),
        commission_forges_pct: 20,
        mode_inscription: 'INVITATION',
      },
    });

    const activate = await request(API_URL)
      .post('/api/partenaires/activate')
      .send({ token, password: accounts.partenaire.password });

    expect(activate.status).toBe(200);
    expect(activate.body.data.partenaire.statut).toBe('ACTIF');

    const register = await request(API_URL)
      .post('/api/partenaires/register')
      .send({
        raison_sociale: `Partenaire FluxB ${suffix}`,
        type: 'UNIVERSITE',
        pays: 'CI',
        email_principal: `part-fluxb-${suffix}@forges.ci`,
        password: accounts.partenaire.password,
      });

    expect(register.status).toBe(201);
    expect(register.body.data.statut).toBe('EN_ATTENTE_VERIFICATION');
  });

  test('RM-127 — API partenaire rejette type_formation en ecriture', async () => {
    const headers = await auth(accounts.partenaire);
    const res = await request(API_URL)
      .post('/api/partenaires/formations')
      .set(headers)
      .send({
        intitule: 'Formation partenaire readonly RM',
        description_courte: 'Test',
        description_longue: 'Test RM-127',
        duree_jours: 3,
        prix_coutant_propose: 100000,
        mode_formation: 'AVEC_SESSION',
        langues_disponibles: ['FR'],
        certification_delivree: true,
        public_cible: 'Professionnels',
        objectifs_pedagogiques: ['Tester RM-127'],
        prerequis: 'Aucun',
        type_formation: 'PREMIUM',
      });

    expect(res.status).toBe(400);
  });

  test('RM-129/RM-137 — validation calcule prix catalogue sans exposer commission au partenaire', async () => {
    await prisma.formationPartenaire.update({
      where: { id: ids.partenaireFormationMeta },
      data: { statut_validation: 'EN_ATTENTE' },
    }).catch(() => {});

    const responsableHeaders = await auth(accounts.responsable);
    const validation = await request(API_URL)
      .put(`/api/responsable/validations/${ids.partenaireFormationMeta}/valider`)
      .set(responsableHeaders)
      .send({
        type_formation: 'STANDARD',
        pilier_abonnement: 'RETAIL',
        prix_coutant_valide: 200000,
      });

    expect(validation.status).toBe(200);
    expect(validation.body.data.prix_catalogue).toBe(250000);

    const partenaireHeaders = await auth(accounts.partenaire);
    const dashboard = await request(API_URL).get('/api/partenaires/dashboard').set(partenaireHeaders);
    expect(dashboard.status).toBe(200);
    expect(JSON.stringify(dashboard.body)).not.toContain('commission_forges_pct');

    const formation = await prisma.formation.findUnique({ where: { id: ids.partenaireFormation } });
    expect(formation.cout_catalogue).toBe(250000);
  });
});
