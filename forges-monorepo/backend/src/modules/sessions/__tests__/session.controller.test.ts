import { SessionController } from '../session.controller';
import { SessionService } from '../session.service';
import { createMockReq, createMockRes, createNext } from '../../../__tests__/helpers/http';

describe('SessionController', () => {
  let controller: SessionController;
  let service: jest.Mocked<SessionService>;

  const UUID = '550e8400-e29b-41d4-a716-446655440000';

  const validCreateBody = {
    formation_id: UUID,
    date_ouverture: '2026-06-01T00:00:00.000Z',
    date_cloture: '2026-06-05T00:00:00.000Z',
    date_debut: '2026-06-10T00:00:00.000Z',
    date_fin: '2026-06-12T00:00:00.000Z',
    capacite: 20,
  };

  const validBulkBody = {
    formation_id: UUID,
    premiere_date_ouverture: '2026-06-01T00:00:00.000Z',
    frequence_semaines: 4,
    nb_sessions: 3,
    duree_inscription_jours: 10,
    duree_session_jours: 3,
    capacite: 20,
  };

  beforeEach(() => {
    service = {
      create: jest.fn(),
      update: jest.fn(),
      planifierAnnuelle: jest.fn(),
      getByFormation: jest.fn(),
      getDisponibles: jest.fn(),
      transitionnerStatuts: jest.fn(),
      archiverSessionsAnciennnes: jest.fn(),
    } as any;

    controller = new SessionController(service);
  });

  it('crée une session et couvre les erreurs métier principales', async () => {
    const invalidRes = createMockRes();
    const invalidNext = createNext();
    await controller.create(createMockReq({ body: {} }), invalidRes, invalidNext);
    expect(invalidRes.status).toHaveBeenCalledWith(400);

    const req = createMockReq({
      body: validCreateBody,
      user: { userId: 'admin-01', role: 'ADMIN', langue: 'FR' },
    });
    const res = createMockRes();
    const next = createNext();

    service.create.mockResolvedValueOnce({ id: 'session-01' } as any);
    await controller.create(req, res, next);
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining(validCreateBody), 'admin-01');
    expect(res.status).toHaveBeenCalledWith(201);

    const notFoundRes = createMockRes();
    service.create.mockRejectedValueOnce(new Error('FORMATION_NOT_FOUND'));
    await controller.create(req, notFoundRes, next);
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    const impossibleRes = createMockRes();
    service.create.mockRejectedValueOnce(new Error('SESSION_IMPOSSIBLE_FORMATION_DEMANDE'));
    await controller.create(req, impossibleRes, next);
    expect(impossibleRes.status).toHaveBeenCalledWith(400);

    const overlapRes = createMockRes();
    service.create.mockRejectedValueOnce(new Error('SESSION_OVERLAP:s1,s2'));
    await controller.create(req, overlapRes, next);
    expect(overlapRes.status).toHaveBeenCalledWith(409);
    expect(overlapRes.json).toHaveBeenCalledWith({
      error: 'SESSION_OVERLAP',
      message: 'Ces dates chevauchent une session existante (RM-17).',
      sessions_en_conflit: ['s1', 's2'],
    });
  });

  it('met à jour une session et mappe 404, 400 et conflits', async () => {
    const req = createMockReq({
      params: { id: 'session-01' },
      body: { capacite: 30 },
      user: { userId: 'admin-01', role: 'ADMIN', langue: 'FR' },
    });
    const res = createMockRes();
    const next = createNext();

    service.update.mockResolvedValueOnce({ id: 'session-01', capacite: 30 } as any);
    await controller.update(req, res, next);
    expect(service.update).toHaveBeenCalledWith('session-01', { capacite: 30 }, 'admin-01');

    const notFoundRes = createMockRes();
    service.update.mockRejectedValueOnce(new Error('SESSION_NOT_FOUND'));
    await controller.update(req, notFoundRes, next);
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    const chronoRes = createMockRes();
    service.update.mockRejectedValueOnce(new Error('CHRONOLOGY_ERROR'));
    await controller.update(req, chronoRes, next);
    expect(chronoRes.status).toHaveBeenCalledWith(400);

    const overlapRes = createMockRes();
    service.update.mockRejectedValueOnce(new Error('SESSION_OVERLAP:s3,s4'));
    await controller.update(req, overlapRes, next);
    expect(overlapRes.status).toHaveBeenCalledWith(409);
    expect(overlapRes.json).toHaveBeenCalledWith({
      error: 'SESSION_OVERLAP',
      sessions_en_conflit: ['s3', 's4'],
    });
  });

  it('planifie des sessions annuelles avec validation et erreur formation', async () => {
    const invalidRes = createMockRes();
    const invalidNext = createNext();
    await controller.planifierAnnuelle(createMockReq({ body: {} }), invalidRes, invalidNext);
    expect(invalidRes.status).toHaveBeenCalledWith(400);

    const req = createMockReq({
      body: validBulkBody,
      user: { userId: 'admin-01', role: 'ADMIN', langue: 'FR' },
    });
    const res = createMockRes();
    const next = createNext();

    service.planifierAnnuelle.mockResolvedValueOnce({ sessions_creees: 3 } as any);
    await controller.planifierAnnuelle(req, res, next);
    expect(service.planifierAnnuelle).toHaveBeenCalledWith(expect.objectContaining(validBulkBody), 'admin-01');
    expect(res.status).toHaveBeenCalledWith(201);

    const notFoundRes = createMockRes();
    service.planifierAnnuelle.mockRejectedValueOnce(new Error('FORMATION_NOT_FOUND'));
    await controller.planifierAnnuelle(req, notFoundRes, next);
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    const impossibleRes = createMockRes();
    service.planifierAnnuelle.mockRejectedValueOnce(new Error('SESSION_IMPOSSIBLE_FORMATION_DEMANDE'));
    await controller.planifierAnnuelle(req, impossibleRes, next);
    expect(impossibleRes.status).toHaveBeenCalledWith(400);
  });

  it('retourne les sessions par formation, les disponibles et le scheduler manuel', async () => {
    const res = createMockRes();
    const next = createNext();

    service.getByFormation.mockResolvedValueOnce([{ id: 'session-01' }] as any);
    await controller.getByFormation(createMockReq({ params: { id: UUID } }), res, next);
    expect(service.getByFormation).toHaveBeenCalledWith(UUID);
    expect(res.json).toHaveBeenCalledWith([{ id: 'session-01' }]);

    service.getDisponibles.mockResolvedValueOnce([{ id: 'session-02' }] as any);
    await controller.getDisponibles(createMockReq({ params: { id: UUID } }), res, next);
    expect(service.getDisponibles).toHaveBeenCalledWith(UUID);

    service.transitionnerStatuts.mockResolvedValueOnce(2 as never);
    service.archiverSessionsAnciennnes.mockResolvedValueOnce(1 as never);
    await controller.runScheduler(createMockReq(), res, next);
    expect(res.json).toHaveBeenCalledWith({ transitions: 2, archives: 1 });

    const boom = new Error('BOOM');
    const errorNext = createNext();
    service.getByFormation.mockRejectedValueOnce(boom);
    await controller.getByFormation(createMockReq({ params: { id: UUID } }), createMockRes(), errorNext);
    expect(errorNext).toHaveBeenCalledWith(boom);
  });
});
