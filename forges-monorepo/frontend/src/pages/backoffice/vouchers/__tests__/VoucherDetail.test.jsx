import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import VoucherDetail from '../VoucherDetail';
import vouchersApi from '../../../../api/vouchers.api';

const state = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

const baseVoucher = {
  id: 'v-1',
  code: 'V-1',
  type: 'PROMOTIONNEL',
  statut: 'BROUILLON',
  type_valeur: 'POURCENTAGE',
  valeur: 25,
  quota_max: 10,
  quota_utilise: 2,
  quota_restant: 8,
  date_expiration: '2026-12-31',
  created_at: '2026-05-14T08:30:00.000Z',
  valide_le: '2026-05-14T09:00:00.000Z',
  valide_par: 'user-superviseur-1',
  motif_refus: null,
  cree_par: 'user-admin-1',
  devis_id: 'devis-1',
  formation: { intitule: 'Formation 1' },
  organisation: { raison_sociale: 'Organisation Test' },
  apporteur: null,
};

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
    vouchersApi.getById.mockResolvedValue(baseVoucher);
    vouchersApi.valider.mockResolvedValue({ ...baseVoucher, statut: 'ACTIF' });
    vouchersApi.refuser.mockResolvedValue({ ...baseVoucher, statut: 'REFUSE' });
  });

  it('affiche le détail complet du voucher promotionnel', async () => {
    render(<BrowserRouter><VoucherDetail /></BrowserRouter>);

    await waitFor(() => expect(screen.getByText('V-1')).toBeInTheDocument());

    expect(screen.getByText('Informations générales')).toBeInTheDocument();
    expect(screen.getByText('Quota et dates')).toBeInTheDocument();
    expect(screen.getByText('Traçabilité')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
    expect(screen.getByText('Formation 1')).toBeInTheDocument();
    expect(screen.getAllByText('Pourcentage')).toHaveLength(2);
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('31 décembre 2026')).toBeInTheDocument();
    expect(screen.getByText('Organisation Test')).toBeInTheDocument();
    expect(screen.getByText('devis-1')).toBeInTheDocument();
    expect(screen.getByText('user-admin-1')).toBeInTheDocument();
    expect(screen.getByText('user-superviseur-1')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Valider/i })).toBeInTheDocument();
  });

  it('formate aussi une réduction en montant fixe', async () => {
    vouchersApi.getById.mockResolvedValueOnce({
      ...baseVoucher,
      type_valeur: 'MONTANT',
      valeur: 5000,
    });

    render(<BrowserRouter><VoucherDetail /></BrowserRouter>);

    await waitFor(() => expect(screen.getByText('V-1')).toBeInTheDocument());
    expect(screen.getAllByText('Montant fixe')).toHaveLength(2);
    expect(screen.getByText('50 FCFA')).toBeInTheDocument();
  });

  it('valide le voucher via le runtime', async () => {
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
