import { describe, it, expect, vi, beforeEach } from 'vitest';
import agentApi from '../agent.api';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../client', () => ({
  apiClient: {
    get: apiMocks.get,
    post: apiMocks.post,
  },
}));

describe('agent.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.get.mockImplementation((url, config) => Promise.resolve({ data: { url, config } }));
    apiMocks.post.mockImplementation((url, data) => Promise.resolve({ data: { url, data } }));
  });

  it('appelle le runtime agent pour les reversements partenaires', async () => {
    await agentApi.getReversementsPartenaires({ page: 1, search: '' });

    expect(apiMocks.get).toHaveBeenCalledWith('/agent/reversements/partenaires', {
      params: { page: 1 },
    });
  });

  it('appelle le runtime agent pour les reversements apporteurs', async () => {
    await agentApi.getReversementsApporteurs({ mois: '2026-03' });
    await agentApi.effectuerReversementApporteur('app-1', { note: 'ok' });

    expect(apiMocks.get).toHaveBeenCalledWith('/agent/reversements/apporteurs', {
      params: { mois: '2026-03' },
    });
    expect(apiMocks.post).toHaveBeenCalledWith('/agent/reversements/apporteurs/app-1/execute', {
      note: 'ok',
    });
  });
});
