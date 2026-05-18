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

vi.mock('../../../utils/authStorage', () => ({
  getAccessToken: () => 'fake-token',
  getRefreshToken: () => null,
  getStoredSession: () => null,
  setStoredSession: vi.fn(),
  clearStoredSession: vi.fn(),
  updateStoredUser: vi.fn(),
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
    error: null,
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

// Capture window.location.assign pour les redirections NGSER
const mockAssign = vi.fn();
Object.defineProperty(window, 'location', {
  value: { assign: mockAssign },
  writable: true,
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const CATALOGUE_RESPONSE = {
  data: [
    {
      id: 'f1',
      titre: 'Formation Essentiel',
      description: 'Formation standard incluse',
      tarif: 500000,
      duree: 20,
      type_formation: 'STANDARD',
      pilier_abonnement: 'RETAIL',
      inclus_abonnement: true,
    },
    {
      id: 'f2',
      titre: 'Formation Premium',
      description: 'Formation exclusive',
      tarif: 800000,
      duree: 30,
      type_formation: 'PREMIUM',
      pilier_abonnement: 'RETAIL',
      inclus_abonnement: false,
    },
  ],
  meta: { page: 1, totalPages: 1, total: 2 },
};

const renderPage = () => render(
  <BrowserRouter>
    <SouscrireAbonnement />
  </BrowserRouter>
);

function setupNoAbonnement() {
  apiClient.get.mockImplementation((url) => {
    if (url === '/formations') return Promise.resolve(CATALOGUE_RESPONSE);
    if (url === '/abonnements/retail/me') {
      return Promise.reject(Object.assign(new Error('NOT_FOUND'), { statusCode: 404, code: 'NOT_FOUND' }));
    }
    return Promise.resolve({});
  });
}

function setupAbonnementActif() {
  apiClient.get.mockImplementation((url) => {
    if (url === '/formations') return Promise.resolve(CATALOGUE_RESPONSE);
    if (url === '/abonnements/retail/me') {
      return Promise.resolve({ data: { id: 'abo-1', offre: 'ESSENTIEL', statut: 'ACTIF' } });
    }
    return Promise.resolve({});
  });
}

describe('SouscrireAbonnement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupNoAbonnement();
  });

  // ─── Affichage ────────────────────────────────────────────────────

  it('affiche les 3 tiers : Catalogue libre, Essentiel, Premium', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Catalogue libre')).toBeInTheDocument();
      expect(screen.getByText('Essentiel')).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
    });
  });

  it('affiche le badge "Recommande" sur le tier Premium', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Recommandé')).toBeInTheDocument();
    });
  });

  it('affiche le bandeau abonnement deja actif si abonnement ACTIF', async () => {
    setupAbonnementActif();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/d.*j.*abonnement actif/i)).toBeInTheDocument();
    });
  });

  it('affiche le nombre de formations incluses et Premium', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/1 formation/i).length).toBeGreaterThan(0);
    });
  });

  // ─── Souscription bloquee sans consentement ───────────────────────

  it('desactive le bouton souscrire sans consentement', async () => {
    renderPage();
    await waitFor(() => {
      const btn = screen.getByTestId('btn-souscrire');
      expect(btn).toBeDisabled();
    });
  });

  it('active le bouton souscrire apres consentement', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('consent-checkbox')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('consent-checkbox'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-souscrire')).not.toBeDisabled();
    });
  });

  // ─── NGSER : redirect vers payment_url ───────────────────────────

  it('redirige vers payment_url NGSER apres souscription', async () => {
    const paymentUrl = 'https://mock-ngser.forges.ci/pay?order=ABO-2026-001-ABCDEF';
    apiClient.post.mockResolvedValue({
      data: {
        abonnement: { id: 'abo-new', offre: 'ESSENTIEL', statut: 'EN_ATTENTE_PAIEMENT' },
        montant_premier_mois: 12000,
        payment_url: paymentUrl,
        order_ngser: 'ABO-2026-001-ABCDEF',
      },
    });

    renderPage();
    await waitFor(() => expect(screen.getByTestId('consent-checkbox')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('consent-checkbox'));
    await waitFor(() => expect(screen.getByTestId('btn-souscrire')).not.toBeDisabled());

    fireEvent.click(screen.getByTestId('btn-souscrire'));

    await waitFor(() => {
      expect(mockAssign).toHaveBeenCalledWith(paymentUrl);
    });
  });

  it('navigue vers /apprenant/abonnement si payment_url absent (fallback)', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        abonnement: { id: 'abo-legacy', offre: 'ESSENTIEL', statut: 'ACTIF' },
        montant_premier_mois: 12000,
        // pas de payment_url
      },
    });

    renderPage();
    await waitFor(() => expect(screen.getByTestId('consent-checkbox')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('consent-checkbox'));
    await waitFor(() => expect(screen.getByTestId('btn-souscrire')).not.toBeDisabled());

    fireEvent.click(screen.getByTestId('btn-souscrire'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/apprenant/abonnement');
    });
  });

  it('envoie l\'offre selectionnee au backend', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        abonnement: { id: 'abo-prem', offre: 'PREMIUM', statut: 'EN_ATTENTE_PAIEMENT' },
        payment_url: 'https://mock-ngser.forges.ci/pay?order=ABO-P',
        order_ngser: 'ABO-P',
        montant_premier_mois: 20000,
      },
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('Choisir Premium')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Choisir Premium'));

    await waitFor(() => expect(screen.getByTestId('consent-checkbox')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('consent-checkbox'));
    await waitFor(() => expect(screen.getByTestId('btn-souscrire')).not.toBeDisabled());

    fireEvent.click(screen.getByTestId('btn-souscrire'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/abonnements/retail',
        expect.objectContaining({ offre: 'PREMIUM' })
      );
    });
  });
});
