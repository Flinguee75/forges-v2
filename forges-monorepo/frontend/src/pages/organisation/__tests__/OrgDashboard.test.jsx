import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OrgDashboard from '../OrgDashboard';
import * as organisationApi from '../../../api/espace-organisation.api';

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn((fn, options) => {
      fn().then((data) => options?.onSuccess?.(data));
    }),
    isLoading: false,
  }),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    showToast: vi.fn(),
  }),
}));

const mockDashboardData = {
  stats: {
    effectifs_inscrits: 25,
    budget_engage: 500000,
    vouchers_actifs: 5,
    total_employes: 30,
    b2b_utilisation_pct: 80,
  },
  recent_inscriptions: [
    {
      id: '1',
      statut: 'CONFIRME',
      etudiant: { prenom: 'Jean', nom: 'Dupont' },
      session: {
        formation: { titre: 'Formation JavaScript' },
        date_debut: '2025-02-01',
      },
    },
  ],
  recent_paiements: [
    {
      id: '1',
      montant: 50000,
      methode_paiement: 'VOUCHER_ORG',
      dossier: {
        etudiant: { prenom: 'Marie', nom: 'Martin' },
      },
      created_at: '2025-01-15',
    },
  ],
  subscription_summary: {
    organisation: {
      statut: 'ESSAI',
      offre: 'BASIQUE',
      created_at: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString(),
      date_fin_essai: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      welcome_offer_active: true,
      welcome_offer_expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    b2b: {
      palier: 'BUSINESS',
      nb_actifs: 25,
      nb_max: 25,
    },
  },
};

const mockFlatDashboardData = {
  stats: {
    effectifs_inscrits: 25,
    budget_engage: 500000,
    vouchers_actifs: 5,
    total_employes: 30,
    b2b_utilisation_pct: 80,
  },
  recent_inscriptions: [],
  recent_paiements: [],
  subscription_summary: null,
};

describe('OrgDashboard - Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(organisationApi.organisationApi, 'getDashboard').mockResolvedValue(
      mockDashboardData
    );
  });

  it('affiche les métriques clés du dashboard', async () => {
    render(
      <BrowserRouter>
        <OrgDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument(); // effectifs_inscrits
      expect(screen.getByText('5')).toBeInTheDocument(); // vouchers_actifs
      expect(screen.getByText('30')).toBeInTheDocument(); // total_employes
    });
  });

  it('affiche la consommation B2B', async () => {
    render(
      <BrowserRouter>
        <OrgDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
  });

  it('affiche les dernières inscriptions', async () => {
    render(
      <BrowserRouter>
        <OrgDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
      expect(screen.getByText('Formation JavaScript')).toBeInTheDocument();
    });
  });

  it('affiche les derniers paiements', async () => {
    render(
      <BrowserRouter>
        <OrgDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Marie Martin')).toBeInTheDocument();
      expect(screen.getByText('Voucher')).toBeInTheDocument();
    });
  });

  it('affiche les liens de navigation rapide', async () => {
    render(
      <BrowserRouter>
        <OrgDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Abonnement' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'B2B' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Vouchers' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Inscriptions' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Ouvrir le conseiller' })).not.toBeInTheDocument();
    });
  });

  it('gère le format sans subscription_summary', async () => {
    organisationApi.organisationApi.getDashboard.mockResolvedValueOnce(mockFlatDashboardData);

    render(
      <BrowserRouter>
        <OrgDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
    });
  });

  it('affiche le bandeau essai et la progression B2B lorsque le backend enrichit le dashboard', async () => {
    render(
      <BrowserRouter>
        <OrgDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Essai gratuit').length).toBeGreaterThan(0);
      expect(screen.getByText(/4 jours? restants/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Souscrire maintenant' })).toBeInTheDocument();
    });
  });
});
