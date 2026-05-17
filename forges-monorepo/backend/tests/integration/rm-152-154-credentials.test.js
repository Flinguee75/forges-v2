/**
 * Tests d'intégration — Proxy AES-256 Credentials de livraison (RM-152 à RM-154)
 *
 * Couvre :
 *   RM-152 : URL partenaire chiffrée AES-256-GCM en base — jamais stockée en clair
 *   RM-153 : proxy décrypte à la volée et redirige (302) — URL absente des logs
 *   RM-154 : aucun credential exposé dans la réponse HTTP (body, headers applicatifs)
 *   MT-01  : audit log PROXY_ACCES_FORMATION sans URL réelle
 *   RBAC   : seul APPRENANT peut utiliser le proxy
 */

require('ts-node/register/transpile-only');

const { hash } = require('bcrypt');
const { API_URL, accounts, auth, ids, prisma, request } = require('./helpers');

const APPRENANT_DOSSIER_ID = 'app-e2e-dossier-01';
const { chiffrerUrl } = require('../../src/shared/crypto/crypto.service');

const PASSWORD = 'Test@FORGES2026!';
const URL_TEST = 'https://formation-proxy-test.example.com/content/42';

let apprenantDossierHeaders;
let partenaireHeaders;
let adminHeaders;
let apprenantIntrusHeaders;

let accesActifId;
let accesSansUrlId;
let accesExpireActifId;
let intrusId;

beforeAll(async () => {
  const suffix = Date.now();
  intrusId = `app-intrus-proxy-${suffix}`;

  await prisma.apprenant.create({
    data: {
      id: intrusId,
      email: `intrus-proxy-${suffix}@forges.test`,
      password_hash: await hash(PASSWORD, 12),
      nom: 'Intrus',
      prenoms: 'Proxy',
      role: 'APPRENANT',
      statut: 'ACTIF',
      type_apprenant: 'APPRENANT',
      niveau_etude: 'LICENCE',
      pays_residence: 'CI',
      pays_nationalite: 'CI',
      langue_preferee: 'FR',
      consentement_rgpd: true,
      consentement_timestamp: new Date(),
      consentement_version_cgu: '1.0',
    },
  });

  // Accès statut ACTIF mais date expirée → ACCES_EXPIRE (RM-153)
  accesExpireActifId = `A-PROXY-EXPIRE-ACTIF-${suffix}`;
  await prisma.accesFormationDemande.create({
    data: {
      id: accesExpireActifId,
      apprenant_id: APPRENANT_DOSSIER_ID,
      formation_id: ids.demandeFormation,
      source_financement: 'ABONNEMENT',
      statut: 'ACTIF',
      date_activation: new Date(Date.now() - 400 * 24 * 3600 * 1000),
      date_expiration: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      progression: 100,
    },
  });

  // Accès ACTIF sans url_externe_chiffree (formation F-E2E-DEMANDE-01 n'a pas d'URL)
  accesSansUrlId = `A-PROXY-SANS-URL-${suffix}`;
  await prisma.accesFormationDemande.create({
    data: {
      id: accesSansUrlId,
      apprenant_id: APPRENANT_DOSSIER_ID,
      formation_id: ids.demandeFormation,
      source_financement: 'ABONNEMENT',
      statut: 'ACTIF',
      date_activation: new Date(),
      date_expiration: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      progression: 0,
    },
  });

  // Accès ACTIF avec url_externe_chiffree (formation mise à jour)
  const urlChiffree = chiffrerUrl(URL_TEST);
  await prisma.formation.update({
    where: { id: ids.demandeFormation },
    data: { url_externe_chiffree: urlChiffree },
  });

  accesActifId = `A-PROXY-ACTIF-${suffix}`;
  await prisma.accesFormationDemande.create({
    data: {
      id: accesActifId,
      apprenant_id: APPRENANT_DOSSIER_ID,
      formation_id: ids.demandeFormation,
      source_financement: 'ABONNEMENT',
      statut: 'ACTIF',
      date_activation: new Date(),
      date_expiration: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      progression: 0,
    },
  });

  [apprenantDossierHeaders, partenaireHeaders, adminHeaders, apprenantIntrusHeaders] =
    await Promise.all([
      auth(accounts.apprenantDossier),
      auth(accounts.partenaire),
      auth(accounts.admin),
      auth({ email: `intrus-proxy-${suffix}@forges.test`, password: PASSWORD }),
    ]);
});

afterAll(async () => {
  await prisma.accesFormationDemande.deleteMany({
    where: { id: { in: [accesSansUrlId, accesActifId, accesExpireActifId] } },
  });
  await prisma.formation.update({
    where: { id: ids.demandeFormation },
    data: { url_externe_chiffree: null },
  });
  await prisma.apprenant.delete({ where: { id: intrusId } }).catch(() => {});
});

describe('RM-152/153/154 — Proxy AES-256 Credentials de livraison', () => {

  describe('RBAC — controle acces', () => {
    test('sans token → 401', async () => {
      const res = await request(API_URL)
        .get(`/api/formations-demande/${accesActifId}/acceder`);
      expect(res.status).toBe(401);
    });

    test('PARTENAIRE → 403', async () => {
      const res = await request(API_URL)
        .get(`/api/formations-demande/${accesActifId}/acceder`)
        .set(partenaireHeaders);
      expect(res.status).toBe(403);
    });

    test('ADMIN → 403', async () => {
      const res = await request(API_URL)
        .get(`/api/formations-demande/${accesActifId}/acceder`)
        .set(adminHeaders);
      expect(res.status).toBe(403);
    });

    test('APPRENANT proprietaire → pas 401/403', async () => {
      const res = await request(API_URL)
        .get(`/api/formations-demande/${accesActifId}/acceder`)
        .set(apprenantDossierHeaders)
        .redirects(0);
      expect([302, 200, 503]).toContain(res.status);
    });
  });

  describe('Erreurs metier', () => {
    test('accesId inconnu → 404 ACCES_NOT_FOUND', async () => {
      const res = await request(API_URL)
        .get('/api/formations-demande/acces-inexistant-xyz/acceder')
        .set(apprenantDossierHeaders);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ACCES_NOT_FOUND');
    });

    test("acces expire → 403 ACCES_EXPIRE", async () => {
      const res = await request(API_URL)
        .get(`/api/formations-demande/${accesExpireActifId}/acceder`)
        .set(apprenantDossierHeaders);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ACCES_EXPIRE');
    });

    test("acces d'un autre apprenant → 403 ACCES_FORBIDDEN", async () => {
      const res = await request(API_URL)
        .get(`/api/formations-demande/${accesActifId}/acceder`)
        .set(apprenantIntrusHeaders);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ACCES_FORBIDDEN');
    });

    test('acces ACTIF sans url_externe_chiffree → 503 URL_FORMATION_INDISPONIBLE', async () => {
      await prisma.formation.update({
        where: { id: ids.demandeFormation },
        data: { url_externe_chiffree: null },
      });

      const res = await request(API_URL)
        .get(`/api/formations-demande/${accesSansUrlId}/acceder`)
        .set(apprenantDossierHeaders);

      expect(res.status).toBe(503);
      expect(res.body.error).toBe('URL_FORMATION_INDISPONIBLE');

      // Remettre l'URL pour les tests suivants
      const urlChiffree = chiffrerUrl(URL_TEST);
      await prisma.formation.update({
        where: { id: ids.demandeFormation },
        data: { url_externe_chiffree: urlChiffree },
      });
    });
  });

  describe('RM-152/153 — Redirect AES-256 (URL jamais exposee)', () => {
    test('acces ACTIF avec URL → 302 redirect', async () => {
      const res = await request(API_URL)
        .get(`/api/formations-demande/${accesActifId}/acceder`)
        .set(apprenantDossierHeaders)
        .redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers['location']).toBeDefined();
    });

    test('RM-154 : URL reelle presente dans Location header apres redirect', async () => {
      const res = await request(API_URL)
        .get(`/api/formations-demande/${accesActifId}/acceder`)
        .set(apprenantDossierHeaders)
        .redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers['location']).toBe(URL_TEST);
    });

    test("RM-154 : body de la reponse 302 ne contient pas l'URL reelle en clair", async () => {
      const res = await request(API_URL)
        .get(`/api/formations-demande/${accesActifId}/acceder`)
        .set(apprenantDossierHeaders)
        .redirects(0);

      expect(res.status).toBe(302);
      const body = JSON.stringify(res.body || '');
      expect(body).not.toContain(URL_TEST);
    });

    test('RM-154 : pas de credentials NGSER ni de token dans la reponse', async () => {
      const res = await request(API_URL)
        .get(`/api/formations-demande/${accesActifId}/acceder`)
        .set(apprenantDossierHeaders)
        .redirects(0);

      const body = JSON.stringify(res.body || '');
      expect(body).not.toContain('Bearer');
      expect(body).not.toContain('auth_token');
      expect(body).not.toContain('payment_token');
      expect(body).not.toContain('AES_SECRET_KEY');
    });
  });

  describe('MT-01 — Audit log', () => {
    test('audit PROXY_ACCES_FORMATION cree apres acces reussi', async () => {
      await request(API_URL)
        .get(`/api/formations-demande/${accesActifId}/acceder`)
        .set(apprenantDossierHeaders)
        .redirects(0);

      const logs = await prisma.$queryRaw`
        SELECT * FROM "AuditLog"
        WHERE action = 'PROXY_ACCES_FORMATION'
          AND metadata::text LIKE ${'%' + accesActifId + '%'}
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      expect(logs.length).toBeGreaterThan(0);
    });

    test('audit PROXY_ACCES_FORMATION ne contient pas l URL reelle', async () => {
      const logs = await prisma.$queryRaw`
        SELECT * FROM "AuditLog"
        WHERE action = 'PROXY_ACCES_FORMATION'
          AND metadata::text LIKE ${'%' + accesActifId + '%'}
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      if (logs.length > 0) {
        const metadataStr = JSON.stringify(logs[0].metadata);
        expect(metadataStr).not.toContain(URL_TEST);
        expect(metadataStr).not.toContain('https://formation-proxy-test');
      }
    });
  });

  describe('RM-153 — last_access_at mis a jour', () => {
    test('last_access_at est mis a jour apres acces reussi', async () => {
      const before = await prisma.accesFormationDemande.findUnique({
        where: { id: accesActifId },
        select: { last_access_at: true },
      });

      await request(API_URL)
        .get(`/api/formations-demande/${accesActifId}/acceder`)
        .set(apprenantDossierHeaders)
        .redirects(0);

      const after = await prisma.accesFormationDemande.findUnique({
        where: { id: accesActifId },
        select: { last_access_at: true },
      });

      expect(after.last_access_at).not.toBeNull();
      if (before.last_access_at) {
        expect(after.last_access_at.getTime()).toBeGreaterThanOrEqual(
          before.last_access_at.getTime()
        );
      }
    });
  });
});
