import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AccesFormation from '../AccesFormation';
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

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/apprenant/formations-a-la-demande/acces-1']}>
      <Routes>
        <Route path="/apprenant/formations-a-la-demande/:accesId" element={<AccesFormation />} />
      </Routes>
    </MemoryRouter>
  );

describe('AccesFormation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche le message de suspension exact', async () => {
    apiClient.get.mockResolvedValueOnce({
      id: 'acces-1',
      statut: 'SUSPENDU',
      progression: 0,
      source_financement: 'ABONNEMENT',
      date_expiration: '2026-06-30T00:00:00.000Z',
      formation: {
        titre: 'Formation suspendue',
        description: 'Description',
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Acces suspendu.')).toBeInTheDocument();
      expect(screen.getByText(/Reactivez votre abonnement pour acceder/)).toBeInTheDocument();
    });
  });

  it('affiche la progression en lecture seule pour un accès actif', async () => {
    apiClient.get.mockResolvedValueOnce({
      id: 'acces-1',
      statut: 'ACTIF',
      progression: 30,
      source_financement: 'ABONNEMENT',
      date_expiration: '2026-06-30T00:00:00.000Z',
      formation: {
        titre: 'Formation active',
        description: 'Description',
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Formation active')).toBeInTheDocument();
      expect(screen.getAllByText('30%').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Mettre a jour la progression')).toBeInTheDocument();

    apiClient.patch.mockResolvedValueOnce({
      data: {
        id: 'acces-1',
        statut: 'ACTIF',
        progression: 55,
      },
    });

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '55' } });

    await waitFor(() => {
      expect(screen.getByText('55%')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la progression' }));

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/espace-apprenant/formations-demande/acces-1/progression',
        { progression: 55 }
      );
      expect(screen.getByText('Progression enregistree.')).toBeInTheDocument();
    });
  });
});
