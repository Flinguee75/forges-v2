import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../client';
import { vouchersApi } from '../vouchers.api';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('vouchersApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appelle les bonnes routes runtime pour les vouchers backoffice', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    apiClient.post.mockResolvedValue({ data: {} });
    apiClient.patch.mockResolvedValue({ data: {} });

    await vouchersApi.getAll({ search: 'promo', statut: '' });
    await vouchersApi.getById('v-1');
    await vouchersApi.getByCode('CODE-1');
    await vouchersApi.createOrganisation({
      formation_id: 'f-1',
      devis_id: 'devis-1',
      valeur: 50000,
      type_valeur: 'MONTANT',
      quota_max: 10,
      date_expiration: '2026-01-01',
    });
    await vouchersApi.createPromotionnel({
      formation_id: 'f-1',
      valeur: 20,
      type_valeur: 'POURCENTAGE',
      quota_max: 5,
      date_expiration: '2026-01-01',
    });
    await vouchersApi.valider('v-1');
    await vouchersApi.refuser('v-1', 'motif');
    await vouchersApi.checkApporteurCode('CODE-1', { voucher_code: 'V-1' });

    expect(apiClient.get).toHaveBeenCalledWith('/vouchers', { params: { search: 'promo' } });
    expect(apiClient.get).toHaveBeenCalledWith('/vouchers/v-1');
    expect(apiClient.get).toHaveBeenCalledWith('/vouchers/code/CODE-1');
    expect(apiClient.get).toHaveBeenCalledWith('/vouchers/apporteur/CODE-1/check', {
      params: { voucher_code: 'V-1' },
    });

    expect(apiClient.post).toHaveBeenCalledWith('/vouchers/organisation', {
      formation_id: 'f-1',
      devis_id: 'devis-1',
      valeur: 50000,
      type_valeur: 'MONTANT',
      quota_max: 10,
      date_expiration: '2026-01-01',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/vouchers/promotionnel', {
      formation_id: 'f-1',
      valeur: 20,
      type_valeur: 'POURCENTAGE',
      quota_max: 5,
      date_expiration: '2026-01-01',
    });
    expect(apiClient.patch).toHaveBeenCalledWith('/vouchers/v-1/validate');
    expect(apiClient.patch).toHaveBeenCalledWith('/vouchers/v-1/reject', { motif: 'motif' });
  });
});
