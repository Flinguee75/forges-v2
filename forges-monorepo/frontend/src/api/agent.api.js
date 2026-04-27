import { apiClient } from './client';

/**
 * API Client — Rôle AGENT
 * Reversements partenaires (RM-138) et apporteurs (RM-147)
 */

const AGENT_BASE_URL = '/agent';

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  );
}

export const agentApi = {
  // GET /api/agent/reversements/partenaires — Liste reversements partenaires en attente
  getReversementsPartenaires: (params = {}) =>
    apiClient.get(`${AGENT_BASE_URL}/reversements/partenaires`, {
      params: cleanQueryParams(params),
    }),

  // POST /api/agent/reversements/:id/effectuer — Effectuer reversement partenaire (RM-138)
  effectuerReversementPartenaire: (partenaireId, data) =>
    apiClient.post(`${AGENT_BASE_URL}/reversements/${partenaireId}/effectuer`, data),

  // GET /api/agent/reversements/apporteurs — Liste reversements apporteurs (RM-147)
  getReversementsApporteurs: (params = {}) =>
    apiClient.get(`${AGENT_BASE_URL}/reversements/apporteurs`, {
      params: cleanQueryParams(params),
    }),

  // POST /api/agent/reversements/apporteurs/:id/execute — Effectuer reversement apporteur (RM-147)
  effectuerReversementApporteur: (apporteurId, data) =>
    apiClient.post(`${AGENT_BASE_URL}/reversements/apporteurs/${apporteurId}/execute`, data),
};

export default agentApi;
