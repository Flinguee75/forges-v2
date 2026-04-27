import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import InvitationPartenaire from '../InvitationPartenaire';
import partenairesApi from '../../../../api/partenaires.api';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../../api/partenaires.api', () => ({
  default: {
    inviterPartenaire: vi.fn(),
  },
}));

const state = vi.hoisted(() => ({
  showToast: vi.fn(),
  execute: vi.fn(async (apiCall, options) => {
    const result = await apiCall();
    await options?.onSuccess?.(result);
    return result;
  }),
}));

vi.mock('../../../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: state.showToast,
  }),
}));

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: state.execute,
    isLoading: false,
    error: null,
  }),
}));

describe('InvitationPartenaire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    partenairesApi.inviterPartenaire.mockResolvedValue({
      message: 'Invitation envoyée',
      partenaire_id: 'part-1',
    });
  });

  it('envoie l invitation admin avec le bon contrat backend', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <InvitationPartenaire />
      </BrowserRouter>
    );

    await user.type(screen.getByLabelText(/Raison sociale/i), 'Tech Formation');
    await user.type(screen.getByLabelText(/Email professionnel/i), 'partner@example.com');
    await user.selectOptions(screen.getByLabelText(/Type de partenaire/i), 'ONG');
    await user.clear(screen.getByLabelText(/Commission FORGES/i));
    await user.type(screen.getByLabelText(/Commission FORGES/i), '18');
    await user.click(screen.getByRole('button', { name: /Envoyer l'invitation/i }));

    await waitFor(() => {
      expect(partenairesApi.inviterPartenaire).toHaveBeenCalledWith({
        raison_sociale: 'Tech Formation',
        type: 'ONG',
        email: 'partner@example.com',
        commission_forges_pct: 18,
      });
    });

    expect(screen.getByText(/Invitation transmise/i)).toBeInTheDocument();
    expect(screen.getByText('part-1')).toBeInTheDocument();
    expect(state.showToast).toHaveBeenCalledWith('Invitation envoyée avec succès.', 'success');
  });
});
