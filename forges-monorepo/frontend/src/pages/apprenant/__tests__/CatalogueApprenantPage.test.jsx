import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CatalogueApprenantPage from '../CatalogueApprenantPage';
import { apiClient } from '../../../api/client';

let mockRole = 'APPRENANT';
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { role: mockRole }, updateUser: vi.fn() }),
}));

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
    mockNavigate.mockReset();
    mockRole = 'APPRENANT';
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

  it('affiche Deja inscrit sur une formation ou l apprenant a un dossier actif', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.includes('/espace-apprenant/dossiers')) {
        return Promise.resolve([{ formation_id: 'f1', statut: 'PAYE' }]);
      }
      return Promise.resolve({
        data: [
          { id: 'f1', titre: 'Formation incluse', description: '', tarif: 500000, duree: 20, type_formation: 'STANDARD', mode_formation: 'A_LA_DEMANDE', pilier_abonnement: 'RETAIL', inclus_abonnement: true },
          { id: 'f2', titre: 'Formation premium', description: '', tarif: 900000, duree: 30, type_formation: 'PREMIUM', mode_formation: 'AVEC_SESSION', pilier_abonnement: 'RETAIL', inclus_abonnement: false },
        ],
        meta: { page: 1, totalPages: 1, total: 2 },
      });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Deja inscrit')).toBeInTheDocument();
    });
    expect(screen.queryAllByText('Accéder maintenant').length).toBe(0);
  });

  it('affiche le CTA normal quand l apprenant n est pas inscrit', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.includes('/espace-apprenant/dossiers')) return Promise.resolve([]);
      return Promise.resolve({
        data: [{ id: 'f1', titre: 'Formation incluse', description: '', tarif: 500000, duree: 20, type_formation: 'STANDARD', mode_formation: 'A_LA_DEMANDE', pilier_abonnement: 'RETAIL', inclus_abonnement: true }],
        meta: { page: 1, totalPages: 1, total: 1 },
      });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Accéder maintenant')).toBeInTheDocument();
      expect(screen.queryByText('Deja inscrit')).not.toBeInTheDocument();
    });
  });

  it('org — affiche la liste des vouchers lies a la formation avec code et expiration', async () => {
    mockRole = 'ORGANISATION';

    apiClient.get.mockImplementation((url) => {
      if (url.includes('/espace-organisation/vouchers')) {
        return Promise.resolve([
          { code: 'VCH-001', date_expiration: '2026-12-31', formation: { id: 'f1' } },
          { code: 'VCH-002', date_expiration: null, formation: { id: 'f1' } },
        ]);
      }
      return Promise.resolve({
        data: [{ id: 'f1', titre: 'Formation incluse', description: '', tarif: 500000, duree: 20, type_formation: 'STANDARD', mode_formation: 'A_LA_DEMANDE', pilier_abonnement: 'RETAIL', inclus_abonnement: true }],
        meta: { page: 1, totalPages: 1, total: 1 },
      });
    });

    render(<BrowserRouter><CatalogueApprenantPage /></BrowserRouter>);

    await waitFor(() => {
      expect(screen.getByText('VCH-001')).toBeInTheDocument();
      expect(screen.getByText('VCH-002')).toBeInTheDocument();
      expect(screen.getByText(/Expire le/)).toBeInTheDocument();
      expect(screen.getByText('Sans expiration')).toBeInTheDocument();
    });

    mockRole = 'APPRENANT';
  });

  it('org — ouvre le detail organisation au lieu des routes apprenant', async () => {
    mockRole = 'ORGANISATION';

    apiClient.get.mockImplementation((url) => {
      if (url.includes('/espace-organisation/vouchers')) {
        return Promise.resolve([]);
      }
      return Promise.resolve({
        data: [{ id: 'f1', titre: 'Formation incluse', description: '', tarif: 500000, duree: 20, type_formation: 'STANDARD', mode_formation: 'A_LA_DEMANDE', pilier_abonnement: 'RETAIL', inclus_abonnement: true }],
        meta: { page: 1, totalPages: 1, total: 1 },
      });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Accéder maintenant')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Accéder maintenant'));

    expect(mockNavigate).toHaveBeenCalledWith('/organisation/formations/f1');
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
