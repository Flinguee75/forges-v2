import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BotMessagesContainer from '../BotMessagesContainer';

describe('BotMessagesContainer', () => {
  it('affiche le contexte de formation et les réponses réelles du feedback', () => {
    render(
      <MemoryRouter>
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
          userRole="APPRENANT"
          onSubmitResponse={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Pilotage de projet certifiant')).toBeInTheDocument();
    expect(screen.getByText('5/5', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Oui', { exact: true, selector: 'div' })).toBeInTheDocument();
  });

  it('n affiche pas de panneau d introduction parasite pour le flux conseil organisation', () => {
    render(
      <MemoryRouter>
        <BotMessagesContainer
          session={{
            statut: 'ACTIVE',
            flux_actif: 'CONSEIL',
            current_question: {
              id: 1,
              question: 'De quoi avez-vous besoin ?',
              options: [
                { value: 'Abonnement', label: 'Abonnement' },
                { value: 'Employés', label: 'Employés' },
                { value: 'Vouchers', label: 'Vouchers' },
                { value: 'Paiements', label: 'Paiements' },
                { value: 'Autre', label: 'Autre' },
              ],
            },
            historique: { steps: [] },
          }}
          userRole="ORGANISATION"
          onSubmitResponse={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.queryByText(/je peux vous aider à aller plus vite/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/je peux vous orienter vers l’action utile/i)).not.toBeInTheDocument();
    expect(screen.getByText('De quoi avez-vous besoin ?')).toBeInTheDocument();
  });

  it('affiche le texte descriptif du conseil sans montrer la fermeture du flux', () => {
    render(
      <MemoryRouter>
        <BotMessagesContainer
          session={{
            statut: 'ACTIVE',
            flux_actif: 'CONSEIL',
            current_question: {
              id: 1,
              question: 'De quoi avez-vous besoin ?',
              options: [
                { value: 'Abonnement', label: 'Abonnement' },
                { value: 'Employés', label: 'Employés' },
                { value: 'Vouchers', label: 'Vouchers' },
                { value: 'Paiements', label: 'Paiements' },
                { value: 'Autre', label: 'Autre' },
              ],
            },
            historique: {
              steps: [
                {
                  question_id: 1,
                  valeur: 'Abonnement',
                  answered_at: '2026-06-11T10:00:00.000Z',
                },
              ],
              metadata: {},
              result: {
                message: 'Vos abonnements sont accessibles depuis le menu Abonnement. Vous pouvez y gérer vos offres et le suivi de vos contrats.',
              },
            },
          }}
          userRole="ORGANISATION"
          onSubmitResponse={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/vos abonnements sont accessibles/i)).toBeInTheDocument();
    expect(screen.queryByText('Merci. À bientôt.')).not.toBeInTheDocument();
  });
});
