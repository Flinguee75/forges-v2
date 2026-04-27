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
    apiClient.get.mockResolvedValue({ data: [] });
    apiClient.post.mockResolvedValue({ data: {} });
    apiClient.patch.mockResolvedValue({ data: {} });
    apiClient.delete.mockResolvedValue({ data: {} });
  });

  it('appelle les routes runtime backoffice pour la liste, le détail et le CRUD', async () => {
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

  it('garde le helper delete figé', async () => {
    await expect(sessionsApi.delete('s-1')).rejects.toThrow("La suppression de session n'est pas implémentée");
  });
});
