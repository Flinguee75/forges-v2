import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DossiersList from '../DossiersList';
import { inscriptionsApi } from '../../../../api/inscriptions.api';

vi.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { role: 'ADMIN' } }),
}));

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: async (fn, options = {}) => {
      const data = await fn();
      options.onSuccess?.(data);
      return data;
    },
    isLoading: false,
  }),
}));

vi.mock('../../../../api/inscriptions.api', () => ({
  inscriptionsApi: {
    getAllBackoffice: vi.fn(),
  },
}));

describe('DossiersList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inscriptionsApi.getAllBackoffice.mockResolvedValue({
      data: [
        {
          id: 'd-1',
          statut: 'PAYE_DIRECTEMENT',
          created_at: '2026-05-10T00:00:00.000Z',
          apprenant: { nom: 'Cisse', prenoms: 'Tidiane' },
          formation: { intitule: 'Formation test' },
        },
      ],
      meta: { page: 1, totalPages: 1, total: 1 },
    });
  });

  it('n affiche plus la colonne paiement et expose le statut dossier clarifie', async () => {
    render(
      <BrowserRouter>
        <DossiersList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Formation test')).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Statut' })).toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: 'Paiement' })).not.toBeInTheDocument();
      expect(screen.getAllByText('Paiement requis').length).toBeGreaterThan(0);
    });
  });
});
