import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import VoucherDetail from '../VoucherDetail';
import vouchersApi from '../../../../api/vouchers.api';

const state = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'v-1' }),
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

vi.mock('../../../../hooks/useToast', () => ({
  useToast: () => ({ showToast: state.showToast }),
}));

vi.mock('../../../../api/vouchers.api', () => ({
  default: {
    getById: vi.fn(),
    valider: vi.fn(),
    refuser: vi.fn(),
  },
}));

describe('VoucherDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vouchersApi.getById.mockResolvedValue({
      id: 'v-1',
      code: 'V-1',
      type: 'PROMOTIONNEL',
      statut: 'BROUILLON',
      quota_max: 10,
      quota_utilise: 2,
      formation: { intitule: 'Formation 1' },
    });
    vouchersApi.valider.mockResolvedValue({ id: 'v-1', statut: 'ACTIF' });
    vouchersApi.refuser.mockResolvedValue({ id: 'v-1', statut: 'REFUSE' });
  });

  it('affiche le détail et valide le voucher via le runtime', async () => {
    const user = userEvent.setup();
    render(<BrowserRouter><VoucherDetail /></BrowserRouter>);

    await waitFor(() => expect(screen.getByText('V-1')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Valider/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Valider/i }));

    await waitFor(() => {
      expect(vouchersApi.valider).toHaveBeenCalledWith('v-1');
    });
  });
});
