import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VouchersList from '../VouchersList';
import vouchersApi from '../../../../api/vouchers.api';

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

vi.mock('../../../../api/vouchers.api', () => ({
  default: {
    getAll: vi.fn(),
  },
}));

describe('VouchersList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vouchersApi.getAll.mockResolvedValue({
      data: [
        { id: 'v-1', code: 'CODE-1', type: 'PROMOTIONNEL', statut: 'BROUILLON', quota_max: 10, quota_utilise: 2, formation: { intitule: 'Formation 1' } },
      ],
      meta: { total: 1, page: 1, totalPages: 1 },
    });
  });

  it('affiche la liste vouchers alignée au runtime', async () => {
    render(<BrowserRouter><VouchersList /></BrowserRouter>);

    await waitFor(() => {
      expect(screen.getByText('CODE-1')).toBeInTheDocument();
      expect(screen.getByText('Formation 1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Creer un voucher promo/i })).toBeInTheDocument();
    });
  });
});
