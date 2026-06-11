import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SessionDetail from '../SessionDetail';
import { sessionsApi } from '../../../../api/sessions.api';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 's-1' }),
  };
});

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn(async (fn, options) => {
      try {
        const data = await fn();
        options?.onSuccess?.(data);
        return data;
      } catch (err) {
        options?.onError?.(err);
        throw err;
      }
    }),
    isLoading: false,
    error: null,
  }),
}));

const showToast = vi.fn();

vi.mock('../../../../hooks/useToast', () => ({
  useToast: () => ({
    showToast,
  }),
}));

vi.mock('../../../../api/sessions.api', () => ({
  sessionsApi: {
    getById: vi.fn(),
    getDossiers: vi.fn(),
    cloturerManuellement: vi.fn(),
    annuler: vi.fn(),
  },
}));

describe('SessionDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    showToast.mockClear();
    sessionsApi.getById.mockResolvedValue({
      data: {
        id: 's-1',
        formation: { id: 'f-1', titre: 'Formation 1' },
        date_ouverture: '2026-06-01T00:00:00.000Z',
        date_cloture: '2026-06-02T00:00:00.000Z',
        date_debut: '2026-06-03T00:00:00.000Z',
        date_fin: '2026-06-04T00:00:00.000Z',
        capacite: 20,
        statut: 'EN_COURS',
        _count: { dossiers: 7 },
      },
    });
    sessionsApi.getDossiers.mockResolvedValue({
      data: [
        {
          id: 'd-1',
          statut: 'GRIS',
          apprenant: { prenoms: 'Awa', nom: 'Diop', email: 'awa@test.com' },
        },
      ],
    });
    sessionsApi.cloturerManuellement.mockResolvedValue({ data: { id: 's-1', statut: 'CLOTUREE' } });
    sessionsApi.annuler.mockResolvedValue({ data: { id: 's-1', statut: 'ANNULEE' } });
  });

  it('affiche le détail et clôture la session via le runtime', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <SessionDetail />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Formation 1').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /Modifier/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Clôturer/i })).toBeInTheDocument();
      expect(screen.getByText('Awa Diop')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Clôturer/i }));

    await waitFor(() => {
      expect(sessionsApi.cloturerManuellement).toHaveBeenCalledWith('s-1');
      expect(sessionsApi.getDossiers).toHaveBeenCalledWith('s-1');
    });
  });

  it('affiche une erreur claire quand l annulation échoue', async () => {
    const user = userEvent.setup();
    sessionsApi.annuler.mockRejectedValue({
      response: { data: { error: 'INVALID_STATUT', message: 'La session ne peut pas être annulée.' } },
    });
    sessionsApi.getById.mockResolvedValueOnce({
      data: {
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
    });

    render(
      <BrowserRouter>
        <SessionDetail />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Annuler/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Annuler/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('La session ne peut pas être annulée.', 'error');
    });
  });
});
