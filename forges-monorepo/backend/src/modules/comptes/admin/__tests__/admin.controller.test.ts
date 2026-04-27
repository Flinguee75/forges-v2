import { AdminController } from '../admin.controller';
import { AdminService } from '../admin.service';
import { createMockReq, createMockRes, createNext } from '../../../../__tests__/helpers/http';

describe('AdminController', () => {
  let controller: AdminController;
  let service: jest.Mocked<AdminService>;

  beforeEach(() => {
    service = {
      createUser: jest.fn(),
      updateUserStatus: jest.fn(),
      invitePartenaire: jest.fn(),
      createApporteur: jest.fn(),
      listUsers: jest.fn(),
    } as any;

    controller = new AdminController(service);
  });

  it('crée un utilisateur et mappe les erreurs de validation et de conflit', async () => {
    const invalidRes = createMockRes();
    const invalidNext = createNext();

    await controller.createUser(createMockReq({ body: {} }), invalidRes, invalidNext);

    expect(invalidRes.status).toHaveBeenCalledWith(400);

    const req = createMockReq({
      body: {
        email: 'ADMIN@TEST.CI',
        role: 'ADMIN',
        nom: 'Doe',
        prenoms: 'Jane',
      },
      user: { userId: 'admin-01', role: 'ADMIN', langue: 'FR' },
    });
    const successRes = createMockRes();
    const successNext = createNext();

    service.createUser.mockResolvedValueOnce({ id: 'user-01' } as any);
    await controller.createUser(req, successRes, successNext);

    expect(service.createUser).toHaveBeenCalledWith(
      {
        email: 'admin@test.ci',
        role: 'ADMIN',
        nom: 'Doe',
        prenoms: 'Jane',
      },
      'admin-01'
    );
    expect(successRes.status).toHaveBeenCalledWith(201);
    expect(successRes.json).toHaveBeenCalledWith({ id: 'user-01' });

    const conflictRes = createMockRes();
    const conflictNext = createNext();
    service.createUser.mockRejectedValueOnce(new Error('EMAIL_ALREADY_EXISTS'));
    await controller.createUser(req, conflictRes, conflictNext);
    expect(conflictRes.status).toHaveBeenCalledWith(409);

    const boom = new Error('BOOM');
    const errorRes = createMockRes();
    const errorNext = createNext();
    service.createUser.mockRejectedValueOnce(boom);
    await controller.createUser(req, errorRes, errorNext);
    expect(errorNext).toHaveBeenCalledWith(boom);
  });

  it('met à jour le statut et traite les erreurs métier attendues', async () => {
    const req = createMockReq({
      params: { id: 'user-01' },
      body: { statut: 'SUSPENDU' },
      user: { userId: 'admin-01', role: 'ADMIN', langue: 'FR' },
    });
    const res = createMockRes();
    const next = createNext();

    service.updateUserStatus.mockResolvedValueOnce({ message: 'ok' } as any);
    await controller.updateStatus(req, res, next);
    expect(service.updateUserStatus).toHaveBeenCalledWith('user-01', 'SUSPENDU', 'admin-01');
    expect(res.json).toHaveBeenCalledWith({ message: 'ok' });

    const notFoundRes = createMockRes();
    service.updateUserStatus.mockRejectedValueOnce(new Error('USER_NOT_FOUND'));
    await controller.updateStatus(req, notFoundRes, next);
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    const conflictRes = createMockRes();
    service.updateUserStatus.mockRejectedValueOnce(new Error('CANNOT_DEACTIVATE_WITH_ACTIVE_DOSSIERS'));
    await controller.updateStatus(
      createMockReq({
        params: { id: 'user-01' },
        body: { statut: 'INACTIF' },
        user: { userId: 'admin-01', role: 'ADMIN', langue: 'FR' },
      }),
      conflictRes,
      next
    );
    expect(conflictRes.status).toHaveBeenCalledWith(409);

    const boom = new Error('BOOM');
    const errorRes = createMockRes();
    const errorNext = createNext();
    service.updateUserStatus.mockRejectedValueOnce(boom);
    await controller.updateStatus(req, errorRes, errorNext);
    expect(errorNext).toHaveBeenCalledWith(boom);
  });

  it('gère les endpoints invitation partenaire, création apporteur et listing', async () => {
    const inviteReq = createMockReq({
      body: {
        email: 'PARTNER@TEST.CI',
        raison_sociale: 'Tech Formation',
        type: 'ONG',
        commission_forges_pct: 15,
      },
      user: { userId: 'admin-01', role: 'ADMIN', langue: 'FR' },
    });
    const inviteRes = createMockRes();
    const inviteNext = createNext();

    service.invitePartenaire.mockResolvedValueOnce({ partenaire_id: 'part-01' } as any);
    await controller.invitePartenaire(inviteReq, inviteRes, inviteNext);
    expect(service.invitePartenaire).toHaveBeenCalledWith(
      {
        email: 'partner@test.ci',
        raison_sociale: 'Tech Formation',
        type: 'ONG',
        commission_forges_pct: 15,
      },
      'admin-01'
    );
    expect(inviteRes.status).toHaveBeenCalledWith(201);

    const inviteInvalidRes = createMockRes();
    await controller.invitePartenaire(createMockReq({ body: {} }), inviteInvalidRes, inviteNext);
    expect(inviteInvalidRes.status).toHaveBeenCalledWith(400);

    const apporteurReq = createMockReq({
      body: {
        nom: 'Apporteur One',
        email: 'APPORTEUR@TEST.CI',
        type: 'INDIVIDU',
        taux_commission_pct: 10,
      },
      user: { userId: 'admin-01', role: 'ADMIN', langue: 'FR' },
    });
    const apporteurRes = createMockRes();
    service.createApporteur.mockResolvedValueOnce({ apporteur_id: 'app-01' } as any);
    await controller.createApporteur(apporteurReq, apporteurRes, inviteNext);
    expect(service.createApporteur).toHaveBeenCalledWith(
      {
        nom: 'Apporteur One',
        email: 'apporteur@test.ci',
        type: 'INDIVIDU',
        taux_commission_pct: 10,
      },
      'admin-01'
    );
    expect(apporteurRes.status).toHaveBeenCalledWith(201);

    const apporteurInvalidRes = createMockRes();
    await controller.createApporteur(createMockReq({ body: {} }), apporteurInvalidRes, inviteNext);
    expect(apporteurInvalidRes.status).toHaveBeenCalledWith(400);

    const listReq = createMockReq({ query: { page: '2' } });
    const listRes = createMockRes();
    service.listUsers.mockResolvedValueOnce({ users: [], total: 0, page: 2, limit: 20 } as any);
    await controller.listUsers(listReq, listRes, inviteNext);
    expect(service.listUsers).toHaveBeenCalledWith(2);
    expect(listRes.json).toHaveBeenCalledWith({ users: [], total: 0, page: 2, limit: 20 });

    const listError = new Error('BOOM');
    const listErrorNext = createNext();
    service.listUsers.mockRejectedValueOnce(listError);
    await controller.listUsers(createMockReq(), createMockRes(), listErrorNext);
    expect(listErrorNext).toHaveBeenCalledWith(listError);
  });
});
