import { describe, expect, it } from 'vitest';
import { getDossierStatutMeta, getPaiementMeta } from '../dossierStatus';

describe('dossierStatus utils', () => {
  it('rend PAYE_DIRECTEMENT plus explicite', () => {
    const meta = getDossierStatutMeta('PAYE_DIRECTEMENT');

    expect(meta.variant).toBe('warning');
    expect(meta.label).toBe('Paiement requis');
  });

  it('distingue un paiement en attente d un dossier a initier', () => {
    const paiementMeta = getPaiementMeta({ statut: 'EN_ATTENTE' }, 'PAYE_DIRECTEMENT');

    expect(paiementMeta.variant).toBe('warning');
    expect(paiementMeta.label).toBe('Paiement initié');
  });

  it('retourne un fallback quand aucun paiement n existe', () => {
    const paiementMeta = getPaiementMeta(null, 'PAYE_DIRECTEMENT');

    expect(paiementMeta.variant).toBe('warning');
    expect(paiementMeta.label).toBe('Paiement requis');
  });
});
