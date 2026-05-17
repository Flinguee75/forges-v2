/**
 * Tests d'intégration — Variables d'environnement & constantes métier (RM-156)
 *
 * Couvre :
 *   RM-156 : toutes les constantes métier viennent du .env via env.config.ts
 *   RM-129 : commission FORGES par défaut = 30%
 *   RM-141 : commission Apporteur par défaut = 5%
 *   RM-07  : délai paiement 72h
 *   RM-146 : seuil reversement Apporteur = 5000 XOF
 *   RM-138 : seuil reversement Partenaire = 50000 XOF
 *   RBAC   : GET/PUT /api/admin/config accessible ADMIN uniquement
 */

const { API_URL, accounts, auth, request } = require('./helpers');

let adminHeaders;
let superviseurHeaders;
let agentHeaders;
let apprenantHeaders;

beforeAll(async () => {
  [adminHeaders, superviseurHeaders, agentHeaders, apprenantHeaders] = await Promise.all([
    auth(accounts.admin),
    auth(accounts.superviseur),
    auth(accounts.agent),
    auth(accounts.apprenant),
  ]);
});

describe('RM-156 — Variables env & constantes metier', () => {

  describe('RBAC — GET /api/admin/config', () => {
    test('ADMIN → 200', async () => {
      const res = await request(API_URL)
        .get('/api/admin/config')
        .set(adminHeaders);
      expect(res.status).toBe(200);
    });

    test('SUPERVISEUR → 403', async () => {
      const res = await request(API_URL)
        .get('/api/admin/config')
        .set(superviseurHeaders);
      expect(res.status).toBe(403);
    });

    test('AGENT → 403', async () => {
      const res = await request(API_URL)
        .get('/api/admin/config')
        .set(agentHeaders);
      expect(res.status).toBe(403);
    });

    test('APPRENANT → 403', async () => {
      const res = await request(API_URL)
        .get('/api/admin/config')
        .set(apprenantHeaders);
      expect(res.status).toBe(403);
    });

    test('sans token → 401', async () => {
      const res = await request(API_URL)
        .get('/api/admin/config');
      expect(res.status).toBe(401);
    });
  });

  describe('Valeurs par defaut RM-156', () => {
    let config;

    beforeAll(async () => {
      const res = await request(API_URL)
        .get('/api/admin/config')
        .set(adminHeaders);
      expect(res.status).toBe(200);
      config = res.body.data;
    });

    test('RM-129 : commission FORGES par defaut = 30%', () => {
      expect(config.default_commission_forges_pct).toBe(30);
    });

    test('RM-141 : commission Apporteur par defaut = 5%', () => {
      expect(config.default_commission_apporteur_pct).toBe(5);
    });

    test('RM-138 : seuil reversement Partenaire = 50000 XOF', () => {
      expect(config.seuil_reversement_partenaire_xof).toBe(50000);
    });

    test('RM-146 : seuil reversement Apporteur = 5000 XOF', () => {
      expect(config.seuil_reversement_apporteur_xof).toBe(5000);
    });

    test('validation_partenaire_delai_jours present et positif', () => {
      expect(config.validation_partenaire_delai_jours).toBeGreaterThan(0);
    });

    test('aucune valeur magique a 20 dans commission FORGES', () => {
      expect(config.default_commission_forges_pct).not.toBe(20);
    });
  });

  describe('RBAC — PUT /api/admin/config', () => {
    test('sans token → 401', async () => {
      const res = await request(API_URL)
        .put('/api/admin/config')
        .send({ COMMISSION_FORGES_DEFAULT_PCT: 25 });
      expect(res.status).toBe(401);
    });

    test('SUPERVISEUR → 403', async () => {
      const res = await request(API_URL)
        .put('/api/admin/config')
        .set(superviseurHeaders)
        .send({ COMMISSION_FORGES_DEFAULT_PCT: 25 });
      expect(res.status).toBe(403);
    });

    test('ADMIN peut mettre a jour une valeur', async () => {
      const res = await request(API_URL)
        .put('/api/admin/config')
        .set(adminHeaders)
        .send({ COMMISSION_FORGES_DEFAULT_PCT: 35 });

      expect(res.status).toBe(200);
      expect(res.body.data.default_commission_forges_pct).toBe(35);
    });

    test('la valeur modifiee est visible sur GET suivant', async () => {
      await request(API_URL)
        .put('/api/admin/config')
        .set(adminHeaders)
        .send({ COMMISSION_FORGES_DEFAULT_PCT: 28 }); // clé RM-156

      const res = await request(API_URL)
        .get('/api/admin/config')
        .set(adminHeaders);

      expect(res.body.data.default_commission_forges_pct).toBe(28);

      // Remettre la valeur par défaut v4.9
      await request(API_URL)
        .put('/api/admin/config')
        .set(adminHeaders)
        .send({ COMMISSION_FORGES_DEFAULT_PCT: 30 }); // reset v4.9 default
    });
  });
});
