import PizZip from 'pizzip';
import { genererDocxDevis } from '../devis-docx.service';

function extractDocumentXml(buffer: Buffer): string {
  const zip = new PizZip(buffer);
  return zip.file('word/document.xml')?.asText() || '';
}

describe('genererDocxDevis', () => {
  it('inclut le numéro de contact dans le DOCX officiel', () => {
    const buffer = genererDocxDevis({
      numero_devis: 'FORGES-DEVIS-2026-001',
      created_at: new Date('2026-05-10T00:00:00.000Z'),
      nb_places: 3,
      tarif_unitaire_xof: 15000,
      montant_total_xof: 45000,
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

    const documentXml = extractDocumentXml(buffer);
    expect(documentXml).toContain('+225 05 04 08 43 84');
  });
});
