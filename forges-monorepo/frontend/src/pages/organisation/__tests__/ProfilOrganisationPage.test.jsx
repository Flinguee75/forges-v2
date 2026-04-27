import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ProfilOrganisationPage from '../ProfilOrganisationPage';
import * as organisationApi from '../../../api/espace-organisation.api';

const mockToast = vi.fn();

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn(async (fn, options) => {
      try {
        const data = await fn();
        if (options?.onSuccess) {
          options.onSuccess(data);
        }
        return data;
      } catch (error) {
        if (options?.onError) {
          options.onError(error);
        }
        throw error;
      }
    }),
    isLoading: false,
  }),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: mockToast,
  }),
}));

const mockProfilData = {
  email: 'contact@organisation.com',
  type: 'ENTREPRISE',
  nom_legal: 'Organisation Test SARL',
  nom_commercial: 'OrgTest',
  identifiant_legal: 'CI-ABJ-2023-B-12345',
  secteur_activite: 'Technologies de l\'information',
  pays: 'CI',
  statut: 'ACTIVE',
  email_contact: 'contact@orgtest.com',
  telephone_contact: '+225 01 02 03 04 05',
  contact_referent: 'Kouassi Jean',
  langue_preferee: 'FR',
};

describe('ProfilOrganisationPage - Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(organisationApi.organisationApi, 'getProfil').mockResolvedValue(mockProfilData);
    vi.spyOn(organisationApi.organisationApi, 'updateProfil').mockResolvedValue(mockProfilData);
  });

  it('affiche les informations de l\'organisation', async () => {
    render(
      <BrowserRouter>
        <ProfilOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Organisation Test SARL')).toBeInTheDocument();
      expect(screen.getByText('OrgTest')).toBeInTheDocument();
      expect(screen.getByText('contact@organisation.com')).toBeInTheDocument();
      expect(screen.getByText('Technologies de l\'information')).toBeInTheDocument();
      expect(screen.getByText('CI-ABJ-2023-B-12345')).toBeInTheDocument();
    });
  });

  it('affiche le badge de statut', async () => {
    render(
      <BrowserRouter>
        <ProfilOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('affiche le bouton Modifier', async () => {
    render(
      <BrowserRouter>
        <ProfilOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Modifier')).toBeInTheDocument();
    });
  });

  it('passe en mode édition au clic sur Modifier', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <ProfilOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Modifier')).toBeInTheDocument();
    });

    const modifierButton = screen.getByText('Modifier');
    await user.click(modifierButton);

    // In edit mode, should see Enregistrer and Annuler buttons
    expect(screen.getByText('Enregistrer')).toBeInTheDocument();
    expect(screen.getByText('Annuler')).toBeInTheDocument();
    expect(screen.queryByText('Modifier')).not.toBeInTheDocument();
  });

  it('affiche tous les champs modifiables en mode édition', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <ProfilOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Modifier')).toBeInTheDocument();
    });

    const modifierButton = screen.getByText('Modifier');
    await user.click(modifierButton);

    // Wait for form to appear and check all editable fields are present
    // Labels may contain * for required fields, so use regex
    await waitFor(() => {
      expect(screen.getByLabelText(/Nom légal/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email de contact/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Contact référent/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Pays/i)).toBeInTheDocument();
      expect(screen.getByText('Langue préférée')).toBeInTheDocument();
    });
  });

  it('permet d\'annuler les modifications', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <ProfilOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Modifier')).toBeInTheDocument();
    });

    const modifierButton = screen.getByText('Modifier');
    await user.click(modifierButton);

    const annulerButton = screen.getByText('Annuler');
    await user.click(annulerButton);

    // Should return to view mode
    expect(screen.getByText('Modifier')).toBeInTheDocument();
    expect(screen.queryByText('Enregistrer')).not.toBeInTheDocument();
  });

  it('soumet les modifications au clic sur Enregistrer', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <ProfilOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Modifier')).toBeInTheDocument();
    });

    const modifierButton = screen.getByText('Modifier');
    await user.click(modifierButton);

    // Wait for form to appear
    const nomLegalInput = await screen.findByLabelText(/Nom légal/i);
    await user.clear(nomLegalInput);
    await user.type(nomLegalInput, 'Nouveau Nom SARL');

    const enregistrerButton = screen.getByText('Enregistrer');
    await user.click(enregistrerButton);

    await waitFor(() => {
      expect(organisationApi.organisationApi.updateProfil).toHaveBeenCalledWith(
        expect.objectContaining({
          nom_legal: 'Nouveau Nom SARL',
        })
      );
      expect(mockToast).toHaveBeenCalledWith('Profil mis à jour avec succès', 'success');
    });
  });

  it('affiche les sections organisées (Général, Contact, Référent)', async () => {
    render(
      <BrowserRouter>
        <ProfilOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Informations générales')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Référent' })).toBeInTheDocument();
      expect(screen.getByText('Kouassi Jean')).toBeInTheDocument();
    });
  });

  it('affiche le type d\'organisation formaté', async () => {
    render(
      <BrowserRouter>
        <ProfilOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // ENTREPRISE should be formatted as "Entreprise"
      expect(screen.getByText('Entreprise')).toBeInTheDocument();
    });
  });

  it('gère les champs optionnels (nom_commercial)', async () => {
    const mockProfilWithoutCommercial = {
      ...mockProfilData,
      nom_commercial: null,
    };

    organisationApi.organisationApi.getProfil.mockResolvedValueOnce(
      mockProfilWithoutCommercial
    );

    render(
      <BrowserRouter>
        <ProfilOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Check that the page renders with optional field as '-'
      const cells = screen.getAllByText('-');
      expect(cells.length).toBeGreaterThan(0);
    });
  });
});
