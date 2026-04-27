import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { authApi } from '../auth.api';

vi.mock('../client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../../utils/authStorage', () => ({
  getStoredSession: vi.fn(),
  setStoredSession: vi.fn(),
}));

import { getStoredSession } from '../../utils/authStorage';

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStoredSession.mockReturnValue({
      user: { role: 'APPRENANT' },
    });
  });

  it('appelle les bonnes routes runtime auth de base', async () => {
    apiClient.post.mockResolvedValue({ data: { ok: true } });
    apiClient.get.mockResolvedValue({ data: { ok: true } });

    await authApi.requestPasswordReset('user@test.ci');
    await authApi.resetPassword('token-1', 'Password1!');
    await authApi.changePassword('Current1!', 'NewPassword1!');
    await authApi.getProfile();

    expect(apiClient.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'user@test.ci' });
    expect(apiClient.post).toHaveBeenCalledWith('/auth/reset-password', {
      token: 'token-1',
      password: 'Password1!',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/auth/change-password', {
      currentPassword: 'Current1!',
      newPassword: 'NewPassword1!',
    });
    expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
  });

  it('confirme un email via le bon fallback runtime', async () => {
    apiClient.get
      .mockRejectedValueOnce({ statusCode: 404 })
      .mockResolvedValueOnce({ data: { confirmed: true } });

    await authApi.confirmEmail('token-1');

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/apprenants/confirm/token-1');
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/organisations/confirm/token-1');
  });

  it.each([
    ['APPRENANT', '/apprenants/profil'],
    ['ORGANISATION', '/espace-organisation/profil'],
    ['GESTIONNAIRE', '/espace-organisation/profil'],
    ['PARTENAIRE', '/partenaires/profil'],
    ['APPORTEUR', '/apporteurs/profil'],
  ])('met à jour le profil pour le rôle %s', async (role, route) => {
    getStoredSession.mockReturnValue({ user: { role } });
    apiClient.put.mockResolvedValue({ data: { ok: true } });

    await authApi.updateProfile({ nom: 'Test' });

    expect(apiClient.put).toHaveBeenCalledWith(route, { nom: 'Test' });
  });

  it('rejette les rôles non exposés pour updateProfile', async () => {
    getStoredSession.mockReturnValue({ user: { role: 'ADMIN' } });

    await expect(authApi.updateProfile({ nom: 'Test' })).rejects.toMatchObject({
      code: 'ROUTE_ABSENTE',
    });
  });
});
