import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BotQuestion from './BotQuestion';

/**
 * Tests pour le composant BotQuestion
 * Référence: F-20 Tests composants v4.8 - RM-118
 *
 * RM-118: Toutes interactions en questions FERMÉES (options[]).
 * Aucune saisie libre sauf commentaire feedback.
 *
 * Couverture:
 * - Affichage de la question
 * - Gestion des questions vides
 * - Application des styles CSS
 */
describe('BotQuestion', () => {
  it('affiche correctement la question fournie', () => {
    const questionText = 'Souhaitez-vous consulter le catalogue de formations ?';

    render(<BotQuestion question={questionText} />);

    expect(screen.getByText(questionText)).toBeInTheDocument();
  });

  it('applique les classes CSS par défaut', () => {
    const questionText = 'Question de test';

    const { container } = render(<BotQuestion question={questionText} />);

    const questionDiv = container.querySelector('.bot-question-appear');
    expect(questionDiv).toBeInTheDocument();
    expect(questionDiv).toHaveClass('rounded-lg', 'border', 'border-border', 'bg-white', 'p-4', 'shadow-sm');
  });

  it('applique les classes CSS personnalisées via className prop', () => {
    const questionText = 'Question personnalisée';
    const customClass = 'custom-class';

    const { container } = render(
      <BotQuestion question={questionText} className={customClass} />
    );

    const questionDiv = container.querySelector('.bot-question-appear');
    expect(questionDiv).toHaveClass(customClass);
  });

  it('affiche un paragraphe avec les styles de texte appropriés', () => {
    const questionText = 'Texte de la question';

    const { container } = render(<BotQuestion question={questionText} />);

    const paragraph = container.querySelector('p');
    expect(paragraph).toBeInTheDocument();
    expect(paragraph).toHaveClass('text-sm', 'font-medium', 'leading-6', 'text-text');
    expect(paragraph).toHaveTextContent(questionText);
  });

  it('gère correctement une question vide', () => {
    const { container } = render(<BotQuestion question="" />);

    const paragraph = container.querySelector('p');
    expect(paragraph).toBeInTheDocument();
    expect(paragraph).toHaveTextContent('');
  });

  it('affiche une longue question sans truncation', () => {
    const longQuestion = 'Ceci est une très longue question qui contient beaucoup de texte pour tester que le composant peut gérer des questions de longueur variable sans problème de mise en page ou de truncation inappropriée.';

    render(<BotQuestion question={longQuestion} />);

    expect(screen.getByText(longQuestion)).toBeInTheDocument();
  });

  it('applique l\'animation bot-question-appear', () => {
    const questionText = 'Question animée';

    const { container } = render(<BotQuestion question={questionText} />);

    const questionDiv = container.querySelector('.bot-question-appear');
    expect(questionDiv).toBeInTheDocument();
  });
});
