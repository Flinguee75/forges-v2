/**
 * E2E Workflow Partenaire — Test complet de bout en bout
 *
 * Flux couvert :
 *   1. Partenaire soumet une formation
 *   2. Formation apparaît dans la liste EN_ATTENTE du responsable
 *   3. Responsable consulte le détail (vérification champs)
 *   4. Responsable valide (type_formation, pilier, prix)
 *   5. Formation passe en ACTIVE côté Formation
 *   6. Formation visible dans la liste VALIDE du responsable
 *   7. Partenaire voit la formation validée dans son dashboard
 *   8. Responsable rejette une autre formation
 *   9. Formation REJETEE visible avec motif
 */

const { accounts, auth, ids, prisma, request, API_URL } = require('./helpers');

const PRIX_COUTANT_XOF = 80000;
const PRIX_COUTANT_CENTIMES = PRIX_COUTANT_XOF * 100;

const FORMATION_PAYLOAD = {
  intitule: `Formation E2E Partenaire ${Date.now()}`,
  description_courte: 'Formation de test E2E workflow partenaire',
  description_longue: 'Description longue de test pour le workflow E2E.',
  duree_jours: 5,
  mode_formation: 'AVEC_SESSION',
  langues_disponibles: ['FR'],
  certification_delivree: true,
  organisme_certificateur: 'FORGES TEST',
  public_cible: 'Professionnels IT',
  objectifs_pedagogiques: ['Maîtriser le workflow', 'Comprendre la validation'],
  prerequis: 'Aucun prérequis',
  programme_syllabus: 'Module 1 : Intro\nModule 2 : Pratique',
  modalite: 'EN_LIGNE',
  nb_places_max_session: 20,
  prix_coutant_propose: PRIX_COUTANT_CENTIMES,
};

describe('E2E Workflow Partenaire — Soumission → Validation → Affichage', () => {
  let fpId = null;
  let formationId = null;
  let fpIdRejet = null;

  // ─── 1. SOUMISSION ─────────────────────────────────────────────────────────

  test('1. Partenaire soumet une formation valide', async () => {
    const headers = await auth(accounts.partenaire);
    const res = await request(API_URL)
      .post('/api/partenaires/formations')
      .set(headers)
      .send(FORMATION_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('fp_id');
    expect(res.body.data).toHaveProperty('formation_id');
    expect(res.body.data.message).toMatch(/attente/i);

    fpId = res.body.data.fp_id;
    formationId = res.body.data.formation_id;
  });

  test('1b. Formation soumise avec statut EN_ATTENTE_VALIDATION en DB', async () => {
    expect(formationId).toBeTruthy();
    const f = await prisma.formation.findUnique({ where: { id: formationId } });
    expect(f).toBeTruthy();
    expect(f.statut).toBe('EN_ATTENTE_VALIDATION');
    expect(f.intitule).toMatch(/E2E/);
    expect(f.objectifs_pedagogiques).toHaveLength(2);
  });

  // ─── 2. LISTE RESPONSABLE ──────────────────────────────────────────────────

  test('2. Responsable voit la formation dans la liste EN_ATTENTE', async () => {
    const headers = await auth(accounts.responsable);
    const res = await request(API_URL)
      .get('/api/responsable/validations')
      .set(headers)
      .query({ statut: 'EN_ATTENTE' });

    expect(res.status).toBe(200);
    const list = res.body.data?.data || res.body.data || [];
    const found = list.find((fp) => fp.id === fpId);
    expect(found).toBeTruthy();
    expect(found.formation?.intitule).toMatch(/E2E/);
    expect(found.statut_validation).toBe('EN_ATTENTE');
  });

  // ─── 3. DÉTAIL RESPONSABLE ────────────────────────────────────────────────

  test('3. Responsable consulte le détail — tous les champs présents', async () => {
    expect(fpId).toBeTruthy();
    const headers = await auth(accounts.responsable);
    const res = await request(API_URL)
      .get(`/api/responsable/validations/${fpId}`)
      .set(headers);

    expect(res.status).toBe(200);
    const fp = res.body.data;

    expect(fp.statut_validation).toBe('EN_ATTENTE');
    expect(fp.prix_coutant_soumis).toBe(PRIX_COUTANT_CENTIMES);

    const f = fp.formation;
    expect(f.intitule).toMatch(/E2E/);
    expect(f.description_courte).toBeTruthy();
    expect(f.public_cible).toBe('Professionnels IT');
    expect(f.objectifs_pedagogiques).toContain('Maîtriser le workflow');
    expect(f.prerequis).toBeTruthy();
    expect(f.langues_disponibles).toContain('FR');
    expect(f.certification_delivree).toBe(true);
    expect(f.duree_jours).toBe(5);
    expect(f.mode_formation).toBe('AVEC_SESSION');
  });

  // ─── 4. VALIDATION ────────────────────────────────────────────────────────

  test('4. Responsable valide la formation (RM-127, RM-137)', async () => {
    expect(fpId).toBeTruthy();
    const headers = await auth(accounts.responsable);
    const res = await request(API_URL)
      .put(`/api/responsable/validations/${fpId}/valider`)
      .set(headers)
      .send({
        type_formation: 'STANDARD',
        pilier_abonnement: 'RETAIL',
        prix_coutant_valide: PRIX_COUTANT_CENTIMES,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.type_formation).toBe('STANDARD');
    expect(res.body.data.pilier_abonnement).toBe('RETAIL');
    expect(res.body.data.prix_coutant_valide).toBe(PRIX_COUTANT_CENTIMES);
    expect(res.body.data.prix_catalogue).toBeGreaterThan(PRIX_COUTANT_CENTIMES);
    expect(res.body.data.inclus_abonnement).toBe(true); // STANDARD + RETAIL = inclus
  });

  // ─── 5. FORMATION ACTIVE ──────────────────────────────────────────────────

  test('5. Formation passe en statut ACTIVE en DB (RM-102)', async () => {
    const f = await prisma.formation.findUnique({ where: { id: formationId } });
    expect(f.statut).toBe('ACTIVE');
    expect(f.type_formation).toBe('STANDARD');
    expect(f.pilier_abonnement).toBe('RETAIL');
    expect(f.cout_catalogue).toBeGreaterThan(0);
    expect(f.inclus_abonnement).toBe(true);
  });

  // ─── 6. VISIBLE LISTE VALIDE ──────────────────────────────────────────────

  test('6. Formation visible dans la liste VALIDE du responsable', async () => {
    const headers = await auth(accounts.responsable);
    const res = await request(API_URL)
      .get('/api/responsable/validations')
      .set(headers)
      .query({ statut: 'VALIDE' });

    expect(res.status).toBe(200);
    const list = res.body.data?.data || res.body.data || [];
    const found = list.find((fp) => fp.id === fpId);
    expect(found).toBeTruthy();
    expect(found.statut_validation).toBe('VALIDE');
  });

  // ─── 7. VUE PARTENAIRE ────────────────────────────────────────────────────

  test('7. Partenaire voit la formation validée dans ses formations', async () => {
    const headers = await auth(accounts.partenaire);
    const res = await request(API_URL)
      .get('/api/partenaires/formations')
      .set(headers)
      .query({ statut_validation: 'VALIDE' }); // FormationPartenaire.statut_validation = VALIDE (not VALIDEE)

    expect(res.status).toBe(200);
    const list = res.body.data?.data || res.body.data || [];
    const found = (Array.isArray(list) ? list : []).find(
      (f) => f.id === formationId || f.formation_id === formationId
    );
    expect(found).toBeTruthy();
  });

  // ─── 8. REJET ─────────────────────────────────────────────────────────────

  test('8. Partenaire soumet une 2e formation pour tester le rejet', async () => {
    const headers = await auth(accounts.partenaire);
    const res = await request(API_URL)
      .post('/api/partenaires/formations')
      .set(headers)
      .send({ ...FORMATION_PAYLOAD, intitule: `Formation E2E Rejet ${Date.now()}` });

    expect(res.status).toBe(201);
    fpIdRejet = res.body.data.fp_id;
  });

  test('9. Responsable rejette la 2e formation avec motif', async () => {
    expect(fpIdRejet).toBeTruthy();
    const headers = await auth(accounts.responsable);
    const res = await request(API_URL)
      .put(`/api/responsable/validations/${fpIdRejet}/rejeter`)
      .set(headers)
      .send({
        motif: 'Dossier incomplet — informations sur le formateur manquantes.',
        corrections_suggeres: 'Ajouter le CV du formateur et les accréditations.',
      });

    expect(res.status).toBe(200);
  });

  test('10. Formation rejetée visible dans la liste REJETE', async () => {
    const headers = await auth(accounts.responsable);
    const res = await request(API_URL)
      .get('/api/responsable/validations')
      .set(headers)
      .query({ statut: 'REJETE' });

    expect(res.status).toBe(200);
    const list = res.body.data?.data || res.body.data || [];
    const found = list.find((fp) => fp.id === fpIdRejet);
    expect(found).toBeTruthy();
    expect(found.statut_validation).toBe('REJETE');
    expect(found.commentaire_responsable).toMatch(/incomplet/i);
  });

  // ─── CLEANUP ───────────────────────────────────────────────────────────────

  afterAll(async () => {
    if (formationId) {
      await prisma.formationPartenaire.deleteMany({ where: { formation_id: formationId } });
      await prisma.formation.deleteMany({ where: { id: formationId } });
    }
    if (fpIdRejet) {
      const fp = await prisma.formationPartenaire.findUnique({ where: { id: fpIdRejet } });
      if (fp) {
        await prisma.formationPartenaire.delete({ where: { id: fpIdRejet } });
        await prisma.formation.deleteMany({ where: { id: fp.formation_id } });
      }
    }
  });
});
