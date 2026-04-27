import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import VoucherForm from '../VoucherForm';
import vouchersApi from '../../../../api/vouchers.api';
import formationsApi from '../../../../api/formations.api';

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

vi.mock('../../../../api/formations.api', () => ({
  default: {
    getAllBackoffice: vi.fn(),
  },
}));

vi.mock('../../../../api/vouchers.api', () => ({
  default: {
    createPromotionnel: vi.fn(),
  },
}));

describe('VoucherForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formationsApi.getAllBackoffice.mockResolvedValue({
      data: [{ id: 'f-1', titre: 'Formation 1' }],
      meta: { total: 1, page: 1, totalPages: 1 },
    });
    vouchersApi.createPromotionnel.mockResolvedValue({
      id: 'v-1',
      code: 'V-1',
      statut: 'BROUILLON',
    });
  });

  it('crée un voucher promotionnel avec le runtime', async () => {
    const user = userEvent.setup();

    render(<BrowserRouter><VoucherForm /></BrowserRouter>);

    await waitFor(() => expect(screen.getByText('Formation 1')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Créer le voucher/i }));

    await waitFor(() => {
      expect(vouchersApi.createPromotionnel).toHaveBeenCalled();
    });
  });
});
