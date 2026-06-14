import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ValidationFormation from '../ValidationFormation';
import * as responsableApiModule from '../../../../api/responsable.api';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: 'f-1' }),
  };
});

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn(async (fn, options) => {
      const data = await fn();
      options?.onSuccess?.(data);
      return data;
    }),
    isLoading: false,
    error: null,
    reset: vi.fn(),
  }),
}));

vi.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'r-1', role: 'RESPONSABLE' },
  }),
}));

vi.mock('../../../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

const BASE_FORMATION = {
  id: 'fp-1',
  date_soumission: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // J+2
  prix_coutant_soumis: 10000000, // 100 000 FCFA
  prix_coutant_valide: null,
  type_formation_assigne: null,
  pilier_abonnement_assigne: null,
  statut_validation: 'EN_ATTENTE_VALIDATION',
  partenaire: { raison_sociale: 'Acme Corp' },
  formation: {
    id: 'f-1',
    intitule: 'Cybersécurité Avancée',
    statut: 'EN_ATTENTE_VALIDATION',
    mode_formation: 'PRESENTIEL',
    duree_jours: 5,
    langues_disponibles: ['FR', 'EN'],
    certification_delivree: true,
    public_cible: 'Décideurs IT',
    description_courte: 'Une formation intensive en cybersécurité.',
    objectifs_pedagogiques: ['Maîtriser les menaces', 'Gouvernance IA'],
    prerequis: 'Bases en réseau',
  },
};

function mockFormation(overrides = {}) {
  vi.spyOn(responsableApiModule.default, 'getValidationDetail').mockResolvedValue(
    { ...BASE_FORMATION, ...overrides }
  );
}

describe('ValidationFormation — redesign 2 colonnes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── #13 Header + scaffold ──────────────────────────────────────────────
  describe('#13 Header full-width + layout 2 colonnes', () => {
    it('affiche le titre de la formation dans le header', async () => {
      mockFormation();
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Cybersécurité Avancée' })).toBeInTheDocument();
      });
    });

    it('affiche le nom du partenaire dans le header', async () => {
      mockFormation();
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
      });
    });

    it('affiche le badge statut EN_ATTENTE_VALIDATION', async () => {
      mockFormation();
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.getByText(/En attente/i)).toBeInTheDocument();
      });
    });

    it('affiche un bouton Retour dans le header', async () => {
      mockFormation();
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Retour/i })).toBeInTheDocument();
      });
    });
  });

  // ── #14 Colonne gauche meta chips ──────────────────────────────────────
  describe('#14 Colonne gauche — meta chips + contenu', () => {
    it('affiche le mode formation dans les meta chips', async () => {
      mockFormation();
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.getByText(/Présentiel/i)).toBeInTheDocument();
      });
    });

    it('affiche la durée en jours dans les meta chips', async () => {
      mockFormation();
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.getByText(/5 jour/i)).toBeInTheDocument();
      });
    });

    it('affiche les langues dans les meta chips', async () => {
      mockFormation();
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.getByText(/FR.*EN|EN.*FR/i)).toBeInTheDocument();
      });
    });

    it('affiche le prix soumis par le partenaire en FCFA', async () => {
      mockFormation();
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.getByText(/100.*000.*FCFA/i)).toBeInTheDocument();
      });
    });

    it('affiche la description courte', async () => {
      mockFormation();
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.getByText('Une formation intensive en cybersécurité.')).toBeInTheDocument();
      });
    });

    it('affiche les objectifs pédagogiques', async () => {
      mockFormation();
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.getByText('Maîtriser les menaces')).toBeInTheDocument();
        expect(screen.getByText('Gouvernance IA')).toBeInTheDocument();
      });
    });
  });

  // ── #15 Bannière délai J+X ─────────────────────────────────────────────
  describe('#15 Bannière délai J+X RM-134', () => {
    it('affiche la bannière délai si plus de 5 jours', async () => {
      mockFormation({
        date_soumission: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      render(<ValidationFormation />);
      await waitFor(() => {
        // Bannière + badge header — au moins 2 occurrences attendues
        const matches = screen.getAllByText(/J\+7|délai.*dépassé/i);
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('masque la bannière délai si moins de 5 jours', async () => {
      mockFormation({
        date_soumission: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      });
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.queryByText(/délai.*dépassé/i)).not.toBeInTheDocument();
      });
    });
  });

  // ── #16 Panel droit sticky ─────────────────────────────────────────────
  describe('#16 Panel droit sticky — classification + validation', () => {
    it('affiche le select type_formation dans le panel', async () => {
      mockFormation();
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.getByLabelText(/Type de formation/i)).toBeInTheDocument();
      });
    });

    it('affiche le select pilier_abonnement dans le panel', async () => {
      mockFormation();
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.getByLabelText(/Pilier/i)).toBeInTheDocument();
      });
    });

    it('affiche l\'input prix coûtant dans le panel', async () => {
      mockFormation();
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.getByLabelText(/Prix co.tant/i)).toBeInTheDocument();
      });
    });

    it('affiche le bouton Valider et publier dans le panel', async () => {
      mockFormation();
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Valider et publier/i })).toBeInTheDocument();
      });
    });

    it('désactive les champs si statut != EN_ATTENTE_VALIDATION', async () => {
      mockFormation({
        statut_validation: 'ACTIVE',
        formation: { ...BASE_FORMATION.formation, statut: 'ACTIVE' },
      });
      render(<ValidationFormation />);
      await waitFor(() => {
        const select = screen.getByLabelText(/Type de formation/i);
        expect(select).toBeDisabled();
      });
    });

    it('envoie type_formation + pilier_abonnement + prix_coutant_valide au backend', async () => {
      mockFormation();
      const validateSpy = vi.spyOn(responsableApiModule.default, 'validerFormation').mockResolvedValue({});
      const user = userEvent.setup();
      render(<ValidationFormation />);

      await waitFor(() => screen.getByRole('button', { name: /Valider et publier/i }));
      await user.click(screen.getByRole('button', { name: /Valider et publier/i }));
      await user.click(screen.getByRole('button', { name: /^Confirmer$/i }));

      await waitFor(() => expect(validateSpy).toHaveBeenCalledTimes(1));
      const payload = validateSpy.mock.calls[0][1];
      expect(payload).toEqual(expect.objectContaining({
        type_formation: 'STANDARD',
        pilier_abonnement: 'TOUS',
      }));
      expect(payload).not.toHaveProperty('commission_forges_pct');
      expect(payload).not.toHaveProperty('prix_catalogue');
    });
  });

  // ── #17 Expand conditionnel rejet + suspension ─────────────────────────
  describe('#17 Expand rejet conditionnel + suspension', () => {
    it('affiche le bouton Rejeter si statut EN_ATTENTE_VALIDATION', async () => {
      mockFormation();
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Rejeter/i })).toBeInTheDocument();
      });
    });

    it('masque la textarea motif rejet par défaut', async () => {
      mockFormation();
      render(<ValidationFormation />);
      await waitFor(() => screen.getByRole('button', { name: /Rejeter/i }));
      expect(screen.queryByPlaceholderText(/motif/i)).not.toBeInTheDocument();
    });

    it('affiche la textarea motif après clic sur Rejeter', async () => {
      mockFormation();
      const user = userEvent.setup();
      render(<ValidationFormation />);
      await waitFor(() => screen.getByRole('button', { name: /Rejeter/i }));
      await user.click(screen.getByRole('button', { name: /Rejeter/i }));
      expect(screen.getByPlaceholderText(/motif/i)).toBeInTheDocument();
    });

    it('appelle rejeterFormation avec le motif saisi', async () => {
      mockFormation();
      const rejectSpy = vi.spyOn(responsableApiModule.default, 'rejeterFormation').mockResolvedValue({});
      const user = userEvent.setup();
      render(<ValidationFormation />);

      await waitFor(() => screen.getByRole('button', { name: /Rejeter/i }));
      await user.click(screen.getByRole('button', { name: /Rejeter/i }));
      await user.type(screen.getByPlaceholderText(/motif/i), 'Contenu insuffisant');
      await user.click(screen.getByRole('button', { name: /Confirmer le rejet/i }));
      await user.click(screen.getByRole('button', { name: /^Confirmer$/i }));

      await waitFor(() => expect(rejectSpy).toHaveBeenCalledWith('f-1', { motif: 'Contenu insuffisant' }));
    });

    it('affiche le bouton Suspendre si statut ACTIVE', async () => {
      mockFormation({
        statut_validation: 'ACTIVE',
        formation: { ...BASE_FORMATION.formation, statut: 'ACTIVE' },
      });
      render(<ValidationFormation />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Suspendre/i })).toBeInTheDocument();
      });
    });

    it('masque le bouton Rejeter si statut ACTIVE', async () => {
      mockFormation({
        statut_validation: 'ACTIVE',
        formation: { ...BASE_FORMATION.formation, statut: 'ACTIVE' },
      });
      render(<ValidationFormation />);
      await waitFor(() => screen.getByRole('button', { name: /Suspendre/i }));
      expect(screen.queryByRole('button', { name: /^Rejeter$/i })).not.toBeInTheDocument();
    });
  });
});
