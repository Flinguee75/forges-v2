import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MonProfilPage from '../MonProfilPage';
import * as etudiantApi from '../../../api/espace-etudiant.api';

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com', role: 'APPRENANT' },
    setUser: vi.fn(),
    updateUser: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: async (fn, options) => {
      try {
        const result = await fn();
        options?.onSuccess?.(result);
        return result;
      } catch (error) {
        options?.onError?.(error);
        throw error;
      }
    },
    isLoading: false,
  }),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

const mockProfileData = {
  id: '1',
  email: 'john.doe@example.com',
  nom: 'Doe',
  prenom: 'John',
  telephone: '+221771234567',
  pays_residence: 'SN',
  type_apprenant: 'PROFESSIONNEL',
  secteur_activite: 'Informatique',
  statut: 'ACTIF',
  createdAt: '2024-01-01',
};

describe('MonProfilPage - Checklist Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(etudiantApi.etudiantApi, 'getProfil').mockResolvedValue(mockProfileData);
    vi.spyOn(etudiantApi.etudiantApi, 'updateProfil').mockResolvedValue({
      ...mockProfileData,
      nom: 'Smith',
      prenom: 'Jane',
      telephone: '+221779876543',
    });
  });

  it('affiche les informations du profil', async () => {
    render(
      <BrowserRouter>
        <MonProfilPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('john.doe@example.com').length).toBeGreaterThan(1);
      expect(screen.getByText('Doe')).toBeInTheDocument();
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('SN')).toBeInTheDocument();
    });
  });

  it('permet de passer en mode édition', async () => {
    render(
      <BrowserRouter>
        <MonProfilPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const modifierButton = screen.getByText('Modifier');
      expect(modifierButton).toBeInTheDocument();
      fireEvent.click(modifierButton);
    });

    // Vérifie que les champs de formulaire apparaissent
    await waitFor(() => {
      const nomInputs = screen.getAllByLabelText(/Nom/i);
      const prenomInputs = screen.getAllByLabelText(/Prénom/i);
      const paysInputs = screen.getAllByTestId('profil-pays-residence');
      expect(nomInputs.length).toBeGreaterThan(0);
      expect(prenomInputs.length).toBeGreaterThan(0);
      expect(paysInputs.length).toBeGreaterThan(0);
    });
  });

  it('permet de modifier le nom, prénom et pays', async () => {
    render(
      <BrowserRouter>
        <MonProfilPage />
      </BrowserRouter>
    );

    // Passer en mode édition
    await waitFor(() => {
      const modifierButton = screen.getByText('Modifier');
      fireEvent.click(modifierButton);
    });

    // Modifier les champs - utilise getAllByLabelText puis prend le premier (l'input)
    await waitFor(() => {
      const nomInputs = screen.getAllByLabelText(/Nom/i);
      const prenomInputs = screen.getAllByLabelText(/Prénom/i);
      const paysInputs = screen.getAllByTestId('profil-pays-residence');

      const nomInput = nomInputs[0];
      const prenomInput = prenomInputs[0];
      const paysInput = paysInputs[0];

      fireEvent.change(nomInput, { target: { value: 'Smith' } });
      fireEvent.change(prenomInput, { target: { value: 'Jane' } });
      fireEvent.change(paysInput, { target: { value: 'CI' } });

      expect(nomInput.value).toBe('Smith');
      expect(prenomInput.value).toBe('Jane');
      expect(paysInput.value).toBe('CI');
    });
  });

  it('permet d\'enregistrer les modifications', async () => {
    render(
      <BrowserRouter>
        <MonProfilPage />
      </BrowserRouter>
    );

    // Passer en mode édition
    await waitFor(() => {
      const modifierButton = screen.getByText('Modifier');
      fireEvent.click(modifierButton);
    });

    // Modifier et enregistrer
    await waitFor(() => {
      const nomInputs = screen.getAllByLabelText(/Nom/i);
      const nomInput = nomInputs[0];
      fireEvent.change(nomInput, { target: { value: 'Smith' } });

      const enregistrerButton = screen.getByText('Enregistrer');
      fireEvent.click(enregistrerButton);
    });

    // Vérifie que l'API a été appelée
    await waitFor(() => {
      expect(etudiantApi.etudiantApi.updateProfil).toHaveBeenCalled();
    });
  });

  it('permet d\'annuler les modifications', async () => {
    render(
      <BrowserRouter>
        <MonProfilPage />
      </BrowserRouter>
    );

    // Passer en mode édition
    await waitFor(() => {
      const modifierButton = screen.getByText('Modifier');
      fireEvent.click(modifierButton);
    });

    // Annuler
    await waitFor(() => {
      const annulerButton = screen.getByText('Annuler');
      fireEvent.click(annulerButton);
    });

    // Vérifie que le mode édition est fermé
    await waitFor(() => {
      expect(screen.queryByLabelText(/Nom/i)).not.toBeInTheDocument();
      expect(screen.getByText('Modifier')).toBeInTheDocument();
    });
  });

  it('affiche le type d\'apprenant et le secteur d\'activité', async () => {
    render(
      <BrowserRouter>
        <MonProfilPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Professionnel')).toBeInTheDocument();
      expect(screen.getByText('Informatique')).toBeInTheDocument();
    });
  });

  it('affiche le statut du compte', async () => {
    render(
      <BrowserRouter>
        <MonProfilPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Actif')).toBeInTheDocument();
    });
  });
});
