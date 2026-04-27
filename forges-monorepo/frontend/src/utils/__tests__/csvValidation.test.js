import { describe, expect, it } from 'vitest';
import { buildB2BImportPayload, parseB2BMembersCsv, validateB2BImportRows } from '../csvValidation';

describe('csvValidation', () => {
  it('parse un CSV simple avec en-tete', () => {
    const rows = parseB2BMembersCsv('email,nom,prenom\nfoo@test.com,Foo,Bar');
    expect(rows).toEqual([
      { email: 'foo@test.com', nom: 'Foo', prenom: 'Bar' },
    ]);
  });

  it('dedoublonne les emails et signale les erreurs', () => {
    const result = validateB2BImportRows([
      { email: 'foo@test.com', nom: 'Foo', prenom: 'Bar' },
      { email: 'FOO@test.com', nom: 'Duplicate', prenom: 'Row' },
      { email: '', nom: 'No', prenom: 'Email' },
    ]);

    expect(result.rows).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
  });

  it('bloque au dessus de 100 lignes', () => {
    const payload = buildB2BImportPayload(Array.from({ length: 101 }, (_, index) => `user${index}@test.com,Nom,Prenom`).join('\n'));
    expect(payload.isValid).toBe(false);
    expect(payload.errors[0].message).toMatch(/100/);
  });
});
