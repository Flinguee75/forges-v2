import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OrganisationDetail from '../OrganisationDetail';
import { organisationsApi } from '../../../../api/organisations.api';

vi.mock('../../../../api/organisations.api', () => ({
  organisationsApi: {
    getById: vi.fn(),
    getMembres: vi.fn(),
    getAbonnement: vi.fn(),
    getVouchers: vi.fn(),
    getConfig: vi.fn(),
  },
}));

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/backoffice/organisations/org-1']}>
      <Routes>
        <Route path="/backoffice/organisations/:id" element={<OrganisationDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('OrganisationDetail', () => {
  it("affiche le détail d'une organisation avec abonnement, membres et vouchers", async () => {
    organisationsApi.getById.mockResolvedValue({
      data: {
        id: 'org-1',
        nom_organisation: 'FORGES Enterprise',
        email: 'contact@forges.test',
        type: 'ENTREPRISE',
        statut: 'ACTIVE',
        pays: 'CI',
        responsable_nom: 'Awa Koné',
        langue: 'FR',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    });
    organisationsApi.getMembres.mockResolvedValue({
      data: [
        {
          id: 'membre-1',
          nom: 'Doe',
          prenoms: 'Jane',
          email: 'jane@forges.test',
          statut: 'ACTIF',
        },
      ],
    });
    organisationsApi.getAbonnement.mockResolvedValue({
      data: {
        id: 'abo-1',
        palier: 'BUSINESS',
        statut: 'ACTIF',
        nb_actifs: 12,
        nb_max: 50,
        prix_annuel: 15000000,
        date_debut: '2026-01-01T00:00:00.000Z',
        date_fin: '2026-12-31T00:00:00.000Z',
      },
    });
    organisationsApi.getVouchers.mockResolvedValue({
      data: [
        {
          id: 'voucher-1',
          code: 'ORG-2026',
          statut: 'ACTIF',
          date_expiration: '2026-12-31T00:00:00.000Z',
          formation: { intitule: 'Management' },
        },
      ],
    });
    organisationsApi.getConfig.mockResolvedValue({
      data: {
        commission_forges_pct: 15,
        seuil_reversement_xof: 25000,
        effective_commission_forges_pct: 15,
        effective_seuil_reversement_xof: 25000,
      },
    });

    renderDetail();

    expect(await screen.findByRole('heading', { name: 'FORGES Enterprise' })).toBeInTheDocument();
    expect(screen.getByText('Détail organisation')).toBeInTheDocument();
    expect(screen.getAllByText('contact@forges.test').length).toBeGreaterThan(0);
    expect(screen.getByText('BUSINESS')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('ORG-2026')).toBeInTheDocument();
    expect(organisationsApi.getById).toHaveBeenCalledWith('org-1');
    expect(organisationsApi.getMembres).toHaveBeenCalledWith('org-1');
    expect(organisationsApi.getAbonnement).toHaveBeenCalledWith('org-1');
    expect(organisationsApi.getVouchers).toHaveBeenCalledWith('org-1');
  });
});
