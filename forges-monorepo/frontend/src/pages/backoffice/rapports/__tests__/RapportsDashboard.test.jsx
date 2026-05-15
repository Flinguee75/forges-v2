import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RapportsDashboard from '../RapportsDashboard';
import { dashboardApi } from '../../../../api/dashboard.api';

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn(async (fn, options) => {
      const data = await fn();
      options?.onSuccess?.(data);
      return data;
    }),
    isLoading: false,
  }),
}));

describe('RapportsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(dashboardApi, 'getDashboardStats').mockResolvedValue({
      totalFormations: 4,
      totalFormationsActives: 3,
      totalSessions: 5,
      totalSessionsOuvertes: 2,
      totalDossiers: 18,
      montantPayeTotal: 420000,
      dossiersByStatut: { PAYE: 12, EN_ATTENTE_VERIFICATION: 6 },
    });
    vi.spyOn(dashboardApi, 'getRapportData').mockResolvedValue({
      total_rapports: 1,
      rapports: [
        {
          dossier_id: 'd-01',
          apprenant_nom: 'Ada Lovelace',
          apprenant_email: 'ada@example.com',
          formation_titre: 'Formation 1',
          statut_dossier: 'PAYE',
          statut_paiement: 'CONFIRME',
          montant_paiement: 250000,
        },
      ],
    });
  });

  it('affiche les rapports runtime', async () => {
    render(
      <BrowserRouter>
        <RapportsDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard rapports')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument();
      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
      expect(screen.getByText('Paiement confirmé')).toBeInTheDocument();
      expect(screen.getByText('Payé')).toBeInTheDocument();
      expect(screen.getByText('2 500 FCFA')).toBeInTheDocument();
    });
  });
});
