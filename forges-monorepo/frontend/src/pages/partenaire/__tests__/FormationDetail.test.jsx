import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import FormationDetail from '../FormationDetail';

const apiMocks = vi.hoisted(() => ({
  getFormationDetail: vi.fn(),
  soumettreFormationBrouillon: vi.fn(),
}));

const hookState = vi.hoisted(() => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  execute: vi.fn(async (fn) => fn()),
}));

vi.mock('../../../api/partenaires.api', () => ({
  getFormationDetail: apiMocks.getFormationDetail,
  soumettreFormationBrouillon: apiMocks.soumettreFormationBrouillon,
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
    showSuccess: hookState.showSuccess,
    showError: hookState.showError,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: 'f-1' }),
  };
});

const draftFormation = {
  id: 'f-1',
  titre: 'Cyber Defense',
  description: 'Formation SOC',
  objectifs: 'Piloter un SOC',
  domaine: 'Cybersécurité',
  public_cible: 'RSSI',
  niveau: 'INTERMEDIAIRE',
  langue: 'FR',
  duree: 24,
  modalite: 'EN_LIGNE',
  mode_formation: 'AVEC_SESSION',
  capacite_max: 25,
  prix_coutant: 12500000,
  statut: 'BROUILLON',
  statut_validation: 'EN_ATTENTE',
};

const renderPage = () => render(
  <MemoryRouter>
    <FormationDetail />
  </MemoryRouter>
);

describe('FormationDetail partenaire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getFormationDetail.mockResolvedValue(draftFormation);
    apiMocks.soumettreFormationBrouillon.mockResolvedValue({ id: 'f-1' });
  });

  it('affiche le detail d un brouillon sans exposer les champs de classification FORGES', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Cyber Defense' })).toBeInTheDocument());

    expect(screen.getByText('Brouillon')).toBeInTheDocument();
    expect(screen.getByText(/125\s*000 FCFA/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Soumettre pour validation/i })).toBeInTheDocument();
    expect(screen.queryByText(/type_formation|pilier_abonnement|commission_forges|prix catalogue/i)).not.toBeInTheDocument();
  });

  it('soumet un brouillon puis recharge le detail', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Cyber Defense')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Soumettre pour validation/i }));

    await waitFor(() => {
      expect(apiMocks.soumettreFormationBrouillon).toHaveBeenCalledWith('f-1');
      expect(apiMocks.getFormationDetail).toHaveBeenCalledTimes(2);
      expect(hookState.showSuccess).toHaveBeenCalledWith('Formation soumise pour validation.');
    });
  });

  it('affiche les motifs et corrections quand la formation est rejetee', async () => {
    apiMocks.getFormationDetail.mockResolvedValue({
      ...draftFormation,
      statut: 'REJETEE',
      statut_validation: 'REJETEE',
      motif_rejet: 'Prix coûtant incohérent',
      corrections_suggerees: 'Fournir le détail du programme et du coût.',
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('Formation rejetee')).toBeInTheDocument());
    expect(screen.getAllByText('Prix coûtant incohérent').length).toBeGreaterThan(0);
    expect(screen.getByText('Fournir le détail du programme et du coût.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Soumettre pour validation/i })).not.toBeInTheDocument();
  });
});
