import { apiClient } from './client';

/**
 * API Client — Rôle RESPONSABLE
 * Validation formations partenaires (UCS18, RM-127, RM-128, RM-131, RM-137)
 */

const RESPONSABLE_BASE_URL = '/responsable';

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  );
}

export const responsableApi = {
  // GET /api/responsable/validations — Liste formations à valider (UCS18)
  getFormationsEnAttente: (params = {}) =>
    apiClient.get(`${RESPONSABLE_BASE_URL}/validations`, {
      params: cleanQueryParams(params),
    }),

  // GET /api/responsable/validations/:id — Détail formation à valider
  getValidationDetail: (id) =>
    apiClient.get(`${RESPONSABLE_BASE_URL}/validations/${id}`),

  // PUT /api/responsable/validations/:id/valider — Valider formation (RM-127, RM-137)
  validerFormation: (id, data) =>
    apiClient.put(`${RESPONSABLE_BASE_URL}/validations/${id}/valider`, data),

  // PUT /api/responsable/validations/:id/rejeter — Rejeter formation (RM-128)
  rejeterFormation: (id, data) =>
    apiClient.put(`${RESPONSABLE_BASE_URL}/validations/${id}/rejeter`, data),

  // PUT /api/responsable/validations/:id/suspendre — Suspendre formation active (RM-131)
  suspendreFormation: (id, data) =>
    apiClient.put(`${RESPONSABLE_BASE_URL}/validations/${id}/suspendre`, data),

  // PUT /api/responsable/validations/:id/reactiver — Réactiver formation suspendue (RM-131)
  reactiverFormation: (id) =>
    apiClient.put(`${RESPONSABLE_BASE_URL}/validations/${id}/reactiver`),
};

export default responsableApi;
