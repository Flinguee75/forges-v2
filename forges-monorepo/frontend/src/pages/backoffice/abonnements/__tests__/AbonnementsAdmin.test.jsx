import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AbonnementsAdmin from '../AbonnementsAdmin';

const mockedAbonnements = {
  data: {
    retail: [],
    organisation: [],
    b2b: [],
    meta: {
      total_retail: 0,
      total_organisation: 0,
      total_b2b: 0,
    },
  },
};

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn(async (_, options) => {
      options?.onSuccess?.(mockedAbonnements);
      return mockedAbonnements;
    }),
    isLoading: false,
    error: null,
    reset: vi.fn(),
  }),
}));

describe('AbonnementsAdmin', () => {
  it('affiche un état figé explicite sans faux formulaire', async () => {
    render(<AbonnementsAdmin />);

    expect(await screen.findByText('Vue consolidée des abonnements')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Gestion centralisée des abonnements Retail, Organisation et B2B'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Aucun abonnement retail')).toBeInTheDocument();
    expect(screen.getByText('Aucun abonnement organisation')).toBeInTheDocument();
    expect(screen.getByText('Aucun abonnement B2B')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
