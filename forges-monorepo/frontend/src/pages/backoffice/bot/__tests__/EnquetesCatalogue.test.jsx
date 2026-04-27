import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import EnquetesCatalogue from '../EnquetesCatalogue';

describe('EnquetesCatalogue', () => {
  it('affiche une indisponibilité runtime', () => {
    render(<EnquetesCatalogue />);

    expect(screen.getByText('Enquêtes formations')).toBeInTheDocument();
    expect(screen.getByText('Enquêtes figées')).toBeInTheDocument();
  });
});
