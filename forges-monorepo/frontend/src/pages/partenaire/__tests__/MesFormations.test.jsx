import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MesFormations from '../MesFormations';

const mockNavigate = vi.fn();

const apiMocks = vi.hoisted(() => ({
  getMesFormations: vi.fn(),
}));

const hookState = vi.hoisted(() => ({
  showError: vi.fn(),
  execute: vi.fn(async (fn) => fn()),
}));

vi.mock('../../../api/partenaires.api', () => ({
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

const formationsResponse = {
  data: [
    {
      id: 'f-1',
      titre: 'Cyber Defense',
      description: 'Formation SOC',
      domaine: 'Cybersécurité',
      duree: 24,
      prix_coutant: 12500000,
      mode_formation: 'AVEC_SESSION',
      statut_validation: 'EN_ATTENTE',
      statut: 'EN_ATTENTE_VALIDATION',
      date_soumission: '2026-05-01T00:00:00.000Z',
    },
    {
      id: 'f-2',
      titre: 'Data Governance',
      description: 'Gouvernance de la donnée',
      domaine: 'Data',
      duree: 16,
      prix_coutant: 5000000,
      mode_formation: 'A_LA_DEMANDE',
      statut_validation: 'REJETEE',
      statut: 'REJETEE',
      motif_rejet: 'Programme trop vague',
      corrections_suggerees: 'Ajouter les objectifs pédagogiques détaillés',
    },
  ],
  meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
};

const renderPage = (initialEntry = '/partenaire/formations') => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <MesFormations />
  </MemoryRouter>
);

describe('MesFormations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getMesFormations.mockResolvedValue(formationsResponse);
  });

  it('liste les soumissions avec statut, prix coutant et messages de validation', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Cyber Defense')).toBeInTheDocument());

    expect(screen.getByText('Data Governance')).toBeInTheDocument();
    expect(screen.getByText(/125\s*000 FCFA/)).toBeInTheDocument();
    expect(screen.getByText('En cours d examen')).toBeInTheDocument();
    expect(screen.getByText('Formation rejetee')).toBeInTheDocument();
    expect(screen.getByText('Programme trop vague')).toBeInTheDocument();
    expect(screen.getByText(/Ajouter les objectifs pédagogiques détaillés/)).toBeInTheDocument();
    expect(screen.queryByText(/commission_forges|type_formation|pilier_abonnement/i)).not.toBeInTheDocument();
  });

  it('transmet les filtres URL et les changements de filtres a l API', async () => {
    const user = userEvent.setup();
    renderPage('/partenaire/formations?statut_validation=VALIDEE');

    await waitFor(() => expect(apiMocks.getMesFormations).toHaveBeenCalledWith({
      statut_validation: 'VALIDEE',
      statut: '',
      search: '',
    }));

    await user.type(screen.getByLabelText(/Recherche/i), 'data');

    await waitFor(() => expect(apiMocks.getMesFormations).toHaveBeenLastCalledWith({
      statut_validation: 'VALIDEE',
      statut: '',
      search: 'data',
    }));
  });

  it('navigue vers le detail de formation depuis une carte', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Cyber Defense')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Cyber Defense/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/partenaire/formations/f-1');
  });
});
