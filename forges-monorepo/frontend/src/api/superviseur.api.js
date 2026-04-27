import { apiClient } from './client';

/**
 * API Client — Rôle SUPERVISEUR
 * Tableau de bord mensuel apporteurs (RM-148)
 */

const SUPERVISEUR_BASE_URL = '/superviseur';

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  );
}

export const superviseurApi = {
  // GET /api/superviseur/apporteurs/tdb — TDB mensuel apporteurs (RM-148)
  getTdbApporteurs: (params = {}) =>
    apiClient.get(`${SUPERVISEUR_BASE_URL}/apporteurs/tdb`, {
      params: cleanQueryParams(params),
    }),
};

export default superviseurApi;
