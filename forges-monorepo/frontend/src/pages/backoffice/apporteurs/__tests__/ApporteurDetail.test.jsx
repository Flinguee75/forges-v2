import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ApporteurDetail from '../ApporteurDetail';
import apporteursApi from '../../../../api/apporteurs.api';

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn(async (fn, options) => {
      const data = await fn();
      options?.onSuccess?.(data);
      return data;
    }),
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../../../api/apporteurs.api', () => ({
  default: {
    getApporteurById: vi.fn(),
    getApporteurDashboard: vi.fn(),
    getApporteurCommissions: vi.fn(),
  },
}));

describe('ApporteurDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apporteursApi.getApporteurById.mockResolvedValue({
      id: 'apt-1',
      nom: 'Alpha Conseil',
      type: 'INDIVIDU',
      email: 'alpha@example.com',
      code_apporteur: 'CODE-1',
      taux_commission_pct: 5,
      statut: 'ACTIF',
      commissions_count: 2,
    });
    apporteursApi.getApporteurDashboard.mockResolvedValue({
      stats_mois: { nb_transactions: 4, commission_xof: 3000 },
      cumul_du_xof: 12000,
      reversements: [],
    });
    apporteursApi.getApporteurCommissions.mockResolvedValue({ data: [] });
  });

  it('affiche le détail apporteur aligné au runtime', async () => {
    render(
      <BrowserRouter>
        <ApporteurDetail />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alpha Conseil')).toBeInTheDocument();
      expect(screen.getByText('CODE-1')).toBeInTheDocument();
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });
  });
});
