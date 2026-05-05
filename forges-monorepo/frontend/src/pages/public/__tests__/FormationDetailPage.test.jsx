import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FormationDetailPage from '../FormationDetailPage';
import * as formationsApi from '../../../api/formations.api';
import * as authHook from '../../../hooks/useAuth';

// Mock des dépendances
jest.mock('../../../api/formations.api');
jest.mock('../../../hooks/useAuth');
jest.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: jest.fn((fn, options) => {
      fn().then(options.onSuccess);
    }),
    isLoading: false,
    error: null,
  }),
}));

// Mock des composants
jest.mock('../../../components/ui/Button', () => {
  return function MockButton({ children, ...props }) {
    return <button {...props}>{children}</button>;
  };
});

jest.mock('../../../components/ui/Card', () => {
  return function MockCard({ children, title }) {
    return (
      <div>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    );
  };
});

jest.mock('../../../components/ui/Badge', () => {
  return function MockBadge({ children, variant }) {
    return <span className={`badge-${variant}`}>{children}</span>;
  };
});

jest.mock('../../../components/feedback/EmptyState', () => {
  return function MockEmptyState({ title, message }) {
    return <div>{title}: {message}</div>;
  };
});

jest.mock('../../../components/feedback/Spinner', () => {
  return function MockSpinner() {
    return <div>Loading...</div>;
  };
});

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
    jest.clearAllMocks();
    authHook.useAuth = jest.fn(() => ({ user: null }));
    formationsApi.formationsApi = {
      getFormationDetail: jest.fn(() => Promise.resolve({ data: mockFormation })),
      getSessionsOuvertes: jest.fn(() => Promise.resolve({ data: mockSessions })),
    };
  });

  it('devrait afficher le titre et la description de la formation', async () => {
    const { container } = render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    // Mock useParams
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({
      id: mockFormation.id,
    });

    await waitFor(() => {
      expect(screen.getByText(mockFormation.intitule)).toBeInTheDocument();
      expect(screen.getByText(mockFormation.description_courte)).toBeInTheDocument();
    });
  });

  it('devrait afficher la description longue si présente', async () => {
    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({
      id: mockFormation.id,
    });

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

    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({
      id: mockFormation.id,
    });

    await waitFor(() => {
      expect(screen.getByText('📋 Prérequis')).toBeInTheDocument();
      expect(screen.getByText(mockFormation.prerequis)).toBeInTheDocument();
    });
  });

  it('devrait afficher les compétences acquises en boîte verte', async () => {
    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({
      id: mockFormation.id,
    });

    await waitFor(() => {
      expect(screen.getByText('✨ Compétences acquises')).toBeInTheDocument();
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

    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({
      id: mockFormation.id,
    });

    await waitFor(() => {
      expect(screen.getByText('🏆 Certification obtenue')).toBeInTheDocument();
    });
  });

  it('devrait afficher les informations clés (durée, tarif, accès)', async () => {
    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({
      id: mockFormation.id,
    });

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

    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({
      id: mockFormation.id,
    });

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

    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({
      id: mockFormation.id,
    });

    await waitFor(() => {
      expect(screen.getByText('Sessions disponibles')).toBeInTheDocument();
    });
  });

  it('devrait afficher un message si aucune session n\'est ouverte', async () => {
    formationsApi.formationsApi.getSessionsOuvertes = jest.fn(() =>
      Promise.resolve({ data: [] })
    );

    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({
      id: mockFormation.id,
    });

    await waitFor(() => {
      expect(screen.getByText('Aucune session ouverte')).toBeInTheDocument();
    });
  });

  it('devrait afficher la référence de la formation', async () => {
    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({
      id: mockFormation.id,
    });

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

    formationsApi.formationsApi.getFormationDetail = jest.fn(() =>
      Promise.resolve({ data: formationSansPrerequisNiCompetences })
    );

    render(
      <BrowserRouter>
        <FormationDetailPage />
      </BrowserRouter>
    );

    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({
      id: mockFormation.id,
    });

    await waitFor(() => {
      // Les sections vides ne doivent pas s'afficher
      expect(screen.queryByText('📋 Prérequis')).not.toBeInTheDocument();
      expect(screen.queryByText('✨ Compétences acquises')).not.toBeInTheDocument();
      expect(screen.queryByText('🏆 Certification obtenue')).not.toBeInTheDocument();
    });
  });
});
