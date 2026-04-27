import { apiClient } from './client';

/**
 * API Paiements
 * Référence: MOD-06 Paiements (CLAUDE.md)
 */

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null
    )
  );
}

function createUnavailableError(message, code = 'ENDPOINT_ABSENT') {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 501;
  return error;
}

export const paiementsApi = {
  /**
   * Initie un paiement manuel
   * POST /api/paiements
   * @param {Object} data - Données du paiement (dossier_id, methode_paiement)
   */
  initier: (data) => {
    return apiClient.post('/paiements', data);
  },

  /**
   * Récupère le détail d'un paiement
   * GET /api/paiements (filtré côté client car le backend runtime n'expose pas de détail dédié)
   * @param {string} id - ID du paiement
   */
  getById: async (id) => {
    const paiements = await apiClient.get('/paiements');
    const list = Array.isArray(paiements) ? paiements : paiements?.data || [];
    const paiement = list.find((item) => item.id === id);

    if (!paiement) {
      throw createUnavailableError('Paiement introuvable dans la liste des paiements runtime.', 'NOT_FOUND');
    }

    return paiement;
  },

  /**
   * Liste des paiements (backoffice uniquement)
   * GET /api/paiements
   * @param {Object} params - Paramètres de requête (page, limit, statut, dossier_id)
   */
  getAll: (params = {}) => {
    return apiClient.get('/backoffice/paiements', {
      params: cleanQueryParams(params)
    });
  },
};
