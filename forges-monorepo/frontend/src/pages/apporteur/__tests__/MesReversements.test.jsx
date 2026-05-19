import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MesReversements from '../MesReversements';

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: async (fn, options = {}) => {
      try {
        const result = await fn();
        options.onSuccess?.(result);
        return result;
      } catch (error) {
        options.onError?.(error);
        throw error;
      }
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../../api/apporteurs.api', () => ({
  default: {
    getMesCommissions: vi.fn(),
  },
}));

const mockCommissions = [
  {
    id: 'c1',
    mois_reference: '2026-04',
    statut: 'REVERSEE',
    montant_base: 150000,
    montant_commission: 7500,
    nb_transactions: 3,
    message: null,
  },
  {
    id: 'c2',
    mois_reference: '2026-04',
    statut: 'EN_ATTENTE',
    montant_base: 100000,
    montant_commission: 5000,
    nb_transactions: 2,
    message: null,
  },
];

describe('MesReversements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appelle getMesCommissions et non getMesReversements (Bug 3)', async () => {
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getMesCommissions.mockResolvedValue({ data: [] });

    render(
      <BrowserRouter>
        <MesReversements />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(apporteursApi.default.getMesCommissions).toHaveBeenCalled();
    });
  });

  it('affiche les commissions EN_ATTENTE et REVERSEE retournees par l API (Bug 3)', async () => {
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getMesCommissions.mockResolvedValue({ data: mockCommissions });

    render(
      <BrowserRouter>
        <MesReversements />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Reversé')).toBeInTheDocument();
      expect(screen.getByText('En attente')).toBeInTheDocument();
    });
  });

  it('affiche les montants en XOF direct sans diviser par 100 (Bug 1)', async () => {
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getMesCommissions.mockResolvedValue({ data: mockCommissions });

    render(
      <BrowserRouter>
        <MesReversements />
      </BrowserRouter>
    );

    await waitFor(() => {
      const elements = screen.getAllByText('7 500 FCFA');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('rend sans cle dupliquee quand deux items ont le meme mois mais des ids differents (Bug 5)', async () => {
    const apporteursApi = await import('../../../api/apporteurs.api');
    apporteursApi.default.getMesCommissions.mockResolvedValue({ data: mockCommissions });

    const consoleError = vi.spyOn(console, 'error');

    render(
      <BrowserRouter>
        <MesReversements />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Reversé')).toBeInTheDocument();
    });

    const duplicateKeyWarnings = consoleError.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('duplicate key')
    );
    expect(duplicateKeyWarnings).toHaveLength(0);
  });
});
