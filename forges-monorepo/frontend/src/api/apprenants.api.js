import { apiClient } from './client';

/**
 * API Client pour la gestion des apprenants (backoffice)
 * Référence: CLAUDE.md - Backoffice apprenants
 */

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null
    )
  );
}

export const apprenantsApi = {
  /**
   * Récupère la liste de tous les apprenants avec filtres et pagination
   * @param {Object} params - Paramètres de pagination et filtrage
   * @returns {Promise} Liste paginée d'apprenants
   */
  getAll: async (params = {}) => {
    return apiClient.get('/backoffice/apprenants', {
      params: cleanQueryParams(params),
    });
  },

  /**
   * Récupère le détail d'un apprenant
   * @param {string} id - ID de l'apprenant
   * @returns {Promise} Détail de l'apprenant
   */
  getById: async (id) => {
    return apiClient.get(`/backoffice/apprenants/${id}`);
  },

  /**
   * Crée un nouveau compte apprenant (backoffice)
   * @param {Object} data - Données du nouvel apprenant
   * @returns {Promise} Apprenant créé
   */
  create: async (data) => {
    return apiClient.post('/backoffice/apprenants', data);
  },

  /**
   * Met à jour un apprenant
   * @param {string} id - ID de l'apprenant
   * @param {Object} data - Données à mettre à jour
   * @returns {Promise} Apprenant mis à jour
   */
  update: async (id, data) => {
    return apiClient.put(`/backoffice/apprenants/${id}`, data);
  },

  /**
   * Suspend ou active un compte apprenant
   * @param {string} id - ID de l'apprenant
   * @param {boolean} suspended - true pour suspendre, false pour activer
   * @returns {Promise} Apprenant mis à jour
   */
  toggleSuspension: async (id, suspended) => {
    return apiClient.patch(`/backoffice/apprenants/${id}/suspension`, { suspended });
  },

  /**
   * Récupère les dossiers d'un apprenant
   * @param {string} id - ID de l'apprenant
   * @returns {Promise} Liste des dossiers
   */
  getDossiers: async (id) => {
    return apiClient.get(`/backoffice/apprenants/${id}/dossiers`);
  },

  /**
   * Récupère l'abonnement actif d'un apprenant
   * @param {string} id - ID de l'apprenant
   * @returns {Promise} Abonnement actif
   */
  getAbonnement: async (id) => {
    return apiClient.get(`/backoffice/apprenants/${id}/abonnement`);
  },
};
