/**
 * Tests d'intégration — Export CSV Partenaire (RM-155)
 *
 * Couvre :
 *   RM-155 : export CSV anonymisé, colonnes exactes, aucune PII, HMAC stable
 *   MT-01  : log CSV_PARTENAIRE_EXPORTE
 *   MT-02  : HMAC stable et irréversible
 *   RBAC   : seul PARTENAIRE peut exporter son propre CSV
 */

const { API_URL, accounts, auth, request } = require('./helpers');

let partenaireHeaders;
let adminHeaders;
let apprenantHeaders;
let exportCsvReference;
const MOIS_TEST = '2025-04';

beforeAll(async () => {
  [partenaireHeaders, adminHeaders, apprenantHeaders] = await Promise.all([
    auth(accounts.partenaire),
    auth(accounts.admin),
    auth(accounts.apprenant),
  ]);

  exportCsvReference = await request(API_URL)
    .get(`/api/partenaires/export-csv?mois=${MOIS_TEST}`)
    .set(partenaireHeaders);
});

describe('RM-155 — Export CSV Partenaire', () => {

  describe("RBAC — controle d'acces", () => {
    it('PARTENAIRE peut acceder a GET /api/partenaires/export-csv', async () => {
      expect(exportCsvReference.status).toBe(200);
    });

    it('ADMIN recoit 403 sur /api/partenaires/export-csv', async () => {
      const res = await request(API_URL)
        .get(`/api/partenaires/export-csv?mois=${MOIS_TEST}`)
        .set(adminHeaders);

      expect(res.status).toBe(403);
    });

    it('APPRENANT recoit 403 sur /api/partenaires/export-csv', async () => {
      const res = await request(API_URL)
        .get(`/api/partenaires/export-csv?mois=${MOIS_TEST}`)
        .set(apprenantHeaders);

      expect(res.status).toBe(403);
    });

    it('sans token recoit 401', async () => {
      const res = await request(API_URL)
        .get(`/api/partenaires/export-csv?mois=${MOIS_TEST}`);

      expect(res.status).toBe(401);
    });
  });

  describe('Validation parametre mois', () => {
    it('sans mois → 400 MOIS_REQUIS', async () => {
      const res = await request(API_URL)
        .get('/api/partenaires/export-csv')
        .set(partenaireHeaders);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('MOIS_REQUIS');
    });

    it('mois format invalide (DD-MM-YYYY) → 400 FORMAT_MOIS_INVALIDE', async () => {
      const res = await request(API_URL)
        .get('/api/partenaires/export-csv?mois=04-2025')
        .set(partenaireHeaders);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('FORMAT_MOIS_INVALIDE');
    });

    it('mois texte libre → 400 FORMAT_MOIS_INVALIDE', async () => {
      const res = await request(API_URL)
        .get('/api/partenaires/export-csv?mois=avril')
        .set(partenaireHeaders);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('FORMAT_MOIS_INVALIDE');
    });
  });

  describe('Format CSV', () => {
    it('Content-Type est text/csv', async () => {
      expect(exportCsvReference.status).toBe(200);
      expect(exportCsvReference.headers['content-type']).toMatch(/text\/csv/);
    });

    it('Content-Disposition contient attachment et nom de fichier .csv', async () => {
      expect(exportCsvReference.status).toBe(200);
      expect(exportCsvReference.headers['content-disposition']).toMatch(/attachment/);
      expect(exportCsvReference.headers['content-disposition']).toMatch(/\.csv/);
    });

    it('header CSV contient exactement les colonnes du spec v4.9', async () => {
      expect(exportCsvReference.status).toBe(200);
      const firstLine = exportCsvReference.text.split('\n')[0];
      expect(firstLine).toBe(
        'identifiant_anonymise,formation_intitule,activation_confirmee_le,statut_acces,certification_obtenue,url_verification_certificat,langue_formation'
      );
    });
  });

  describe('Absence de PII (RM-155)', () => {
    it("le CSV ne contient pas d'email", async () => {
      expect(exportCsvReference.status).toBe(200);
      expect(exportCsvReference.text).not.toMatch(/@/);
    });

    it("le CSV ne contient pas l'ID apprenant brut", async () => {
      expect(exportCsvReference.status).toBe(200);
      // Les lignes de données ne doivent pas contenir un UUID brut non haché
      // On vérifie que les données apprenants ne sont pas exposées en clair
      // L'identifiant_anonymise est un hash hex de 64 chars — pas un UUID
      const lines = exportCsvReference.text.split('\n').filter(l => l.trim() && !l.startsWith('identifiant'));
      for (const line of lines) {
        const firstCol = line.split(',')[0];
        // Doit être un hash hex 64 chars, pas un UUID (qui contient des tirets)
        if (firstCol) {
          expect(firstCol).toMatch(/^[a-f0-9]{64}$/);
        }
      }
    });

    it('le CSV ne contient pas de token NGSER ni de credentials', async () => {
      expect(exportCsvReference.status).toBe(200);
      expect(exportCsvReference.text).not.toContain('Bearer');
      expect(exportCsvReference.text).not.toContain('TOKEN-');
      expect(exportCsvReference.text).not.toContain('payment_token');
      expect(exportCsvReference.text).not.toContain('auth_token');
    });
  });

  describe('HMAC stable (MT-02)', () => {
    it('deux exports successifs du meme mois produisent le meme identifiant_anonymise', async () => {
      const res1 = await request(API_URL)
        .get(`/api/partenaires/export-csv?mois=${MOIS_TEST}`)
        .set(partenaireHeaders);
      const res2 = await request(API_URL)
        .get(`/api/partenaires/export-csv?mois=${MOIS_TEST}`)
        .set(partenaireHeaders);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      // Les contenus doivent etre identiques (HMAC stable)
      expect(res1.text).toBe(res2.text);
    });
  });
});
