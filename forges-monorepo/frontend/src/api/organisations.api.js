import { apiClient } from './client';

/**
 * API Client pour la gestion des organisations (backoffice)
 * Référence: CLAUDE.md - Backoffice organisations
 */

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null
    )
  );
}

export const organisationsApi = {
  /**
   * Récupère la liste de toutes les organisations avec filtres et pagination
   * @param {Object} params - Paramètres de pagination et filtrage
   * @returns {Promise} Liste paginée d'organisations
   */
  getAll: async (params = {}) => {
    return apiClient.get('/backoffice/organisations', {
      params: cleanQueryParams(params),
    });
  },

  /**
   * Récupère le détail d'une organisation
   * @param {string} id - ID de l'organisation
   * @returns {Promise} Détail de l'organisation
   */
  getById: async (id) => {
    return apiClient.get(`/backoffice/organisations/${id}`);
  },

  /**
   * Crée une nouvelle organisation (backoffice)
   * @param {Object} data - Données de la nouvelle organisation
   * @returns {Promise} Organisation créée
   */
  create: async (data) => {
    return apiClient.post('/backoffice/organisations', data);
  },

  /**
   * Met à jour une organisation
   * @param {string} id - ID de l'organisation
   * @param {Object} data - Données à mettre à jour
   * @returns {Promise} Organisation mise à jour
   */
  update: async (id, data) => {
    return apiClient.put(`/backoffice/organisations/${id}`, data);
  },

  /**
   * Suspend ou active une organisation
   * @param {string} id - ID de l'organisation
   * @param {boolean} suspended - true pour suspendre, false pour activer
   * @returns {Promise} Organisation mise à jour
   */
  toggleSuspension: async (id, suspended) => {
    return apiClient.patch(`/backoffice/organisations/${id}/suspension`, { suspended });
  },

  /**
   * Récupère les membres d'une organisation
   * @param {string} id - ID de l'organisation
   * @returns {Promise} Liste des membres
   */
  getMembres: async (id) => {
    return apiClient.get(`/backoffice/organisations/${id}/membres`);
  },

  /**
   * Récupère l'abonnement actif d'une organisation
   * @param {string} id - ID de l'organisation
   * @returns {Promise} Abonnement actif
   */
  getAbonnement: async (id) => {
    return apiClient.get(`/backoffice/organisations/${id}/abonnement`);
  },

  /**
   * Récupère les vouchers d'une organisation
   * @param {string} id - ID de l'organisation
   * @returns {Promise} Liste des vouchers
   */
  getVouchers: async (id) => {
    return apiClient.get(`/backoffice/organisations/${id}/vouchers`);
  },
};
