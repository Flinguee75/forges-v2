import { describe, expect, it } from 'vitest';
import { formatMontantXOF } from '../montant';

describe('formatMontantXOF', () => {
  it('formate une valeur XOF entiere', () => {
    expect(formatMontantXOF(7500)).toBe('7 500 FCFA');
  });

  it('retourne 0 FCFA pour la valeur zero', () => {
    expect(formatMontantXOF(0)).toBe('0 FCFA');
  });

  it('retourne 0 FCFA pour null', () => {
    expect(formatMontantXOF(null)).toBe('0 FCFA');
  });

  it('formate 150000 sans diviser par 100', () => {
    expect(formatMontantXOF(150000)).toBe('150 000 FCFA');
  });

  it('formate 5000 correctement', () => {
    expect(formatMontantXOF(5000)).toBe('5 000 FCFA');
  });
});
