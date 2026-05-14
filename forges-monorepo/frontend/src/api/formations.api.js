import { apiClient } from './client';

/**
 * API Client pour les formations
 * Utilisé pour le catalogue public et la gestion backoffice des formations
 * Référence: MOD-03 Formations (CLAUDE.md backend)
 */

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null
    )
  );
}

function normalizeFormation(formation) {
  if (!formation) return formation;

  return {
    ...formation,
    titre: formation.titre || formation.intitule,
    description: formation.description || formation.description_courte,
    duree: formation.duree || formation.duree_jours,
    tarif: formation.tarif || formation.cout_catalogue,
  };
}

function normalizeBackofficeResponse(response) {
  return {
    ...response,
    data: Array.isArray(response?.data)
      ? response.data.map(normalizeFormation)
      : normalizeFormation(response?.data),
  };
}

export const formationsApi = {
  // ============================================
  // API PUBLIQUE (catalogue)
  // ============================================

  /**
   * Récupère la liste des formations publiées (catalogue public)
   * @param {Object} params - Paramètres de pagination et filtrage
   * @param {number} params.page - Numéro de page (défaut: 1)
   * @param {number} params.limit - Nombre d'éléments par page (défaut: 20)
   * @param {string} params.search - Recherche textuelle (optionnel)
   * @returns {Promise} Liste paginée de formations
   */
  getCatalogue: async (params = {}) => {
    return apiClient.get('/formations', {
      params: cleanQueryParams(params),
    });
  },

  /**
   * Récupère toutes les formations (alias pour getCatalogue)
   * @param {Object} params - Paramètres de pagination et filtrage
   * @returns {Promise} Liste paginée de formations
   */
  getAll: async (params = {}) => {
    return formationsApi.getCatalogue(params);
  },

  /**
   * Récupère le détail d'une formation publiée
   * @param {string} id - ID de la formation
   * @returns {Promise} Détail de la formation
   */
  getFormationDetail: async (id) => {
    return apiClient.get(`/formations/${id}`);
  },

  /**
   * Récupère les sessions ouvertes pour une formation
   * @param {string} formationId - ID de la formation
   * @returns {Promise} Liste des sessions ouvertes
   */
  getSessionsOuvertes: async (formationId) => {
    return apiClient.get(`/formations/${formationId}/sessions`);
  },

  /**
   * POST /api/formations/:id/acceder — Accès formation à la demande (RM-92)
   * Réservé aux APPRENANT/ORGANISATION avec abonnement actif
   * @param {string} id - ID de la formation
   * @returns {Promise} AccesFormationDemande créé ou existant
   */
  accederDemande: async (id) => {
    return apiClient.post(`/formations/${id}/acceder`);
  },

  // ============================================
  // API BACKOFFICE (gestion formations)
  // ============================================

  /**
   * Récupère toutes les formations backoffice (tous statuts)
   * Filtrage automatique selon le rôle (RESPONSABLE voit seulement ses formations)
   * @param {Object} params - Paramètres de pagination et filtrage
   * @param {number} params.page - Numéro de page
   * @param {number} params.limit - Nombre d'éléments par page
   * @param {string} params.statut - Filtrer par statut (BROUILLON, PUBLIEE, ARCHIVEE)
   * @param {string} params.search - Recherche textuelle
   * @returns {Promise} Liste paginée de formations
   */
  getAllBackoffice: async (params = {}) => {
    const response = await apiClient.get('/formations/backoffice/list', {
      params: cleanQueryParams(params),
    });
    return normalizeBackofficeResponse(response);
  },

  /**
   * Récupère le détail d'une formation (backoffice)
   * @param {string} id - ID de la formation
   * @returns {Promise} Détail de la formation
   */
  getByIdBackoffice: async (id) => {
    const response = await apiClient.get(`/formations/backoffice/${id}`);
    return normalizeBackofficeResponse(response);
  },

  /**
   * Crée une nouvelle formation (BROUILLON par défaut)
   * @param {Object} data - Données de la formation
   * @returns {Promise} Formation créée
   */
  create: async (data) => {
    return apiClient.post('/formations', data);
  },

  /**
   * Met à jour une formation
   * @param {string} id - ID de la formation
   * @param {Object} data - Données à mettre à jour
   * @returns {Promise} Formation mise à jour
   */
  update: async (id, data) => {
    return apiClient.patch(`/formations/${id}`, data);
  },

  /**
   * Publie une formation (transition BROUILLON → PUBLIEE)
   * @param {string} id - ID de la formation
   * @returns {Promise} Formation publiée
   */
  publier: async (id) => {
    return apiClient.patch(`/formations/${id}/publish`);
  },

  /**
   * Archive une formation (transition PUBLIEE → ARCHIVEE)
   * @param {string} id - ID de la formation
   * @returns {Promise} Formation archivée
   */
  archiver: async (id) => {
    return apiClient.delete(`/formations/${id}/archive`);
  },

  /**
   * Lie une formation existante a un partenaire depuis le backoffice
   * @param {string} id - ID de la formation
   * @param {Object} data - Données de liaison
   * @param {string} data.partenaire_id - ID du partenaire
   * @param {number} [data.prix_coutant_soumis] - Prix coûtant proposé
   * @returns {Promise} Résultat de liaison
   */
  lierPartenaireBackoffice: async (id, data) => {
    return apiClient.patch(`/formations/backoffice/${id}/lier-partenaire`, data);
  },

  getBackofficePartenaires: async () => {
    return apiClient.get('/formations/backoffice/partenaires');
  },

  /**
   * Supprime une formation (seulement si BROUILLON)
   * Note: Cette fonctionnalité n'existe pas dans le backend actuel
   * @param {string} _id - ID de la formation (unused until backend implementation)
   * @returns {Promise} Confirmation de suppression
   */
  delete: async (_id) => {
    // Route non implémentée dans le backend
    throw new Error('La suppression de formation n\'est pas implémentée');
  },
};

export default formationsApi;
