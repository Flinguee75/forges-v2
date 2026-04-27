import { apiClient } from './client';

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  );
}

function normalizeDossiersResponse(response) {
  const dossiers = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : response?.dossiers || [];

  return {
    ...response,
    data: response?.data ?? dossiers,
    dossiers,
  };
}

function normalizeLegacyFormationsDemandeResponse(response) {
  const rawItems = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : response?.formations || [];

  const formations = rawItems.map((acces) => ({
    id: acces.id,
    statut: acces.statut,
    session: {
      statut: acces.statut === 'ACTIF' ? 'EN_COURS' : acces.statut,
      formation: acces.formation,
      date_debut: acces.date_activation,
      date_fin: acces.date_expiration,
    },
  }));

  return {
    ...response,
    data: response?.data ?? formations,
    formations,
  };
}

function normalizeApprenantProfile(response) {
  const data = response?.data ?? response;

  return {
    ...data,
    prenom: data?.prenom || data?.prenoms || '',
    prenoms: data?.prenoms || data?.prenom || '',
    pays_residence: data?.pays_residence || data?.pays_iso || '',
  };
}

function serializeApprenantProfileUpdate(data = {}) {
  return cleanQueryParams({
    nom: data.nom,
    prenoms: data.prenom || data.prenoms,
    pays_residence: data.pays_residence,
  });
}

/**
 * API Espace Apprenant
 * Pont de compatibilité pour les anciennes routes legacy.
 * Référence: MOD-09 Espace Apprenant / migration apprenant
 */

export const etudiantApi = {
  /**
   * Récupère la liste des dossiers de l'apprenant
 * GET /api/espace-apprenant/dossiers
   * @param {Object} params - Paramètres de requête (statut, page, limit)
   */
  getMesDossiers: (params = {}) => {
    return apiClient.get('/dossiers', {
      params: cleanQueryParams(params),
    }).then(normalizeDossiersResponse);
  },

  /**
   * Récupère la liste des formations de l'apprenant
 * GET /api/espace-apprenant/formations
   * @param {Object} params - Paramètres de requête (statut, page, limit)
   */
  getMesFormations: (params = {}) => {
    return apiClient.get('/espace-apprenant/formations-demande', {
      params: cleanQueryParams(params),
    }).then(normalizeLegacyFormationsDemandeResponse);
  },

  /**
   * Récupère la liste des attestations disponibles
   * GET /api/attestations
   */
  getMesAttestations: () => {
    return apiClient.get('/attestations');
  },

  /**
   * Télécharge l'attestation PDF d'un dossier
 * GET /api/attestations/:dossierId/download
   * @param {string} dossierId - ID du dossier
   */
  getAttestation: (dossierId) => {
    return apiClient.get(`/attestations/${dossierId}/download`, {
      responseType: 'blob',
    });
  },

  /**
   * Récupère le détail d'un dossier apprenant
   * GET /api/dossiers/:id
   * @param {string} dossierId - ID du dossier
   */
  getDossierDetail: (dossierId) => {
    return apiClient.get(`/dossiers/${dossierId}`);
  },

  /**
   * Récupère le profil apprenant via le pont legacy
   * GET /api/apprenants/profil
   */
  getProfil: async () => {
    const response = await apiClient.get('/apprenants/profil');
    return normalizeApprenantProfile(response);
  },

  /**
   * Met à jour le profil apprenant via le pont legacy
   * PUT /api/apprenants/profil
   */
  updateProfil: async (data) => {
    const response = await apiClient.put('/apprenants/profil', serializeApprenantProfileUpdate(data));
    return normalizeApprenantProfile(response?.data?.apprenant || response?.apprenant || response);
  },
};

export { etudiantApi as apprenantApi };
