/**
 * Utilitaires de formatage des montants monétaires
 *
 * Convention FORGES : tous les montants sont stockés en centimes en base de données.
 * Exemple : 200000000 centimes = 2 000 000 FCFA
 */

/**
 * Formate un montant en centimes vers FCFA lisible.
 * @param {number} montantCentimes - Montant en centimes
 * @returns {string} Montant formaté (ex: "2 000 000 FCFA")
 */
export function formatCurrency(montantCentimes) {
  if (montantCentimes === null || montantCentimes === undefined) {
    return '0 FCFA';
  }

  const xof = Math.round(Number(montantCentimes) / 100);
  return `${xof.toLocaleString('fr-FR')} FCFA`;
}

/**
 * Formate un montant en centimes avec le format currency standard Intl.
 * @param {number} montantCentimes - Montant en centimes
 * @returns {string} Montant formaté avec symbole de devise
 */
export function formatCurrencyStandard(montantCentimes) {
  const xof = Math.round(Number(montantCentimes || 0) / 100);

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(xof);
}

/**
 * Convertit des centimes en XOF (divise par 100).
 * @param {number} centimes
 * @returns {number} Montant en XOF
 */
export function centimesToXOF(centimes) {
  return Math.round(Number(centimes || 0) / 100);
}

/**
 * Convertit des XOF en centimes (multiplie par 100).
 * @param {number} xof
 * @returns {number} Montant en centimes
 */
export function xofToCentimes(xof) {
  return Math.round(Number(xof || 0) * 100);
}

// Alias pour rétrocompatibilité
export const formatMontant = formatCurrency;
export const formatPrice = formatCurrency;
