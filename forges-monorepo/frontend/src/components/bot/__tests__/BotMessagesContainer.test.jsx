import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BotMessagesContainer from '../BotMessagesContainer';

describe('BotMessagesContainer', () => {
  it('affiche le contexte de formation et les réponses réelles du feedback', () => {
    render(
      <BotMessagesContainer
        session={{
          statut: 'ACTIVE',
          flux_actif: 'FEEDBACK',
          current_question: {
            id: 'feedback_recommande',
            question: 'Recommanderiez-vous cette formation à un collègue ?',
            options: [
              { value: 'OUI', label: 'Oui' },
              { value: 'NON', label: 'Non' },
            ],
          },
          historique: {
            steps: [
              {
                question_id: 'feedback_note_globale',
                valeur: '5',
                answered_at: '2026-06-10T10:00:00.000Z',
              },
              {
                question_id: 'feedback_recommande',
                valeur: 'OUI',
                answered_at: '2026-06-10T10:02:00.000Z',
              },
            ],
            metadata: {
              feedback: {
                formation_intitule: 'Pilotage de projet certifiant',
                session_id: 'session-demo-01',
              },
            },
          },
        }}
        onSubmitResponse={vi.fn()}
      />
    );

    expect(screen.getByText('Pilotage de projet certifiant')).toBeInTheDocument();
    expect(screen.getByText(/session-demo-01/)).toBeInTheDocument();
    expect(screen.getByText('5/5', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Oui', { exact: true, selector: 'div' })).toBeInTheDocument();
  });
});
