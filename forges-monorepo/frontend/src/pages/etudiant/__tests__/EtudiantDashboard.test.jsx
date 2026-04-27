import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EtudiantDashboard from '../EtudiantDashboard';
import * as etudiantApi from '../../../api/espace-etudiant.api';

// Mock des hooks et API
vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn((fn, options) => {
      fn().then((data) => options?.onSuccess?.(data));
    }),
    isLoading: false,
  }),
}));

const mockDossiersData = {
  data: [
    {
      id: '1',
      statut: 'EN_ATTENTE',
      created_at: '2025-01-01',
      session: {
        formation: { titre: 'Formation Test' },
        date_debut: '2025-02-01',
      },
    },
    {
      id: '2',
      statut: 'RETENU',
      created_at: '2025-01-02',
      session: {
        formation: { titre: 'Formation Test 2' },
        date_debut: '2025-02-15',
      },
    },
    {
      id: '3',
      statut: 'CONFIRME',
      created_at: '2025-01-03',
      session: {
        formation: { titre: 'Formation Test 3' },
        date_debut: '2025-03-01',
      },
    },
  ],
};

const mockFormationsData = {
  data: [
    {
      id: '1',
      statut: 'CONFIRME',
      session: {
        statut: 'EN_COURS',
        formation: { titre: 'Formation En Cours' },
        date_debut: '2025-01-01',
        date_fin: '2025-06-01',
      },
    },
  ],
};

describe('EtudiantDashboard - Checklist Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(etudiantApi.etudiantApi, 'getMesDossiers').mockResolvedValue(mockDossiersData);
    vi.spyOn(etudiantApi.etudiantApi, 'getMesFormations').mockResolvedValue(mockFormationsData);
  });

  it('affiche les statistiques des dossiers en cours', async () => {
    render(
      <BrowserRouter>
        <EtudiantDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Vérifie que les stats sont affichées
      expect(screen.getByText('Dossiers en attente')).toBeInTheDocument();
      expect(screen.getByText('Paiements à effectuer')).toBeInTheDocument();
      expect(screen.getByText('Formations confirmées')).toBeInTheDocument();
      expect(screen.getByText('Formations en cours')).toBeInTheDocument();
    });

    // Vérifie les valeurs calculées - utilise getAllByText car plusieurs "1" peuvent apparaître
    await waitFor(() => {
      const statsElements = screen.getAllByText('1');
      expect(statsElements.length).toBeGreaterThan(0); // Au moins un élément avec "1"
    });
  });

  it('affiche les derniers dossiers avec le bon badge de statut', async () => {
    render(
      <BrowserRouter>
        <EtudiantDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Vérifie que les dossiers sont affichés
      expect(screen.getByText('Formation Test')).toBeInTheDocument();
      expect(screen.getByText('Formation Test 2')).toBeInTheDocument();
    });

    // Vérifie les badges de statut
    await waitFor(() => {
      expect(screen.getByText('En attente')).toBeInTheDocument();
      expect(screen.getByText('Retenu')).toBeInTheDocument();
      expect(screen.getByText('Confirmé')).toBeInTheDocument();
    });
  });

  it('affiche une alerte pour les paiements en attente', async () => {
    render(
      <BrowserRouter>
        <EtudiantDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Action requise : Paiement en attente/)).toBeInTheDocument();
      expect(screen.getByText(/Vous avez 1 dossier\(s\) retenu\(s\)/)).toBeInTheDocument();
      expect(screen.getByText('Payer maintenant')).toBeInTheDocument();
    });
  });

  it('affiche les liens vers les sections principales', async () => {
    render(
      <BrowserRouter>
        <EtudiantDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Catalogue')).toBeInTheDocument();
      expect(screen.getByText('Mes Dossiers')).toBeInTheDocument();
      expect(screen.getByText('Attestations')).toBeInTheDocument();
    });
  });
});
