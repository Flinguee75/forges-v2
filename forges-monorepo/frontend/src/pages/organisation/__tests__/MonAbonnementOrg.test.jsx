import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MonAbonnementOrg from '../MonAbonnementOrg';
import * as organisationApiModule from '../../../api/espace-organisation.api';

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn(async (fn, options) => {
      try {
        const data = await fn();
        options?.onSuccess?.(data);
        return data;
      } catch (error) {
        options?.onError?.(error);
        throw error;
      }
    }),
    isLoading: false,
    error: null,
    reset: vi.fn(),
  }),
}));

describe('MonAbonnementOrg', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(organisationApiModule.organisationApi, 'getAbonnementOrganisation').mockResolvedValue({
      id: 'abo-org-1',
      statut: 'ESSAI',
      is_trial: true,
      offre: 'BASIQUE',
      date_fin_essai: '2026-04-10T00:00:00.000Z',
      date_renouvellement: null,
      montant_annuel: 0,
      jours_restants_essai: 7,
      welcome_offer_active: true,
      welcome_offer_pct: 20,
      welcome_offer_expires_at: '2026-04-12T00:00:00.000Z',
      can_subscribe: true,
    });
    vi.spyOn(organisationApiModule.organisationApi, 'souscrireOrganisation').mockResolvedValue({});
  });

  it('affiche le statut d essai et l offre bienvenue', async () => {
    render(
      <BrowserRouter>
        <MonAbonnementOrg />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Essai gratuit').length).toBeGreaterThan(0);
      expect(screen.getByText(/Offre bienvenue -20%/)).toBeInTheDocument();
      expect(screen.getByText(/7 jour\(s\) restant\(s\)/)).toBeInTheDocument();
    });
  });

  it('affiche explicitement quand aucun abonnement n est souscrit', async () => {
    organisationApiModule.organisationApi.getAbonnementOrganisation.mockRejectedValueOnce({
      code: 'NOT_FOUND',
      statusCode: 404,
    });

    render(
      <BrowserRouter>
        <MonAbonnementOrg />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Aucun abonnement actif')).toBeInTheDocument();
      expect(screen.getByText(/Aucune offre n['’]est sélectionnée pour le moment/i)).toBeInTheDocument();
    });
  });

  it('affiche les montants Organisation en XOF sans conversion centimes', async () => {
    organisationApiModule.organisationApi.getAbonnementOrganisation.mockResolvedValueOnce({
      id: 'abo-org-2',
      statut: 'ACTIF',
      is_trial: false,
      offre: 'PRO',
      date_renouvellement: '2027-04-01T00:00:00.000Z',
      montant_annuel_xof: 150000,
      montant_annuel: 150000,
      can_subscribe: false,
    });

    render(
      <BrowserRouter>
        <MonAbonnementOrg />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('150 000 FCFA').length).toBeGreaterThan(0);
      expect(screen.queryByText('1 500 000 FCFA')).not.toBeInTheDocument();
      expect(screen.queryByText('1 500 FCFA')).not.toBeInTheDocument();
    });
  });
});
