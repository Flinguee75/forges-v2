import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../../../contexts/ToastContext';
import ResetPasswordConfirmPage from '../ResetPasswordConfirmPage';
import { authApi } from '../../../api/auth.api';

vi.mock('../../../api/auth.api', () => ({
  authApi: {
    resetPassword: vi.fn(),
  },
}));

describe('ResetPasswordConfirmPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('réinitialise le mot de passe avec un token', async () => {
    authApi.resetPassword.mockResolvedValue({
      message: 'Mot de passe réinitialisé avec succès',
    });

    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/reset-password/token-01']}>
          <Routes>
            <Route path="/reset-password/:token" element={<ResetPasswordConfirmPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/nouveau mot de passe/i), 'Password1!');
    await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'Password1!');
    await user.click(screen.getByRole('button', { name: /réinitialiser le mot de passe/i }));

    await waitFor(() => {
      expect(authApi.resetPassword).toHaveBeenCalledWith('token-01', 'Password1!');
      expect(screen.getByText(/mot de passe réinitialisé/i)).toBeInTheDocument();
    });
  });

  it('affiche une erreur si les mots de passe sont différents', async () => {
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/reset-password/token-01']}>
          <Routes>
            <Route path="/reset-password/:token" element={<ResetPasswordConfirmPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/nouveau mot de passe/i), 'Password1!');
    await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'Password2!');
    await user.click(screen.getByRole('button', { name: /réinitialiser le mot de passe/i }));

    expect(screen.getByText(/ne correspondent pas/i)).toBeInTheDocument();
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });
});
