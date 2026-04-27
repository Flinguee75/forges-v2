import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../auth.api';
import { apiClient } from '../client';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('authApi.confirmEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appelle la route apprenant de confirmation', async () => {
    apiClient.get.mockResolvedValue({ data: { message: 'ok' } });

    await authApi.confirmEmail('token-123');

    expect(apiClient.get).toHaveBeenCalledWith('/apprenants/confirm/token-123');
  });
});
