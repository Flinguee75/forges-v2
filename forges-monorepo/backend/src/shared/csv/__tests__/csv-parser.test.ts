import fs from 'fs';
import path from 'path';
import { getMissingHeaders, normalizeXofAmount, parseCsvTable } from '../csv-parser';

describe('csv-parser', () => {
  const fixturePath = path.resolve(__dirname, 'fixtures/apprenants-individuels-test.csv');

  it('parse le CSV apprenants attendu', () => {
    const csvContent = fs.readFileSync(fixturePath, 'utf-8');
    const table = parseCsvTable(csvContent);

    expect(table.headers).toEqual([
      'nom',
      'prenom',
      'email',
      'organisation',
      'secteur_activite',
      'pays_residence',
      'pays_nationalite',
      'tarif_xof',
    ]);
    expect(table.rows).toHaveLength(3);
    expect(table.rows[0]).toMatchObject({
      nom: 'DOGBA',
      prenom: 'Benjamin Belotte',
      email: 'redfoo923@gmail.com',
      organisation: 'Ministère de l’Intérieur et de la Sécurité',
      pays_residence: 'Côte d’Ivoire',
      pays_nationalite: 'Côte d’Ivoire',
      tarif_xof: '3000000',
    });
  });

  it('détecte les colonnes manquantes', () => {
    expect(getMissingHeaders(['nom', 'email'], ['nom', 'prenom', 'email'])).toEqual(['prenom']);
  });

  it('normalise les montants XOF', () => {
    expect(normalizeXofAmount('3 000 000')).toBe(3000000);
    expect(normalizeXofAmount('2 000 000')).toBe(2000000);
    expect(normalizeXofAmount('3000000')).toBe(3000000);
  });
});
