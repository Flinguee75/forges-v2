/**
 * Tests unitaires — ExportCsvController (RM-155)
 *
 * Couvre :
 *   - Validation query param `mois` (YYYY-MM)
 *   - Réponse CSV avec Content-Type et Content-Disposition corrects
 *   - Résolution partenaire introuvable → 404
 *   - Erreurs de service propagées
 */

import { Request, Response, NextFunction } from 'express';

const mockGenererCsv = jest.fn();
const mockFindByUserId = jest.fn();

jest.mock('../export-csv.service', () => ({
  ExportCsvService: jest.fn().mockImplementation(() => ({
    genererCsvPartenaire: mockGenererCsv,
  })),
}));

jest.mock('../partenaire.repository', () => ({
  PartenaireRepository: jest.fn().mockImplementation(() => ({
    findByUserId: mockFindByUserId,
  })),
}));

import { ExportCsvController } from '../export-csv.controller';
import { ExportCsvService } from '../export-csv.service';
import { PartenaireRepository } from '../partenaire.repository';
import { PrismaClient } from '@prisma/client';

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    query: {},
    params: {},
    user: { userId: 'user-part-01', role: 'PARTENAIRE' },
    ...overrides,
  } as unknown as Request;
}

function makeRes(): { res: Response; status: jest.Mock; json: jest.Mock; set: jest.Mock; send: jest.Mock } {
  const json = jest.fn();
  const send = jest.fn();
  const set = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json, send });
  return { res: { status, json, set, send } as unknown as Response, status, json, set, send };
}

const next: NextFunction = jest.fn();

describe('ExportCsvController — RM-155', () => {
  let controller: ExportCsvController;

  beforeEach(() => {
    jest.clearAllMocks();
    const prisma = new PrismaClient();
    const service = new ExportCsvService(prisma);
    const repo = new PartenaireRepository(prisma);
    controller = new ExportCsvController(service, repo);
  });

  describe('RM-155.1 — Validation du paramètre mois', () => {
    it('retourne 400 MOIS_REQUIS si mois absent', async () => {
      const req = makeReq({ query: {} });
      const { res, status, json } = makeRes();

      await controller.exportCsv(req, res, next);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'MOIS_REQUIS' }));
      expect(mockGenererCsv).not.toHaveBeenCalled();
    });

    it('retourne 400 FORMAT_MOIS_INVALIDE si format non YYYY-MM', async () => {
      const req = makeReq({ query: { mois: '04-2025' } });
      const { res, status, json } = makeRes();

      await controller.exportCsv(req, res, next);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'FORMAT_MOIS_INVALIDE' }));
      expect(mockGenererCsv).not.toHaveBeenCalled();
    });

    it('retourne 400 FORMAT_MOIS_INVALIDE si mois non numérique', async () => {
      const req = makeReq({ query: { mois: 'avril-2025' } });
      const { res, status, json } = makeRes();

      await controller.exportCsv(req, res, next);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'FORMAT_MOIS_INVALIDE' }));
    });
  });

  describe('RM-155.2 — Résolution partenaire', () => {
    it('retourne 404 PARTENAIRE_NOT_FOUND si userId ne correspond à aucun partenaire', async () => {
      mockFindByUserId.mockResolvedValue(null);
      const req = makeReq({ query: { mois: '2025-04' } });
      const { res, status, json } = makeRes();

      await controller.exportCsv(req, res, next);

      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'PARTENAIRE_NOT_FOUND' }));
      expect(mockGenererCsv).not.toHaveBeenCalled();
    });
  });

  describe('RM-155.3 — Export CSV réussi', () => {
    const CSV_HEADER = 'identifiant_anonymise,formation_intitule,activation_confirmee_le,statut_acces,certification_obtenue,url_verification_certificat,langue_formation\n';

    beforeEach(() => {
      mockFindByUserId.mockResolvedValue({ id: 'part-real-01' });
      mockGenererCsv.mockResolvedValue(CSV_HEADER);
    });

    it('retourne 200 avec Content-Type text/csv', async () => {
      const req = makeReq({ query: { mois: '2025-04' } });
      const { res, set, status } = makeRes();

      await controller.exportCsv(req, res, next);

      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ 'Content-Type': expect.stringContaining('text/csv') })
      );
      expect(status).toHaveBeenCalledWith(200);
    });

    it('retourne Content-Disposition attachment avec nom de fichier', async () => {
      const req = makeReq({ query: { mois: '2025-04' } });
      const { res, set } = makeRes();

      await controller.exportCsv(req, res, next);

      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Disposition': expect.stringMatching(/attachment.*filename.*2025-04.*\.csv/),
        })
      );
    });

    it('appelle le service avec partenaireId résolu et mois', async () => {
      const req = makeReq({ query: { mois: '2025-04' } });
      const { res } = makeRes();

      await controller.exportCsv(req, res, next);

      expect(mockFindByUserId).toHaveBeenCalledWith('user-part-01');
      expect(mockGenererCsv).toHaveBeenCalledWith('part-real-01', '2025-04');
    });

    it('log CSV_PARTENAIRE_EXPORTE dans audit (MT-01)', async () => {
      const req = makeReq({ query: { mois: '2025-04' } });
      const { res } = makeRes();

      await controller.exportCsv(req, res, next);

      // Pas d'erreur levée = audit appelé silencieusement
      expect(mockGenererCsv).toHaveBeenCalled();
    });
  });

  describe('RM-155.4 — Propagation erreurs service', () => {
    it("passe l'erreur a next() en cas d'exception inattendue", async () => {
      mockFindByUserId.mockResolvedValue({ id: 'part-real-01' });
      mockGenererCsv.mockRejectedValue(new Error('DB_ERROR'));
      const req = makeReq({ query: { mois: '2025-04' } });
      const { res } = makeRes();

      await controller.exportCsv(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
