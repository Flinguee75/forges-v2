/**
 * Utilitaires de formatage des montants monétaires
 *
 * Convention: Tous les montants en base de données sont stockés en XOF (francs CFA)
 * Exemple: 3000000 = 3 000 000 FCFA
 */

/**
 * Formate un montant en XOF avec séparateurs de milliers
 * @param {number} montant - Montant en XOF
 * @returns {string} Montant formaté (ex: "3 000 000 FCFA")
 */
export function formatCurrency(montant) {
  if (montant === null || montant === undefined) {
    return '0 FCFA';
  }

  return `${Math.round(Number(montant)).toLocaleString('fr-FR')} FCFA`;
}

/**
 * Formate un montant en XOF avec le format currency standard
 * @param {number} montant - Montant en XOF
 * @returns {string} Montant formaté avec symbole de devise (ex: "3 000 000 XOF")
 */
export function formatCurrencyStandard(montant) {
  if (montant === null || montant === undefined) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(Number(montant)));
}

/**
 * Passe-plat pour compatibilité — les montants sont déjà en XOF
 */
export function centimesToXOF(montant) {
  return Math.round(Number(montant || 0));
}

/**
 * Passe-plat pour compatibilité — les montants sont déjà en XOF
 */
export function xofToCentimes(montant) {
  return Math.round(Number(montant || 0));
}

// Alias pour rétrocompatibilité
export const formatMontant = formatCurrency;
export const formatPrice = formatCurrency;
