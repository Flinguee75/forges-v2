import { ApprenantController } from '../apprenant.controller';
import { ApprenantService } from '../apprenant.service';
import { createMockReq, createMockRes, createNext } from '../../../../__tests__/helpers/http';

describe('ApprenantController', () => {
  let controller: ApprenantController;
  let service: jest.Mocked<ApprenantService>;

  const validBody = {
    email: 'APPRENANT@TEST.CI',
    password: 'Password1',
    nom: 'Doe',
    prenoms: 'Jane',
    type_apprenant: 'PROFESSIONNEL',
    secteur_activite: 'Finance',
    pays_residence: 'CI',
    pays_nationalite: 'CI',
    langue_preferee: 'FR',
    consentement_rgpd: true,
  };

  beforeEach(() => {
    service = {
      register: jest.fn(),
      confirmEmail: jest.fn(),
      resendConfirmation: jest.fn(),
    } as any;

    controller = new ApprenantController(service);
  });

  it('gère l’inscription avec validation, conflit métier et délégation d’erreur', async () => {
    const invalidRes = createMockRes();
    const invalidNext = createNext();
    await controller.register(createMockReq({ body: {} }), invalidRes, invalidNext);
    expect(invalidRes.status).toHaveBeenCalledWith(400);

    const req = createMockReq({ body: validBody, ip: '10.0.0.1' });
    const res = createMockRes();
    const next = createNext();
    service.register.mockResolvedValueOnce({ apprenant_id: 'app-01' } as any);

    await controller.register(req, res, next);

    expect(service.register).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'apprenant@test.ci' }),
      '10.0.0.1'
    );
    expect(res.status).toHaveBeenCalledWith(201);

    const conflictRes = createMockRes();
    service.register.mockRejectedValueOnce(new Error('EMAIL_ALREADY_EXISTS'));
    await controller.register(req, conflictRes, next);
    expect(conflictRes.status).toHaveBeenCalledWith(409);

    const boom = new Error('BOOM');
    const errorNext = createNext();
    service.register.mockRejectedValueOnce(boom);
    await controller.register(req, createMockRes(), errorNext);
    expect(errorNext).toHaveBeenCalledWith(boom);
  });

  it('confirme un compte et mappe les erreurs de token', async () => {
    const req = createMockReq({ params: { token: 'token-01' } });
    const res = createMockRes();
    const next = createNext();

    service.confirmEmail.mockResolvedValueOnce({ message: 'ok' } as any);
    await controller.confirm(req, res, next);
    expect(service.confirmEmail).toHaveBeenCalledWith('token-01');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: { message: 'ok' } });

    const invalidRes = createMockRes();
    service.confirmEmail.mockRejectedValueOnce(new Error('TOKEN_INVALID'));
    await controller.confirm(req, invalidRes, next);
    expect(invalidRes.status).toHaveBeenCalledWith(404);

    const expiredRes = createMockRes();
    service.confirmEmail.mockRejectedValueOnce(new Error('TOKEN_EXPIRED'));
    await controller.confirm(req, expiredRes, next);
    expect(expiredRes.status).toHaveBeenCalledWith(410);

    const boom = new Error('BOOM');
    const errorNext = createNext();
    service.confirmEmail.mockRejectedValueOnce(boom);
    await controller.confirm(req, createMockRes(), errorNext);
    expect(errorNext).toHaveBeenCalledWith(boom);
  });

  it('renvoie un lien de confirmation et délègue les erreurs inattendues', async () => {
    const req = createMockReq({ body: { email: 'apprenant@test.ci' } });
    const res = createMockRes();
    const next = createNext();

    service.resendConfirmation.mockResolvedValueOnce({ message: 'sent' } as any);
    await controller.resendConfirmation(req, res, next);
    expect(service.resendConfirmation).toHaveBeenCalledWith('apprenant@test.ci');
    expect(res.json).toHaveBeenCalledWith({ message: 'sent' });

    const boom = new Error('BOOM');
    const errorNext = createNext();
    service.resendConfirmation.mockRejectedValueOnce(boom);
    await controller.resendConfirmation(req, createMockRes(), errorNext);
    expect(errorNext).toHaveBeenCalledWith(boom);
  });
});
