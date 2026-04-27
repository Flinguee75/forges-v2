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
    {
      id: '2',
      reference: 'PAY-002',
      methode_paiement: 'MOBILE_MONEY',
      montant: 50000, // 500 FCFA
      dossier: {
        etudiant: {
          prenom: 'Marie',
          nom: 'Martin',
        },
        session: {
          formation: {
            titre: 'Formation Node.js',
          },
        },
      },
      statut: 'EN_ATTENTE',
      created_at: '2025-01-20T14:30:00Z',
    },
    {
      id: '3',
      reference: 'PAY-003',
      methode_paiement: 'CARTE',
      montant: 75000, // 750 FCFA
      dossier: {
        etudiant: {
          prenom: 'Paul',
          nom: 'Bernard',
        },
        session: {
          formation: {
            titre: 'Formation TypeScript',
          },
        },
      },
      statut: 'ECHOUE',
      created_at: '2025-01-18T09:15:00Z',
    },
  ],
  meta: {
    page: 1,
    totalPages: 1,
    total: 3,
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
      expect(screen.getByText('PAY-002')).toBeInTheDocument();
      expect(screen.getByText('PAY-003')).toBeInTheDocument();
    });
  });

  it('affiche le nombre total de paiements', async () => {
    render(
      <BrowserRouter>
        <PaiementsOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('3 paiements')).toBeInTheDocument();
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
      expect(screen.getByText('En attente')).toBeInTheDocument();
      expect(screen.getByText('Échoué')).toBeInTheDocument();
    });
  });

  it('affiche le type de paiement (voucher vs autres)', async () => {
    render(
      <BrowserRouter>
        <PaiementsOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Voucher Organisation')).toBeInTheDocument();
      expect(screen.getByText('MOBILE_MONEY')).toBeInTheDocument();
      expect(screen.getByText('CARTE')).toBeInTheDocument();
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
      expect(screen.getByText(/500.*FCFA/)).toBeInTheDocument();
      expect(screen.getByText(/750.*FCFA/)).toBeInTheDocument();
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
      expect(screen.getByText('Marie Martin')).toBeInTheDocument();
      expect(screen.getByText('Paul Bernard')).toBeInTheDocument();
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
