import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/test-utils';
import RegisterOrganisationPage from '../RegisterOrganisationPage';
import { authApi } from '../../../api/auth.api';
import { useApi } from '../../../hooks/useApi';

const mockNavigate = vi.fn();
const mockExecute = vi.fn();

vi.mock('../../../hooks/useApi', () => ({
  useApi: vi.fn(),
}));

vi.mock('../../../api/auth.api', () => ({
  authApi: {
    registerOrganisation: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('RegisterOrganisationPage', () => {
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

  it('affiche le consentement RGPD et le contact référent', () => {
    renderWithProviders(<RegisterOrganisationPage />);

    expect(screen.getByRole('link', { name: /retour au choix d'inscription/i })).toHaveAttribute('href', '/register');
    expect(screen.getByLabelText(/contact référent/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/consentement rgpd/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^raison sociale$/i })).toBeInTheDocument();
  });

  it('envoie un payload aligné sur le backend', async () => {
    const user = userEvent.setup();
    authApi.registerOrganisation.mockResolvedValue({
      message: 'Compte organisation créé. Vérifiez votre email.',
    });

    renderWithProviders(<RegisterOrganisationPage />);

    await user.type(screen.getByRole('textbox', { name: /^raison sociale$/i }), 'TechCorp Dev CI');
    await user.selectOptions(screen.getByLabelText(/type d'organisation/i), 'ENTREPRISE');
    await user.type(screen.getByLabelText(/identifiant légal/i), 'CI-ABJ-01-2024-B12-12345');
    await user.type(screen.getByLabelText(/^email de l'organisation/i), 'org@test.ci');
    await user.type(screen.getByLabelText(/^mot de passe/i), 'Test@2026A');
    await user.type(screen.getAllByLabelText(/mot de passe/i)[1], 'Test@2026A');
    await user.type(screen.getByLabelText(/contact référent/i), 'Awa Diop, RH');
    await user.click(screen.getByLabelText(/consentement rgpd/i));
    await user.click(screen.getByRole('button', { name: /créer le compte organisation/i }));

    await waitFor(() => {
      expect(authApi.registerOrganisation).toHaveBeenCalledWith(
        expect.objectContaining({
          raison_sociale: 'TechCorp Dev CI',
          type: 'ENTREPRISE',
          identifiant_legal: 'CI-ABJ-01-2024-B12-12345',
          email: 'org@test.ci',
          contact_referent: 'Awa Diop, RH',
          consentement_rgpd: true,
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/login', expect.any(Object));
    });
  });
});
