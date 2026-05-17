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

function normalizeList(response) {
  return Array.isArray(response) ? response : response?.data || [];
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
   * Initie une session NGSER backend-only.
   * Le montant est toujours recalculé côté backend (RM-157).
   */
  initierNgser: (data) => {
    return apiClient.post('/paiements/initier', data);
  },

  initierFineo: (dossier_id) => {
    return apiClient.post('/paiements/fineo/initier', { dossier_id });
  },

  /**
   * Récupère le détail d'un paiement
   * GET /api/paiements (filtré côté client car le backend runtime n'expose pas de détail dédié)
   * @param {string} id - ID du paiement
   */
  getById: async (id) => {
    const paiements = await apiClient.get('/paiements');
    const list = normalizeList(paiements);
    const paiement = list.find((item) => item.id === id);

    if (!paiement) {
      throw createUnavailableError('Paiement introuvable dans la liste des paiements runtime.', 'NOT_FOUND');
    }

    return paiement;
  },

  /**
   * Récupère un paiement apprenant depuis une référence backend ou provider.
   * Utilisé par les callbacks pour ne pas faire confiance aux paramètres de redirection.
   */
  getByReference: async (reference) => {
    const paiements = await apiClient.get('/paiements');
    const list = normalizeList(paiements);
    const paiement = list.find((item) => (
      item.id === reference ||
      item.order_ngser === reference ||
      item.transaction_id === reference
    ));

    if (!paiement) {
      throw createUnavailableError('Paiement introuvable dans la liste des paiements runtime.', 'NOT_FOUND');
    }

    return paiement;
  },

  /**
   * Récupère le détail d'un paiement backoffice (avec voucher organisation et apporteur).
   * GET /api/backoffice/paiements/:id
   */
  getBackofficeById: async (id) => {
    const response = await apiClient.get(`/backoffice/paiements/${id}`);
    return response?.data ?? response;
  },

  /**
   * Liste des paiements (backoffice uniquement)
   * GET /api/paiements
   * @param {Object} params - Paramètres de requête (page, limit, statut, dossier_id)
   */
  getAll: (params = {}) => {
    return apiClient.get('/backoffice/paiements', {
      params: cleanQueryParams(params)
    }).then((response) => {
      if (Array.isArray(response)) {
        return {
          data: response,
          meta: {
            page: Number(params.page || 1),
            totalPages: 1,
            total: response.length,
          },
        };
      }

      return response;
    });
  },

  /**
   * Supprime un paiement côté admin.
   * DELETE /api/admin/paiements/:id
   */
  deleteAdmin: (id, motif) => {
    if (motif) {
      return apiClient.delete(`/admin/paiements/${id}`, {
        data: { motif },
      });
    }

    return apiClient.delete(`/admin/paiements/${id}`);
  },
};
