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

  it('getRapportMensuel appelle le runtime superviseur tdb', async () => {
    await apporteursApi.getRapportMensuel({ mois: '2026-03' });

    expect(apiMocks.get).toHaveBeenCalledWith('/superviseur/apporteurs/tdb', {
      params: { mois: '2026-03' },
    });
  });

  it('fige le helper mensuel hérité', async () => {
    await expect(apporteursApi.reverserReversementMensuel('apt-1', '2026-03')).rejects.toMatchObject({
      code: 'ROUTE_ABSENTE',
    });
  });

  it('getApporteurById appelle GET /admin/apporteurs/:id', async () => {
    await apporteursApi.getApporteurById('apt-1');
    expect(apiMocks.get).toHaveBeenCalledWith('/admin/apporteurs/apt-1');
  });

  it('getAllApporteurs appelle GET /admin/apporteurs', async () => {
    apiMocks.get.mockResolvedValueOnce({ data: { data: [], meta: { total: 0 } } });
    await apporteursApi.getAllApporteurs({ search: 'traore' });
    expect(apiMocks.get).toHaveBeenCalledWith('/admin/apporteurs', { params: { search: 'traore' } });
  });

  it('createApporteur appelle POST /admin/apporteurs', async () => {
    await apporteursApi.createApporteur({ nom: 'Test', email: 't@t.ci', type: 'INDIVIDU', taux_commission_pct: 5 });
    expect(apiMocks.post).toHaveBeenCalledWith('/admin/apporteurs', expect.objectContaining({ nom: 'Test', email: 't@t.ci' }));
  });

  it('approuverApporteur appelle PUT /admin/apporteurs/:id/approuver', async () => {
    await apporteursApi.approuverApporteur('apt-1');
    expect(apiMocks.put).toHaveBeenCalledWith('/admin/apporteurs/apt-1/approuver', {});
  });

  it('getApporteurDashboard lance ROUTE_ABSENTE car la route n\'existe pas', async () => {
    await expect(apporteursApi.getApporteurDashboard('apt-1')).rejects.toMatchObject({
      code: 'ROUTE_ABSENTE',
    });
    expect(apiMocks.get).not.toHaveBeenCalled();
  });

  // Bug 3 - getMesReversements doit deleguer a getMesCommissions
  it('getMesReversements appelle getMesCommissions avec statut REVERSEE par defaut', async () => {
    apiMocks.get.mockResolvedValueOnce({ data: { data: [], meta: { page: 1, limit: 0, total: 0, totalPages: 1 } } });

    const result = await apporteursApi.getMesReversements();

    expect(apiMocks.get).toHaveBeenCalledWith('/apporteurs/commissions', {
      params: { statut: 'REVERSEE' },
    });
    expect(result).toMatchObject({ data: expect.any(Array), meta: expect.any(Object) });
  });

  it('getMesReversements avec statut surcharge appelle getMesCommissions avec le statut fourni', async () => {
    apiMocks.get.mockResolvedValueOnce({ data: { data: [], meta: { page: 1, limit: 0, total: 0, totalPages: 1 } } });

    await apporteursApi.getMesReversements({ statut: 'VALIDEE' });

    expect(apiMocks.get).toHaveBeenCalledWith('/apporteurs/commissions', {
      params: { statut: 'VALIDEE' },
    });
  });

  it('getMesReversements retourne le meme format data+meta que getMesCommissions', async () => {
    const mockPayload = {
      data: [{ id: 'c-1', montant_commission: 1000, statut: 'REVERSEE' }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };
    apiMocks.get.mockResolvedValueOnce({ data: mockPayload });

    const result = await apporteursApi.getMesReversements();

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});
