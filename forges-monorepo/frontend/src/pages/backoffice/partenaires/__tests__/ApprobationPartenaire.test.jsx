import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ApprobationPartenaire from '../ApprobationPartenaire';
import partenairesApi from '../../../../api/partenaires.api';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'p-1' }),
  };
});

const state = vi.hoisted(() => ({
  showToast: vi.fn(),
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

vi.mock('../../../../hooks/useToast', () => ({
  useToast: () => ({ showToast: state.showToast }),
}));

vi.mock('../../../../api/partenaires.api', () => ({
  default: {
    getPartenaireAdmin: vi.fn(),
    approuverPartenaire: vi.fn(),
    refuserPartenaire: vi.fn(),
    suspendrePartenaire: vi.fn(),
    reactiverPartenaire: vi.fn(),
  },
}));

describe('ApprobationPartenaire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    partenairesApi.getPartenaireAdmin.mockResolvedValue({
      id: 'p-1',
      raison_sociale: 'Tech Formation',
      statut: 'EN_ATTENTE_VERIFICATION',
      type: 'ONG',
      email_principal: 'p@example.com',
      responsable_designe_id: 'resp-1',
    });
    partenairesApi.approuverPartenaire.mockResolvedValue({ statut: 'ACTIF' });
    partenairesApi.refuserPartenaire.mockResolvedValue({ statut: 'REJETE' });
    partenairesApi.suspendrePartenaire.mockResolvedValue({ statut: 'SUSPENDU' });
    partenairesApi.reactiverPartenaire.mockResolvedValue({ statut: 'ACTIF' });
  });

  it('permet de traiter un partenaire via le runtime', async () => {
    const user = userEvent.setup();

    render(<BrowserRouter><ApprobationPartenaire /></BrowserRouter>);

    await waitFor(() => expect(screen.getByText('Tech Formation')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Approuver/i }));

    await waitFor(() => {
      expect(partenairesApi.approuverPartenaire).toHaveBeenCalledWith('p-1', { responsable_designe_id: 'resp-1' });
    });
  });
});
