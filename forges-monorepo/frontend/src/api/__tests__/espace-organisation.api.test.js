import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../client';
import { organisationApi } from '../espace-organisation.api';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('organisationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appelle la bonne route vouchers organisation', async () => {
    apiClient.get.mockResolvedValue({ data: [] });

    await organisationApi.getVouchers({ statut: 'ACTIF', page: 2 });

    expect(apiClient.get).toHaveBeenCalledWith('/espace-organisation/vouchers', {
      params: { statut: 'ACTIF', page: 2 },
    });
  });
});
