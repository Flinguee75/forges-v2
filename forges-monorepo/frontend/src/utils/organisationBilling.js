const ORGANISATION_OFFERS = {
  BASIQUE: {
    label: 'Basique',
    annualAmount: Number(import.meta.env.VITE_ABO_ORG_BASIQUE_XOF || 5000000),
    description: 'Acces plateforme essentiel apres la periode d essai.',
  },
  PRO: {
    label: 'Pro',
    annualAmount: Number(import.meta.env.VITE_ABO_ORG_PRO_XOF || 15000000),
    description: 'Pour les organisations qui veulent plus de capacite et de souplesse.',
  },
  ENTERPRISE: {
    label: 'Enterprise',
    annualAmount: Number(import.meta.env.VITE_ABO_ORG_ENTERPRISE_XOF || 40000000),
    description: 'Offre avancee avec accompagnement et volumes plus importants.',
  },
};

const B2B_PALIERS = {
  STARTER: {
    label: 'Starter',
    annualAmount: 25000000,
    nbMax: 10,
    range: '1 - 10',
  },
  BUSINESS: {
    label: 'Business',
    annualAmount: 50000000,
    nbMax: 25,
    range: '11 - 25',
  },
  ENTERPRISE: {
    label: 'Enterprise',
    annualAmount: 90000000,
    nbMax: 100,
    range: '26 - 100',
  },
  SUR_DEVIS: {
    label: 'Sur devis',
    annualAmount: 0,
    nbMax: 0,
    range: 'Plus de 100',
  },
};

function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatFcfa(amount) {
  const value = Math.round(Number(amount || 0) / 100);
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

export function formatDate(value) {
  const parsed = toIsoDate(value);
  if (!parsed) {
    return '-';
  }

  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function getOrganisationOfferList() {
  return Object.entries(ORGANISATION_OFFERS).map(([key, offer]) => ({
    key,
    ...offer,
  }));
}

export function getOrganisationOfferLabel(offre) {
  return ORGANISATION_OFFERS[offre]?.label || offre || '-';
}

export function getB2BPalierList() {
  return Object.entries(B2B_PALIERS).map(([key, palier]) => ({
    key,
    ...palier,
  }));
}

export function getB2BPalierLabel(palier) {
  return B2B_PALIERS[palier]?.label || palier || '-';
}

export function getB2BProgressVariant(ratio = 0) {
  if (ratio >= 1) {
    return 'danger';
  }

  if (ratio >= 0.8) {
    return 'warning';
  }

  return 'success';
}

export function getB2BProgressMessage(ratio = 0) {
  if (ratio >= 1) {
    return 'Capacite atteinte';
  }

  if (ratio >= 0.8) {
    return 'Proposer une montee de palier';
  }

  return 'Capacite confortable';
}

export function getTrialDaysRemaining(dateFinEssai) {
  const parsed = toIsoDate(dateFinEssai);
  if (!parsed) {
    return null;
  }

  const diff = Math.ceil((parsed.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}

export function isWelcomeOfferActive(subscription = {}) {
  if (subscription.welcome_offer_active !== undefined) {
    return Boolean(subscription.welcome_offer_active);
  }

  if (!subscription.date_fin_essai || !subscription.created_at) {
    return false;
  }

  const createdAt = toIsoDate(subscription.created_at);
  const trialEnd = toIsoDate(subscription.date_fin_essai);
  if (!createdAt || !trialEnd) {
    return false;
  }

  const offerStart = new Date(createdAt.getTime() + 25 * 24 * 60 * 60 * 1000);
  const offerEnd = new Date(createdAt.getTime() + 32 * 24 * 60 * 60 * 1000);
  const now = Date.now();
  return now >= offerStart.getTime() && now <= offerEnd.getTime() && now <= trialEnd.getTime();
}

export function getWelcomeOfferExpiry(subscription = {}) {
  if (subscription.welcome_offer_expires_at) {
    return subscription.welcome_offer_expires_at;
  }

  if (!subscription.created_at) {
    return null;
  }

  const createdAt = toIsoDate(subscription.created_at);
  if (!createdAt) {
    return null;
  }

  return new Date(createdAt.getTime() + 32 * 24 * 60 * 60 * 1000).toISOString();
}

export function previewOrganisationSubscription(offre) {
  const normalized = String(offre || 'BASIQUE').toUpperCase();
  const config = ORGANISATION_OFFERS[normalized] || ORGANISATION_OFFERS.BASIQUE;
  return {
    offre: normalized,
    label: config.label,
    annualAmount: config.annualAmount,
    formattedAmount: formatFcfa(config.annualAmount),
  };
}

export function previewB2BUpgrade(currentPalier, targetPalier) {
  const current = B2B_PALIERS[String(currentPalier || '').toUpperCase()] || B2B_PALIERS.STARTER;
  const target = B2B_PALIERS[String(targetPalier || '').toUpperCase()] || current;
  const diff = Math.max(0, target.annualAmount - current.annualAmount);

  return {
    currentPalier: currentPalier || 'STARTER',
    targetPalier: targetPalier || currentPalier || 'STARTER',
    currentAmount: current.annualAmount,
    targetAmount: target.annualAmount,
    differentialAmount: diff,
    formattedDifferentialAmount: formatFcfa(diff),
  };
}

export { ORGANISATION_OFFERS, B2B_PALIERS };
