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
      fn().then(options.onSuccess);
    }),
    isLoading: false,
    error: null,
  }),
}));

// Mock des composants
vi.mock('../../../components/ui/Button', () => ({
  default: function MockButton({ children, ...props }) {
    return <button {...props}>{children}</button>;
  },
}));

vi.mock('../../../components/ui/Card', () => ({
  default: function MockCard({ children, title }) {
    return (
      <div>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    );
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
  duree_acces_jours: 365,
  mode_formation: 'AVEC_SESSION',
  responsable_id: 'usr-resp-0001-0000-0000-000000000002',
};

const mockSessions = [
  {
    id: 'ses-prem-00001-0000-0000-000000000002',
    date_debut: '2026-05-24T13:22:09.713Z',
    date_fin: '2026-07-23T13:22:09.713Z',
    date_ouverture: '2026-05-01T13:22:09.713Z',
    date_cloture: '2026-05-19T13:22:09.713Z',
    capacite: 15,
    statut: 'INSCRIPTIONS_OUVERTES',
  },
];

describe('FormationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useParamsMock.mockReturnValue({ id: mockFormation.id });
    // eslint-disable-next-line no-import-assign
    authHook.useAuth = vi.fn(() => ({ user: null }));
    // eslint-disable-next-line no-import-assign
    formationsApi.formationsApi = {
      getFormationDetail: vi.fn(() => Promise.resolve({ data: mockFormation })),
      getSessionsOuvertes: vi.fn(() => Promise.resolve({ data: mockSessions })),
    };
  });

  it('devrait afficher le titre et la description de la formation', async () => {
    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(mockFormation.intitule).length).toBeGreaterThan(1);
      expect(screen.getAllByText(mockFormation.description_courte).length).toBeGreaterThan(1);
    });
  });

  it('devrait afficher la description longue si présente', async () => {
    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Description détaillée')).toBeInTheDocument();
    });
  });

  it('devrait afficher les prérequis en boîte bleue', async () => {
    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Prérequis')).toBeInTheDocument();
      expect(screen.getByText(mockFormation.prerequis)).toBeInTheDocument();
    });
  });

  it('devrait afficher les compétences acquises en boîte verte', async () => {
    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Compétences acquises')).toBeInTheDocument();
      mockFormation.objectifs_pedagogiques.forEach((competence) => {
        expect(screen.getByText(competence)).toBeInTheDocument();
      });
    });
  });

  it('devrait afficher le badge de certification', async () => {
    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Certification obtenue')).toBeInTheDocument();
    });
  });

  it('devrait afficher les informations clés (durée, tarif, accès)', async () => {
    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Durée')).toBeInTheDocument();
      expect(screen.getByText('Tarif')).toBeInTheDocument();
      expect(screen.getByText('Accès')).toBeInTheDocument();
      expect(screen.getByText('365 jours d\'accès')).toBeInTheDocument();
    });
  });

  it('devrait afficher le type de formation', async () => {
    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('PREMIUM')).toBeInTheDocument();
    });
  });

  it('devrait afficher les sessions disponibles', async () => {
    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sessions disponibles')).toBeInTheDocument();
    });
  });

  it('devrait afficher un message si aucune session n\'est ouverte', async () => {
    formationsApi.formationsApi.getSessionsOuvertes = vi.fn(() =>
      Promise.resolve({ data: [] })
    );

    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Aucune session ouverte/)).toBeInTheDocument();
    });
  });

  it('devrait afficher la référence de la formation', async () => {
    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Référence')).toBeInTheDocument();
      expect(screen.getByText(mockFormation.id)).toBeInTheDocument();
    });
  });

  it('devrait masquer les sections vides', async () => {
    const formationSansPrerequisNiCompetences = {
      ...mockFormation,
      prerequis: '',
      objectifs_pedagogiques: [],
      certification_delivree: false,
    };

    formationsApi.formationsApi.getFormationDetail = vi.fn(() =>
      Promise.resolve({ data: formationSansPrerequisNiCompetences })
    );

    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Les sections vides ne doivent pas s'afficher
      expect(screen.queryByText('Prérequis')).not.toBeInTheDocument();
      expect(screen.queryByText('Compétences acquises')).not.toBeInTheDocument();
      expect(screen.queryByText('Certification obtenue')).not.toBeInTheDocument();
    });
  });
});
