import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ApporteursList from '../ApporteursList';
import apporteursApi from '../../../../api/apporteurs.api';

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn(async (fn, options) => {
      const data = await fn();
      options?.onSuccess?.(data);
      return data;
    }),
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../../../api/apporteurs.api', () => ({
  default: {
    getAllApporteurs: vi.fn(),
  },
}));

describe('ApporteursList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apporteursApi.getAllApporteurs.mockResolvedValue({
      data: [
        {
          id: 'apt-1',
          nom: 'Alpha Conseil',
          email: 'alpha@example.com',
          code_apporteur: 'CODE-1',
          statut: 'ACTIF',
          date_inscription: '2026-01-01T00:00:00.000Z',
          commissions_count: 3,
        },
      ],
      meta: { total: 1, page: 1, totalPages: 1 },
    });
  });

  it('affiche la liste admin des apporteurs alignée au runtime', async () => {
    render(
      <BrowserRouter>
        <ApporteursList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alpha Conseil')).toBeInTheDocument();
      expect(screen.getByText('CODE-1')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});
