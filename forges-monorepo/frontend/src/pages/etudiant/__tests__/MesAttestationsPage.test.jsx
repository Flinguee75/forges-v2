import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MesAttestationsPage from '../MesAttestationsPage';
import * as etudiantApi from '../../../api/espace-etudiant.api';

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

const mockDossiersConfirmes = {
  data: [
    {
      id: '1',
      statut: 'CONFIRME',
      session: {
        titre: 'Session Janvier 2025',
        formation: {
          titre: 'Formation JavaScript Avancé',
        },
        date_debut: '2025-01-15',
        date_fin: '2025-06-15',
      },
    },
    {
      id: '2',
      statut: 'CONFIRME',
      session: {
        titre: 'Session Février 2025',
        formation: {
          titre: 'Formation React Pro',
        },
        date_debut: '2025-02-01',
        date_fin: '2025-07-01',
      },
    },
  ],
};

describe('MesAttestationsPage - Checklist Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(etudiantApi.etudiantApi, 'getMesAttestations').mockResolvedValue({
      data: mockDossiersConfirmes.data,
    });
    vi.spyOn(etudiantApi.etudiantApi, 'getAttestation').mockResolvedValue(
      new Blob(['PDF content'], { type: 'application/pdf' })
    );
  });

  it('affiche la liste des attestations disponibles', async () => {
    render(
      <BrowserRouter>
        <MesAttestationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Formation JavaScript Avancé')).toBeInTheDocument();
      expect(screen.getByText('Formation React Pro')).toBeInTheDocument();
    });

    // Vérifie que les sessions sont affichées
    await waitFor(() => {
      expect(screen.getByText(/Session Janvier 2025/)).toBeInTheDocument();
      expect(screen.getByText(/Session Février 2025/)).toBeInTheDocument();
    });
  });

  it('affiche les dates de début et fin pour chaque formation', async () => {
    render(
      <BrowserRouter>
        <MesAttestationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Format français des dates - il y a plusieurs éléments avec ce texte
      const debutElements = screen.getAllByText(/Début:/);
      const finElements = screen.getAllByText(/Fin:/);
      expect(debutElements.length).toBeGreaterThan(0);
      expect(finElements.length).toBeGreaterThan(0);
    });
  });

  it('affiche un bouton pour télécharger chaque attestation', async () => {
    render(
      <BrowserRouter>
        <MesAttestationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const downloadButtons = screen.getAllByText("Télécharger l'attestation");
      expect(downloadButtons).toHaveLength(2);
    });
  });

  it('déclenche le téléchargement du PDF au clic sur le bouton', async () => {
    // Mock pour simuler le téléchargement
    const createObjectURLMock = vi.fn(() => 'blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    const clickMock = vi.fn();

    // eslint-disable-next-line no-undef
    global.URL.createObjectURL = createObjectURLMock;
    // eslint-disable-next-line no-undef
    global.URL.revokeObjectURL = revokeObjectURLMock;

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        const element = originalCreateElement(tag);
        element.click = clickMock;
        return element;
      }
      return originalCreateElement(tag);
    });

    render(
      <BrowserRouter>
        <MesAttestationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const downloadButtons = screen.getAllByText("Télécharger l'attestation");
      fireEvent.click(downloadButtons[0]);
    });

    // Vérifie que l'API a été appelée
    await waitFor(() => {
      expect(etudiantApi.etudiantApi.getAttestation).toHaveBeenCalledWith('1');
    });
  });

  it('affiche un message si aucune attestation disponible', async () => {
    // Restore original mocks first
    vi.restoreAllMocks();

    // Mock again with empty data
    vi.spyOn(etudiantApi.etudiantApi, 'getMesAttestations').mockResolvedValue({
      data: [],
    });

    render(
      <BrowserRouter>
        <MesAttestationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Aucune attestation disponible')).toBeInTheDocument();
    });
  });

  it('affiche le bon contact de support sur la page des attestations', async () => {
    render(
      <BrowserRouter>
        <MesAttestationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('contact@forges.ci')).toBeInTheDocument();
    });
  });
});
