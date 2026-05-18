import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ProfilOrganisationPage from '../ProfilOrganisationPage';
import * as organisationApi from '../../../api/espace-organisation.api';
import * as authApi from '../../../api/auth.api';

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
  raison_sociale: 'Organisation Test SARL',
  identifiant_legal: 'CI-ABJ-2023-B-12345',
  pays: 'CI',
  statut: 'ACTIVE',
  contact_referent: 'Kouassi Jean-Baptiste Marie',
  langue_preferee: 'FR',
};

describe('ProfilOrganisationPage - Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(organisationApi.organisationApi, 'getProfil').mockResolvedValue(mockProfilData);
    vi.spyOn(organisationApi.organisationApi, 'updateProfil').mockResolvedValue(mockProfilData);
    vi.spyOn(authApi.authApi, 'changePassword').mockResolvedValue({
      message: 'Mot de passe modifié',
    });
  });

  it('affiche les informations de l\'organisation', async () => {
    render(
      <BrowserRouter>
        <ProfilOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Organisation Test SARL')).toBeInTheDocument();
      expect(screen.getByText('contact@organisation.com')).toBeInTheDocument();
      expect(screen.getByText('CI-ABJ-2023-B-12345')).toBeInTheDocument();
      expect(screen.getByText('Kouassi Jean-Baptiste Marie')).toBeInTheDocument();
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
      expect(screen.getByLabelText(/Raison sociale/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
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
    const nomLegalInput = await screen.findByLabelText(/Raison sociale/i);
    await user.clear(nomLegalInput);
    await user.type(nomLegalInput, 'Nouveau Nom SARL');

    const enregistrerButton = screen.getByText('Enregistrer');
    await user.click(enregistrerButton);

    await waitFor(() => {
      expect(organisationApi.organisationApi.updateProfil).toHaveBeenCalledWith(
        expect.objectContaining({
          raison_sociale: 'Nouveau Nom SARL',
          contact_referent: 'Kouassi Jean-Baptiste Marie',
        })
      );
      expect(mockToast).toHaveBeenCalledWith('Profil mis à jour avec succès', 'success');
    });
  });

  it('conserve les champs non modifiés affichés après une sauvegarde minimale', async () => {
    const user = userEvent.setup();
    organisationApi.organisationApi.updateProfil.mockResolvedValueOnce({
      ...mockProfilData,
      raison_sociale: 'Nouveau Nom SARL',
    });

    render(
      <BrowserRouter>
        <ProfilOrganisationPage />
      </BrowserRouter>
    );

    await user.click(await screen.findByText('Modifier'));

    const raisonSocialeInput = await screen.findByLabelText(/Raison sociale/i);
    await user.clear(raisonSocialeInput);
    await user.type(raisonSocialeInput, 'Nouveau Nom SARL');
    await user.click(screen.getByText('Enregistrer'));

    await waitFor(() => {
      expect(screen.getByText('Nouveau Nom SARL')).toBeInTheDocument();
      expect(screen.getByText('contact@organisation.com')).toBeInTheDocument();
      expect(screen.getByText('Kouassi Jean-Baptiste Marie')).toBeInTheDocument();
      expect(screen.getByText('CI-ABJ-2023-B-12345')).toBeInTheDocument();
    });
  });

  it('affiche les sections organisées (Général, Contact)', async () => {
    render(
      <BrowserRouter>
        <ProfilOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Informations générales')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument();
      expect(screen.getByText('Kouassi Jean-Baptiste Marie')).toBeInTheDocument();
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

  it('gère les champs optionnels (identifiant_legal)', async () => {
    const mockProfilWithoutLegalId = {
      ...mockProfilData,
      identifiant_legal: null,
    };

    organisationApi.organisationApi.getProfil.mockResolvedValueOnce(
      mockProfilWithoutLegalId
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

  it('permet de changer le mot de passe organisation', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <ProfilOrganisationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Modifier')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /changer le mot de passe/i }));

    await user.type(screen.getByLabelText(/mot de passe actuel/i), 'Current1!');
    await user.type(screen.getByLabelText(/^nouveau mot de passe/i), 'NewPassword1!');
    await user.type(screen.getByLabelText(/confirmer le nouveau mot de passe/i), 'NewPassword1!');
    await user.click(screen.getByRole('button', { name: /confirmer/i }));

    await waitFor(() => {
      expect(authApi.authApi.changePassword).toHaveBeenCalledWith('Current1!', 'NewPassword1!');
      expect(mockToast).toHaveBeenCalledWith('Mot de passe modifié avec succès', 'success');
    });
  });
});
