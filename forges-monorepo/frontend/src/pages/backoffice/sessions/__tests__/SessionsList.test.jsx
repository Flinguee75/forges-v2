import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SessionsList from '../SessionsList';
import { sessionsApi } from '../../../../api/sessions.api';
import { formationsApi } from '../../../../api/formations.api';

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

vi.mock('../../../../api/sessions.api', () => ({
  sessionsApi: {
    getBackofficeList: vi.fn(),
  },
}));

vi.mock('../../../../api/formations.api', () => ({
  formationsApi: {
    getAllBackoffice: vi.fn(),
  },
}));

describe('SessionsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formationsApi.getAllBackoffice.mockResolvedValue({
      data: [{ id: 'f-1', titre: 'Formation 1' }],
      meta: { page: 1, totalPages: 1, total: 1 },
    });
    sessionsApi.getBackofficeList.mockResolvedValue({
      data: [
        {
          id: 's-1',
          formation: { id: 'f-1', titre: 'Formation 1' },
          date_ouverture: '2026-06-01T00:00:00.000Z',
          date_cloture: '2026-06-02T00:00:00.000Z',
          date_debut: '2026-06-03T00:00:00.000Z',
          date_fin: '2026-06-04T00:00:00.000Z',
          capacite: 20,
          statut: 'OUVERTE',
          _count: { dossiers: 7 },
        },
      ],
      meta: { page: 1, totalPages: 1, total: 1 },
    });
  });

  it('affiche la liste backoffice des sessions alignée au runtime', async () => {
    render(
      <BrowserRouter>
        <SessionsList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Formation 1').length).toBeGreaterThan(0);
      expect(screen.getByText('7 / 20 inscrits')).toBeInTheDocument();
      expect(screen.getByText('1 session')).toBeInTheDocument();
      expect(screen.getByText('13 places restantes — 35% rempli')).toBeInTheDocument();
    });
  });

  it('clamp les places restantes à zéro quand la session est surcapacitaire', async () => {
    sessionsApi.getBackofficeList.mockResolvedValueOnce({
      data: [
        {
          id: 's-2',
          formation: { id: 'f-1', titre: 'Formation 1' },
          date_ouverture: '2026-06-05T00:00:00.000Z',
          date_cloture: '2026-06-06T00:00:00.000Z',
          date_debut: '2026-06-07T00:00:00.000Z',
          date_fin: '2026-06-08T00:00:00.000Z',
          capacite: 20,
          statut: 'OUVERTE',
          _count: { dossiers: 25 },
        },
      ],
      meta: { page: 1, totalPages: 1, total: 1 },
    });

    render(
      <BrowserRouter>
        <SessionsList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('0 places restantes — 125% rempli')).toBeInTheDocument();
    });
  });
});
