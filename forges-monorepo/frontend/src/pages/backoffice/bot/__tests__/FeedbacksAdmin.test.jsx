import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeedbacksAdmin from '../FeedbacksAdmin';

const mockedFeedbacks = {
  data: {
    feedbacks: [],
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
      options?.onSuccess?.(mockedFeedbacks);
      return mockedFeedbacks;
    }),
    isLoading: false,
    error: null,
    reset: vi.fn(),
  }),
}));

describe('FeedbacksAdmin', () => {
  it('affiche une indisponibilité runtime', async () => {
    render(<FeedbacksAdmin />);

    expect(await screen.findByText('Feedbacks formations')).toBeInTheDocument();
    expect(
      screen.getByText("Retours d'expérience des apprenants sur les formations")
    ).toBeInTheDocument();
    expect(screen.getByText('Aucun feedback')).toBeInTheDocument();
  });
});
