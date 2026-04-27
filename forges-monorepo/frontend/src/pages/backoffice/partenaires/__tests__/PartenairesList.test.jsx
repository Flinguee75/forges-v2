import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PartenairesList from '../PartenairesList';
import partenairesApi from '../../../../api/partenaires.api';

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

vi.mock('../../../../api/partenaires.api', () => ({
  default: {
    getAllPartenaires: vi.fn(),
  },
}));

describe('PartenairesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    partenairesApi.getAllPartenaires.mockResolvedValue({
      data: [
        { id: 'p-1', raison_sociale: 'Tech Formation', email_principal: 'p@example.com', statut: 'ACTIF', counts: { formations: 2 }, created_at: '2026-01-01T00:00:00.000Z' },
      ],
      meta: { total: 1, page: 1, totalPages: 1 },
    });
  });

  it('affiche la liste admin des partenaires alignée au runtime', async () => {
    render(<BrowserRouter><PartenairesList /></BrowserRouter>);

    await waitFor(() => {
      expect(screen.getByText('Tech Formation')).toBeInTheDocument();
      expect(screen.getByText('p@example.com')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Inviter un partenaire/i })).toBeInTheDocument();
    });
  });
});
