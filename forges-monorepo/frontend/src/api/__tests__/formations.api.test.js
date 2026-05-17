import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formationsApi } from '../formations.api';
import { apiClient } from '../client';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('formations.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue({ data: [] });
    apiClient.post.mockResolvedValue({ data: {} });
    apiClient.put.mockResolvedValue({ data: {} });
    apiClient.patch.mockResolvedValue({ data: {} });
  });

  it('appelle la route runtime de publication', async () => {
    await formationsApi.publier('f-1');

    expect(apiClient.patch).toHaveBeenCalledWith('/formations/f-1/publish');
  });

  it('appelle les routes backoffice de lecture et CRUD', async () => {
    await formationsApi.getAllBackoffice({ search: 'Alpha' });
    await formationsApi.getByIdBackoffice('f-1');
    await formationsApi.create({ intitule: 'Alpha' });
    await formationsApi.update('f-1', { intitule: 'Beta' });
    await formationsApi.archiver('f-1');
    await formationsApi.lierPartenaireBackoffice('f-1', { partenaire_id: 'p-1', prix_coutant_soumis: 120000 });

    expect(apiClient.get).toHaveBeenCalledWith('/formations/backoffice/list', {
      params: { search: 'Alpha' },
    });
    expect(apiClient.get).toHaveBeenCalledWith('/formations/backoffice/f-1');
    expect(apiClient.post).toHaveBeenCalledWith('/formations', { intitule: 'Alpha' });
    expect(apiClient.patch).toHaveBeenCalledWith('/formations/f-1', { intitule: 'Beta' });
    expect(apiClient.delete).toHaveBeenCalledWith('/formations/f-1/archive');
    expect(apiClient.patch).toHaveBeenCalledWith('/formations/backoffice/f-1/lier-partenaire', {
      partenaire_id: 'p-1',
      prix_coutant_soumis: 120000,
    });
  });
});
