const RETAIL_MONTHLY_PRICES = {
  ESSENTIEL: Number(import.meta.env.VITE_ABO_RETAIL_ESSENTIEL_XOF || 1500000),
  PREMIUM: Number(import.meta.env.VITE_ABO_RETAIL_PREMIUM_XOF || 2500000),
};

function normalizeOffer(offer) {
  return String(offer || '').toUpperCase();
}

function daysInMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

function firstDayNextMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

function remainingDaysInclusive(fromDate, toDate) {
  const diff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}

function prorata(amount, numeratorDays, denominatorDays) {
  if (!amount || numeratorDays <= 0 || denominatorDays <= 0) {
    return 0;
  }

  return Math.max(0, Math.round((amount * numeratorDays) / denominatorDays));
}

export function formatFcfa(amount) {
  const value = Math.round(Number(amount || 0) / 100);
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

export function formatDate(date) {
  if (!date) {
    return '-';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function getRetailMonthlyPrice(offre) {
  return RETAIL_MONTHLY_PRICES[normalizeOffer(offre)] || 0;
}

export function previewRetailSubscription(offre, referenceDate = new Date()) {
  const normalizedOffer = normalizeOffer(offre);
  const monthlyAmount = getRetailMonthlyPrice(normalizedOffer);
  const renewalDate = firstDayNextMonth(referenceDate);
  const amount = prorata(
    monthlyAmount,
    remainingDaysInclusive(referenceDate, renewalDate),
    daysInMonth(referenceDate)
  );

  return {
    offre: normalizedOffer,
    monthlyAmount,
    renewalDate,
    montant_premier_mois: amount,
  };
}

export function previewRetailUpgrade(currentOffer, targetOffer = 'PREMIUM', referenceDate = new Date(), renewalDate = null) {
  const normalizedCurrent = normalizeOffer(currentOffer);
  const normalizedTarget = normalizeOffer(targetOffer);
  const currentMonthlyAmount = getRetailMonthlyPrice(normalizedCurrent);
  const targetMonthlyAmount = getRetailMonthlyPrice(normalizedTarget);
  const effectiveRenewalDate = renewalDate ? new Date(renewalDate) : firstDayNextMonth(referenceDate);
  const diff = Math.max(0, targetMonthlyAmount - currentMonthlyAmount);

  return {
    currentOffer: normalizedCurrent,
    targetOffer: normalizedTarget,
    currentMonthlyAmount,
    targetMonthlyAmount,
    renewalDate: effectiveRenewalDate,
    montant_diff_prorata: prorata(
      diff,
      remainingDaysInclusive(referenceDate, effectiveRenewalDate),
      daysInMonth(referenceDate)
    ),
  };
}

export function isFutureDate(date) {
  if (!date) {
    return false;
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getTime() > Date.now();
}

