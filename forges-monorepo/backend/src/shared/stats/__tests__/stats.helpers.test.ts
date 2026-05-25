import { xofToCentimes, buildDateCondition } from '../stats.helpers';

describe('xofToCentimes', () => {
  it('converts positive XOF to centimes', () => {
    expect(xofToCentimes(1000)).toBe(100000);
  });
  it('returns 0 for null', () => {
    expect(xofToCentimes(null)).toBe(0);
  });
  it('returns 0 for undefined', () => {
    expect(xofToCentimes(undefined)).toBe(0);
  });
  it('handles fractional XOF', () => {
    expect(xofToCentimes(1.5)).toBe(150);
  });
});

describe('buildDateCondition', () => {
  it('returns null when no dates provided', () => {
    expect(buildDateCondition()).toBeNull();
  });
  it('builds gte condition from dateFrom only', () => {
    const result = buildDateCondition('2025-01-01');
    expect(result).toEqual({ created_at: { gte: new Date('2025-01-01') } });
  });
  it('builds lte condition from dateTo only', () => {
    const result = buildDateCondition(undefined, '2025-12-31');
    expect(result).toEqual({ created_at: { lte: new Date('2025-12-31') } });
  });
  it('builds gte+lte condition from both dates', () => {
    const result = buildDateCondition('2025-01-01', '2025-12-31');
    expect(result).toEqual({
      created_at: {
        gte: new Date('2025-01-01'),
        lte: new Date('2025-12-31'),
      },
    });
  });
  it('accepts Date objects directly', () => {
    const from = new Date('2025-06-01');
    const result = buildDateCondition(from);
    expect(result).toEqual({ created_at: { gte: from } });
  });
});
