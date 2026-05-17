import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CatalogueEtudiantPage from '../CatalogueEtudiantPage';
import { formationsApi } from '../../../api/formations.api';
import { etudiantApi } from '../../../api/espace-etudiant.api';

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

vi.mock('../../../api/formations.api', () => ({
  formationsApi: {
    getCatalogue: vi.fn(),
  },
}));

vi.mock('../../../api/espace-etudiant.api', () => ({
  etudiantApi: {
    getMesDossiers: vi.fn(),
  },
}));

describe('CatalogueEtudiantPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formationsApi.getCatalogue.mockResolvedValue({
      data: [
        {
          id: 'formation-01',
          intitule: 'Masterclass Cyber',
          description_courte: 'Programme intensif',
          cout_catalogue: 150000,
          duree_jours: 5,
          mode_formation: 'AVEC_SESSION',
        },
      ],
      meta: { total: 1, page: 1, totalPages: 1 },
    });
    etudiantApi.getMesDossiers.mockResolvedValue({
      data: [
        {
          id: 'dossier-01',
          statut: 'PAYE',
          formation: { id: 'formation-01', intitule: 'Masterclass Cyber' },
          session: { statut: 'CLOTUREE' },
        },
      ],
    });
  });

  it('affiche quune formation est déjà inscrite et propose l attestation', async () => {
    render(
      <BrowserRouter>
        <CatalogueEtudiantPage />
      </BrowserRouter>
    );

    await screen.findAllByText('Masterclass Cyber');
    expect(screen.getByText('Déjà inscrit')).toBeInTheDocument();
    expect(screen.getByText('Attestation PDF')).toBeInTheDocument();
    expect(screen.getByText("Télécharger l'attestation")).toBeInTheDocument();
  });
});
