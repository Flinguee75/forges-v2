export function formatMontantXOF(montantXOF) {
  return `${Math.round(Number(montantXOF || 0)).toLocaleString('fr-FR')} FCFA`;
}
