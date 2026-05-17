import { apiClient } from './client';

/**
 * API Client pour les inscriptions et dossiers
 * Référence: MOD-05 Inscriptions (CLAUDE.md backend)
 */

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null
    )
  );
}

export const inscriptionsApi = {
  // ============================================
  // API BACKOFFICE (gestion dossiers)
  // ============================================

  /**
   * Récupère tous les dossiers backoffice avec filtres
   * @param {Object} params - Paramètres de pagination et filtrage
   * @returns {Promise} Liste paginée de dossiers
   */
  getAllBackoffice: async (params = {}) => {
    return apiClient.get('/backoffice/dossiers', {
      params: cleanQueryParams(params),
    });
  },

  /**
   * Récupère le détail d'un dossier (backoffice)
   * @param {string} id - ID du dossier
   * @returns {Promise} Détail du dossier
   */
  getByIdBackoffice: async (id) => {
    return apiClient.get(`/dossiers/${id}`);
  },

  /**
   * Décision RETENIR un dossier (transition EN_ATTENTE → RETENU)
   * @param {string} id - ID du dossier
   * @returns {Promise} Dossier retenu
   */
  retenir: async (id) => {
    return apiClient.post(`/dossiers/${id}/retenir`);
  },

  /**
   * Décision REFUSER un dossier (transition EN_ATTENTE → REFUSE)
   * @param {string} id - ID du dossier
   * @param {Object} data - Données de refus
   * @param {string} data.motif_refus - Motif du refus
   * @returns {Promise} Dossier refusé
   */
  refuser: async (id, data) => {
    return apiClient.put(`/dossiers/${id}/refuser`, data);
  },

  /**
   * Traiter un dossier EXCEPTION (RM-05)
   * @param {string} id - ID du dossier
   * @param {Object} data - Décision
   * @param {string} data.decision - 'RETENU' ou 'REFUSE'
   * @param {string} data.motif_refus - Motif si REFUSE
   * @returns {Promise} Dossier traité
   */
  traiterException: async (id, data) => {
    return apiClient.put(`/dossiers/${id}/exception`, data);
  },
};

export default inscriptionsApi;
