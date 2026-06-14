import { apiClient } from './client';

/**
 * API Client pour les abonnements
 */

export const abonnementsApi = {
  // GET /api/abonnements/tarifs - Tarifs publics (landing page, no auth)
  getTarifs: async () => {
    return apiClient.get('/abonnements/tarifs');
  },

  // GET /api/backoffice/abonnements - Vue consolidée backoffice
  getAllBackoffice: async (params = {}) => {
    return apiClient.get('/backoffice/abonnements', { params });
  },

  // GET /api/backoffice/abonnements/contrat-institutionnel - Contrats institutionnels
  getContratsInstitutionnels: async (params = {}) => {
    return apiClient.get('/backoffice/abonnements/contrat-institutionnel', { params });
  },
};

export default abonnementsApi;
