const { accounts, auth, ids, prisma, request, API_URL } = require('./helpers');

const BADGE_COLORS = {
  PREMIUM: '#6C3483',
  SUR_DEVIS: '#E65100',
};

const TEST_RUN_ID = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function createFormation(overrides) {
  const id = `f-test-${TEST_RUN_ID}-${Math.random().toString(16).slice(2, 8)}`;
  return prisma.formation.create({
    data: {
      id,
      intitule: `Formation Test ${id}`,
      description_courte: 'Test',
      description_longue: 'Test',
      duree_jours: 5,
      cout_catalogue: 100000,
      type_formation: 'STANDARD',
      pilier_abonnement: 'RETAIL',
      mode_formation: 'AVEC_SESSION',
      statut: 'ACTIVE',
      langues_disponibles: ['FR'],
      certification_delivree: true,
      public_cible: 'Professionnels',
      objectifs_pedagogiques: ['Test'],
      prerequis: 'Aucun',
      inclus_abonnement: true,
      responsable_id: ids.responsable,
      partenaire_id: ids.partenaire,
      ...overrides,
    },
  });
}

const createdFormationIds = [];

afterAll(async () => {
  if (createdFormationIds.length > 0) {
    await prisma.accesFormationDemande
      .deleteMany({ where: { formation_id: { in: createdFormationIds } } })
      .catch(() => {});
    await prisma.formation
      .deleteMany({ where: { id: { in: createdFormationIds } } })
      .catch(() => {});
  }
});

describe('Vague 3 API — Formations Avancées RM-87/90/91/94/96/103', () => {

  // ===== RM-90 : badges catalogue =====

  test('RM-90 — badges Premium/Sur devis/Standard dans le catalogue public', async () => {
    const fStandard = await createFormation({
      type_formation: 'STANDARD',
      inclus_abonnement: true,
    });
    const fPremium = await createFormation({
      type_formation: 'PREMIUM',
      inclus_abonnement: false,
    });
    const fSurDevis = await createFormation({
      type_formation: 'SUR_DEVIS',
      inclus_abonnement: false,
    });
    createdFormationIds.push(fStandard.id, fPremium.id, fSurDevis.id);

    const res = await request(API_URL).get('/api/formations').query({ limit: 100 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    const standard = res.body.data.find((f) => f.id === fStandard.id);
    const premium = res.body.data.find((f) => f.id === fPremium.id);
    const surDevis = res.body.data.find((f) => f.id === fSurDevis.id);

    expect(standard).toBeTruthy();
    expect(standard.type_formation).toBe('STANDARD');
    expect(standard.badge).toBeFalsy();

    expect(premium).toBeTruthy();
    expect(premium.type_formation).toBe('PREMIUM');
    expect(premium.badge).toBe('Premium');
    expect(premium.badge_color).toBe(BADGE_COLORS.PREMIUM);

    expect(surDevis).toBeTruthy();
    expect(surDevis.type_formation).toBe('SUR_DEVIS');
    expect(surDevis.badge).toBe('Sur devis');
    expect(surDevis.badge_color).toBe(BADGE_COLORS.SUR_DEVIS);
  });

  test('RM-90 — badge Premium présent dans l endpoint détail', async () => {
    const formation = await createFormation({
      type_formation: 'PREMIUM',
      inclus_abonnement: false,
    });
    createdFormationIds.push(formation.id);

    const res = await request(API_URL).get(`/api/formations/${formation.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.type_formation).toBe('PREMIUM');
    expect(res.body.data.badge).toBe('Premium');
    expect(res.body.data.badge_color).toBe(BADGE_COLORS.PREMIUM);
  });

  // ===== RM-87 : Premium accessible hors abonnement =====

  test('RM-87 — Premium visible et marquée non incluse dans l abonnement', async () => {
    const formation = await createFormation({
      type_formation: 'PREMIUM',
      inclus_abonnement: false,
    });
    createdFormationIds.push(formation.id);

    const apprenantHeaders = await auth(accounts.apprenant);
    const res = await request(API_URL)
      .get('/api/formations')
      .set(apprenantHeaders)
      .query({ limit: 100 });

    expect(res.status).toBe(200);
    const premium = res.body.data.find((f) => f.id === formation.id);
    expect(premium).toBeTruthy();
    expect(premium.badge).toBe('Premium');
    expect(premium.inclus_abonnement).toBe(false);
  });

  // ===== RM-91 : mode_formation obligatoire à la création =====

  test('RM-91 — création formation rejetée sans mode_formation', async () => {
    const responsableHeaders = await auth(accounts.responsable);

    const res = await request(API_URL)
      .post('/api/formations')
      .set(responsableHeaders)
      .send({
        intitule: 'Formation sans mode',
        description_courte: 'Test',
        description_longue: 'Test',
        duree_jours: 5,
        cout_catalogue: 100000,
        type_formation: 'STANDARD',
        pilier_abonnement: 'RETAIL',
        // mode_formation manquant
        statut: 'ACTIVE',
        langues_disponibles: ['FR'],
        certification_delivree: true,
        public_cible: 'Professionnels',
        objectifs_pedagogiques: ['Test'],
        prerequis: 'Aucun',
      });

    expect([400, 422]).toContain(res.status);
    const errorJson = JSON.stringify(res.body);
    expect(errorJson).toMatch(/mode_formation|required|obligatoire/i);
  });

  // ===== RM-94 : Standard inclus dans abonnement =====

  test('RM-94 — formations Standard avec pilier Retail/B2B sont incluses dans l abonnement', async () => {
    const fStandardRetail = await createFormation({
      type_formation: 'STANDARD',
      pilier_abonnement: 'RETAIL',
      inclus_abonnement: true,
    });
    createdFormationIds.push(fStandardRetail.id);

    const res = await request(API_URL).get('/api/formations').query({ limit: 100 });
    expect(res.status).toBe(200);

    const standardRetail = res.body.data.find((f) => f.id === fStandardRetail.id);
    expect(standardRetail).toBeTruthy();
    expect(standardRetail.inclus_abonnement).toBe(true);
  });

  // ===== RM-96 : pas de session pour formation A_LA_DEMANDE =====

  test('RM-96 — création de session interdite pour formation A_LA_DEMANDE', async () => {
    const formation = await createFormation({
      mode_formation: 'A_LA_DEMANDE',
      type_formation: 'STANDARD',
      inclus_abonnement: true,
    });
    createdFormationIds.push(formation.id);

    const responsableHeaders = await auth(accounts.responsable);
    const future = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(API_URL)
      .post('/api/backoffice/sessions')
      .set(responsableHeaders)
      .send({
        formation_id: formation.id,
        capacite: 20,
        date_ouverture: future(5),
        date_cloture: future(15),
        date_debut: future(20),
        date_fin: future(30),
      });

    expect([400, 422]).toContain(res.status);
    expect(res.body.error).toBe('SESSION_IMPOSSIBLE_FORMATION_DEMANDE');
  });

  // ===== RM-103 : expiration accès A_LA_DEMANDE = 365 jours =====

  test('RM-103 — accès formation à la demande expire à 365 jours par défaut', async () => {
    const formation = await createFormation({
      mode_formation: 'A_LA_DEMANDE',
      type_formation: 'STANDARD',
      inclus_abonnement: true,
    });
    createdFormationIds.push(formation.id);

    const apprenantHeaders = await auth(accounts.apprenantPremiumRetail);

    const res = await request(API_URL)
      .post(`/api/formations/${formation.id}/acceder`)
      .set(apprenantHeaders)
      .send({});

    expect([200, 201]).toContain(res.status);

    const acces = await prisma.accesFormationDemande.findFirst({
      where: { formation_id: formation.id },
      orderBy: { created_at: 'desc' },
    });
    expect(acces).toBeTruthy();
    expect(acces.statut).toBe('ACTIF');

    // RM-103 : expiration 365 jours par défaut
    const dureeJours = (acces.date_expiration.getTime() - acces.created_at.getTime()) /
      (24 * 60 * 60 * 1000);
    expect(Math.round(dureeJours)).toBeGreaterThanOrEqual(364);
    expect(Math.round(dureeJours)).toBeLessThanOrEqual(366);
  });
});
