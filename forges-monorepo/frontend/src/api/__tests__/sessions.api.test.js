import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sessionsApi } from '../sessions.api';
import { apiClient } from '../client';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('sessions.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue({ data: { statusCode: 200, data: [] } });
    apiClient.post.mockResolvedValue({ data: {} });
    apiClient.patch.mockResolvedValue({ data: {} });
    apiClient.delete.mockResolvedValue({ data: {} });
  });

  it('appelle les routes runtime backoffice pour la liste, le détail et le CRUD', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        statusCode: 200,
        data: [
          {
            id: 's-1',
            formation: { id: 'f-1', intitule: 'Formation Test' },
            statut: 'PLANIFIEE',
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
    });

    await sessionsApi.getBackofficeList({ search: 'Alpha', limit: 10 });
    await sessionsApi.getById('s-1');
    await sessionsApi.create({ formation_id: 'f-1' });
    await sessionsApi.update('s-1', { capacite: 20 });
    await sessionsApi.cloturerManuellement('s-1');
    await sessionsApi.annuler('s-1');
    await sessionsApi.planifier({ formation_id: 'f-1' });
    await sessionsApi.getDossiers('s-1', { statut: 'GRIS' });

    expect(apiClient.get).toHaveBeenCalledWith('/backoffice/sessions', {
      params: { search: 'Alpha', limit: 10 },
    });
    expect(apiClient.get).toHaveBeenCalledWith('/backoffice/sessions/s-1');
    expect(apiClient.post).toHaveBeenCalledWith('/backoffice/sessions', { formation_id: 'f-1' });
    expect(apiClient.patch).toHaveBeenCalledWith('/backoffice/sessions/s-1', { capacite: 20 });
    expect(apiClient.patch).toHaveBeenCalledWith('/backoffice/sessions/s-1/close');
    expect(apiClient.delete).toHaveBeenCalledWith('/backoffice/sessions/s-1/cancel');
    expect(apiClient.post).toHaveBeenCalledWith('/backoffice/sessions/bulk', { formation_id: 'f-1' });
    expect(apiClient.get).toHaveBeenCalledWith('/backoffice/sessions/s-1/dossiers', {
      params: { statut: 'GRIS' },
    });
  });

  it('déplie la réponse backoffice avec data/meta', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        statusCode: 200,
        data: [
          {
            id: 's-1',
            formation: { id: 'f-1', intitule: 'Formation Test' },
            statut: 'INSCRIPTIONS_OUVERTES',
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    });

    const result = await sessionsApi.getBackofficeList();

    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: 's-1',
      formation: { titre: 'Formation Test' },
      statut: 'INSCRIPTIONS_OUVERTES',
    });
  });

  it('garde le helper delete figé', async () => {
    await expect(sessionsApi.delete('s-1')).rejects.toThrow("La suppression de session n'est pas implémentée");
  });
});
