import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContratInstitutionnel from '../ContratInstitutionnel';

describe('ContratInstitutionnel', () => {
  it('affiche un état figé explicite sans formulaire runtime', () => {
    render(<ContratInstitutionnel />);

    expect(screen.getByText('Contrat institutionnel')).toBeInTheDocument();
    expect(screen.getByText('Contrats figés')).toBeInTheDocument();
    expect(
      screen.getByText("La gestion institutionnelle pourra être rebranchée sans changer l'UI.")
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Organisation/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
