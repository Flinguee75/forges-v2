import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContratInstitutionnel from '../ContratInstitutionnel';

const mockedContrats = {
  data: {
    contrats: [],
    meta: {
      total: 0,
      page: 1,
      limit: 20,
    },
    stats: {
      actifs: 0,
      brouillons: 0,
      expires: 0,
    },
  },
};

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn(async (_, options) => {
      options?.onSuccess?.(mockedContrats);
      return mockedContrats;
    }),
    isLoading: false,
    error: null,
    reset: vi.fn(),
  }),
}));

describe('ContratInstitutionnel', () => {
  it('affiche la vue backoffice des contrats institutionnels', async () => {
    render(<ContratInstitutionnel />);

    expect(await screen.findByText('Contrat institutionnel')).toBeInTheDocument();
    expect(screen.getByText('Contrats')).toBeInTheDocument();
    expect(screen.getByText('Actifs')).toBeInTheDocument();
    expect(screen.getByText('Brouillons')).toBeInTheDocument();
    expect(screen.getByText('Expirés')).toBeInTheDocument();
    expect(screen.getByText('Aucun contrat institutionnel')).toBeInTheDocument();
    expect(
      screen.getByText("Aucun contrat institutionnel n'est disponible pour le moment.")
    ).toBeInTheDocument();
  });
});
