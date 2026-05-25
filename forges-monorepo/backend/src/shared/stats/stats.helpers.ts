const CENTIMES_PER_XOF = 100;

export function xofToCentimes(amountXof?: number | null): number {
  return Number(amountXof || 0) * CENTIMES_PER_XOF;
}

export function buildDateCondition(
  dateFrom?: string | Date,
  dateTo?: string | Date,
): Record<string, { gte?: Date; lte?: Date }> | null {
  if (!dateFrom && !dateTo) {
    return null;
  }

  const createdAt: Record<string, Date> = {};

  if (dateFrom) {
    createdAt.gte = new Date(dateFrom);
  }

  if (dateTo) {
    createdAt.lte = new Date(dateTo);
  }

  return { created_at: createdAt };
}
