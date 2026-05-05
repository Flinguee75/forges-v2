import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CatalogueApprenantPage from '../CatalogueApprenantPage';
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
    <CatalogueApprenantPage />
  </BrowserRouter>
);

describe('CatalogueApprenantPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue({
      data: [
        {
          id: 'f1',
          titre: 'Formation incluse',
          description: 'Parcours standard',
          tarif: 500000,
          duree: 20,
          type_formation: 'STANDARD',
          mode_formation: 'A_LA_DEMANDE',
          pilier_abonnement: 'RETAIL',
          inclus_abonnement: true,
        },
        {
          id: 'f2',
          titre: 'Formation premium',
          description: 'Parcours avancé',
          tarif: 900000,
          duree: 30,
          type_formation: 'PREMIUM',
          mode_formation: 'AVEC_SESSION',
          pilier_abonnement: 'RETAIL',
          inclus_abonnement: false,
        },
      ],
      meta: { page: 1, totalPages: 1, total: 2 },
    });
  });

  it('affiche les badges Inclus et Premium', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Formation incluse')).toBeInTheDocument();
      expect(screen.getByText('Formation premium')).toBeInTheDocument();
      expect(screen.getByText('Inclus')).toBeInTheDocument();
      expect(screen.getAllByText('Premium').length).toBeGreaterThan(0);
      expect(screen.getByText('Accéder maintenant')).toBeInTheDocument();
      expect(screen.getByText('Voir les sessions')).toBeInTheDocument();
    });
  });
});
