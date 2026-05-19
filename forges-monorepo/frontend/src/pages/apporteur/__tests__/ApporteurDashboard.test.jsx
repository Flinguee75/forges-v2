import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ApporteurDashboard from '../ApporteurDashboard';

const mockNavigate = vi.fn();
const mockShowToast = vi.fn();

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
  }),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock('../../../api/apporteurs.api', () => ({
  default: {
    getDashboard: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }) => <div data-testid="qr-code">{value}</div>,
}));

const mockDashboardData = {
  code_apporteur: '550e8400-e29b-41d4-a716-446655440000',
  referral_url: 'https://forges.com/register?ref=550e8400-e29b-41d4-a716-446655440000',
  taux_commission_pct: 5,
  langue_preferee: 'FR',
  statut: 'ACTIF',
  workflow_status: 'ACTIF',
  stats_mois_courant: {
    nb_transactions_mois: 12,
    montant_base_mois: 500000,
    montant_commission_mois: 25000,
  },
  cumul_en_cours: 25000,
  cumul_total_percu: 150000,
};

describe('ApporteurDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn(() => Promise.resolve()),
      },
      writable: true,
      configurable: true,
    });
  });

  it('affiche le code UUID permanent (RM-141)', async () => {
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getDashboard.mockResolvedValue(mockDashboardData);

    render(
      <BrowserRouter>
        <ApporteurDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('550e8400-e29b-41d4-a716-446655440000')).toBeInTheDocument();
    });

    // Vérifier que le champ est en lecture seule
    const codeInput = screen.getByDisplayValue('550e8400-e29b-41d4-a716-446655440000');
    expect(codeInput).toHaveAttribute('readOnly');
  });

  it('affiche le bouton Copier pour le code UUID', async () => {
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getDashboard.mockResolvedValue(mockDashboardData);

    render(
      <BrowserRouter>
        <ApporteurDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Copier')[0]).toBeInTheDocument();
    });
  });

  it('copie le code UUID dans le presse-papiers au clic', async () => {
    const user = userEvent.setup();
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getDashboard.mockResolvedValue(mockDashboardData);

    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    render(
      <BrowserRouter>
        <ApporteurDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Copier').length).toBeGreaterThan(0);
    });

    const copyButtons = screen.getAllByText('Copier');
    await user.click(copyButtons[0]);

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(mockShowToast).toHaveBeenCalledWith('Copié dans le presse-papiers.', 'success');
      expect(screen.getByText('Copié')).toBeInTheDocument();
    });
  });

  it('affiche le lien de parrainage', async () => {
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getDashboard.mockResolvedValue(mockDashboardData);

    render(
      <BrowserRouter>
        <ApporteurDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://forges.com/register?ref=550e8400-e29b-41d4-a716-446655440000')).toBeInTheDocument();
    });
  });

  it('affiche le QR code avec le lien de parrainage', async () => {
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getDashboard.mockResolvedValue(mockDashboardData);

    render(
      <BrowserRouter>
        <ApporteurDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      const qrCode = screen.getByTestId('qr-code');
      expect(qrCode).toBeInTheDocument();
      expect(qrCode).toHaveTextContent('https://forges.com/register?ref=550e8400-e29b-41d4-a716-446655440000');
    });
  });

  it('affiche le taux de commission (RM-141 - défaut 5%)', async () => {
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getDashboard.mockResolvedValue(mockDashboardData);

    render(
      <BrowserRouter>
        <ApporteurDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('5%')).toBeInTheDocument();
    });
  });

  it('affiche les statistiques du mois en cours', async () => {
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getDashboard.mockResolvedValue(mockDashboardData);

    render(
      <BrowserRouter>
        <ApporteurDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument(); // nb transactions
      expect(screen.getByText('500 000 FCFA')).toBeInTheDocument(); // CA généré
      // Il y a plusieurs éléments avec "25 000 FCFA", donc on vérifie qu'au moins un existe
      const commissionsElements = screen.getAllByText('25 000 FCFA');
      expect(commissionsElements.length).toBeGreaterThan(0);
    });
  });

  it('affiche le cumul en cours et le message de seuil (RM-147)', async () => {
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getDashboard.mockResolvedValue(mockDashboardData);

    render(
      <BrowserRouter>
        <ApporteurDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Le seuil minimum est atteint/i)).toBeInTheDocument();
    });
  });

  it('affiche le message de report si cumul < seuil (RM-147)', async () => {
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getDashboard.mockResolvedValue({
      ...mockDashboardData,
      cumul_en_cours: 3000, // < 5000 XOF
    });

    render(
      <BrowserRouter>
        <ApporteurDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Report au mois suivant/i)).toBeInTheDocument();
      expect(screen.getByText(/3000 XOF \/ seuil : 5000 XOF/i)).toBeInTheDocument();
    });
  });

  it('affiche le cumul total perçu', async () => {
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getDashboard.mockResolvedValue(mockDashboardData);

    render(
      <BrowserRouter>
        <ApporteurDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/150\s?000 FCFA/)).toBeInTheDocument();
      expect(screen.getByText(/Montant total déjà reversé/i)).toBeInTheDocument();
    });
  });

  it('affiche le badge de statut ACTIF', async () => {
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getDashboard.mockResolvedValue(mockDashboardData);

    render(
      <BrowserRouter>
        <ApporteurDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Actif')).toBeInTheDocument();
    });
  });

  it('affiche les actions rapides avec navigation', async () => {
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getDashboard.mockResolvedValue(mockDashboardData);

    render(
      <BrowserRouter>
        <ApporteurDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Voir mes commissions')).toBeInTheDocument();
      expect(screen.getByText('Voir mes reversements')).toBeInTheDocument();
      expect(screen.getByText('Gérer mon profil')).toBeInTheDocument();
    });
  });

  it('navigue vers les pages appropriées au clic sur les actions', async () => {
    const user = userEvent.setup();
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getDashboard.mockResolvedValue(mockDashboardData);

    render(
      <BrowserRouter>
        <ApporteurDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Voir mes commissions')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Voir mes commissions'));
    expect(mockNavigate).toHaveBeenCalledWith('/apporteur/commissions');

    await user.click(screen.getByText('Voir mes reversements'));
    expect(mockNavigate).toHaveBeenCalledWith('/apporteur/reversements');

    await user.click(screen.getByText('Gérer mon profil'));
    expect(mockNavigate).toHaveBeenCalledWith('/apporteur/profil');
  });
});
