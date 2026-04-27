import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { createMockReq, createMockRes } from '../../../__tests__/helpers/http';

describe('AuthController', () => {
  let controller: AuthController;
  let mockService: jest.Mocked<AuthService>;

  beforeEach(() => {
    mockService = {
      login: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      changePassword: jest.fn(),
      me: jest.fn(),
    } as any;

    controller = new AuthController(mockService);
  });

  it('retourne le résultat du login avec les paramètres parsés', async () => {
    const req = createMockReq({
      body: { email: 'user@test.ci', password: 'Password1' },
      ip: '10.0.0.1',
    });
    const res = createMockRes();
    mockService.login.mockResolvedValue({ accessToken: 'token' } as any);

    await controller.login(req, res);

    expect(mockService.login).toHaveBeenCalledWith('user@test.ci', 'Password1', '10.0.0.1');
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      data: { accessToken: 'token' },
    });
  });

  it('rejette si le payload est invalide', async () => {
    const req = createMockReq({ body: { email: 'not-an-email', password: 'short' } });
    const res = createMockRes();

    await controller.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retourne la réponse du forgot password', async () => {
    const req = createMockReq({ body: { email: 'user@test.ci' }, ip: '10.0.0.1' });
    const res = createMockRes();
    mockService.forgotPassword.mockResolvedValue({
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé.',
    } as any);

    await controller.forgotPassword(req, res);

    expect(mockService.forgotPassword).toHaveBeenCalledWith('user@test.ci', '10.0.0.1');
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      data: { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' },
    });
  });
});
