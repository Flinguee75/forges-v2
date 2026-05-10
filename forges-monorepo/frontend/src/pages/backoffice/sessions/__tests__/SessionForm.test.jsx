import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SessionForm from '../SessionForm';
import { sessionsApi } from '../../../../api/sessions.api';
import { formationsApi } from '../../../../api/formations.api';

const mockNavigate = vi.fn();

function toDateTimeLocal(value) {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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
    getById: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../../../api/formations.api', () => ({
  formationsApi: {
    getAllBackoffice: vi.fn(),
  },
}));

describe('SessionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formationsApi.getAllBackoffice.mockResolvedValue({
      data: [{ id: 'f-1', titre: 'Formation 1' }],
      meta: { page: 1, totalPages: 1, total: 1 },
    });
    sessionsApi.getById.mockResolvedValue({
      data: {
        id: 's-1',
        formation: { id: 'f-1', titre: 'Formation 1' },
        formation_id: 'f-1',
        date_ouverture: '2026-06-01T10:00:00.000Z',
        date_cloture: '2026-06-02T10:00:00.000Z',
        date_debut: '2026-06-03T10:00:00.000Z',
        date_fin: '2026-06-04T10:00:00.000Z',
        capacite: 20,
      },
    });
  });

  it('préremplit les champs lors de l édition', async () => {
    const dateOuverture = toDateTimeLocal('2026-06-01T10:00:00.000Z');
    const dateCloture = toDateTimeLocal('2026-06-02T10:00:00.000Z');
    const dateDebut = toDateTimeLocal('2026-06-03T10:00:00.000Z');
    const dateFin = toDateTimeLocal('2026-06-04T10:00:00.000Z');

    render(
      <BrowserRouter>
        <SessionForm />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Formation 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue(dateOuverture)).toBeInTheDocument();
      expect(screen.getByDisplayValue(dateCloture)).toBeInTheDocument();
      expect(screen.getByDisplayValue(dateDebut)).toBeInTheDocument();
      expect(screen.getByDisplayValue(dateFin)).toBeInTheDocument();
      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    });
  });
});
