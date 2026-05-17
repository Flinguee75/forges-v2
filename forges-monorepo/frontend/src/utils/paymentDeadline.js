export const DEFAULT_PAYMENT_EXPIRATION_HOURS = 72;

export function normalizePaymentExpirationHours(hours) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_PAYMENT_EXPIRATION_HOURS;
  }

  return value;
}

export function getPaymentExpirationMs(hours) {
  return normalizePaymentExpirationHours(hours) * 60 * 60 * 1000;
}

export function formatPaymentExpirationHours(hours) {
  const value = normalizePaymentExpirationHours(hours);
  return `${value} heure${value > 1 ? 's' : ''}`;
}

export function formatPaymentExpirationShort(hours) {
  return `${normalizePaymentExpirationHours(hours)}h`;
}
