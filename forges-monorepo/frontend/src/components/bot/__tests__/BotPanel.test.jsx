import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import BotPanel from '../BotPanel';

describe('BotPanel', () => {
  it('affiche l’historique, la question actuelle et les recommandations', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onRetry = vi.fn();
    const onRestart = vi.fn();
    const onSubmitResponse = vi.fn();

    render(
      <BrowserRouter>
        <BotPanel
          session={{
            id: 'session-1',
            flux_actif: 'ORIENTATION',
            statut: 'ACTIVE',
            current_question: {
              id: 'orientation_actions',
              question: 'Voici les recommandations disponibles selon votre profil. Souhaitez-vous poursuivre ?',
              options: [
                { value: 'VOIR_CATALOGUE', label: 'Voir le catalogue' },
                { value: 'AUCUNE_NE_CONVIENT', label: 'Aucune ne convient' },
                { value: 'PLUS_TARD', label: 'Plus tard' },
              ],
              recommendations: [
                {
                  id: 'f-1',
                  titre: 'Formation recommandée',
                  description: 'Parcours adapté',
                  tarif: 500000,
                  duree: 24,
                  type_formation: 'PREMIUM',
                  inclus_abonnement: true,
                },
              ],
            },
            historique: {
              steps: [
                {
                  question_id: 'upgrade_offer',
                  value: 'VOIR_OFFRES',
                  commentaire: 'Très utile',
                  answered_at: '2026-04-01T10:00:00.000Z',
                },
              ],
              metadata: {
                orientation: {
                  cout_estime: 500000,
                  palier_recommande: 'STARTER',
                },
              },
              result: null,
            },
          }}
          isLoading={false}
          error={null}
          onClose={onClose}
          onRetry={onRetry}
          onRestart={onRestart}
          onSubmitResponse={onSubmitResponse}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Historique')).toBeInTheDocument();
    expect(screen.getByText(/Une offre plus adaptée est disponible/)).toBeInTheDocument();
    expect(screen.getByText('Voir les offres')).toBeInTheDocument();
    expect(screen.getByText('Formation recommandée')).toBeInTheDocument();
    expect(screen.getByText(/Coût estimé:/)).toBeInTheDocument();
    expect(screen.getByText(/Palier recommandé:/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Voir le catalogue' }));

    expect(onSubmitResponse).toHaveBeenCalledWith('VOIR_CATALOGUE', null);
  });

  it('affiche un CTA Voir les offres quand un flux upgrade termine avec target_path', () => {
    const onClose = vi.fn();

    render(
      <BrowserRouter>
        <BotPanel
          session={{
            id: 'session-upgrade',
            flux_actif: 'UPGRADE',
            statut: 'TERMINEE',
            current_question: null,
            historique: {
              steps: [],
              metadata: {
                upgrade: {
                  target_path: '/apprenant/abonnement',
                },
              },
              result: {
                action: 'VOIR_OFFRES',
                target_path: '/apprenant/abonnement',
              },
            },
          }}
          isLoading={false}
          error={null}
          onClose={onClose}
          onRetry={vi.fn()}
          onRestart={vi.fn()}
          onSubmitResponse={vi.fn()}
        />
      </BrowserRouter>
    );

    const cta = screen.getByRole('link', { name: 'Voir les offres' });
    expect(cta).toHaveAttribute('href', '/apprenant/abonnement');
  });
});
