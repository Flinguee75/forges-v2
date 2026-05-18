import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PartenaireDashboard from '../PartenaireDashboard';

const mockNavigate = vi.fn();

const apiMocks = vi.hoisted(() => ({
  getPartenaireStats: vi.fn(),
  getMesFormations: vi.fn(),
}));

const hookState = vi.hoisted(() => ({
  showError: vi.fn(),
  execute: vi.fn(async (fn) => fn()),
}));

vi.mock('../../../api/partenaires.api', () => ({
  getPartenaireStats: apiMocks.getPartenaireStats,
  getMesFormations: apiMocks.getMesFormations,
}));

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: hookState.execute,
    isLoading: false,
  }),
}));

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { role: 'PARTENAIRE', langue_preferee: 'FR' },
  }),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    showError: hookState.showError,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderPage = () => render(
  <MemoryRouter>
    <PartenaireDashboard />
  </MemoryRouter>
);

describe('PartenaireDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getPartenaireStats.mockResolvedValue({
      stats: {
        total_formations: 5,
        formations_validees: 2,
        formations_rejetees: 1,
        formations_suspendues: 0,
        reversements_nets_mois: 12500000,
      },
      formations: [
        {
          id: 'f-1',
          titre: 'Cyber Defense',
          statut_validation: 'VALIDEE',
          date_soumission: '2026-05-01T00:00:00.000Z',
        },
      ],
      reversements: [
        {
          id: 'rev-1',
          formation: { titre: 'Cyber Defense' },
          statut_validation: 'REVERSEE',
          montant_net: 7500000,
          date_validation: '2026-04-30T00:00:00.000Z',
          commission_forges_pct: 20,
        },
      ],
    });
    apiMocks.getMesFormations.mockResolvedValue({
      data: [],
      meta: { total: 2, page: 1, limit: 1, totalPages: 2 },
    });
  });

  it('affiche les KPI critiques du partenaire et les reversements nets', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Formations actives')).toBeInTheDocument());

    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getByText('En attente validation')).toBeInTheDocument();
    expect(screen.getByText('Reversements nets du mois')).toBeInTheDocument();
    expect(screen.getByText(/125\s*000 FCFA/)).toBeInTheDocument();
    expect(screen.getByText(/75\s*000 FCFA/)).toBeInTheDocument();
    expect(screen.getAllByText('Cyber Defense').length).toBeGreaterThan(0);
    expect(screen.queryByText(/commission_forges|20%|commission FORGES/i)).not.toBeInTheDocument();
  });

  it('charge le nombre de formations en attente via le filtre contractuel', async () => {
    renderPage();

    await waitFor(() => expect(apiMocks.getMesFormations).toHaveBeenCalledWith({
      statut_validation: 'EN_ATTENTE',
      page: 1,
      limit: 1,
    }));
  });

  it('oriente vers les pages partenaire depuis les actions rapides', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Actions rapides')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Soumettre une formation' }));

    expect(mockNavigate).toHaveBeenCalledWith('/partenaire/soumettre-formation');
  });
});
