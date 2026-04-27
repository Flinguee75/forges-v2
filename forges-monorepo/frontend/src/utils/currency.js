/**
 * Utilitaires de formatage des montants monétaires
 *
 * Convention: Tous les montants en base de données sont stockés en CENTIMES XOF
 * 1 XOF = 100 centimes
 * Exemple: 2000000 centimes = 20 000 XOF
 */

/**
 * Formate un montant en centimes vers XOF avec séparateurs de milliers
 * @param {number} centimes - Montant en centimes
 * @returns {string} Montant formaté (ex: "20 000 FCFA")
 */
export function formatCurrency(centimes) {
  if (centimes === null || centimes === undefined) {
    return '0 FCFA';
  }

  const montantXOF = Math.round(Number(centimes) / 100);
  return `${montantXOF.toLocaleString('fr-FR')} FCFA`;
}

/**
 * Formate un montant en centimes vers XOF avec le format currency standard
 * @param {number} centimes - Montant en centimes
 * @returns {string} Montant formaté avec symbole de devise (ex: "20 000 XOF")
 */
export function formatCurrencyStandard(centimes) {
  if (centimes === null || centimes === undefined) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);
  }

  const montantXOF = Math.round(Number(centimes) / 100);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montantXOF);
}

/**
 * Convertit des centimes en XOF (nombre)
 * @param {number} centimes - Montant en centimes
 * @returns {number} Montant en XOF
 */
export function centimesToXOF(centimes) {
  return Math.round(Number(centimes || 0) / 100);
}

/**
 * Convertit des XOF en centimes (nombre)
 * @param {number} xof - Montant en XOF
 * @returns {number} Montant en centimes
 */
export function xofToCentimes(xof) {
  return Math.round(Number(xof || 0) * 100);
}

// Alias pour rétrocompatibilité
export const formatMontant = formatCurrency;
export const formatPrice = formatCurrency;
