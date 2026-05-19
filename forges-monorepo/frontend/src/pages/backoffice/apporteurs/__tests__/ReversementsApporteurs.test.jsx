import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ReversementsApporteurs from '../ReversementsApporteurs';
import apporteursApi from '../../../../api/apporteurs.api';
import agentApi from '../../../../api/agent.api';

vi.mock('../../../../api/apporteurs.api', () => ({
  default: {
    getRapportMensuel: vi.fn(),
  },
}));

vi.mock('../../../../api/agent.api', () => ({
  default: {
    getReversementsApporteurs: vi.fn(),
    effectuerReversementApporteur: vi.fn(),
  },
}));

const toastState = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

const apiState = vi.hoisted(() => ({
  user: { id: 'agent-1', role: 'AGENT' },
  execute: vi.fn(async (apiCall, options) => {
    const result = await apiCall();
    await options?.onSuccess?.(result);
    return result;
  }),
}));

vi.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: apiState.user }),
}));

vi.mock('../../../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: toastState.showToast,
  }),
}));

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: apiState.execute,
    isLoading: false,
    error: null,
  }),
}));

describe('ReversementsApporteurs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiState.user = { id: 'agent-1', role: 'AGENT' };

    agentApi.getReversementsApporteurs.mockResolvedValue({
      data: [
        {
          apporteur_id: 'app-1',
          nom: 'Alpha Referral',
          email: 'alpha@example.com',
          code_apporteur: 'CODE-1',
          montant_total_xof: 600000,
          nb_commissions: 3,
        },
      ],
    });

    agentApi.effectuerReversementApporteur.mockResolvedValue({
      apporteur_id: 'app-1',
      montant_total_xof: 600000,
    });

    apporteursApi.getRapportMensuel.mockResolvedValue({
      nb_apporteurs_actifs: 2,
      commissions_totales_dues_xof: 900000,
      top_apporteurs: [
        {
          apporteur_id: 'app-1',
          nom: 'Alpha Referral',
          email: 'alpha@example.com',
          nb_transactions: 8,
          montant_base: 800000,
          montant_commission: 40000,
        },
      ],
    });
  });

  it('affiche la file des reversements et permet la validation agent', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <ReversementsApporteurs />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(agentApi.getReversementsApporteurs).toHaveBeenCalled();
      expect(screen.getByText('Alpha Referral')).toBeInTheDocument();
      expect(screen.getByText('CODE-1')).toBeInTheDocument();
    });

    expect(screen.getByRole('cell', { name: '3' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /600\s*000 FCFA/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Effectuer le reversement/i }));
    expect(await screen.findByText(/Confirmer le reversement/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Confirmer/i }));

    await waitFor(() => {
      expect(agentApi.effectuerReversementApporteur).toHaveBeenCalledWith('app-1');
      expect(toastState.showToast).toHaveBeenCalledWith('Reversement effectué avec succès.', 'success');
    });
  });

  it('affiche le résumé mensuel superviseur', async () => {
    apiState.user = { id: 'sup-1', role: 'SUPERVISEUR' };
    const expectedMonth = (() => {
      const currentDate = new Date();
      currentDate.setMonth(currentDate.getMonth() - 1);
      return currentDate.toISOString().slice(0, 7);
    })();

    render(
      <BrowserRouter>
        <ReversementsApporteurs />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(apporteursApi.getRapportMensuel).toHaveBeenCalledWith({ mois: expectedMonth });
      expect(screen.getByText(/Tableau mensuel apporteurs/i)).toBeInTheDocument();
      expect(screen.getByText('Alpha Referral')).toBeInTheDocument();
    });

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText(/900\s*000 FCFA/).length).toBeGreaterThan(0);
  });

  it('affiche le résumé mensuel consolidé pour ADMIN', async () => {
    apiState.user = { id: 'admin-1', role: 'ADMIN' };

    render(
      <BrowserRouter>
        <ReversementsApporteurs />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(apporteursApi.getRapportMensuel).toHaveBeenCalled();
      expect(agentApi.getReversementsApporteurs).not.toHaveBeenCalled();
      expect(screen.getByText(/Tableau mensuel apporteurs/i)).toBeInTheDocument();
      expect(screen.getByText('Alpha Referral')).toBeInTheDocument();
    });

    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
