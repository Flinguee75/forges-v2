import { BotController } from '../bot.controller';
import { BotService } from '../bot.service';
import { createMockReq, createMockRes, createNext } from '../../../__tests__/helpers/http';

describe('BotController', () => {
  let controller: BotController;
  let mockService: jest.Mocked<BotService>;

  beforeEach(() => {
    mockService = {
      demarrerSessionApprenant: jest.fn(),
      repondre: jest.fn(),
      abandonnerSession: jest.fn(),
    } as any;
    controller = new BotController(mockService);
  });

  it('démarre une session bot', async () => {
    const req = createMockReq({ user: { userId: 'app-01', langue: 'FR' } });
    const res = createMockRes();
    const next = createNext();
    mockService.demarrerSessionApprenant.mockResolvedValue({ session_id: 'sess-01' } as any);

    await controller.demarrerSession(req, res, next);

    expect(mockService.demarrerSessionApprenant).toHaveBeenCalledWith('app-01', 'FR');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  describe('getActiveSession', () => {
    it('retourne la session active de l\'utilisateur', async () => {
      const req = createMockReq({ user: { userId: 'app-01' } });
      const res = createMockRes();
      const next = createNext();
      const mockSession = { id: 'sess-01', statut: 'EN_COURS', utilisateur_id: 'app-01' };
      mockService.getSessionActive = jest.fn().mockResolvedValue(mockSession);

      await controller.getActiveSession(req, res, next);

      expect(mockService.getSessionActive).toHaveBeenCalledWith('app-01');
      expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: mockSession });
    });

    it('retourne 404 si aucune session active', async () => {
      const req = createMockReq({ user: { userId: 'app-01' } });
      const res = createMockRes();
      const next = createNext();
      mockService.getSessionActive = jest.fn().mockResolvedValue(null);

      await controller.getActiveSession(req, res, next);

      expect(mockService.getSessionActive).toHaveBeenCalledWith('app-01');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 404,
        error: 'NOT_FOUND',
        code: 'NOT_FOUND',
        message: 'Aucune session active'
      });
    });

    it('délègue les erreurs au middleware de gestion d\'erreurs', async () => {
      const req = createMockReq({ user: { userId: 'app-01' } });
      const res = createMockRes();
      const next = createNext();
      const error = new Error('Database error');
      mockService.getSessionActive = jest.fn().mockRejectedValue(error);

      await controller.getActiveSession(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  it('mappe les erreurs fonctionnelles sur une réponse bot', async () => {
    const req = createMockReq({
      params: { id: 'sess-01' },
      body: { question_id: 1, valeur: 'Oui' },
    });
    const res = createMockRes();
    const next = createNext();

    await controller.repondre(createMockReq({ params: { id: 'sess-01' }, body: {} }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    mockService.repondre.mockRejectedValueOnce(new Error('SESSION_INVALIDE'));
    await controller.repondre(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);

    mockService.repondre.mockRejectedValueOnce(new Error('REPONSE_HORS_LISTE'));
    await controller.repondre(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    mockService.repondre.mockRejectedValueOnce(new Error('NOTE_GLOBALE_OBLIGATOIRE'));
    await controller.repondre(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('abandonne une session et délègue les erreurs non gérées', async () => {
    const req = createMockReq({ params: { id: 'sess-01' } });
    const res = createMockRes();
    const next = createNext();
    const error = new Error('BOOM');

    mockService.abandonnerSession.mockResolvedValueOnce({ fin: true } as any);
    await controller.abandonner(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: { fin: true } });

    mockService.abandonnerSession.mockRejectedValueOnce(error);
    await controller.abandonner(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
