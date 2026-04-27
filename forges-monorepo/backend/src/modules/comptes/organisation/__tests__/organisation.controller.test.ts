import { OrganisationController } from '../organisation.controller';
import { OrganisationService } from '../organisation.service';
import { createMockReq, createMockRes, createNext } from '../../../../__tests__/helpers/http';

describe('OrganisationController', () => {
  let controller: OrganisationController;
  let service: jest.Mocked<OrganisationService>;

  const validBody = {
    raison_sociale: 'TechCorp',
    type: 'ENTREPRISE',
    identifiant_legal: 'CI-RCCM-2026-001',
    contact_referent: 'DRH',
    pays: 'CI',
    langue_preferee: 'FR',
    email: 'ORG@TEST.CI',
    password: 'Password1',
    consentement_rgpd: true,
  };

  beforeEach(() => {
    service = {
      register: jest.fn(),
      confirmEmail: jest.fn(),
      suspendreEssaisExpires: jest.fn(),
    } as any;

    controller = new OrganisationController(service);
  });

  it('gère l’inscription organisation avec validation et conflits', async () => {
    const invalidRes = createMockRes();
    const invalidNext = createNext();
    await controller.register(createMockReq({ body: {} }), invalidRes, invalidNext);
    expect(invalidRes.status).toHaveBeenCalledWith(400);

    const req = createMockReq({ body: validBody, ip: '10.0.0.2' });
    const res = createMockRes();
    const next = createNext();
    service.register.mockResolvedValueOnce({ organisation_id: 'org-01' } as any);

    await controller.register(req, res, next);

    expect(service.register).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'org@test.ci' }),
      '10.0.0.2'
    );
    expect(res.status).toHaveBeenCalledWith(201);

    const emailConflictRes = createMockRes();
    service.register.mockRejectedValueOnce(new Error('EMAIL_ALREADY_EXISTS'));
    await controller.register(req, emailConflictRes, next);
    expect(emailConflictRes.status).toHaveBeenCalledWith(409);

    const legalConflictRes = createMockRes();
    service.register.mockRejectedValueOnce(new Error('IDENTIFIANT_LEGAL_ALREADY_EXISTS'));
    await controller.register(req, legalConflictRes, next);
    expect(legalConflictRes.status).toHaveBeenCalledWith(409);

    const boom = new Error('BOOM');
    const errorNext = createNext();
    service.register.mockRejectedValueOnce(boom);
    await controller.register(req, createMockRes(), errorNext);
    expect(errorNext).toHaveBeenCalledWith(boom);
  });

  it('confirme un compte organisation et mappe les erreurs de token', async () => {
    const req = createMockReq({ params: { token: 'token-01' } });
    const res = createMockRes();
    const next = createNext();

    service.confirmEmail.mockResolvedValueOnce({ message: 'ok' } as any);
    await controller.confirm(req, res, next);
    expect(service.confirmEmail).toHaveBeenCalledWith('token-01');
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
});
