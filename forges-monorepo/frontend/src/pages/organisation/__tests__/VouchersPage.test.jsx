import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import VouchersPage from '../VouchersPage';
import * as organisationApi from '../../../api/espace-organisation.api';

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn((fn, options) => {
      fn().then((data) => options?.onSuccess?.(data));
    }),
    isLoading: false,
  }),
}));

const mockVouchersData = {
  data: [
    {
      id: '1',
      code: 'VOUCHER-001',
      formation: { titre: 'Formation React' },
      valeur: 50000, // centimes → 500 FCFA
      type_valeur: 'MONTANT',
      quota_utilise: 3,
      quota_max: 10,
      date_expiration: '2025-12-31',
      statut: 'ACTIF',
    },
    {
      id: '2',
      code: 'VOUCHER-002',
      formation: { titre: 'Formation Node.js' },
      valeur: 20, // 20%
      type_valeur: 'POURCENTAGE',
      quota_utilise: 10,
      quota_max: 10,
      date_expiration: '2025-06-30',
      statut: 'EPUISE',
    },
    {
      id: '3',
      code: 'VOUCHER-003',
      formation: { titre: 'Formation TypeScript' },
      valeur: 30000, // centimes → 300 FCFA
      type_valeur: 'MONTANT',
      quota_utilise: 5,
      quota_max: 20,
      date_expiration: '2024-12-31',
      statut: 'EXPIRE',
    },
  ],
  meta: {
    page: 1,
    totalPages: 1,
    total: 3,
  },
};

describe('VouchersPage - Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(organisationApi.organisationApi, 'getVouchers').mockResolvedValue(
      mockVouchersData
    );
  });

  it('affiche la liste des vouchers', async () => {
    render(
      <BrowserRouter>
        <VouchersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('VOUCHER-001')).toBeInTheDocument();
      expect(screen.getByText('VOUCHER-002')).toBeInTheDocument();
      expect(screen.getByText('VOUCHER-003')).toBeInTheDocument();
    });
  });

  it('affiche le nombre total de vouchers', async () => {
    render(
      <BrowserRouter>
        <VouchersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('3 vouchers')).toBeInTheDocument();
    });
  });

  it('affiche le filtre statut', async () => {
    render(
      <BrowserRouter>
        <VouchersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Statut:')).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });
  });

  it('affiche les badges de statut correctement', async () => {
    render(
      <BrowserRouter>
        <VouchersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Actif')).toBeInTheDocument();
      expect(screen.getByText('Épuisé')).toBeInTheDocument();
      expect(screen.getByText('Expiré')).toBeInTheDocument();
    });
  });

  it('affiche la barre de progression du quota', async () => {
    render(
      <BrowserRouter>
        <VouchersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Check for quota display format "X / Y"
      expect(screen.getByText(/3.*\/.*10/)).toBeInTheDocument();
      expect(screen.getByText(/10.*\/.*10/)).toBeInTheDocument();
      expect(screen.getByText(/5.*\/.*20/)).toBeInTheDocument();
    });
  });

  it('formate correctement les montants et pourcentages', async () => {
    render(
      <BrowserRouter>
        <VouchersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // MONTANT type should show FCFA
      expect(screen.getByText(/500.*FCFA/)).toBeInTheDocument();
      expect(screen.getByText(/300.*FCFA/)).toBeInTheDocument();

      // POURCENTAGE type should show %
      expect(screen.getByText('20%')).toBeInTheDocument();
    });
  });

  it('permet de filtrer par statut', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <VouchersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'ACTIF');

    expect(organisationApi.organisationApi.getVouchers).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'ACTIF' })
    );
  });

  it('affiche la pagination si nécessaire', async () => {
    const mockMultiPageData = {
      ...mockVouchersData,
      meta: { page: 1, totalPages: 3, total: 30 },
    };

    organisationApi.organisationApi.getVouchers.mockResolvedValueOnce(mockMultiPageData);

    render(
      <BrowserRouter>
        <VouchersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Pagination component should be rendered when totalPages > 1
      expect(screen.getByText('30 vouchers')).toBeInTheDocument();
    });
  });
});
