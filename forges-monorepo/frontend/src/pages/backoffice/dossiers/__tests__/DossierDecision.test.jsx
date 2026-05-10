import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const navigateMock = vi.fn();
const executeMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'dossier-01' }),
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { role: 'ADMIN' } }),
}));

vi.mock('../../../../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({ execute: executeMock, isLoading: false }),
}));

vi.mock('../../../../api/inscriptions.api', () => ({
  inscriptionsApi: {
    getByIdBackoffice: vi.fn(),
    retenir: vi.fn(),
    refuser: vi.fn(),
    traiterException: vi.fn(),
  },
}));

import DossierDecision from '../DossierDecision';
import { inscriptionsApi } from '../../../../api/inscriptions.api';

describe('DossierDecision', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    executeMock.mockImplementation(async (apiCall, options = {}) => {
      const result = await apiCall();
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      return result;
    });
  });

  it('affiche les informations détaillées du dossier depuis la réponse enveloppée', async () => {
    inscriptionsApi.getByIdBackoffice.mockResolvedValueOnce({
      statusCode: 200,
      data: {
        id: 'dossier-01',
        statut: 'PAYE',
        source_financement: 'VOUCHER',
        type_fenetre: 'NORMAL',
        created_at: '2026-05-10T00:00:00.000Z',
        motif_refus: null,
        apprenant: {
          nom: 'Cisse',
          prenoms: 'Tidiane',
          email: 'tidiane@example.com',
          type_apprenant: 'APPRENANT',
          pays_residence: 'Côte d’Ivoire',
          pays_nationalite: 'Sénégal',
          secteur_activite: 'IT',
          niveau_etude: 'Master',
          organisation: {
            raison_sociale: 'Forges Org',
            email: 'org@example.com',
            type: 'ENTREPRISE',
            contact_referent: 'Mme Test',
            pays: 'Côte d’Ivoire',
          },
        },
        formation: {
          intitule: 'Masterclass Cyber',
          type_formation: 'PREMIUM',
          mode_formation: 'AVEC_SESSION',
          cout_catalogue: 150000,
        },
        session: {
          date_debut: '2026-06-01T00:00:00.000Z',
          date_fin: '2026-06-11T00:00:00.000Z',
          statut: 'PLANIFIEE',
          lieu: 'Abidjan',
          capacite: 20,
          nb_inscrits: 5,
          places_restantes: 15,
        },
        voucher_organisation: {
          code: 'VCHR-001',
          statut: 'ACTIF',
          quota_utilise: 0,
          quota_max: 1,
          date_expiration: '2026-06-11T00:00:00.000Z',
        },
        paiement: {
          statut: 'CONFIRME',
          methode: 'VOUCHER_ORG',
          montant_catalogue: 150000,
          montant_final: 150000,
          reduction_appliquee: 0,
          confirmed_at: '2026-05-10T00:00:00.000Z',
        },
      },
    });

    render(<DossierDecision />);

    expect(await screen.findByText(/Dossier de Cisse Tidiane/i)).toBeInTheDocument();
    expect(screen.getByText('Forges Org')).toBeInTheDocument();
    expect(screen.getByText('Masterclass Cyber')).toBeInTheDocument();
    expect(screen.getByText('Abidjan')).toBeInTheDocument();
    expect(screen.getByText(/VCHR-001 \(ACTIF\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/150\s?000 FCFA/i).length).toBeGreaterThan(0);
    expect(screen.getByText('15')).toBeInTheDocument();
  });
});
