import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import GestionEmployesPage from '../GestionEmployesPage';
import * as organisationApi from '../../../api/espace-organisation.api';

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
    showToast: vi.fn(),
  }),
}));

const mockMembresData = {
  data: [
    {
      id: '1',
      email: 'jean.dupont@example.com',
      nom: 'Dupont',
      prenom: 'Jean',
      statut: 'ACTIF',
      derniere_inscription: {
        id: 'dossier-1',
        statut: 'PAYE',
      },
    },
    {
      id: '2',
      email: 'marie.martin@example.com',
      nom: 'Martin',
      prenom: 'Marie',
      statut: 'ACTIF',
    },
  ],
  meta: {
    page: 1,
    totalPages: 1,
    total: 2,
  },
};

describe('GestionEmployesPage - Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(organisationApi.organisationApi, 'getMembres').mockResolvedValue(
      mockMembresData
    );
    vi.spyOn(organisationApi.organisationApi, 'createMembre').mockResolvedValue({
      id: '3',
      email: 'new@example.com',
      nom: 'Nouveau',
      prenom: 'Employé',
      statut: 'ACTIF',
    });
  });

  it('affiche la liste des employés', async () => {
    render(
      <BrowserRouter>
        <GestionEmployesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('jean.dupont@example.com')).toBeInTheDocument();
      expect(screen.getByText('Dupont')).toBeInTheDocument();
      expect(screen.getByText('Jean')).toBeInTheDocument();
      expect(screen.getByText('marie.martin@example.com')).toBeInTheDocument();
    });
  });

  it('affiche le statut du dernier dossier quand il est fourni par l API', async () => {
    render(
      <BrowserRouter>
        <GestionEmployesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Payé')).toBeInTheDocument();
    });
  });

  it('affiche le nombre total d\'employés', async () => {
    render(
      <BrowserRouter>
        <GestionEmployesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('2 employés')).toBeInTheDocument();
    });
  });

  it('affiche le bouton Ajouter un employé', async () => {
    render(
      <BrowserRouter>
        <GestionEmployesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Ajouter un employé')).toBeInTheDocument();
    });
  });

  it('ouvre la modal au clic sur Ajouter un employé', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <GestionEmployesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Ajouter un employé')).toBeInTheDocument();
    });

    const button = screen.getByText('Ajouter un employé');
    await user.click(button);

    // Use findByRole to wait for modal to open and check for dialog
    expect(await screen.findByText('Ajouter un employé', { selector: 'h2' })).toBeInTheDocument();

    // Check for input fields in the modal
    const emailInputs = screen.getAllByLabelText(/Email/i);
    const nomInputs = screen.getAllByLabelText(/Nom/i);
    const prenomInputs = screen.getAllByLabelText(/Prénom/i);

    expect(emailInputs.length).toBeGreaterThan(0);
    expect(nomInputs.length).toBeGreaterThan(0);
    expect(prenomInputs.length).toBeGreaterThan(0);
  });

  it('affiche les boutons Supprimer pour chaque employé', async () => {
    render(
      <BrowserRouter>
        <GestionEmployesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Supprimer');
      expect(deleteButtons.length).toBe(2);
    });
  });
});
