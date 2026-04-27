import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RegisterPartenaire from '../RegisterPartenaire';
import { confirmEmailPartenaire, registerPartenaire } from '../../../api/partenaires.api';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../api/partenaires.api', () => ({
  confirmEmailPartenaire: vi.fn(),
  registerPartenaire: vi.fn(),
}));

const state = vi.hoisted(() => ({
  showToast: vi.fn(),
  execute: vi.fn(async (apiCall, options) => {
    const result = await apiCall();
    await options?.onSuccess?.(result);
    return result;
  }),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: state.showToast,
  }),
}));

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: state.execute,
    isLoading: false,
    error: null,
  }),
}));

describe('RegisterPartenaire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerPartenaire.mockResolvedValue({
      message: 'Demande enregistrée',
    });
    confirmEmailPartenaire.mockResolvedValue({
      message: 'Compte partenaire activé.',
    });
  });

  it('enregistre une auto-inscription avec les enums backend', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/register-partenaire']}>
        <RegisterPartenaire />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/Email professionnel/i), 'partner@example.com');
    await user.type(screen.getByLabelText(/Raison sociale/i), 'Partner SARL');
    await user.selectOptions(screen.getByLabelText(/Type de partenaire/i), 'ONG');
    await user.type(screen.getByLabelText(/^Mot de passe/i), 'Password1');
    await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /Creer mon compte partenaire/i }));

    await waitFor(() => {
      expect(registerPartenaire).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'partner@example.com',
          raison_sociale: 'Partner SARL',
          type_partenaire: 'ONG',
          password: 'Password1',
        })
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/login', expect.any(Object));
  });

  it('active une invitation avec token et mot de passe', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/confirm-email-partenaire?token=invite-1']}>
        <Routes>
          <Route path="/confirm-email-partenaire" element={<RegisterPartenaire />} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/^Mot de passe/i), 'Password1');
    await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /Activer mon compte partenaire/i }));

    await waitFor(() => {
      expect(confirmEmailPartenaire).toHaveBeenCalledWith('invite-1', 'Password1');
      expect(mockNavigate).toHaveBeenCalledWith('/login', expect.any(Object));
    });
  });
});
