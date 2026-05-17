import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MesDossiersPage from '../MesDossiersPage';
import apprenantApi from '../../../api/espace-apprenant.api';

vi.mock('../../../api/espace-apprenant.api', () => ({
  default: {
    getMesDossiers: vi.fn(),
  },
}));

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: async (fn, options = {}) => {
      const result = await fn();
      options.onSuccess?.(result);
      return result;
    },
    isLoading: false,
  }),
}));

describe('MesDossiersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('liste les dossiers apprenant depuis le runtime réel', async () => {
    apprenantApi.getMesDossiers.mockResolvedValue([
      {
        id: 'd-1',
        statut: 'RETENU',
        created_at: '2026-04-01T00:00:00.000Z',
        source_financement: 'RETAIL',
        session: {
          date_debut: '2026-05-01T00:00:00.000Z',
          date_fin: '2026-05-15T00:00:00.000Z',
          formation: { titre: 'Formation test' },
        },
      },
    ]);

    render(
      <BrowserRouter>
        <MesDossiersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Formation test')).toBeInTheDocument();
      expect(screen.getAllByText('Retenu').length).toBeGreaterThan(1);
      expect(screen.getByText(/Paiement apprenant/)).toBeInTheDocument();
    });

    expect(apprenantApi.getMesDossiers).toHaveBeenCalledWith();
  });

  it('affiche l’état vide quand aucun dossier n’est présent', async () => {
    apprenantApi.getMesDossiers.mockResolvedValue([]);

    render(
      <BrowserRouter>
        <MesDossiersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Aucun dossier d'inscription")).toBeInTheDocument();
      expect(screen.getByText('Parcourir le catalogue')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Parcourir le catalogue'));
    expect(screen.getByText('Parcourir le catalogue')).toBeInTheDocument();
  });
});
