import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import PaiementsOrganisationPage from '../PaiementsOrganisationPage';
import * as organisationApi from '../../../api/espace-organisation.api';

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn((fn, options) => {
      fn().then((data) => options?.onSuccess?.(data));
    }),
    isLoading: false,
  }),
}));

const mockPaiementsData = {
  data: [
    {
      id: '1',
      reference: 'PAY-001',
      methode_paiement: 'VOUCHER_ORG',
      montant: 100000, // 1000 FCFA
      dossier: {
        etudiant: {
          prenom: 'Jean',
          nom: 'Dupont',
        },
        session: {
          formation: {
            titre: 'Formation React',
          },
        },
      },
      statut: 'CONFIRME',
      created_at: '2025-01-15T10:00:00Z',
    },
  ],
  meta: {
    page: 1,
    totalPages: 1,
    total: 1,
  },
};

describe('PaiementsOrganisationPage - Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(organisationApi.organisationApi, 'getPaiements').mockResolvedValue(
      mockPaiementsData
    );
  });

  it('affiche la liste des paiements', async () => {
    render(
      <BrowserRouter>
        <PaiementsOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('PAY-001')).toBeInTheDocument();
    });
  });

  it('affiche le nombre total de paiements', async () => {
    render(
      <BrowserRouter>
        <PaiementsOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1 paiement')).toBeInTheDocument();
    });
  });

  it('affiche le filtre statut', async () => {
    render(
      <BrowserRouter>
        <PaiementsOrganisationPage />
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
        <PaiementsOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Confirmé')).toBeInTheDocument();
    });
  });

  it('affiche uniquement les paiements organisation', async () => {
    render(
      <BrowserRouter>
        <PaiementsOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Voucher Organisation')).toBeInTheDocument();
      expect(screen.queryByText('MOBILE_MONEY')).not.toBeInTheDocument();
      expect(screen.queryByText('CARTE')).not.toBeInTheDocument();
    });
  });

  it('formate correctement les montants', async () => {
    render(
      <BrowserRouter>
        <PaiementsOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Should display formatted amounts with thousand separators
      expect(screen.getByText(/1.*000.*FCFA/)).toBeInTheDocument();
    });
  });

  it('affiche les noms des employés', async () => {
    render(
      <BrowserRouter>
        <PaiementsOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    });
  });

  it('permet de filtrer par statut', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <PaiementsOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'CONFIRME');

    expect(organisationApi.organisationApi.getPaiements).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'CONFIRME' })
    );
  });

  it('affiche la pagination si nécessaire', async () => {
    const mockMultiPageData = {
      ...mockPaiementsData,
      meta: { page: 1, totalPages: 3, total: 30 },
    };

    organisationApi.organisationApi.getPaiements.mockResolvedValueOnce(mockMultiPageData);

    render(
      <BrowserRouter>
        <PaiementsOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('30 paiements')).toBeInTheDocument();
    });
  });
});
