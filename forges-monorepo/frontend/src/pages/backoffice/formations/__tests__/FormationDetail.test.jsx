import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import FormationDetail from '../FormationDetail';
import { formationsApi } from '../../../../api/formations.api';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'f-1' }),
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

vi.mock('../../../../api/formations.api', () => ({
  formationsApi: {
    getByIdBackoffice: vi.fn(),
    publier: vi.fn(),
    archiver: vi.fn(),
  },
}));

describe('FormationDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formationsApi.getByIdBackoffice.mockResolvedValue({
      data: {
        id: 'f-1',
        titre: 'Formation 1',
        description: 'Description 1',
        description_longue: 'Longue description',
        duree: 3,
        tarif: 100000,
        statut: 'BROUILLON',
        _count: { sessions: 2 },
      },
    });
    formationsApi.publier.mockResolvedValue({ data: { id: 'f-1', statut: 'ACTIVE' } });
    formationsApi.archiver.mockResolvedValue({ data: { id: 'f-1', statut: 'ARCHIVEE' } });
  });

  it('affiche le détail et archive la formation via le runtime', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <FormationDetail />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Formation 1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Publier/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Archiver/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Publier/i }));

    await waitFor(() => {
      expect(formationsApi.publier).toHaveBeenCalledWith('f-1');
    });

    await user.click(screen.getByRole('button', { name: /Archiver/i }));

    await waitFor(() => {
      expect(formationsApi.archiver).toHaveBeenCalledWith('f-1');
    });
  });
});
