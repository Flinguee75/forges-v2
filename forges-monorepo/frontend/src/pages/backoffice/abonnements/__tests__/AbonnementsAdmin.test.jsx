import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AbonnementsAdmin from '../AbonnementsAdmin';

describe('AbonnementsAdmin', () => {
  it('affiche un état figé explicite sans faux formulaire', () => {
    render(<AbonnementsAdmin />);

    expect(screen.getByText('Vue consolidée des abonnements')).toBeInTheDocument();
    expect(screen.getByText('Abonnements figés')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Les vues Retail, B2B et Organisation seront réactivées quand le backend sera prêt.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
