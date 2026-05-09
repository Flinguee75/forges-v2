import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BackofficeDashboard from '../BackofficeDashboard';
import { dashboardApi } from '../../../api/dashboard.api';

let mockUser = { id: '1', role: 'ADMIN' };

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn(async (fn, options) => {
      const data = await fn();
      options?.onSuccess?.(data);
      return data;
    }),
    isLoading: false,
  }),
}));

describe('BackofficeDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: '1', role: 'ADMIN' };
    vi.spyOn(dashboardApi, 'getBackofficeDashboard').mockResolvedValue({
      role: 'ADMIN',
      data: {
        nb_apprenants_actifs: 120,
        nb_organisations_actives: 12,
        nb_formations_actives: 8,
        nb_sessions_en_cours: 3,
        nb_dossiers_total: 245,
        ca_total_xof: 15000000,
        nb_abonnements_retail_actifs: 42,
        nb_abonnements_b2b_actifs: 7,
        dossiers_par_statut: { RETENU: 11, PAYE: 30 },
      },
      timestamp: '2026-04-22T10:00:00.000Z',
    });
  });

  it('affiche les KPI admin runtime', async () => {
    render(
      <BrowserRouter>
        <BackofficeDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Apprenants actifs')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('Organisations actives')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('CA total')).toBeInTheDocument();
      expect(screen.getByText(/150[\s\u202f]?000 FCFA/)).toBeInTheDocument();
    });
  });

  it('charge le snapshot backoffice runtime', async () => {
    render(
      <BrowserRouter>
        <BackofficeDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(dashboardApi.getBackofficeDashboard).toHaveBeenCalledWith('ADMIN');
    });
  });

  it('affiche une indisponibilité pour un rôle non exposé', async () => {
    mockUser = { id: '2', role: 'APPRENANT' };

    render(
      <BrowserRouter>
        <BackofficeDashboard />
      </BrowserRouter>
    );

    expect(
      screen.getByText('Dashboard backoffice indisponible')
    ).toBeInTheDocument();
  });
});
