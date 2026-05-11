import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { paiementsApi } from '../paiements.api';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('paiementsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initie une session NGSER via endpoint backend-only', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        paiement_id: 'pay-1',
        payment_url: 'https://securetest.crossroad-africa.net/pay',
      },
    });

    await paiementsApi.initierNgser({ dossier_id: 'dos-1' });

    expect(apiClient.post).toHaveBeenCalledWith('/paiements/initier', {
      dossier_id: 'dos-1',
    });
  });

  it('normalise la liste backoffice brute du runtime actuel', async () => {
    apiClient.get.mockResolvedValue([{ id: 'pay-1' }, { id: 'pay-2' }]);

    const result = await paiementsApi.getAll({ page: 2, statut: '' });

    expect(apiClient.get).toHaveBeenCalledWith('/backoffice/paiements', {
      params: { page: 2 },
    });
    expect(result).toEqual({
      data: [{ id: 'pay-1' }, { id: 'pay-2' }],
      meta: { page: 2, totalPages: 1, total: 2 },
    });
  });

  it('récupère un détail backoffice depuis la liste backoffice', async () => {
    apiClient.get.mockResolvedValue([{ id: 'pay-1' }, { id: 'pay-2' }]);

    const result = await paiementsApi.getBackofficeById('pay-2');

    expect(apiClient.get).toHaveBeenCalledWith('/backoffice/paiements');
    expect(result).toEqual({ id: 'pay-2' });
  });

  it('supprime un paiement admin avec motif optionnel', async () => {
    apiClient.delete.mockResolvedValue({ statusCode: 200, data: { statut: 'SUPPRIME' } });

    await paiementsApi.deleteAdmin('pay-3', 'Nettoyage test');

    expect(apiClient.delete).toHaveBeenCalledWith('/admin/paiements/pay-3', {
      data: { motif: 'Nettoyage test' },
    });
  });
});
