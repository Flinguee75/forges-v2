const ORGANISATION_OFFERS = {
  BASIQUE: {
    label: 'Basique',
    annualAmount: Number(import.meta.env.VITE_ABO_ORG_BASIQUE_XOF || 5000000),
    description: 'Accès à la plateforme après la période d\'essai. Idéal pour démarrer.',
    features: [
      'Accès au catalogue de formations',
      'Gestion des inscriptions de vos employés',
      'Achat et suivi de vouchers',
      'Tableau de bord organisation',
      'Support standard',
    ],
  },
  PRO: {
    label: 'Pro',
    annualAmount: Number(import.meta.env.VITE_ABO_ORG_PRO_XOF || 15000000),
    description: 'Pour les organisations à fort volume de formations. Inclut le B2B.',
    features: [
      'Tout le Basique',
      'Abonnement B2B jusqu\'à 25 apprenants inclus',
      'Import CSV des bénéficiaires',
      'Export des rapports et historiques',
      'Support prioritaire',
    ],
  },
  ENTERPRISE: {
    label: 'Enterprise',
    annualAmount: Number(import.meta.env.VITE_ABO_ORG_ENTERPRISE_XOF || 40000000),
    description: 'Offre sur-mesure avec accompagnement dédié pour les grandes organisations.',
    features: [
      'Tout le Pro',
      'Abonnement B2B jusqu\'à 100 apprenants inclus',
      'Référent FORGES dédié',
      'Négociation tarifaire sur les formations',
      'SLA et support 7j/7',
    ],
  },
};

const B2B_PALIERS = {
  STARTER: {
    label: 'Starter',
    annualAmount: 25000000,
    nbMax: 10,
    range: '1 - 10',
    description: 'Pour les petites équipes. Idéal pour un premier déploiement B2B.',
  },
  BUSINESS: {
    label: 'Business',
    annualAmount: 50000000,
    nbMax: 25,
    range: '11 - 25',
    description: 'Pour les équipes en croissance avec des besoins de formation réguliers.',
  },
  ENTERPRISE: {
    label: 'Enterprise',
    annualAmount: 90000000,
    nbMax: 100,
    range: '26 - 100',
    description: 'Pour les grandes organisations avec un volume important de bénéficiaires.',
  },
  SUR_DEVIS: {
    label: 'Sur devis',
    annualAmount: 0,
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
