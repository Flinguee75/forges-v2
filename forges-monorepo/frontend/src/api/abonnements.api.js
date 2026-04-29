import { apiClient } from './client';

/**
 * API Client pour les abonnements
 */

export const abonnementsApi = {
  // GET /api/backoffice/abonnements - Vue consolidée backoffice
  getAllBackoffice: async (params = {}) => {
    return apiClient.get('/backoffice/abonnements', { params });
  },
};

export default abonnementsApi;
