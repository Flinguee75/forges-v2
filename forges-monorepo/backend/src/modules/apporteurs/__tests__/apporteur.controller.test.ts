import { ApporteurController } from '../apporteur.controller';
import { ApporteurService } from '../apporteur.service';
import { createMockReq, createMockRes, createNext } from '../../../__tests__/helpers/http';

describe('ApporteurController', () => {
  let controller: ApporteurController;
  let service: jest.Mocked<ApporteurService>;

  beforeEach(() => {
    service = {
      register: jest.fn(),
      getDashboard: jest.fn(),
      getCommissionsParMois: jest.fn(),
      effectuerReversements: jest.fn(),
      cloturerCompte: jest.fn(),
      getTdbMensuelSuperviseur: jest.fn(),
      traiterFinDeMois: jest.fn(),
    } as any;

    controller = new ApporteurController(service);
  });

  it('retourne le dashboard et mappe un apporteur introuvable', async () => {
    const req = createMockReq({ user: { userId: 'app-01', role: 'APPORTEUR', langue: 'FR' } });
    const res = createMockRes();
    const next = createNext();

    service.getDashboard.mockResolvedValueOnce({ commissions: [] } as any);
    await controller.getDashboard(req, res, next);
    expect(service.getDashboard).toHaveBeenCalledWith('app-01');
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      data: { commissions: [] },
    });

    const notFoundRes = createMockRes();
    service.getDashboard.mockRejectedValueOnce(new Error('APPORTEUR_NOT_FOUND'));
    await controller.getDashboard(req, notFoundRes, next);
    expect(notFoundRes.status).toHaveBeenCalledWith(404);
  });

  it('gère l\'inscription publique apporteur', async () => {
    const req = createMockReq({
      body: {
        nom: 'Apporteur Test',
        email: 'apporteur@test.ci',
        telephone: '0700000000',
        adresse: 'Abidjan',
        password: 'Password1!',
        type: 'INDIVIDU',
        consentement_rgpd: true,
      },
    });
    const res = createMockRes();
    const next = createNext();

    service.register.mockResolvedValueOnce({
      message: 'ok',
      workflow_status: 'EN_ATTENTE_VERIFICATION',
    } as any);

    await controller.register(req, res, next);

    expect(service.register).toHaveBeenCalledWith(
      expect.objectContaining({
        nom: 'Apporteur Test',
        email: 'apporteur@test.ci',
        type: 'INDIVIDU',
      }),
      expect.any(String)
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 201,
      data: {
        message: 'ok',
        workflow_status: 'EN_ATTENTE_VERIFICATION',
      },
    });
  });

  it('parse les mois sur les listings et délègue les erreurs', async () => {
    const req = createMockReq({
      query: { mois: '2026-02-01T00:00:00.000Z' },
      user: { userId: 'app-01', role: 'APPORTEUR', langue: 'FR' },
    });
    const res = createMockRes();
    const next = createNext();

    service.getCommissionsParMois.mockResolvedValueOnce([{ id: 'c-01' }] as any);
    await controller.getCommissions(req, res, next);
    expect(service.getCommissionsParMois).toHaveBeenCalledWith('app-01', new Date('2026-02-01T00:00:00.000Z'));
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      data: [{ id: 'c-01' }],
    });

    service.getTdbMensuelSuperviseur.mockResolvedValueOnce({ top: [] } as any);
    await controller.getTdbMensuel(
      createMockReq({
        query: { mois: '2026-03-01T00:00:00.000Z' },
        user: { userId: 'sup-01', role: 'SUPERVISEUR', langue: 'FR' },
      }),
      res,
      next
    );
    expect(service.getTdbMensuelSuperviseur).toHaveBeenCalledWith(new Date('2026-03-01T00:00:00.000Z'));

    const boom = new Error('BOOM');
    const errorNext = createNext();
    service.getCommissionsParMois.mockRejectedValueOnce(boom);
    await controller.getCommissions(req, createMockRes(), errorNext);
    expect(errorNext).toHaveBeenCalledWith(boom);
  });

  it('gère les reversements, la clôture et le scheduler mensuel', async () => {
    const next = createNext();

    const reverseRes = createMockRes();
    service.effectuerReversements.mockResolvedValueOnce({ reversements: 2 } as any);
    await controller.effectuerReversements(
      createMockReq({ user: { userId: 'agent-01', role: 'AGENT', langue: 'FR' } }),
      reverseRes,
      next
    );
    expect(service.effectuerReversements).toHaveBeenCalledWith('agent-01');
    expect(reverseRes.json).toHaveBeenCalledWith({
      statusCode: 201,
      data: { reversements: 2 },
    });

    const closeReq = createMockReq({
      params: { id: 'app-01' },
      user: { userId: 'admin-01', role: 'ADMIN', langue: 'FR' },
    });
    const closeRes = createMockRes();
    service.cloturerCompte.mockResolvedValueOnce({ message: 'closed' } as any);
    await controller.cloturerCompte(closeReq, closeRes, next);
    expect(service.cloturerCompte).toHaveBeenCalledWith('app-01', 'admin-01');

    const closeNotFoundRes = createMockRes();
    service.cloturerCompte.mockRejectedValueOnce(new Error('APPORTEUR_NOT_FOUND'));
    await controller.cloturerCompte(closeReq, closeNotFoundRes, next);
    expect(closeNotFoundRes.status).toHaveBeenCalledWith(404);

    const schedulerRes = createMockRes();
    service.traiterFinDeMois.mockResolvedValueOnce({ traites: 5 } as any);
    await controller.runSchedulerFinMois(createMockReq(), schedulerRes, next);
    expect(schedulerRes.json).toHaveBeenCalledWith({
      statusCode: 200,
      data: { traites: 5 },
    });
  });
});
