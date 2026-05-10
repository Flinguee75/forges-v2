import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import VoucherForm from '../VoucherForm';
import vouchersApi from '../../../../api/vouchers.api';
import formationsApi from '../../../../api/formations.api';
import devisApi from '../../../../api/devis.api';

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

vi.mock('../../../../api/devis.api', () => ({
  default: {
    getAll: vi.fn(),
  },
}));

vi.mock('../../../../api/vouchers.api', () => ({
  default: {
    createPromotionnel: vi.fn(),
    createOrganisation: vi.fn(),
  },
}));

describe('VoucherForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formationsApi.getAllBackoffice.mockResolvedValue({
      data: [{ id: 'f-1', titre: 'Formation 1' }],
      meta: { total: 1, page: 1, totalPages: 1 },
    });
    devisApi.getAll.mockResolvedValue({
      data: [
        {
          id: 'devis-1',
          numero_devis: 'FORGES-DEVIS-2026-001',
          organisation: { raison_sociale: 'Org Test' },
          formation: { intitule: 'Formation 1' },
        },
      ],
      meta: { total: 1, page: 1, totalPages: 1 },
    });
    vouchersApi.createPromotionnel.mockResolvedValue({
      id: 'v-1',
      code: 'V-1',
      statut: 'BROUILLON',
    });
    vouchersApi.createOrganisation.mockResolvedValue({
      id: 'v-2',
      code: 'V-2',
      statut: 'ACTIF',
    });
  });

  it('crée un voucher promotionnel avec le runtime', async () => {
    const user = userEvent.setup();

    render(<BrowserRouter><VoucherForm /></BrowserRouter>);

    await waitFor(() => expect(screen.getAllByText('Formation 1').length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: /Créer un voucher/i }));

    await waitFor(() => {
      expect(vouchersApi.createPromotionnel).toHaveBeenCalled();
    });
  });

  it('crée un voucher organisation lié à un devis avec le runtime', async () => {
    const user = userEvent.setup();

    render(<BrowserRouter><VoucherForm /></BrowserRouter>);

    await waitFor(() => expect(screen.getAllByText('Formation 1').length).toBeGreaterThan(0));
    await user.selectOptions(screen.getByLabelText(/Type de création/i), 'ORGANISATION');
    await user.selectOptions(screen.getByLabelText(/Devis source du voucher/i), 'devis-1');
    await user.click(screen.getByRole('button', { name: /Créer un voucher/i }));

    await waitFor(() => {
      expect(vouchersApi.createOrganisation).toHaveBeenCalledWith(
        expect.objectContaining({ devis_id: 'devis-1' })
      );
    });
    expect(await screen.findByText(/Voucher créé avec succès/i)).toBeInTheDocument();
    expect(screen.getByText(/Un e-mail de confirmation est envoyé à l’organisation/i)).toBeInTheDocument();
    expect(screen.getByText(/L’organisation recevra aussi le message associé au devis/i)).toBeInTheDocument();
  });
});
