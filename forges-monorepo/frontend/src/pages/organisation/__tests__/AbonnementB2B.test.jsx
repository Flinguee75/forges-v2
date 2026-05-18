import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AbonnementB2B from '../AbonnementB2B';
import * as organisationApiModule from '../../../api/espace-organisation.api';

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn(async (fn, options) => {
      const data = await fn();
      options?.onSuccess?.(data);
      return data;
    }),
    isLoading: false,
    error: null,
    reset: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

describe('AbonnementB2B', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(organisationApiModule.organisationApi, 'getAbonnementOrganisation').mockResolvedValue({
      id: 'abo-org-1',
      statut: 'ACTIF',
      is_trial: false,
      offre: 'PRO',
    });
    vi.spyOn(organisationApiModule.organisationApi, 'getAbonnementB2B').mockResolvedValue({
      id: 'b2b-1',
      exists: true,
      statut: 'ACTIF',
      palier: 'BUSINESS',
      nb_actifs: 25,
      nb_max: 25,
      ratio_utilisation: 1,
      progress_variant: 'danger',
      downgrade_planifie: 'STARTER',
      downgrade_message: 'Effectif au renouvellement',
      message: 'Le palier est atteint. Une montée en palier est recommandée.',
      montant_annuel_xof: 500000,
      montant_annuel: 500000,
      date_renouvellement: '2027-04-01T00:00:00.000Z',
    });
    vi.spyOn(organisationApiModule.organisationApi, 'changerPalierB2B').mockResolvedValue({});
    vi.spyOn(organisationApiModule.organisationApi, 'souscrireB2B').mockResolvedValue({});
    vi.spyOn(organisationApiModule.organisationApi, 'getMembres').mockResolvedValue({
      data: [],
      meta: { page: 1, totalPages: 1, total: 0 },
    });
  });

  it('affiche la progression, la recommandation de montee et le message de descente planifiee', async () => {
    render(
      <BrowserRouter>
        <AbonnementB2B />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('25 / 25', { selector: 'p.text-xl.font-semibold.text-text' })).toBeInTheDocument();
      expect(screen.getAllByText(/Effectif au renouvellement/).length).toBeGreaterThan(0);
      expect(screen.getByText(/palier est atteint/i)).toBeInTheDocument();
    });
  });

  it('affiche les montants B2B en XOF sans conversion centimes', async () => {
    render(
      <BrowserRouter>
        <AbonnementB2B />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('500 000 FCFA').length).toBeGreaterThan(0);
      expect(screen.queryByText('5 000 FCFA')).not.toBeInTheDocument();
      expect(screen.queryByText('5 000 000 FCFA')).not.toBeInTheDocument();
    });
  });
});
