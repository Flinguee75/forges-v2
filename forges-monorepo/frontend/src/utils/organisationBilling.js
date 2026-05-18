const ORGANISATION_OFFERS = {
  BASIQUE: {
    label: 'Basique',
    annualAmountXof: Number(import.meta.env.VITE_ABO_ORG_BASIQUE_XOF || 50000),
    description: 'Accès complet à la plateforme après la période d\'essai. Idéal pour démarrer.',
    features: [
      'Tableau de bord organisation',
      'Gestion des vouchers',
      'Export PDF des rapports',
      'Gestion des inscriptions de vos employés',
      '1 gestionnaire de compte',
      'Support standard',
    ],
  },
  PRO: {
    label: 'Pro',
    annualAmountXof: Number(import.meta.env.VITE_ABO_ORG_PRO_XOF || 150000),
    description: 'Pour les organisations à fort volume de formations. Statistiques avancées et exports enrichis.',
    features: [
      'Tout le Basique',
      'Statistiques avancées',
      'Export Excel des données',
      '1 gestionnaire de compte',
      'Support prioritaire',
    ],
  },
  ENTERPRISE: {
    label: 'Enterprise',
    annualAmountXof: Number(import.meta.env.VITE_ABO_ORG_ENTERPRISE_XOF || 400000),
    description: 'Offre complète pour les grandes organisations avec SLA garanti et accès API.',
    features: [
      'Tout le Pro',
      'Accès API FORGES',
      'SLA 99,9% garanti',
      'Jusqu\'à 5 gestionnaires de compte',
      'Support 7j/7',
    ],
  },
};

const B2B_PALIERS = {
  STARTER: {
    label: 'Starter',
    annualAmountXof: 250000,
    nbMax: 20,
    range: '1 - 20',
    description: 'Pour les petites équipes. Idéal pour un premier déploiement B2B.',
  },
  BUSINESS: {
    label: 'Business',
    annualAmountXof: 500000,
    nbMax: 50,
    range: '21 - 50',
    description: 'Pour les équipes en croissance avec des besoins de formation réguliers.',
  },
  ENTERPRISE: {
    label: 'Enterprise',
    annualAmountXof: 900000,
    nbMax: 100,
    range: '51 - 100',
    description: 'Pour les grandes organisations. Inclut 2 formations Premium par an.',
  },
  SUR_DEVIS: {
    label: 'Sur devis',
    annualAmountXof: 0,
    nbMax: 0,
    range: 'Plus de 100',
    description: 'Contactez FORGES pour un tarif adapté à vos volumes.',
  },
};

function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatFcfaFromXof(amountXof) {
  const value = Math.round(Number(amountXof || 0));
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

export function formatFcfaFromCentimes(amountCentimes) {
  const value = Math.round(Number(amountCentimes || 0) / 100);
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

export const formatFcfa = formatFcfaFromXof;

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
    annualAmount: offer.annualAmountXof,
  }));
}

export function getOrganisationOfferLabel(offre) {
  return ORGANISATION_OFFERS[offre]?.label || offre || '-';
}

export function getB2BPalierList() {
  return Object.entries(B2B_PALIERS).map(([key, palier]) => ({
    key,
    ...palier,
    annualAmount: palier.annualAmountXof,
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
    return 'Capacité atteinte';
  }

  if (ratio >= 0.8) {
    return 'Bientôt à capacité — envisagez un palier supérieur';
  }

  return 'Capacité disponible';
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
    annualAmountXof: config.annualAmountXof,
    annualAmount: config.annualAmountXof,
    formattedAmount: formatFcfaFromXof(config.annualAmountXof),
  };
}

export function previewB2BUpgrade(currentPalier, targetPalier) {
  const current = B2B_PALIERS[String(currentPalier || '').toUpperCase()] || B2B_PALIERS.STARTER;
  const target = B2B_PALIERS[String(targetPalier || '').toUpperCase()] || current;
  const diff = Math.max(0, target.annualAmountXof - current.annualAmountXof);

  return {
    currentPalier: currentPalier || 'STARTER',
    targetPalier: targetPalier || currentPalier || 'STARTER',
    currentAmountXof: current.annualAmountXof,
    targetAmountXof: target.annualAmountXof,
    currentAmount: current.annualAmountXof,
    targetAmount: target.annualAmountXof,
    differentialAmountXof: diff,
    differentialAmount: diff,
    formattedDifferentialAmount: formatFcfaFromXof(diff),
  };
}

export { ORGANISATION_OFFERS, B2B_PALIERS };
