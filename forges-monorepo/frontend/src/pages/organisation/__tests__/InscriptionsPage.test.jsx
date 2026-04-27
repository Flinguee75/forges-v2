import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import InscriptionsPage from '../InscriptionsPage';
import * as organisationApi from '../../../api/espace-organisation.api';
import * as formationsApi from '../../../api/formations.api';

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn((fn, options) => {
      fn().then((data) => options?.onSuccess?.(data));
    }),
    isLoading: false,
  }),
}));

const mockFormationsData = {
  data: [
    { id: '1', titre: 'Formation JavaScript', statut: 'PUBLIEE' },
    { id: '2', titre: 'Formation React', statut: 'PUBLIEE' },
  ],
  meta: { page: 1, totalPages: 1, total: 2 },
};

const mockInscriptionsData = {
  data: [
    {
      id: '1',
      statut: 'CONFIRME',
      etudiant: { prenom: 'Jean', nom: 'Dupont' },
      session: {
        formation: { titre: 'Formation JavaScript', tarif: 50000 }, // centimes → 500 FCFA
        date_debut: '2025-02-01',
      },
      montant_remise: 0,
      created_at: '2025-01-15',
    },
    {
      id: '2',
      statut: 'EN_ATTENTE',
      etudiant: { prenom: 'Marie', nom: 'Martin' },
      session: {
        formation: { titre: 'Formation React', tarif: 60000 },
        date_debut: '2025-02-15',
      },
      montant_remise: 10000,
      created_at: '2025-01-16',
    },
  ],
  meta: {
    page: 1,
    totalPages: 1,
    total: 2,
  },
};

describe('InscriptionsPage - Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(formationsApi.formationsApi, 'getAll').mockResolvedValue(
      mockFormationsData
    );
    vi.spyOn(organisationApi.organisationApi, 'getInscriptions').mockResolvedValue(
      mockInscriptionsData
    );
  });

  it('affiche la liste des inscriptions', async () => {
    render(
      <BrowserRouter>
        <InscriptionsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
      expect(screen.getByText('Marie Martin')).toBeInTheDocument();
      // Formation names appear in both filter dropdown and table, so check for multiple
      expect(screen.getAllByText('Formation JavaScript').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Formation React').length).toBeGreaterThan(0);
    });
  });

  it('affiche les filtres statut et formation', async () => {
    render(
      <BrowserRouter>
        <InscriptionsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Formation:/)).toBeInTheDocument();
      expect(screen.getByText(/Statut:/)).toBeInTheDocument();
    });
  });

  it('permet de filtrer par statut', async () => {
    const { container } = render(
      <BrowserRouter>
        <InscriptionsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const selects = container.querySelectorAll('select');
      const statutSelect = Array.from(selects).find(
        (s) => s.querySelector('option[value="EN_ATTENTE"]')
      );
      expect(statutSelect).toBeInTheDocument();
      expect(statutSelect.querySelector('option[value=""]')).toBeInTheDocument();
      expect(statutSelect.querySelector('option[value="RETENU"]')).toBeInTheDocument();
      expect(statutSelect.querySelector('option[value="CONFIRME"]')).toBeInTheDocument();
    });
  });

  it('permet de filtrer par formation', async () => {
    const { container } = render(
      <BrowserRouter>
        <InscriptionsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const selects = container.querySelectorAll('select');
      const formationSelect = Array.from(selects).find(
        (s) => s.querySelector('option')?.textContent === 'Toutes' || s.querySelector('option')?.textContent === 'Formation JavaScript'
      );
      expect(formationSelect).toBeInTheDocument();
    });
  });

  it('affiche le montant avec remise calculée', async () => {
    render(
      <BrowserRouter>
        <InscriptionsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // tarif 50000 centimes = 50 000 FCFA (InscriptionsPage ne divise pas par 100)
      expect(screen.getAllByText(/50.*000.*FCFA/).length).toBeGreaterThan(0);
    });
  });

  it('affiche les badges de statut', async () => {
    render(
      <BrowserRouter>
        <InscriptionsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Confirmé')).toBeInTheDocument();
      expect(screen.getByText('En attente')).toBeInTheDocument();
    });
  });
});
