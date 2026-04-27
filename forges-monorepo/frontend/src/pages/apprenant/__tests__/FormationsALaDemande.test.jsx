import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FormationsALaDemande from '../FormationsALaDemande';
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
    <FormationsALaDemande />
  </BrowserRouter>
);

describe('FormationsALaDemande', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue([
      {
        id: 'a1',
        statut: 'ACTIF',
        source_financement: 'ABONNEMENT',
        progression: 45,
        date_expiration: '2026-06-30T00:00:00.000Z',
        formation: {
          titre: 'Formation à la demande',
          description: 'Parcours en autonomie',
          mode_formation: 'A_LA_DEMANDE',
        },
      },
      {
        id: 'a2',
        statut: 'SUSPENDU',
        source_financement: 'RETAIL',
        progression: 0,
        date_expiration: '2026-05-15T00:00:00.000Z',
        formation: {
          titre: 'Accès suspendu',
          description: 'Parcours suspendu',
          mode_formation: 'A_LA_DEMANDE',
        },
      },
    ]);
  });

  it('liste les accès avec progression et expiration', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Formation à la demande')).toBeInTheDocument();
      expect(screen.getByText('Accès suspendu')).toBeInTheDocument();
      expect(screen.getByText(/Progression:\s*45%/)).toBeInTheDocument();
      expect(screen.getAllByText(/Expiration:/).length).toBeGreaterThan(1);
      expect(screen.getAllByText('Voir le détail').length).toBeGreaterThan(0);
    });
  });
});
