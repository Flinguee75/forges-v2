import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DemandesContactAdmin from '../DemandesContactAdmin';

let mockedResponse = {
  data: {
    demandes: [],
    meta: {
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
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

describe('DemandesContactAdmin', () => {
  beforeEach(() => {
    mockedResponse = {
      data: {
        demandes: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        },
      },
    };
  });

  it('affiche une vue vide quand aucune demande n est disponible', async () => {
    render(<DemandesContactAdmin />);

    expect(await screen.findByText('Demandes de contact')).toBeInTheDocument();
    expect(
      screen.getByText('Demandes captées depuis le flux conseil organisation, avec le motif, le commentaire et l’organisation liée.')
    ).toBeInTheDocument();
    expect(screen.getByText('Aucune demande')).toBeInTheDocument();
  });

  it('affiche les demandes avec l organisation liée', async () => {
    mockedResponse = {
      data: {
        demandes: [
          {
            id: 'dc-01',
            statut: 'NOUVELLE',
            motif: 'Technique',
            commentaire: 'Besoin d aide sur les vouchers',
            type_utilisateur: 'ORGANISATION',
            session_bot_id: 'sess-bot-01',
            date_saisie: '2026-06-11T10:30:00.000Z',
            organisation: {
              raison_sociale: 'FORGES Org',
              contact_referent: 'Mme Diallo',
              email: 'orga@test.ci',
            },
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      },
    };

    render(<DemandesContactAdmin />);

    expect(await screen.findByText('FORGES Org')).toBeInTheDocument();
    expect(screen.getByText('Besoin d aide sur les vouchers')).toBeInTheDocument();
    expect(screen.getByText('Technique')).toBeInTheDocument();
    expect(screen.getByText(/sess-bot-01/)).toBeInTheDocument();
  });
});
