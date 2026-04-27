import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilPartenaire from '../ProfilPartenaire';

const state = vi.hoisted(() => ({
  showToast: vi.fn(),
  updateUser: vi.fn(),
  execute: vi.fn(async (fn, options) => {
    const data = await fn();
    options?.onSuccess?.(data);
    return data;
  }),
}));

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: state.execute,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({ showToast: state.showToast }),
}));

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { langue_preferee: 'FR', email: 'partner@test.ci' },
    updateUser: state.updateUser,
  }),
}));

const apiMocks = vi.hoisted(() => ({
  getMonProfilPartenaire: vi.fn(),
  updateMonProfilPartenaire: vi.fn(),
}));

vi.mock('../../../api/partenaires.api', () => ({
  getMonProfilPartenaire: apiMocks.getMonProfilPartenaire,
  updateMonProfilPartenaire: apiMocks.updateMonProfilPartenaire,
  getProfilPartenaire: apiMocks.getMonProfilPartenaire,
  updateProfilPartenaire: apiMocks.updateMonProfilPartenaire,
  default: {
    getMonProfilPartenaire: apiMocks.getMonProfilPartenaire,
    updateMonProfilPartenaire: apiMocks.updateMonProfilPartenaire,
    getProfilPartenaire: apiMocks.getMonProfilPartenaire,
    updateProfilPartenaire: apiMocks.updateMonProfilPartenaire,
  },
}));

describe('ProfilPartenaire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getMonProfilPartenaire.mockResolvedValue({
      id: 'p-1',
      raison_sociale: 'Tech Formation',
      type: 'ONG',
      pays: 'CI',
      email_principal: 'partner@test.ci',
      statut: 'ACTIF',
      mode_inscription: 'INVITATION_ADMIN',
      created_at: '2026-01-01T00:00:00.000Z',
      nb_formations: 2,
    });
    apiMocks.updateMonProfilPartenaire.mockResolvedValue({
      id: 'p-1',
      raison_sociale: 'Tech Formation Plus',
      type: 'ONG',
      pays: 'CI',
      email_principal: 'partner+new@test.ci',
      statut: 'ACTIF',
      mode_inscription: 'INVITATION_ADMIN',
      created_at: '2026-01-01T00:00:00.000Z',
      nb_formations: 2,
    });
  });

  it('charge et met à jour le profil partenaire via le runtime', async () => {
    const user = userEvent.setup();
    render(<ProfilPartenaire />);

    await waitFor(() => expect(screen.getByDisplayValue('Tech Formation')).toBeInTheDocument());

    await user.clear(screen.getByRole('textbox', { name: /Email/i }));
    await user.type(screen.getByRole('textbox', { name: /Email/i }), 'partner+new@test.ci');
    await user.clear(screen.getByRole('textbox', { name: /Raison sociale/i }));
    await user.type(screen.getByRole('textbox', { name: /Raison sociale/i }), 'Tech Formation Plus');
    await waitFor(() => expect(screen.getByDisplayValue('Tech Formation Plus')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByDisplayValue('partner+new@test.ci')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Enregistrer les modifications/i }));

    await waitFor(() => {
      expect(apiMocks.updateMonProfilPartenaire).toHaveBeenCalledWith({
        email: 'partner+new@test.ci',
        raison_sociale: 'Tech Formation Plus',
        pays: 'CI',
      });
      expect(state.updateUser).toHaveBeenCalled();
      expect(screen.getByDisplayValue('Tech Formation Plus')).toBeInTheDocument();
    });
  });
});
