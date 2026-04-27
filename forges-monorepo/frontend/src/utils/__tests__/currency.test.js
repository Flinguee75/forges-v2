import { describe, expect, it } from 'vitest';
import { formatCurrency, formatCurrencyStandard, centimesToXOF, xofToCentimes } from '../currency';

describe('currency utils', () => {
  describe('formatCurrency', () => {
    it('formate correctement 200 millions de centimes en 2 millions XOF', () => {
      const result = formatCurrency(200000000);
      expect(result).toContain('2');
      expect(result).toContain('000');
      expect(result).toContain('FCFA');
      expect(centimesToXOF(200000000)).toBe(2000000);
    });

    it('formate correctement des petits montants', () => {
      expect(formatCurrency(50000)).toContain('500');
      expect(formatCurrency(50000)).toContain('FCFA');
      expect(formatCurrency(100)).toContain('1');
      expect(formatCurrency(100)).toContain('FCFA');
    });

    it('gère les valeurs nulles et undefined', () => {
      expect(formatCurrency(null)).toBe('0 FCFA');
      expect(formatCurrency(undefined)).toBe('0 FCFA');
      expect(formatCurrency(0)).toBe('0 FCFA');
    });

    it('arrondit correctement les valeurs décimales', () => {
      expect(formatCurrency(15050)).toBe('151 FCFA'); // 150.5 → 151
      expect(formatCurrency(15049)).toBe('150 FCFA'); // 150.49 → 150
    });
  });

  describe('formatCurrencyStandard', () => {
    it('formate avec le symbole XOF standard', () => {
      const result = formatCurrencyStandard(200000000);
      expect(result).toContain('2');
      expect(result).toContain('000');
      // Intl.NumberFormat affiche "F CFA" pour la devise XOF
      expect(result).toMatch(/F\s*CFA|XOF/);
    });
  });

  describe('centimesToXOF', () => {
    it('convertit correctement 200 millions centimes en 2 millions XOF', () => {
      expect(centimesToXOF(200000000)).toBe(2000000);
    });

    it('arrondit correctement', () => {
      expect(centimesToXOF(15050)).toBe(151);
      expect(centimesToXOF(15049)).toBe(150);
    });

    it('gère les valeurs nulles', () => {
      expect(centimesToXOF(null)).toBe(0);
      expect(centimesToXOF(undefined)).toBe(0);
    });
  });

  describe('xofToCentimes', () => {
    it('convertit correctement 2 millions XOF en 200 millions centimes', () => {
      expect(xofToCentimes(2000000)).toBe(200000000);
    });

    it('arrondit correctement', () => {
      expect(xofToCentimes(150.5)).toBe(15050);
      expect(xofToCentimes(150.49)).toBe(15049);
    });

    it('gère les valeurs nulles', () => {
      expect(xofToCentimes(null)).toBe(0);
      expect(xofToCentimes(undefined)).toBe(0);
    });
  });

  describe('cas réels du seed PEJEDEC', () => {
    it('200000000 centimes = 2 000 000 FCFA', () => {
      const result = formatCurrency(200000000);
      expect(result).toContain('2');
      expect(result).toContain('000');
      expect(result).toContain('000');
      expect(result).toContain('FCFA');
      expect(centimesToXOF(200000000)).toBe(2000000);
    });

    it('2000000000 centimes = 20 000 000 FCFA', () => {
      const result = formatCurrency(2000000000);
      expect(result).toContain('20');
      expect(result).toContain('FCFA');
      expect(centimesToXOF(2000000000)).toBe(20000000);
    });

    it('1200000000 centimes = 12 000 000 FCFA', () => {
      const result = formatCurrency(1200000000);
      expect(result).toContain('12');
      expect(result).toContain('FCFA');
      expect(centimesToXOF(1200000000)).toBe(12000000);
    });
  });
});
