import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ApprenantDashboard from '../ApprenantDashboard';
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

vi.mock('../../../components/bot/BotWidget', () => ({
  default: () => <button aria-label="Ouvrir le conseiller">Conseiller</button>,
}));

const renderPage = () => render(
  <BrowserRouter>
    <ApprenantDashboard />
  </BrowserRouter>
);

describe('ApprenantDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockImplementation((url) => {
      if (url === '/formations') {
        return Promise.resolve({
          data: [
            {
              id: 'f1',
              titre: 'Formation incluse',
              description: 'Parcours standard',
              tarif: 500000,
              duree: 20,
              type_formation: 'STANDARD',
              inclus_abonnement: true,
            },
            {
              id: 'f2',
              titre: 'Formation premium',
              description: 'Parcours avancé',
              tarif: 900000,
              duree: 30,
              type_formation: 'PREMIUM',
              inclus_abonnement: false,
            },
          ],
          meta: { page: 1, totalPages: 1, total: 2 },
        });
      }

      if (url === '/espace-apprenant/formations-demande') {
        return Promise.resolve([
          {
            id: 'a1',
            statut: 'ACTIF',
            source_financement: 'ABONNEMENT',
            progression: 45,
            date_expiration: '2026-06-30T00:00:00.000Z',
            formation: { titre: 'Formation à la demande' },
          },
        ]);
      }

      if (url === '/abonnements/retail/me') {
        return Promise.reject({ statusCode: 404, code: 'NOT_FOUND' });
      }

      return Promise.resolve({});
    });
  });

  it('affiche les badges inclus et premium ainsi que les CTA rapides', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Formations')).toBeInTheDocument();
      expect(screen.getByText('Abonnement')).toBeInTheDocument();
      expect(screen.getByText('Formations disponibles')).toBeInTheDocument();
      expect(screen.getByText('Inclus')).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ouvrir le conseiller' })).toBeInTheDocument();
    });
  });
});
