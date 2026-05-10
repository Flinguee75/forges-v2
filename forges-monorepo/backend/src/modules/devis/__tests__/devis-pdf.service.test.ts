jest.mock('child_process', () => ({
  execSync: jest.fn(() => {
    throw new Error('soffice not available');
  }),
}));

import { genererPdfDevis } from '../devis-pdf.service';

describe('genererPdfDevis', () => {
  it('retourne un PDF natif si soffice est indisponible', async () => {
    const buffer = await genererPdfDevis({
      devis: {
        numero_devis: 'FORGES-DEVIS-2026-999',
        created_at: new Date('2026-05-10T00:00:00.000Z'),
        nb_places: 3,
        tarif_unitaire_xof: 15000,
        montant_total_xof: 45000,
      },
      organisation: {
        raison_sociale: 'Organisation Test',
        email: 'orga@test.ci',
        contact_referent: 'Contact Test',
      },
      formation: {
        intitule: 'Formation Test',
      },
      session: {
        date_debut: new Date('2026-06-01T00:00:00.000Z'),
        date_fin: new Date('2026-06-11T00:00:00.000Z'),
      },
    });

    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });
});
