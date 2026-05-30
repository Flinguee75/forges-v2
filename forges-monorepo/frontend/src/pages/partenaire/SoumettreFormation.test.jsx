import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import SoumettreFormation from './SoumettreFormation';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { soumettreFormation } from '../../api/partenaires.api';

const mockNavigate = vi.fn();
const mockExecute = vi.fn();
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();

vi.mock('../../hooks/useApi', () => ({
  useApi: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/partenaires.api', () => ({
  soumettreFormation: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('SoumettreFormation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useApi.mockReturnValue({
      execute: mockExecute,
      isLoading: false,
    });

    useAuth.mockReturnValue({
      user: { role: 'PARTENAIRE', langue_preferee: 'FR' },
    });

    useToast.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
    });

    mockExecute.mockImplementation(async (apiCall) => apiCall());
    soumettreFormation.mockResolvedValue({ id: 'formation-1' });
  });

  it('n expose jamais type_formation ni pilier_abonnement (RM-127)', () => {
    const { container } = renderWithProviders(<SoumettreFormation />);

    // Vérifier qu'il n'y a pas de select ou input avec ces noms
    const typeFormationInput = container.querySelector('input[name="type_formation"], select[name="type_formation"]');
    const pilierAbonnementInput = container.querySelector('input[name="pilier_abonnement"], select[name="pilier_abonnement"]');

    expect(typeFormationInput).toBeNull();
    expect(pilierAbonnementInput).toBeNull();

    // Vérifier que seul le prix coûtant est présent (pas les champs de classification FORGES)
    expect(screen.getByText(/Prix.*co[ûu]tant/i)).toBeInTheDocument();
  });

  it('permet la sauvegarde en brouillon avant la soumission complete', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SoumettreFormation />);

    await user.click(screen.getByRole('button', { name: /sauvegarder en brouillon/i }));

    await waitFor(() => {
      expect(soumettreFormation).toHaveBeenCalledTimes(1);
      expect(soumettreFormation).toHaveBeenCalledWith(expect.any(Object), true);
      expect(mockShowSuccess).toHaveBeenCalledWith('Brouillon enregistre.');
      expect(mockNavigate).toHaveBeenCalledWith('/partenaire/formations');
    });
  });

  it('soumet une formation complete avec montants en centimes et sans champs FORGES readonly', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SoumettreFormation />);

    await user.type(screen.getByLabelText(/^Titre$/i), 'Cyber Defense Bootcamp');
    await user.type(screen.getByLabelText(/^Domaine$/i), 'Cybersécurité');
    await user.type(screen.getByLabelText(/Public cible/i), 'Responsables sécurité');
    await user.type(screen.getByLabelText(/^Description$/i), 'Formation opérationnelle SOC et réponse incident.');
    await user.type(screen.getByLabelText(/Objectifs/i), 'Diagnostiquer les incidents\nPiloter la réponse');
    await user.type(screen.getByLabelText(/Programme/i), 'Jour 1 SOC\nJour 2 incident response');
    await user.type(screen.getByLabelText(/Competences/i), 'Investigation, containment, reporting');
    await user.selectOptions(screen.getByLabelText(/Mode/i), 'A_LA_DEMANDE');
    await user.type(screen.getByLabelText(/Duree/i), '24');
    await user.type(screen.getByLabelText(/Capacite/i), '30');
    await user.type(screen.getByLabelText(/Prix coutant/i), '125000');
    await user.type(screen.getByLabelText(/URL du contenu/i), 'https://lms.forges.test/formations/cyber-defense');

    await user.click(screen.getByRole('button', { name: /soumettre pour validation/i }));

    await waitFor(() => expect(soumettreFormation).toHaveBeenCalledTimes(1));

    const [payload, brouillon] = soumettreFormation.mock.calls[0];
    expect(brouillon).toBe(false);
    expect(payload).toEqual(expect.objectContaining({
      titre: 'Cyber Defense Bootcamp',
      duree_heures: 24,
      capacite_max: 30,
      prix_coutant: 12500000,
      mode_formation: 'A_LA_DEMANDE',
      url_contenu: 'https://lms.forges.test/formations/cyber-defense',
    }));
    expect(payload).not.toHaveProperty('type_formation');
    expect(payload).not.toHaveProperty('pilier_abonnement');
    expect(mockShowSuccess).toHaveBeenCalledWith('Formation soumise pour validation. Delai estime : 5 jours ouvres.');
  });

  it('bloque la soumission incomplete avant appel API', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SoumettreFormation />);

    await user.click(screen.getByRole('button', { name: /soumettre pour validation/i }));

    expect(soumettreFormation).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalledWith('Veuillez corriger les erreurs du formulaire.');
    expect(screen.getAllByText('Champ obligatoire').length).toBeGreaterThan(0);
  });

  it('exige un lieu pour une formation avec session en presentiel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SoumettreFormation />);

    await user.type(screen.getByLabelText(/^Titre$/i), 'Atelier sécurité');
    await user.type(screen.getByLabelText(/^Domaine$/i), 'Cybersécurité');
    await user.type(screen.getByLabelText(/Public cible/i), 'Managers IT');
    await user.type(screen.getByLabelText(/^Description$/i), 'Atelier de sécurité applicative.');
    await user.type(screen.getByLabelText(/Objectifs/i), 'Comprendre les risques');
    await user.type(screen.getByLabelText(/Programme/i), 'Menaces, contrôles, exercices');
    await user.type(screen.getByLabelText(/Competences/i), 'Analyse de risque');
    await user.selectOptions(screen.getByLabelText(/Modalite/i), 'PRESENTIEL');
    await user.type(screen.getByLabelText(/Duree/i), '8');
    await user.type(screen.getByLabelText(/Capacite/i), '15');
    await user.type(screen.getByLabelText(/Prix coutant/i), '50000');
    await user.click(screen.getByRole('button', { name: /soumettre pour validation/i }));

    expect(soumettreFormation).not.toHaveBeenCalled();
    expect(screen.getByText('Le lieu est requis pour les formations en presentiel ou hybrides')).toBeInTheDocument();
  });
});
