import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GestionApprenantsB2B from '../GestionApprenantsB2B';
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
  }),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

describe('GestionApprenantsB2B', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(organisationApiModule.organisationApi, 'getMembres').mockResolvedValue({
      data: [],
      meta: { page: 1, totalPages: 1, total: 0 },
    });
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
      nb_actifs: 0,
      nb_max: 10,
      ratio_utilisation: 0,
      progress_variant: 'success',
    });
    vi.spyOn(organisationApiModule.organisationApi, 'importB2BMembres').mockResolvedValue({
      imported: 0,
      linked: 0,
      skipped: 0,
      errors: [],
    });
  });

  it('affiche les erreurs de validation CSV avant envoi API', async () => {
    render(
      <BrowserRouter>
        <GestionApprenantsB2B />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Import CSV B2B/)).toBeInTheDocument();
    });

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['email,nom,prenom\nbad-email,Bad,Format'], 'members.csv', {
      type: 'text/csv',
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Erreurs détectées/)).toBeInTheDocument();
      expect(screen.getByText(/Email invalide/)).toBeInTheDocument();
    });

    expect(organisationApiModule.organisationApi.importB2BMembres).not.toHaveBeenCalled();
  });
});
