import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeedbacksAdmin from '../FeedbacksAdmin';

let mockedResponse = {
  data: {
    feedbacks: [],
    grouped_feedbacks: [],
    meta: {
      total: 0,
      moyenne_globale: 0,
      taux_recommandation: 0,
    },
  },
};

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn(async (_, options) => {
      options?.onSuccess?.(mockedResponse);
      return mockedResponse;
    }),
    isLoading: false,
    error: null,
    reset: vi.fn(),
  }),
}));

describe('FeedbacksAdmin', () => {
  beforeEach(() => {
    mockedResponse = {
      data: {
        feedbacks: [],
        grouped_feedbacks: [],
        meta: {
          total: 0,
          moyenne_globale: 0,
          taux_recommandation: 0,
        },
      },
    };
  });

  it('affiche une vue vide quand aucun feedback n’est disponible', async () => {
    render(<FeedbacksAdmin />);

    expect(await screen.findByText('Feedbacks formations')).toBeInTheDocument();
    expect(
      screen.getByText("Retours d'expérience des apprenants regroupés par formation avec la session associée.")
    ).toBeInTheDocument();
    expect(screen.getByText('Aucun feedback')).toBeInTheDocument();
  });

  it('affiche les feedbacks regroupés par formation avec la session associée', async () => {
    mockedResponse = {
      data: {
        feedbacks: [
          {
            id: 'fb-01',
            note_globale: 5,
            recommande: true,
            canal: 'BOT',
            date_saisie: '2026-06-10T09:40:00.000Z',
            commentaire_libre: 'Très clair',
            session: {
              id: 'sess-01',
              date_debut: '2026-06-05T09:00:00.000Z',
              date_fin: '2026-06-10T17:00:00.000Z',
              statut: 'CLOTUREE',
            },
            apprenant: {
              nom: 'Doe',
              prenoms: 'Jane',
              email: 'jane.doe@example.com',
            },
            formation: {
              id: 'form-01',
              intitule: 'Pilotage de projet certifiant',
              partenaire: { raison_sociale: 'FORGES' },
            },
          },
        ],
        grouped_feedbacks: [
          {
            formation: {
              id: 'form-01',
              intitule: 'Pilotage de projet certifiant',
              partenaire: { raison_sociale: 'FORGES' },
            },
            meta: {
              total: 1,
              moyenne_globale: 5,
              taux_recommandation: 100,
            },
            feedbacks: [
              {
                id: 'fb-01',
                note_globale: 5,
                recommande: true,
                canal: 'BOT',
                date_saisie: '2026-06-10T09:40:00.000Z',
                commentaire_libre: 'Très clair',
                session: {
                  id: 'sess-01',
                  date_debut: '2026-06-05T09:00:00.000Z',
                  date_fin: '2026-06-10T17:00:00.000Z',
                  statut: 'CLOTUREE',
                },
                apprenant: {
                  nom: 'Doe',
                  prenoms: 'Jane',
                  email: 'jane.doe@example.com',
                },
              },
            ],
          },
        ],
        meta: {
          total: 1,
          moyenne_globale: 5,
          taux_recommandation: 100,
        },
      },
    };

    render(<FeedbacksAdmin />);

    expect(await screen.findByText('Pilotage de projet certifiant')).toBeInTheDocument();
    expect(screen.getByText(/Session sess-01/)).toBeInTheDocument();
    expect(screen.getByText('Très clair')).toBeInTheDocument();
  });
});
