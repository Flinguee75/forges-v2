import { apiClient } from './client';

/**
 * API Client pour les sessions de formation
 * Référence: MOD-04 Sessions (CLAUDE.md backend)
 */

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null
    )
  );
}

function normalizeSession(session) {
  if (!session) return session;

  return {
    ...session,
    formation: session.formation
      ? {
          ...session.formation,
          titre: session.formation.titre || session.formation.intitule,
        }
      : session.formation,
  };
}

function normalizeBackofficeResponse(response) {
  return {
    ...response,
    data: Array.isArray(response?.data)
      ? response.data.map(normalizeSession)
      : normalizeSession(response?.data),
  };
}

export const sessionsApi = {
  // ============================================
  // API BACKOFFICE (gestion sessions)
  // ============================================

  /**
   * Récupère toutes les sessions backoffice
   * @param {Object} params - Paramètres de pagination et filtrage
   * @param {number} params.page - Numéro de page
   * @param {number} params.limit - Nombre d'éléments par page
   * @param {string} params.formation_id - Filtrer par formation
   * @param {string} params.statut - Filtrer par statut
   * @returns {Promise} Liste paginée de sessions
   */
  getAll: async (params = {}) => {
    return apiClient.get('/sessions', {
      params: cleanQueryParams(params),
    });
  },

  getBackofficeList: async (params = {}) => {
    const response = await apiClient.get('/backoffice/sessions', {
      params: cleanQueryParams(params),
    });
    return normalizeBackofficeResponse(response);
  },

  /**
   * Récupère le détail d'une session
   * @param {string} id - ID de la session
   * @returns {Promise} Détail de la session
   */
  getById: async (id) => {
    const response = await apiClient.get(`/backoffice/sessions/${id}`);
    return normalizeBackofficeResponse(response);
  },

  /**
   * Crée une nouvelle session (BROUILLON par défaut)
   * @param {Object} data - Données de la session
   * @returns {Promise} Session créée
   */
  create: async (data) => {
    return apiClient.post('/backoffice/sessions', data);
  },

  /**
   * Met à jour une session
   * @param {string} id - ID de la session
   * @param {Object} data - Données à mettre à jour
   * @returns {Promise} Session mise à jour
   */
  update: async (id, data) => {
    return apiClient.patch(`/backoffice/sessions/${id}`, data);
  },

  /**
   * Clôture manuelle d'une session (transition vers CLOTUREE)
   * @param {string} id - ID de la session
   * @returns {Promise} Session clôturée
   */
  cloturerManuellement: async (id) => {
    return apiClient.patch(`/backoffice/sessions/${id}/close`);
  },

  /**
   * Annule une session (transition vers ANNULEE)
   * @param {string} id - ID de la session
   * @returns {Promise} Session annulée
   */
  annuler: async (id) => {
    return apiClient.delete(`/backoffice/sessions/${id}/cancel`);
  },

  /**
   * Planifie une session (transition BROUILLON → PLANIFIEE)
   * Note: Cette fonctionnalité n'existe pas dans le backend actuel
   * Les transitions sont automatiques via le scheduler
   * @param {string} id - ID de la session
   * @returns {Promise} Session planifiée
   */
  planifier: async (data) => {
    return apiClient.post('/backoffice/sessions/bulk', data);
  },

  /**
   * Supprime une session (seulement si BROUILLON)
   * Note: Cette fonctionnalité n'existe pas dans le backend actuel
   * @param {string} _id - ID de la session (unused until backend implementation)
   * @returns {Promise} Confirmation de suppression
   */
  delete: async (_id) => {
    // Route non implémentée dans le backend
    throw new Error('La suppression de session n\'est pas implémentée');
  },

  /**
   * Récupère la liste des dossiers d'une session
   * Route: GET /api/backoffice/sessions/:id/dossiers
   * @param {string} id - ID de la session
   * @param {Object} params - Paramètres de pagination et filtrage
   * @returns {Promise} Liste paginée de dossiers
   */
  getDossiers: async (id, params = {}) => {
    return apiClient.get(`/backoffice/sessions/${id}/dossiers`, {
      params: cleanQueryParams(params),
    });
  },

  /**
   * POST /api/sessions/:id/inscrire — Inscription à une session
   * Réservé aux APPRENANT/ORGANISATION/GESTIONNAIRE
   * @param {string} id - ID de la session
   * @param {Object} data - Données d'inscription
   * @param {string} data.source_financement - RETAIL, ABONNEMENT, B2B, INSTITUTIONNEL
   * @param {string} [data.voucher_code] - Code voucher (optionnel)
   * @param {string} [data.code_apporteur] - Code apporteur (optionnel)
   * @returns {Promise} Dossier créé
   */
  inscrire: async (id, data) => {
    return apiClient.post(`/sessions/${id}/inscrire`, data);
  },
};

export default sessionsApi;
