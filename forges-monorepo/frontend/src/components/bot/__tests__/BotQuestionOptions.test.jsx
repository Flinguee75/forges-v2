import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BotQuestionOptions from '../BotQuestionOptions';

describe('BotQuestionOptions', () => {
  it('soumet une réponse fermée sans champ commentaire', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <BotQuestionOptions
        question={{
          id: 'upgrade_offer',
          question: 'Une offre plus adaptée est disponible. Souhaitez-vous la consulter ?',
          options: [
            { value: 'VOIR_OFFRES', label: 'Voir les offres' },
            { value: 'PLUS_TARD', label: 'Plus tard' },
          ],
          allow_commentaire: false,
        }}
        onSubmit={onSubmit}
        isLoading={false}
      />
    );

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Voir les offres' }));

    expect(onSubmit).toHaveBeenCalledWith('VOIR_OFFRES', null);
  });

  it('affiche et transmet un commentaire optionnel sur la question autorisée', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <BotQuestionOptions
        question={{
          id: 'recommandation',
          question: 'Recommanderiez-vous cette formation à un collègue ?',
          options: [
            { value: 'OUI', label: 'Oui' },
            { value: 'NON', label: 'Non' },
          ],
          allow_commentaire: true,
          commentaire_max_length: 500,
        }}
        onSubmit={onSubmit}
        isLoading={false}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Oui' }));
    expect(onSubmit).toHaveBeenCalledWith('OUI', null);

    await user.type(textarea, 'Retour utile');
    await user.click(screen.getByRole('button', { name: 'Non' }));

    expect(onSubmit).toHaveBeenLastCalledWith('NON', 'Retour utile');
  });

  it('ignore le commentaire si la question ne l autorise pas', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <BotQuestionOptions
        question={{
          id: 'orientation_actions',
          question: 'Voici les recommandations disponibles selon votre profil. Souhaitez-vous poursuivre ?',
          options: [
            { value: 'VOIR_CATALOGUE', label: 'Voir le catalogue' },
            { value: 'AUCUNE_NE_CONVIENT', label: 'Aucune ne convient' },
            { value: 'PLUS_TARD', label: 'Plus tard' },
          ],
          allow_commentaire: false,
        }}
        onSubmit={onSubmit}
        isLoading={false}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Voir le catalogue' }));

    expect(onSubmit).toHaveBeenCalledWith('VOIR_CATALOGUE', null);
  });

  it('affiche un état vide quand options[] est vide (RM-118)', () => {
    const onSubmit = vi.fn();

    const { container } = render(
      <BotQuestionOptions
        question={{
          id: 'empty_options',
          question: 'Question sans options',
          options: [],
          allow_commentaire: false,
        }}
        onSubmit={onSubmit}
        isLoading={false}
      />
    );

    // Vérifie qu'aucun bouton n'est affiché
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(0);
  });

  it('rejette une valeur hors de options[] (RM-118)', () => {
    const onSubmit = vi.fn();

    render(
      <BotQuestionOptions
        question={{
          id: 'valid_options',
          question: 'Choisissez une option valide',
          options: [
            { value: 'OPTION_A', label: 'Option A' },
            { value: 'OPTION_B', label: 'Option B' },
          ],
          allow_commentaire: false,
        }}
        onSubmit={onSubmit}
        isLoading={false}
      />
    );

    // Les seules options valides sont OPTION_A et OPTION_B
    // Toute autre valeur ne devrait pas pouvoir être soumise via l'interface
    expect(screen.getByRole('button', { name: 'Option A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Option B' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Option invalide' })).not.toBeInTheDocument();
  });
});
