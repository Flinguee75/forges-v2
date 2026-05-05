import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MonAbonnement from '../MonAbonnement';
import { apiClient } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: async (fn, options = {}) => {
      try {
        const result = await fn();
        options.onSuccess?.(result);
        return result;
      } catch (error) {
        options.onError?.(error);
        throw error;
      }
    },
    isLoading: false,
    reset: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    showToast: vi.fn(),
  }),
}));

const renderPage = () => render(
  <BrowserRouter>
    <MonAbonnement />
  </BrowserRouter>
);

describe('MonAbonnement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche un état vide quand aucun abonnement retail n existe', async () => {
    apiClient.get.mockRejectedValueOnce({ statusCode: 404, code: 'NOT_FOUND' });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Passez à la vitesse supérieure')).toBeInTheDocument();
      expect(screen.getByText('Voir les offres')).toBeInTheDocument();
    });
  });

  it('affiche un aperçu du prorata lors du passage à Premium', async () => {
    apiClient.get.mockReset();
    apiClient.get
      .mockResolvedValueOnce({
        id: 'abo-1',
        offre: 'ESSENTIEL',
        statut: 'ACTIF',
        montant_mensuel: 1500000,
        date_renouvellement: '2026-05-01T00:00:00.000Z',
        suspendu_jusqu: null,
      })
      .mockResolvedValueOnce({
        data: [{ id: 'f-1', titre: 'Formation incluse', cout_catalogue: 500000, duree_jours: 20, inclus_abonnement: true }],
      });
    apiClient.put.mockResolvedValueOnce({
      id: 'abo-1',
      offre: 'PREMIUM',
      statut: 'ACTIF',
      montant_mensuel: 2500000,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Essentiel' })).toBeInTheDocument();
      expect(screen.getByText(/1\s?500\s?000 FCFA|1 500 000 FCFA/)).toBeInTheDocument();
      expect(screen.getByText(/Code:\s*f-1/i)).toBeInTheDocument();
      expect(screen.getByText(/20 j/)).toBeInTheDocument();
      expect(screen.getAllByText(/5\s?000 FCFA|5 000 FCFA/).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByText('Upgrade vers Premium'));

    await waitFor(() => {
      expect(screen.getByText(/Différentiel prorata estimé/)).toBeInTheDocument();
      expect(screen.getByText('Confirmer')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirmer'));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith('/abonnements/retail/upgrade', { offre: 'PREMIUM' });
    });
  });

  it('affiche le message RM-104 pour le downgrade', async () => {
    apiClient.get.mockReset();
    apiClient.get
      .mockResolvedValueOnce({
        id: 'abo-2',
        offre: 'PREMIUM',
        statut: 'ACTIF',
        montant_mensuel: 2500000,
        date_renouvellement: '2026-05-01T00:00:00.000Z',
        suspendu_jusqu: null,
      })
      .mockResolvedValueOnce({ data: [] });
    apiClient.put.mockResolvedValueOnce({
      id: 'abo-2',
      offre: 'ESSENTIEL',
      statut: 'ACTIF',
      montant_mensuel: 1500000,
      message: 'Effectif a la fin de la periode',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Passer à Essentiel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Passer à Essentiel'));

    await waitFor(() => {
      expect(screen.getAllByText('Effectif à la fin de la période (RM-104)').length).toBeGreaterThan(0);
    });
  });

  it('masque le bouton Suspendre quand la suspension est encore active', async () => {
    apiClient.get.mockReset();
    apiClient.get
      .mockResolvedValueOnce({
        id: 'abo-3',
        offre: 'ESSENTIEL',
        statut: 'ACTIF',
        montant_mensuel: 1500000,
        date_renouvellement: '2026-05-01T00:00:00.000Z',
        suspendu_jusqu: '2026-06-30T00:00:00.000Z',
      })
      .mockResolvedValueOnce({ data: [] });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Essentiel' })).toBeInTheDocument();
    });

    expect(screen.queryByText('Suspendre')).not.toBeInTheDocument();
  });
});
