import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FormationDetailPage from '../FormationDetailPage';
import * as formationsApi from '../../../api/formations.api';
import * as authHook from '../../../hooks/useAuth';

const useParamsMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => useParamsMock(),
  };
});

// Mock des dépendances
vi.mock('../../../api/formations.api');
vi.mock('../../../hooks/useAuth');
vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn((fn, options) => {
      return fn().then(options.onSuccess);
    }),
    isLoading: false,
    error: null,
  }),
}));

// Mock des composants
vi.mock('../../../components/ui/Button', () => ({
  default: function MockButton({ children, fullWidth: _fullWidth, size: _size, ...props }) {
    return <button {...props}>{children}</button>;
  },
}));

vi.mock('../../../components/ui/Badge', () => ({
  default: function MockBadge({ children, variant }) {
    return <span className={`badge-${variant}`}>{children}</span>;
  },
}));

vi.mock('../../../components/feedback/EmptyState', () => ({
  default: function MockEmptyState({ title, message }) {
    return <div>{title}: {message}</div>;
  },
}));

vi.mock('../../../components/feedback/Spinner', () => ({
  default: function MockSpinner() {
    return <div>Loading...</div>;
  },
}));

const mockFormation = {
  id: 'frm-prem-0001-0000-0000-000000000002',
  intitule: '[F-PREM-01] Cybersécurité Avancée GWU',
  description_courte: 'Certification Premium GWU — Cybersécurité niveau expert.',
  description_longue: '<p>Formation Premium GWU/CCDL en cybersécurité avancée.</p>',
  duree_jours: 60,
  cout_catalogue: 200000000,
  type_formation: 'PREMIUM',
  statut: 'ACTIVE',
  statut_validation: 'VALIDEE',
  certification_delivree: true,
  prerequis: 'Maîtrise de la programmation Python et des bases de Linux',
  objectifs_pedagogiques: [
    'Sécuriser une infrastructure cloud',
    'Implémenter une politique de sécurité',
    'Gérer les risques cybernétiques',
    'Auditer une architecture réseau',
  ],
  programme_syllabus: 'Fondamentaux de la cybersécurité\nGestion des risques\nAudit et réponse aux incidents',
  duree_acces_jours: 365,
  mode_formation: 'AVEC_SESSION',
  langues_disponibles: ['FR', 'EN'],
  partenaire: {
    raison_sociale: 'GWU/CCDL',
  },
  responsable_id: 'usr-resp-0001-0000-0000-000000000002',
};

const mockSessions = [
  {
    id: 'ses-prem-00001-0000-0000-000000000002',
    date_debut: '2026-07-24T13:22:09.713Z',
    date_fin: '2026-09-23T13:22:09.713Z',
    date_ouverture: '2026-06-01T13:22:09.713Z',
    date_cloture: '2026-07-19T13:22:09.713Z',
    capacite: 15,
    places_restantes: 7,
    statut: 'INSCRIPTIONS_OUVERTES',
  },
];

describe('FormationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.IntersectionObserver = class IntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    Element.prototype.scrollIntoView = vi.fn();
    useParamsMock.mockReturnValue({ id: mockFormation.id });
    // eslint-disable-next-line no-import-assign
    authHook.useAuth = vi.fn(() => ({ user: null }));
    // eslint-disable-next-line no-import-assign
    formationsApi.formationsApi = {
      getFormationDetail: vi.fn(() => Promise.resolve({ data: mockFormation })),
      getSessionsOuvertes: vi.fn(() => Promise.resolve({ data: mockSessions })),
    };
  });

  function renderPage() {
    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );
  }

  it('affiche le titre et la description de la formation', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(mockFormation.intitule).length).toBeGreaterThan(0);
      expect(screen.getAllByText(mockFormation.description_courte).length).toBeGreaterThan(0);
    });
  });

  it('affiche les ancres des sections disponibles sans témoignages', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'À propos' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Résultats' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cours' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Témoignages' })).not.toBeInTheDocument();
    });
  });

  it('présente les objectifs dans la section résultats', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ce que vous saurez faire' })).toBeInTheDocument();
      mockFormation.objectifs_pedagogiques.forEach((objectif) => {
        expect(screen.getByText(objectif)).toBeInTheDocument();
      });
    });
  });

  it('présente le programme sous forme de cours numérotés', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Programme de la formation' })).toBeInTheDocument();
      expect(screen.getByText('Cours 1')).toBeInTheDocument();
      expect(screen.getByText('Fondamentaux de la cybersécurité')).toBeInTheDocument();
      expect(screen.getByText('Cours 3')).toBeInTheDocument();
      expect(screen.getByText('Audit et réponse aux incidents')).toBeInTheDocument();
    });
  });

  it('affiche les prérequis et la certification dans à propos', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'À propos de cette formation' })).toBeInTheDocument();
      expect(screen.getByText('Prérequis')).toBeInTheDocument();
      expect(screen.getByText(mockFormation.prerequis)).toBeInTheDocument();
      expect(screen.getAllByText('Certification délivrée').length).toBeGreaterThan(0);
    });
  });

  it('affiche la prochaine session et les places restantes dans la carte d’inscription', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Prochaine session')).toBeInTheDocument();
      expect(screen.getAllByText('24 juillet 2026').length).toBeGreaterThan(0);
      expect(screen.getByText('Clôture des inscriptions')).toBeInTheDocument();
      expect(screen.getAllByText('19 juillet 2026').length).toBeGreaterThan(0);
      expect(screen.getAllByText('7 places restantes').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: "Se connecter pour s'inscrire" }).length).toBeGreaterThan(0);
    });
  });

  it('masque résultats et cours lorsque leurs données sont absentes', async () => {
    formationsApi.formationsApi.getFormationDetail = vi.fn(() =>
      Promise.resolve({
        data: {
          ...mockFormation,
          objectifs_pedagogiques: [],
          programme_syllabus: '',
        },
      })
    );
    formationsApi.formationsApi.getSessionsOuvertes = vi.fn(() => Promise.resolve({ data: [] }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'À propos' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Résultats' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cours' })).not.toBeInTheDocument();
    });
  });

  it('affiche un état indisponible si aucune session n’est ouverte', async () => {
    formationsApi.formationsApi.getSessionsOuvertes = vi.fn(() =>
      Promise.resolve({ data: [] })
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Aucune session ouverte/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: "Se connecter pour s'inscrire" })).not.toBeInTheDocument();
    });
  });

  it('ignore une session dont la clôture des inscriptions est passée', async () => {
    formationsApi.formationsApi.getSessionsOuvertes = vi.fn(() =>
      Promise.resolve({
        data: [{
          ...mockSessions[0],
          date_debut: '2026-05-24T13:22:09.713Z',
          date_fin: '2026-06-01T13:22:09.713Z',
          date_cloture: '2026-05-19T13:22:09.713Z',
        }],
      })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Inscriptions indisponibles')).toBeInTheDocument();
      expect(screen.queryByText('Prochaine session')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: "Se connecter pour s'inscrire" })).not.toBeInTheDocument();
    });
  });
});
