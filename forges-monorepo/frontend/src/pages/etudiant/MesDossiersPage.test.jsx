import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import MesDossiersPage from './MesDossiersPage';
import { useApi } from '../../hooks/useApi';
import { etudiantApi } from '../../api/espace-etudiant.api';

vi.mock('../../hooks/useApi', () => ({
  useApi: vi.fn(),
}));

vi.mock('../../api/espace-etudiant.api', () => ({
  etudiantApi: {
    getMesDossiers: vi.fn(),
  },
}));

const mockExecute = vi.fn();

function createDossier(overrides = {}) {
  return {
    id: '1',
    statut: 'EN_ATTENTE_VERIFICATION',
    created_at: '2026-03-20T10:00:00.000Z',
    montant_remise: 0,
    session: {
      date_debut: '2026-04-01T12:00:00.000Z',
      formation: {
        titre: 'Formation React',
        tarif: 5000000,
      },
    },
    ...overrides,
  };
}

describe('MesDossiersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useApi.mockReturnValue({
      execute: mockExecute,
      isLoading: false,
      error: null,
    });

    mockExecute.mockImplementation(async (apiCall, options = {}) => {
      const result = await apiCall();
      options.onSuccess?.(result);
      return result;
    });
  });

  it('affiche un spinner pendant le chargement', () => {
    useApi.mockReturnValue({
      execute: mockExecute,
      isLoading: true,
      error: null,
    });

    const { container } = renderWithProviders(<MesDossiersPage />);

    expect(container.querySelector('svg.animate-spin')).toBeTruthy();
  });

  it('affiche un empty state si aucun dossier n est retourne', async () => {
    etudiantApi.getMesDossiers.mockResolvedValue({
      data: [],
      meta: { total: 0, totalPages: 0, page: 1 },
    });

    renderWithProviders(<MesDossiersPage />);

    expect(await screen.findByText('Aucun dossier trouvé')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir le catalogue' })).toHaveAttribute(
      'href',
      '/apprenant/catalogue'
    );
  });

  it('affiche les dossiers avec le shape de donnees actuel', async () => {
    etudiantApi.getMesDossiers.mockResolvedValue({
      data: [
        createDossier(),
        createDossier({
          id: '2',
          statut: 'PAYE',
          session: {
            date_debut: '2026-05-10T12:00:00.000Z',
            formation: {
              titre: 'Formation Node.js',
              tarif: 6500000,
            },
          },
        }),
      ],
      meta: { total: 2, totalPages: 1, page: 1 },
    });

    renderWithProviders(<MesDossiersPage />);

    expect(await screen.findByText('Formation React')).toBeInTheDocument();
    expect(screen.getByText('Formation Node.js')).toBeInTheDocument();
    expect(screen.getByText('Session du 01/04/2026')).toBeInTheDocument();
    expect(screen.getByText('Session du 10/05/2026')).toBeInTheDocument();
    expect(screen.getAllByText('20/03/2026')).toHaveLength(2);
  });

  it('mappe les statuts v4.8 sur les bons badges et actions', async () => {
    etudiantApi.getMesDossiers.mockResolvedValue({
      data: [
        createDossier({ id: '1', statut: 'EN_ATTENTE_VERIFICATION' }),
        createDossier({ id: '1b', statut: 'EN_ATTENTE_PAIEMENT' }),
        createDossier({ id: '2', statut: 'PAYE_DIRECTEMENT' }),
        createDossier({ id: '3', statut: 'PAYE' }),
        createDossier({ id: '4', statut: 'REJETE' }),
        createDossier({ id: '5', statut: 'GRIS' }),
      ],
      meta: { total: 5, totalPages: 1, page: 1 },
    });

    renderWithProviders(<MesDossiersPage />);

    expect(await screen.findByText('En attente de verification')).toBeInTheDocument();
    const paiementDirectBadge = screen.getAllByText('Paiement à effectuer').at(-1);
    const payeBadge = screen.getAllByText('Paye').at(-1);
    const rejeteBadge = screen.getAllByText('Rejete').at(-1);
    const listeGriseBadge = screen.getAllByText('Liste grise').at(-1);

    expect(screen.getAllByText('Paiement à effectuer')).toHaveLength(2);
    expect(paiementDirectBadge).toBeInTheDocument();
    expect(payeBadge).toBeInTheDocument();
    expect(rejeteBadge).toBeInTheDocument();
    expect(listeGriseBadge).toBeInTheDocument();

    expect(paiementDirectBadge.closest('span')).toHaveClass('bg-warning-soft');
    expect(rejeteBadge.closest('span')).toHaveClass('bg-danger-soft');
    expect(listeGriseBadge.closest('span')).toHaveClass('bg-warning-soft');

    expect(screen.getByRole('link', { name: 'Payer' })).toHaveAttribute('href', '/apprenant/paiements');
    expect(screen.getByRole('link', { name: 'Attestation' })).toHaveAttribute(
      'href',
      '/apprenant/attestations?dossier=3'
    );
  });

  it('affiche la pagination quand plusieurs pages existent', async () => {
    etudiantApi.getMesDossiers.mockResolvedValue({
      data: Array.from({ length: 10 }, (_, index) =>
        createDossier({
          id: `${index + 1}`,
          session: {
            date_debut: '2026-04-01T12:00:00.000Z',
            formation: {
              titre: `Formation ${index + 1}`,
              tarif: 5000000,
            },
          },
        })
      ),
      meta: { total: 25, totalPages: 3, page: 1 },
    });

    renderWithProviders(<MesDossiersPage />);

    expect(await screen.findByText('Formation 1')).toBeInTheDocument();
    expect(
      screen.getAllByText(
        (_, element) =>
          element?.tagName.toLowerCase() === 'p' &&
          element.textContent === 'Page 1 sur 3'
      )[0]
    ).toBeInTheDocument();
  });

  it('recharge les dossiers quand le filtre change', async () => {
    const user = userEvent.setup();

    etudiantApi.getMesDossiers.mockResolvedValue({
      data: [],
      meta: { total: 0, totalPages: 0, page: 1 },
    });

    renderWithProviders(<MesDossiersPage />);

    await screen.findByText('Aucun dossier trouvé');
    await user.selectOptions(screen.getByRole('combobox'), 'PAYE');

    await waitFor(() => {
      expect(etudiantApi.getMesDossiers).toHaveBeenLastCalledWith({
        statut: 'PAYE',
        page: 1,
        limit: 10,
      });
    });
  });

  it('retombe sur l empty state si l API echoue', async () => {
    etudiantApi.getMesDossiers.mockRejectedValue(new Error('Erreur reseau'));

    renderWithProviders(<MesDossiersPage />);

    expect(await screen.findByText('Aucun dossier trouvé')).toBeInTheDocument();
  });
});
