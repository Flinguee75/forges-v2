import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FormationsList from '../FormationsList';
import { formationsApi } from '../../../../api/formations.api';

vi.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { role: 'ADMIN' } }),
}));

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

vi.mock('../../../../api/formations.api', () => ({
  formationsApi: {
    getAllBackoffice: vi.fn(),
  },
}));

describe('FormationsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formationsApi.getAllBackoffice.mockResolvedValue({
      data: [
        {
          id: 'f-1',
          titre: 'Formation 1',
          description: 'Description 1',
          duree: 3,
          tarif: 100000,
          statut: 'ACTIVE',
          _count: { sessions: 2 },
        },
      ],
      meta: { page: 1, totalPages: 1, total: 1 },
    });
  });

  it('affiche la liste backoffice des formations alignée au runtime', async () => {
    render(
      <BrowserRouter>
        <FormationsList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Formation 1')).toBeInTheDocument();
      expect(screen.getByText('2 sessions')).toBeInTheDocument();
      expect(screen.getByText('1 formation')).toBeInTheDocument();
    });
  });
});
