import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { dashboardApi } from '../dashboard.api';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('dashboardApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appelle les bonnes routes runtime pour le noyau dashboard', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { total: 1 } })
      .mockResolvedValueOnce({ data: { evolution: [] } })
      .mockResolvedValueOnce({ data: { evolution: [] } })
      .mockResolvedValueOnce({ data: { rapports: [] } })
      .mockResolvedValueOnce({ data: new Blob(['csv'], { type: 'text/csv' }) })
      .mockResolvedValueOnce({ data: new Blob(['pdf'], { type: 'application/pdf' }) })
      .mockResolvedValueOnce({ data: { formation: { id: 'f-1' } } })
      .mockResolvedValueOnce({ data: { session: { id: 's-1' } } })
      .mockResolvedValueOnce({ data: { role: 'ADMIN' } })
      .mockResolvedValueOnce({ data: { default_commission_forges_pct: 20 } });
    apiClient.put.mockResolvedValue({ data: { default_commission_forges_pct: 25 } });

    await dashboardApi.getDashboardStats({ periode: '12mois', search: '', page: 2, empty: null });
    await dashboardApi.getInscriptionsEvolution({ periode: '6mois' });
    await dashboardApi.getPaiementsEvolution({ periode: '3mois' });
    await dashboardApi.getRapportData({ statut: 'PAYE' });
    await dashboardApi.exportRapportCSV({ format: 'csv' });
    await dashboardApi.exportRapportPDF({ format: 'pdf' });
    await dashboardApi.getFormationStats('f-1', { periode: '30jours' });
    await dashboardApi.getSessionStats('s-1', { periode: '30jours' });
    await dashboardApi.getBackofficeDashboard('ADMIN');
    await dashboardApi.getBackofficeConfig();
    await dashboardApi.updateBackofficeConfig({ DEFAULT_COMMISSION_FORGES_PCT: 25 });

    expect(apiClient.get).toHaveBeenCalledWith('/dashboard/stats', {
      params: { periode: '12mois', page: 2 },
    });
    expect(apiClient.get).toHaveBeenCalledWith('/dashboard/inscriptions/evolution', {
      params: { periode: '6mois' },
    });
    expect(apiClient.get).toHaveBeenCalledWith('/dashboard/paiements/evolution', {
      params: { periode: '3mois' },
    });
    expect(apiClient.get).toHaveBeenCalledWith('/dashboard/rapports', {
      params: { statut: 'PAYE' },
    });
    expect(apiClient.get).toHaveBeenCalledWith('/dashboard/rapports/export/csv', {
      params: { format: 'csv' },
      responseType: 'blob',
    });
    expect(apiClient.get).toHaveBeenCalledWith('/dashboard/rapports/export/pdf', {
      params: { format: 'pdf' },
      responseType: 'blob',
    });
    expect(apiClient.get).toHaveBeenCalledWith('/dashboard/stats/formations/f-1', {
      params: { periode: '30jours' },
    });
    expect(apiClient.get).toHaveBeenCalledWith('/dashboard/stats/sessions/s-1', {
      params: { periode: '30jours' },
    });
    expect(apiClient.get).toHaveBeenCalledWith('/backoffice/dashboard/admin');
    expect(apiClient.get).toHaveBeenCalledWith('/backoffice/config');
    expect(apiClient.put).toHaveBeenCalledWith('/backoffice/config', {
      DEFAULT_COMMISSION_FORGES_PCT: 25,
    });
  });

  it('utilise le bon dashboard backoffice selon le rôle', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { role: 'ADMIN' } })
      .mockResolvedValueOnce({ data: { role: 'SUPERVISEUR' } });

    await dashboardApi.getBackofficeDashboard('ADMIN');
    await dashboardApi.getBackofficeDashboard('SUPERVISEUR');

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/backoffice/dashboard/admin');
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/backoffice/dashboard/superviseur');
  });

  it('rejette les helpers admin volontairement hors contrat', () => {
    expect(() => dashboardApi.getAdminRetailSubscriptions()).toThrow("n'est pas exposé par le runtime backend actuel");
    expect(() => dashboardApi.getAdminB2BSubscriptions()).toThrow("n'est pas exposé par le runtime backend actuel");
    expect(() => dashboardApi.getAdminOrganisationSubscriptions()).toThrow("n'est pas exposé par le runtime backend actuel");
    expect(() => dashboardApi.getInstitutionalContracts()).toThrow("n'est pas exposé par le runtime backend actuel");
    expect(() => dashboardApi.createInstitutionalContract()).toThrow("n'est pas exposé par le runtime backend actuel");
    expect(() => dashboardApi.getAdminOrganisations()).toThrow("n'est pas exposé par le runtime backend actuel");
    expect(() => dashboardApi.getAdminEnquetesCatalogue()).toThrow("n'est pas exposé par le runtime backend actuel");
    expect(() => dashboardApi.getEnqueteCatalogueFormations()).toThrow("n'est pas exposé par le runtime backend actuel");
    expect(() => dashboardApi.cataloguerEnqueteCatalogue()).toThrow("n'est pas exposé par le runtime backend actuel");
    expect(() => dashboardApi.notifyEnqueteCatalogue()).toThrow("n'est pas exposé par le runtime backend actuel");
    expect(() => dashboardApi.getAdminFeedbacks()).toThrow("n'est pas exposé par le runtime backend actuel");
  });

  it('bloque le dashboard backoffice pour les rôles non exposés', async () => {
    await expect(dashboardApi.getBackofficeDashboard('APPRENANT')).rejects.toMatchObject({
      code: 'ROUTE_ABSENTE',
    });
  });
});
