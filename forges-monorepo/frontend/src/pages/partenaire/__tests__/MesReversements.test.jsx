import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MesReversements from '../MesReversements';

const apiMocks = vi.hoisted(() => ({
  getMesReversements: vi.fn(),
}));

const hookState = vi.hoisted(() => ({
  showError: vi.fn(),
  execute: vi.fn(async (fn) => fn()),
}));

vi.mock('../../../api/partenaires.api', () => ({
  getMesReversements: apiMocks.getMesReversements,
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

const renderPage = () => render(
  <MemoryRouter>
    <MesReversements />
  </MemoryRouter>
);

describe('MesReversements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getMesReversements.mockResolvedValue({
      data: [
        {
          id: 'rev-1',
          date_validation: '2026-04-30T00:00:00.000Z',
          formation: { titre: 'Cyber Defense' },
          statut_validation: 'VALIDEE',
          montant_net: 7500000,
          commission_forges_pct: 20,
        },
        {
          id: 'rev-2',
          date_validation: '2026-03-31T00:00:00.000Z',
          formation: { titre: 'Data Governance' },
          statut_validation: 'REVERSEE',
          montant_net: 2500000,
        },
      ],
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    });
  });

  it('affiche uniquement les montants nets visibles au partenaire', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Cyber Defense')).toBeInTheDocument());

    expect(screen.getAllByText(/75\s*000 FCFA/).length).toBeGreaterThan(0);
    expect(screen.getByText(/100\s*000 FCFA/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText(/commission_forges|commission FORGES|20%/i)).not.toBeInTheDocument();
  });

  it('relance la recherche quand le partenaire filtre par statut valide', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(apiMocks.getMesReversements).toHaveBeenCalledWith({
      mois: '',
      statut_validation: '',
    }));

    await user.selectOptions(screen.getByLabelText(/Statut/i), 'VALIDEE');

    await waitFor(() => expect(apiMocks.getMesReversements).toHaveBeenLastCalledWith({
      mois: '',
      statut_validation: 'VALIDEE',
    }));
  });

  it('affiche un etat vide distinct quand les filtres ne retournent rien', async () => {
    apiMocks.getMesReversements.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('Aucun reversement')).toBeInTheDocument());
    expect(screen.getByText('Aucun reversement disponible pour le moment.')).toBeInTheDocument();
  });
});
