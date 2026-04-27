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
});
