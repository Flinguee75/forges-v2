/**
 * Constantes metier depuis .env — RM-156
 *
 * Toute valeur globale passe par ces fonctions.
 * Interdit : const DELAI = 72; ou commission ?? 20
 * Correct   : getDelaiPaiementMs() ou getCommissionForgesDefaut()
 */

export function getCommissionForgesDefaut(): number {
  return Number(process.env.COMMISSION_FORGES_DEFAULT_PCT ?? 30);
}

export function getCommissionApporteurDefaut(): number {
  return Number(process.env.COMMISSION_APPORTEUR_DEFAULT_PCT ?? 5);
}

export function getDelaiPaiementMs(): number {
  return Number(process.env.PAIEMENT_EXPIRATION_HEURES ?? 72) * 3600 * 1000;
}

export function getDelaiPaiementH(): number {
  return Number(process.env.PAIEMENT_EXPIRATION_HEURES ?? 72);
}

export function getSeuilReversementApporteur(): number {
  return Number(process.env.SEUIL_REVERSEMENT_APPORTEUR_XOF ?? 5000);
}

export function getSeuilReversementPartenaire(): number {
  return Number(process.env.SEUIL_REVERSEMENT_PARTENAIRE_XOF ?? 50000);
}

export function getEssaiGratuitJours(): number {
  return Number(process.env.ESSAI_GRATUIT_DUREE_JOURS ?? 30);
}

export function getAccesFormationDemandeDureeJours(): number {
  return Number(process.env.ACCES_FORMATION_DEMANDE_DUREE_JOURS ?? 365);
}
