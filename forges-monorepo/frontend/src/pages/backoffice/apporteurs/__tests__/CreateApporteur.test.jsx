import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CreateApporteur from '../CreateApporteur';
import apporteursApi from '../../../../api/apporteurs.api';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../../api/apporteurs.api', () => ({
  default: {
    createApporteur: vi.fn(),
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

describe('CreateApporteur', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apporteursApi.createApporteur.mockResolvedValue({
      apporteur_id: 'app-9',
      code_apporteur: 'uuid-new',
    });
  });

  it('envoie uniquement les champs autorisés et affiche le code créé', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <CreateApporteur />
      </BrowserRouter>
    );

    await user.type(screen.getByLabelText(/Nom/i), 'Gamma Partners');
    await user.selectOptions(screen.getByLabelText(/^Type$/i), 'ORGANISATION');
    await user.type(screen.getByLabelText(/^Email/i), 'gamma@example.com');
    await user.clear(screen.getByLabelText(/Taux de commission/i));
    await user.type(screen.getByLabelText(/Taux de commission/i), '8');
    await user.selectOptions(screen.getByLabelText(/Langue préférée/i), 'FR');
    await user.click(screen.getByRole('button', { name: /Créer l'apporteur/i }));

    await waitFor(() => {
      expect(apporteursApi.createApporteur).toHaveBeenCalledWith({
        nom: 'Gamma Partners',
        type: 'ORGANISATION',
        email: 'gamma@example.com',
        taux_commission_pct: 8,
        langue_preferee: 'FR',
      });
    });

    expect(screen.getByText(/L'apporteur a été créé et activé/i)).toBeInTheDocument();
    expect(screen.getByText('app-9')).toBeInTheDocument();
    expect(screen.getByText('uuid-new')).toBeInTheDocument();
    expect(state.showToast).toHaveBeenCalledWith('Apporteur créé avec succès.', 'success');
  });

  it('bloque un taux de commission non entier', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <CreateApporteur />
      </BrowserRouter>
    );

    await user.type(screen.getByLabelText(/Nom/i), 'Delta Network');
    await user.type(screen.getByLabelText(/^Email/i), 'delta@example.com');
    await user.clear(screen.getByLabelText(/Taux de commission/i));
    await user.type(screen.getByLabelText(/Taux de commission/i), '7.5');
    await user.click(screen.getByRole('button', { name: /Créer l'apporteur/i }));

    await waitFor(() => {
      expect(apporteursApi.createApporteur).not.toHaveBeenCalled();
    });
  });
});
