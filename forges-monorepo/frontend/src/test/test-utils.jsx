import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '../contexts/ToastContext';
import { AuthProvider } from '../contexts/AuthContext';

/**
 * Helper de test avec tous les providers nécessaires
 * Référence: F-11 Tests (Todo_front.pdf)
 *
 * Utilisation:
 * import { renderWithProviders } from '../test/test-utils';
 * renderWithProviders(<MaPage />);
 */

/**
 * Render avec ToastProvider + BrowserRouter
 */
export function renderWithToast(ui, options = {}) {
  return render(
    <BrowserRouter>
      <ToastProvider>{ui}</ToastProvider>
    </BrowserRouter>,
    options
  );
}

/**
 * Render avec AuthProvider + ToastProvider + BrowserRouter
 */
export function renderWithAuth(ui, { authValue = {}, ...options } = {}) {
  const defaultAuthValue = {
    user: null,
    login: () => {},
    logout: () => {},
    isAuthenticated: false,
    ...authValue,
  };

  // Note: Pour mocker AuthProvider, on utilise directement le mock dans les tests
  // Ce helper est pour les cas où on veut un vrai AuthProvider
  return render(
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider value={defaultAuthValue}>{ui}</AuthProvider>
      </ToastProvider>
    </BrowserRouter>,
    options
  );
}

/**
 * Render avec tous les providers (Router + Toast + Auth)
 * C'est le plus complet pour tester des pages complètes
 */
export function renderWithProviders(ui, options = {}) {
  return render(
    <BrowserRouter>
      <ToastProvider>{ui}</ToastProvider>
    </BrowserRouter>,
    options
  );
}

/**
 * Render simple avec juste BrowserRouter (pour composants sans contexte)
 */
export function renderWithRouter(ui, options = {}) {
  return render(<BrowserRouter>{ui}</BrowserRouter>, options);
}

// Ré-exporter tout de @testing-library/react
export * from '@testing-library/react';
