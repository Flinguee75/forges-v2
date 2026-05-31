import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../LandingPage';

describe('LandingPage', () => {
  it('presents mixed learner and organisation value with credibility proof', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const learnerLinks = screen.getAllByRole('link', { name: /je me forme/i });
    const organisationLinks = screen.getAllByRole('link', { name: /je forme mon (e|é)quipe/i });

    expect(screen.getByRole('heading', { name: /formations certifiantes/i })).toBeInTheDocument();
    expect(learnerLinks.some((link) => link.getAttribute('href') === '/register/etudiant')).toBe(true);
    expect(organisationLinks.some((link) => link.getAttribute('href') === '/register/organisation')).toBe(true);
    expect(screen.getByText(/Masterclass GWU\/CCDL/i)).toBeInTheDocument();
    expect(screen.queryByText(/plateforme africaine de formations certifiantes/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /partenaires/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Apprenants' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Organisations' })).toBeInTheDocument();
    expect(screen.getAllByText(/^partenaires$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^mobile$/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /nous contacter/i })).toBeInTheDocument();

    const contactLink = screen.getByRole('link', { name: /contact@forges-group\.com/i });
    expect(contactLink).toHaveAttribute('href', 'mailto:contact@forges-group.com');
  });

  it('keeps hero call-to-action contrast classes unambiguous', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const hero = screen.getByRole('heading', { name: /formations certifiantes/i }).closest('section');
    const heroQueries = within(hero);
    const organisationCtaClasses = heroQueries.getByRole('link', { name: /je forme mon équipe/i }).className.split(/\s+/);
    const learnerCtaClasses = heroQueries.getByRole('link', { name: /je me forme/i }).className.split(/\s+/);

    expect(organisationCtaClasses).not.toContain('text-primary');
    expect(learnerCtaClasses).not.toContain('bg-secondary');
    expect(organisationCtaClasses.some((className) => className.includes('hover:bg-[#0F2F43]'))).toBe(true);
    expect(organisationCtaClasses.some((className) => className.includes('var(--color-primary-ink)'))).toBe(false);
    expect(heroQueries.queryByRole('link', { name: /voir le catalogue/i })).not.toBeInTheDocument();
  });

  it('shows a learner certification progression preview in the hero', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const hero = screen.getByRole('heading', { name: /formations certifiantes/i }).closest('section');
    const heroQueries = within(hero);

    expect(heroQueries.getByText(/progression formation/i)).toBeInTheDocument();
    expect(heroQueries.getAllByText(/certification/i).length).toBeGreaterThan(0);
    expect(heroQueries.queryByText(/cybersécurité/i)).not.toBeInTheDocument();
    expect(heroQueries.queryAllByText(/\bIA\b/i)).toHaveLength(0);
    expect(heroQueries.queryByText('Dossiers')).not.toBeInTheDocument();
    expect(heroQueries.queryByText('Payes')).not.toBeInTheDocument();
    expect(heroQueries.queryByText('A traiter')).not.toBeInTheDocument();
  });
});
