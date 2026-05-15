export const DOSSIER_STATUT_META = {
  EN_ATTENTE: { variant: 'gray', label: 'En attente' },
  EN_ATTENTE_VERIFICATION: { variant: 'warning', label: 'En vérification' },
  RETENU: { variant: 'success', label: 'Retenu' },
  PAYE_DIRECTEMENT: { variant: 'warning', label: 'Paiement à initier' },
  PAYE: { variant: 'success', label: 'Payé' },
  CONFIRME: { variant: 'success', label: 'Confirmé' },
  REJETE: { variant: 'danger', label: 'Rejeté' },
  REFUSE: { variant: 'danger', label: 'Refusé' },
  GRIS: { variant: 'warning', label: 'Liste grise' },
  EXCEPTION: { variant: 'warning', label: 'Exception' },
  ARCHIVE: { variant: 'gray', label: 'Archivé' },
  ANNULE: { variant: 'danger', label: 'Annulé' },
};

export const PAIEMENT_STATUT_META = {
  CONFIRME: { variant: 'success', label: 'Paiement confirmé' },
  EN_ATTENTE: { variant: 'warning', label: 'Paiement initié' },
  PENDING: { variant: 'warning', label: 'Paiement initié' },
  ECHOUE: { variant: 'danger', label: 'Paiement échoué' },
  EXPIRE: { variant: 'danger', label: 'Paiement expiré' },
};

export function getDossierStatutMeta(statut) {
  return DOSSIER_STATUT_META[statut] || { variant: 'gray', label: statut || 'Inconnu' };
}

export function getPaiementMeta(paiement, dossierStatut) {
  if (paiement?.statut === 'CONFIRME') {
    return PAIEMENT_STATUT_META.CONFIRME;
  }

  if (paiement?.statut === 'EN_ATTENTE' || paiement?.statut === 'PENDING') {
    return PAIEMENT_STATUT_META.EN_ATTENTE;
  }

  if (paiement?.statut === 'ECHOUE') {
    return PAIEMENT_STATUT_META.ECHOUE;
  }

  if (paiement?.statut === 'EXPIRE') {
    return PAIEMENT_STATUT_META.EXPIRE;
  }

  if (dossierStatut === 'PAYE_DIRECTEMENT' || dossierStatut === 'RETENU') {
    return { variant: 'warning', label: 'Paiement à initier' };
  }

  return { variant: 'gray', label: 'Aucun paiement initié' };
}
