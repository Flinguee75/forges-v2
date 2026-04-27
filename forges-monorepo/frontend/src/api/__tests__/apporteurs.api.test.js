import { describe, it, expect, vi, beforeEach } from 'vitest';
import apporteursApi from '../apporteurs.api';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));

vi.mock('../client', () => ({
  apiClient: {
    get: apiMocks.get,
    post: apiMocks.post,
    put: apiMocks.put,
  },
}));

describe('apporteurs.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.get.mockImplementation((url, config) => Promise.resolve({ data: { url, config } }));
    apiMocks.post.mockImplementation((url, data) => Promise.resolve({ data: { url, data } }));
    apiMocks.put.mockImplementation((url, data) => Promise.resolve({ data: { url, data } }));
  });

  it('appelle le runtime pour le dashboard et le profil apporteur', async () => {
    await apporteursApi.getDashboard();
    await apporteursApi.getMonProfil();
    await apporteursApi.updateProfil({ nom: 'Alpha' });
    await apporteursApi.register({ nom: 'Alpha', email: 'alpha@test.com', password: 'Password1!' });

    expect(apiMocks.get).toHaveBeenCalledWith('/apporteurs/dashboard');
    expect(apiMocks.get).toHaveBeenCalledWith('/apporteurs/profil');
    expect(apiMocks.put).toHaveBeenCalledWith('/apporteurs/profil', { nom: 'Alpha' });
    expect(apiMocks.post).toHaveBeenCalledWith('/apporteurs/register', { nom: 'Alpha', email: 'alpha@test.com', password: 'Password1!' });
  });

  it('appelle le runtime pour les usages admin et superviseur', async () => {
    await apporteursApi.getAllApporteurs({ search: 'Alpha' });
    await apporteursApi.createApporteur({ nom: 'Alpha', email: 'alpha@test.com' });
    await apporteursApi.approuverApporteur('apt-1', { note: 'ok' });
    await apporteursApi.getRapportMensuel({ mois: '2026-03' });

    expect(apiMocks.get).toHaveBeenCalledWith('/admin/apporteurs', {
      params: { search: 'Alpha' },
    });
    expect(apiMocks.post).toHaveBeenCalledWith('/admin/apporteurs', {
      nom: 'Alpha',
      email: 'alpha@test.com',
      type: 'INDIVIDU',
      taux_commission_pct: 5,
    });
    expect(apiMocks.put).toHaveBeenCalledWith('/admin/apporteurs/apt-1/approuver', { note: 'ok' });
    expect(apiMocks.get).toHaveBeenCalledWith('/superviseur/apporteurs/tdb', {
      params: { mois: '2026-03' },
    });
  });

  it('fige le helper mensuel hérité', async () => {
    await expect(apporteursApi.reverserReversementMensuel('apt-1', '2026-03')).rejects.toMatchObject({
      code: 'ROUTE_ABSENTE',
    });
  });
});
