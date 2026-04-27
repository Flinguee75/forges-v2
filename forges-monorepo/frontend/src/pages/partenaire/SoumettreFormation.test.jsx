import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import SoumettreFormation from './SoumettreFormation';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { soumettreFormation } from '../../api/partenaires.api';

const mockNavigate = vi.fn();
const mockExecute = vi.fn();
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();

vi.mock('../../hooks/useApi', () => ({
  useApi: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/partenaires.api', () => ({
  soumettreFormation: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('SoumettreFormation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useApi.mockReturnValue({
      execute: mockExecute,
      isLoading: false,
    });

    useAuth.mockReturnValue({
      user: { role: 'PARTENAIRE', langue_preferee: 'FR' },
    });

    useToast.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
    });

    mockExecute.mockImplementation(async (apiCall) => apiCall());
    soumettreFormation.mockResolvedValue({ id: 'formation-1' });
  });

  it('n expose jamais type_formation ni pilier_abonnement (RM-127)', () => {
    const { container } = renderWithProviders(<SoumettreFormation />);

    // Vérifier qu'il n'y a pas de select ou input avec ces noms
    const typeFormationInput = container.querySelector('input[name="type_formation"], select[name="type_formation"]');
    const pilierAbonnementInput = container.querySelector('input[name="pilier_abonnement"], select[name="pilier_abonnement"]');

    expect(typeFormationInput).toBeNull();
    expect(pilierAbonnementInput).toBeNull();

    // Vérifier que seul le prix coûtant est présent (pas les champs de classification FORGES)
    expect(screen.getByText(/Prix.*co[ûu]tant/i)).toBeInTheDocument();
  });

  it('permet la sauvegarde en brouillon avant la soumission complete', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SoumettreFormation />);

    await user.click(screen.getByRole('button', { name: /sauvegarder en brouillon/i }));

    await waitFor(() => {
      expect(soumettreFormation).toHaveBeenCalledTimes(1);
      expect(soumettreFormation).toHaveBeenCalledWith(expect.any(Object), true);
      expect(mockShowSuccess).toHaveBeenCalledWith('Brouillon enregistre.');
      expect(mockNavigate).toHaveBeenCalledWith('/partenaire/formations');
    });
  });
});
