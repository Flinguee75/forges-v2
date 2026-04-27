import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/test-utils';
import RegisterEtudiantPage from '../RegisterEtudiantPage';
import { authApi } from '../../../api/auth.api';
import { useApi } from '../../../hooks/useApi';

const mockNavigate = vi.fn();
const mockExecute = vi.fn();

vi.mock('../../../hooks/useApi', () => ({
  useApi: vi.fn(),
}));

vi.mock('../../../api/auth.api', () => ({
  authApi: {
    registerEtudiant: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('RegisterEtudiantPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useApi.mockReturnValue({
      execute: mockExecute,
      isLoading: false,
      error: null,
    });

    mockExecute.mockImplementation(async (apiCall, options = {}) => {
      const result = await apiCall();
      options.onSuccess?.(result);
      return result;
    });
  });

  it('affiche le champ prénoms et le consentement RGPD', () => {
    renderWithProviders(<RegisterEtudiantPage />);

    expect(screen.getByLabelText(/prénoms/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/consentement rgpd/i)).toBeInTheDocument();
  });

  it('envoie un payload compatible avec le backend', async () => {
    const user = userEvent.setup();
    authApi.registerEtudiant.mockResolvedValue({
      message: 'Compte créé. Vérifiez votre email pour activer votre compte.',
    });

    renderWithProviders(<RegisterEtudiantPage />);

    await user.type(screen.getByLabelText(/^nom \*/i), 'Koné');
    await user.type(screen.getByLabelText(/prénoms \*/i), 'Amadou');
    await user.type(screen.getByLabelText(/email \*/i), 'test@example.ci');
    const passwordInputs = screen.getAllByLabelText(/mot de passe/i);
    await user.type(passwordInputs[0], 'Test@2026A');
    await user.type(passwordInputs[1], 'Test@2026A');
    await user.selectOptions(screen.getByLabelText(/niveau d'étude/i), 'LICENCE');
    await user.click(screen.getByLabelText(/consentement rgpd/i));
    await user.click(screen.getByRole('button', { name: /créer mon compte/i }));

    await waitFor(() => {
      expect(authApi.registerEtudiant).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.ci',
          nom: 'Koné',
          prenoms: 'Amadou',
          consentement_rgpd: true,
          type_apprenant: 'APPRENANT',
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/login', expect.any(Object));
    });
  });
});
