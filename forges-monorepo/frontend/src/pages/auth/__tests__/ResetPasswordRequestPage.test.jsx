import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/test-utils';
import ResetPasswordRequestPage from '../ResetPasswordRequestPage';
import { authApi } from '../../../api/auth.api';

vi.mock('../../../api/auth.api', () => ({
  authApi: {
    requestPasswordReset: vi.fn(),
  },
}));

describe('ResetPasswordRequestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('envoie une demande de reset et affiche la confirmation', async () => {
    authApi.requestPasswordReset.mockResolvedValue({
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé.',
    });

    renderWithProviders(<ResetPasswordRequestPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'user@test.ci');
    await user.click(screen.getByRole('button', { name: /envoyer le lien/i }));

    await waitFor(() => {
      expect(authApi.requestPasswordReset).toHaveBeenCalledWith('user@test.ci');
      expect(screen.getByText(/vérifiez votre boîte mail/i)).toBeInTheDocument();
    });
  });
});
