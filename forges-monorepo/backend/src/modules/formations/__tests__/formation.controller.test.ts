import { FormationController } from '../formation.controller';
import { FormationService } from '../formation.service';
import { createMockReq, createMockRes, createNext } from '../../../__tests__/helpers/http';

describe('FormationController', () => {
  let controller: FormationController;
  let mockService: jest.Mocked<FormationService>;

  beforeEach(() => {
    mockService = {
      getCataloguePublic: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      archiver: jest.fn(),
      publish: jest.fn(),
      assignerType: jest.fn(),
      getAll: jest.fn(),
    } as any;
    controller = new FormationController(mockService);
  });

  it('retourne le catalogue public et une formation par id', async () => {
    const res = createMockRes();
    const next = createNext();

    mockService.getCataloguePublic.mockResolvedValue({
      formations: [{ id: 'formation-01', intitule: 'Formation', duree_jours: 3, cout_catalogue: 100000 }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    } as any);
    await controller.getCataloguePublic(createMockReq(), res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([expect.objectContaining({ id: 'formation-01', titre: 'Formation' })]),
      meta: expect.objectContaining({ total: 1, page: 1, totalPages: 1 }),
    }));

    mockService.getById.mockResolvedValueOnce({ id: 'formation-01', intitule: 'Formation', duree_jours: 3, cout_catalogue: 100000, description_courte: 'Desc' } as any);
    await controller.getById(createMockReq({ params: { id: 'formation-01' } }), res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 200,
      data: expect.objectContaining({ id: 'formation-01', titre: 'Formation' }),
    }));

    mockService.getById.mockRejectedValueOnce(new Error('FORMATION_NOT_FOUND'));
    await controller.getById(createMockReq({ params: { id: 'missing' } }), res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('crée une formation et mappe une erreur de validation', async () => {
    const res = createMockRes();
    const next = createNext();
    const validReq = createMockReq({
      body: {
        intitule: 'Formation Test',
        description_courte: 'Description courte',
        duree_jours: 3,
        cout_catalogue: 100000,
        type_formation: 'STANDARD',
        mode_formation: 'AVEC_SESSION',
        langues_disponibles: ['FR'],
        objectifs_pedagogiques: ['Obj'],
      },
      user: { userId: 'resp-01' },
    });

    await controller.create(createMockReq({ body: {} }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    mockService.create.mockResolvedValueOnce({ id: 'formation-01' } as any);
    await controller.create(validReq, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('met à jour, archive, assigne un type et liste les formations', async () => {
    const res = createMockRes();
    const next = createNext();
    const updateReq = createMockReq({
      params: { id: 'formation-01' },
      body: { intitule: 'Formation v2' },
      user: { userId: 'resp-01' },
    });

    mockService.update.mockResolvedValueOnce({ id: 'formation-01' } as any);
    await controller.update(updateReq, res, next);
    expect(res.json).toHaveBeenCalledWith({ id: 'formation-01' });

    mockService.update.mockRejectedValueOnce(new Error('FORMATION_ARCHIVEE'));
    await controller.update(updateReq, res, next);
    expect(res.status).toHaveBeenCalledWith(403);

    mockService.archiver.mockRejectedValueOnce(new Error('FORMATION_DEJA_ARCHIVEE'));
    await controller.archiver(createMockReq({ params: { id: 'formation-01' }, user: { userId: 'admin-01' } }), res, next);
    expect(res.status).toHaveBeenCalledWith(409);

    mockService.publish.mockResolvedValueOnce({ id: 'formation-01', statut: 'EN_ATTENTE_PLANIFICATION' } as any);
    await controller.publish(createMockReq({ params: { id: 'formation-01' }, user: { userId: 'admin-01' } }), res, next);
    expect(res.json).toHaveBeenCalledWith({ id: 'formation-01', statut: 'EN_ATTENTE_PLANIFICATION' });

    mockService.assignerType.mockResolvedValueOnce({ id: 'formation-01', type_formation: 'STANDARD' } as any);
    await controller.assignerType(createMockReq({
      params: { id: 'formation-01' },
      body: {
        type_formation: 'STANDARD',
        pilier_abonnement: 'TOUS',
      },
      user: { userId: 'resp-01' },
    }), res, next);
    expect(res.json).toHaveBeenCalledWith({ id: 'formation-01', type_formation: 'STANDARD' });

    mockService.getAll.mockResolvedValueOnce({ formations: [], total: 0, page: 2, limit: 5 } as any);
    await controller.getAll(createMockReq({
      query: { statut: 'ACTIVE', page: '2', limit: '5' },
    }), res, next);
    expect(mockService.getAll).toHaveBeenCalledWith({
      statut: 'ACTIVE',
      type_formation: undefined,
      mode_formation: undefined,
      page: 2,
      limit: 5,
    });
  });
});
