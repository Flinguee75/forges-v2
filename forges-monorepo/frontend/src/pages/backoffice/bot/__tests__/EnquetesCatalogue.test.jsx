import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EnquetesCatalogue from '../EnquetesCatalogue';

const mockedEnquetes = {
  data: {
    enquetes: [],
    meta: {
      total: 0,
      page: 1,
      totalPages: 1,
      limit: 10,
    },
  },
};

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn(async (_, options) => {
      options?.onSuccess?.(mockedEnquetes);
      return mockedEnquetes;
    }),
    isLoading: false,
    error: null,
    reset: vi.fn(),
  }),
}));

describe('EnquetesCatalogue', () => {
  it('affiche une indisponibilité runtime', async () => {
    render(<EnquetesCatalogue />);

    expect(await screen.findByText('Enquêtes formations')).toBeInTheDocument();
    expect(
      screen.getByText('Enquêtes de catalogue collectées via le Bot Conseiller')
    ).toBeInTheDocument();
    expect(screen.getByText('Aucune enquête')).toBeInTheDocument();
  });
});
