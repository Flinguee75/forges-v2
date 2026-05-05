import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FormationMarketplaceCard from '../../../components/catalogue/FormationMarketplaceCard';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({ to, children }) => <a href={to}>{children}</a>,
}));

// Mock la fonction de formatage monétaire
jest.mock('../../../utils/currency', () => ({
  formatCurrency: (amount) => {
    if (!amount) return '0 FCFA';
    return `${Math.round(amount / 100).toLocaleString('fr-FR')} FCFA`;
  },
}));

const mockFormation = {
  id: 'frm-prem-0001-0000-0000-000000000002',
  intitule: '[F-PREM-01] Cybersécurité Avancée GWU',
  description_courte: 'Certification Premium GWU — Cybersécurité niveau expert.',
  description_longue: '<p>Formation complète en cybersécurité</p>',
  duree_jours: 60,
  cout_catalogue: 200000000,
  type_formation: 'PREMIUM',
  mode_formation: 'AVEC_SESSION',
  inclus_abonnement: false,
  certification_delivree: true,
  prerequis: 'Maîtrise de Python et Linux',
  objectifs_pedagogiques: [
    'Sécuriser une infrastructure',
    'Gérer les risques cybernétiques',
  ],
};

describe('FormationMarketplaceCard', () => {
  it('devrait afficher le titre de la formation', () => {
    render(
      <BrowserRouter>
        <FormationMarketplaceCard formation={mockFormation} />
      </BrowserRouter>
    );

    expect(screen.getByText(mockFormation.intitule)).toBeInTheDocument();
  });

  it('devrait afficher la description courte', () => {
    render(
      <BrowserRouter>
        <FormationMarketplaceCard formation={mockFormation} />
      </BrowserRouter>
    );

    expect(screen.getByText(mockFormation.description_courte)).toBeInTheDocument();
  });

  it('devrait afficher la durée en jours', () => {
    render(
      <BrowserRouter>
        <FormationMarketplaceCard formation={mockFormation} />
      </BrowserRouter>
    );

    expect(screen.getByText('60 jours')).toBeInTheDocument();
  });

  it('devrait afficher le badge Premium', () => {
    render(
      <BrowserRouter>
        <FormationMarketplaceCard formation={mockFormation} />
      </BrowserRouter>
    );

    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('devrait afficher le badge Certifiante si certification_delivree est true', () => {
    render(
      <BrowserRouter>
        <FormationMarketplaceCard formation={mockFormation} />
      </BrowserRouter>
    );

    expect(screen.getByText('🏆 Certifiante')).toBeInTheDocument();
  });

  it('devrait afficher le badge Inclus si inclus_abonnement est true', () => {
    const formationIncluse = { ...mockFormation, inclus_abonnement: true };

    render(
      <BrowserRouter>
        <FormationMarketplaceCard formation={formationIncluse} />
      </BrowserRouter>
    );

    expect(screen.getByText('Inclus')).toBeInTheDocument();
  });

  it('devrait afficher les prérequis sur la carte', () => {
    render(
      <BrowserRouter>
        <FormationMarketplaceCard formation={mockFormation} />
      </BrowserRouter>
    );

    expect(screen.getByText(/Prérequis:/)).toBeInTheDocument();
    expect(screen.getByText(/Maîtrise de Python et Linux/)).toBeInTheDocument();
  });

  it('devrait afficher un lien vers le détail de la formation', () => {
    render(
      <BrowserRouter>
        <FormationMarketplaceCard formation={mockFormation} />
      </BrowserRouter>
    );

    const link = screen.getByRole('link', { hidden: true });
    expect(link).toHaveAttribute('href', `/formations/${mockFormation.id}`);
  });

  it('devrait afficher un lien personnalisé si to est fourni', () => {
    const customPath = '/custom/path';

    render(
      <BrowserRouter>
        <FormationMarketplaceCard formation={mockFormation} to={customPath} />
      </BrowserRouter>
    );

    const link = screen.getByRole('link', { hidden: true });
    expect(link).toHaveAttribute('href', customPath);
  });

  it('devrait afficher le chemin par défaut pour les apprenants avec mode A_LA_DEMANDE', () => {
    const formationADemande = {
      ...mockFormation,
      mode_formation: 'A_LA_DEMANDE',
    };

    render(
      <BrowserRouter>
        <FormationMarketplaceCard
          formation={formationADemande}
          context="apprenant"
        />
      </BrowserRouter>
    );

    const link = screen.getByRole('link', { hidden: true });
    expect(link).toHaveAttribute(
      'href',
      `/apprenant/formations-a-la-demande/${formationADemande.id}`
    );
  });

  it('devrait afficher la catégorie correcte basée sur le titre', () => {
    const formationCyber = { ...mockFormation };

    render(
      <BrowserRouter>
        <FormationMarketplaceCard formation={formationCyber} />
      </BrowserRouter>
    );

    expect(screen.getByText('Cybersecurite')).toBeInTheDocument();
  });

  it('devrait afficher le tarif formaté', () => {
    render(
      <BrowserRouter>
        <FormationMarketplaceCard formation={mockFormation} />
      </BrowserRouter>
    );

    // Le tarif 200000000 centimes = 2 000 000 FCFA
    expect(screen.getByText(/2 000 000 FCFA/)).toBeInTheDocument();
  });

  it('ne devrait pas afficher le badge Certifiante si certification_delivree est false', () => {
    const formationSansCertif = { ...mockFormation, certification_delivree: false };

    render(
      <BrowserRouter>
        <FormationMarketplaceCard formation={formationSansCertif} />
      </BrowserRouter>
    );

    expect(screen.queryByText('🏆 Certifiante')).not.toBeInTheDocument();
  });

  it('devrait masquer les prérequis si absent', () => {
    const formationSansPrerequisites = { ...mockFormation, prerequis: '' };

    render(
      <BrowserRouter>
        <FormationMarketplaceCard formation={formationSansPrerequisites} />
      </BrowserRouter>
    );

    expect(screen.queryByText(/Prérequis:/)).not.toBeInTheDocument();
  });

  it('devrait afficher les badges Inclus et Premium ensemble', () => {
    const formationComplete = {
      ...mockFormation,
      inclus_abonnement: true,
      type_formation: 'PREMIUM',
    };

    render(
      <BrowserRouter>
        <FormationMarketplaceCard formation={formationComplete} />
      </BrowserRouter>
    );

    expect(screen.getByText('Inclus')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('🏆 Certifiante')).toBeInTheDocument();
  });
});
