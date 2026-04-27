import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SouscrireAbonnement from '../SouscrireAbonnement';
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
    <SouscrireAbonnement />
  </BrowserRouter>
);

describe('SouscrireAbonnement', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiClient.get.mockImplementation((url) => {
      if (url === '/abonnements/retail/me') {
        return Promise.reject({ statusCode: 404, code: 'NOT_FOUND' });
      }

      if (url === '/abonnements/retail/formations-incluses') {
        return Promise.resolve({
          data: [
            {
              id: 'f1',
              titre: 'Formation incluse',
              description_courte: 'Parcours standard inclus',
              cout_catalogue: 500000,
              duree_jours: 20,
              type_formation: 'STANDARD',
              pilier_abonnement: 'RETAIL',
              inclus_abonnement: true,
            },
          ],
        });
      }

      if (url === '/formations') {
        return Promise.resolve({
          data: [],
          meta: { page: 1, totalPages: 1, total: 0 },
        });
      }

      return Promise.resolve({});
    });

    apiClient.post.mockResolvedValue({
      id: 'abo-1',
      offre: 'ESSENTIEL',
      statut: 'ACTIF',
    });
  });

  it('compare les offres et affiche les formations incluses', async () => {
    apiClient.get.mockReset();
    apiClient.get
      .mockResolvedValueOnce({
        id: 'abo-1',
        offre: 'ESSENTIEL',
        statut: 'ACTIF',
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'f1',
            titre: 'Formation incluse',
            description_courte: 'Parcours standard inclus',
            cout_catalogue: 500000,
            duree_jours: 20,
            type_formation: 'STANDARD',
            pilier_abonnement: 'RETAIL',
            inclus_abonnement: true,
          },
        ],
      });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Abonnement déjà actif')).toBeInTheDocument();
      expect(screen.getByText('Formation incluse')).toBeInTheDocument();
      expect(screen.getByText(/Code:\s*f1/i)).toBeInTheDocument();
      expect(screen.getByText('Inclus')).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
      expect(screen.getAllByText(/1 formation\(s\) incluse\(s\)/).length).toBeGreaterThan(0);
    });
  });

  it('bloque la confirmation sans consentement local', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Confirmer la souscription')).toBeDisabled();
    });
  });

  it('permet de souscrire après consentement', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Confirmer la souscription')).toBeDisabled();
    });

    fireEvent.click(screen.getByLabelText(/accepter le renouvellement automatique/i));

    await waitFor(() => {
      expect(screen.getByText('Confirmer la souscription')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByText('Confirmer la souscription'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/abonnements/retail', { offre: 'ESSENTIEL' });
    });
  });
});
