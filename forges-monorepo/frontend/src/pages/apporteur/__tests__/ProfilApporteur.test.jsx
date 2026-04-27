import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilApporteur from '../ProfilApporteur';
import apporteursApi from '../../../api/apporteurs.api';

const state = vi.hoisted(() => ({
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
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../../api/apporteurs.api', () => ({
  default: {
    getMonProfil: vi.fn(),
    updateProfil: vi.fn(),
  },
}));

describe('ProfilApporteur', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apporteursApi.getMonProfil.mockResolvedValue({
      id: 'a-1',
      nom: 'Alpha Conseil',
      type: 'INDIVIDU',
      email: 'alpha@test.ci',
      telephone: '01020304',
      pays: 'CI',
      code_apporteur: 'CODE-1',
      taux_commission_pct: 5,
      statut: 'ACTIF',
      created_at: '2026-01-01T00:00:00.000Z',
      commissions_count: 2,
    });
    apporteursApi.updateProfil.mockResolvedValue({
      id: 'a-1',
      nom: 'Alpha Conseil Plus',
      type: 'INDIVIDU',
      email: 'alpha+new@test.ci',
      telephone: '05060708',
      pays: 'BJ',
      code_apporteur: 'CODE-1',
      taux_commission_pct: 5,
      statut: 'ACTIF',
      created_at: '2026-01-01T00:00:00.000Z',
      commissions_count: 2,
    });
  });

  it('charge et met à jour le profil apporteur via le runtime', async () => {
    const user = userEvent.setup();
    render(<ProfilApporteur />);

    await waitFor(() => expect(screen.getByDisplayValue('Alpha Conseil')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Modifier/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Enregistrer/i })).toBeInTheDocument());
    await user.clear(screen.getByRole('textbox', { name: /Nom/i }));
    await user.type(screen.getByRole('textbox', { name: /Nom/i }), 'Alpha Conseil Plus');
    await user.clear(screen.getByRole('textbox', { name: /Email/i }));
    await user.type(screen.getByRole('textbox', { name: /Email/i }), 'alpha+new@test.ci');
    await user.clear(screen.getByRole('textbox', { name: /Téléphone/i }));
    await user.type(screen.getByRole('textbox', { name: /Téléphone/i }), '05060708');
    await user.clear(screen.getByRole('textbox', { name: /Pays/i }));
    await user.type(screen.getByRole('textbox', { name: /Pays/i }), 'BJ');
    await waitFor(() => expect(screen.getByDisplayValue('Alpha Conseil Plus')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByDisplayValue('alpha+new@test.ci')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByDisplayValue('05060708')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByDisplayValue('BJ')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Enregistrer/i }));

    await waitFor(() => {
      expect(apporteursApi.updateProfil).toHaveBeenCalledWith({
        nom: 'Alpha Conseil Plus',
        email: 'alpha+new@test.ci',
        telephone: '05060708',
        pays: 'BJ',
      });
      expect(screen.getByDisplayValue('Alpha Conseil Plus')).toBeInTheDocument();
    });
  });
});
