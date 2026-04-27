import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import LoginPage from './LoginPage';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { authApi } from '../../api/auth.api';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();
const mockExecute = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/useApi', () => ({
  useApi: vi.fn(),
}));

vi.mock('../../api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuth.mockReturnValue({
      login: mockLogin,
      user: null,
      isAuthenticated: false,
    });

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

  it('affiche le formulaire et les liens principaux', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Creer un compte' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'Mot de passe oublie' })).toHaveAttribute('href', '/reset-password');
  });

  it('affiche les comptes de connexion rapide en mode developpement', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByText('Connexion rapide')).toBeInTheDocument();
    expect(screen.getByText('admin@forges.ci')).toBeInTheDocument();
    expect(screen.getByText('apprenant@forges.ci')).toBeInTheDocument();
  });

  it('soumet le formulaire et connecte un apprenant v4.8', async () => {
    const user = userEvent.setup();
    const response = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: '1', role: 'APPRENANT', email: 'apprenant@forges.ci' },
    };

    authApi.login.mockResolvedValue(response);

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'apprenant@forges.ci');
    await user.type(screen.getByLabelText(/mot de passe/i), 'Secret@123');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'apprenant@forges.ci',
        password: 'Secret@123',
      });
      expect(mockLogin).toHaveBeenCalledWith(
        response.accessToken,
        response.refreshToken,
        response.user
      );
      expect(mockNavigate).toHaveBeenCalledWith('/apprenant/dashboard');
    });
  });

  it.each([
    ['APPRENANT', '/apprenant/dashboard'],
    ['ETUDIANT', '/apprenant/dashboard'],
    ['ADMIN', '/backoffice/dashboard'],
    ['ORGANISATION', '/organisation/dashboard'],
    ['PARTENAIRE', '/partenaire/dashboard'],
  ])('redirige %s vers %s apres connexion', async (role, expectedPath) => {
    const user = userEvent.setup();

    authApi.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: '1', role, email: 'user@forges.ci' },
    });

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'user@forges.ci');
    await user.type(screen.getByLabelText(/mot de passe/i), 'Secret@123');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(expectedPath);
    });
  });

  it('affiche une erreur issue du hook useApi', () => {
    useApi.mockReturnValue({
      execute: mockExecute,
      isLoading: false,
      error: 'Email ou mot de passe incorrect',
    });

    renderWithProviders(<LoginPage />);

    expect(screen.getByText('Email ou mot de passe incorrect')).toBeInTheDocument();
  });

  it('desactive le bouton pendant la connexion', () => {
    useApi.mockReturnValue({
      execute: mockExecute,
      isLoading: true,
      error: null,
    });

    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeDisabled();
  });

  it('utilise la connexion rapide avec les bons identifiants', async () => {
    const user = userEvent.setup();

    authApi.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: '1', role: 'ADMIN', email: 'admin@forges.ci' },
    });

    renderWithProviders(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /Admin Principal/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'admin@forges.ci',
        password: 'Test@FORGES2026!',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/backoffice/dashboard');
    });
  });
});
