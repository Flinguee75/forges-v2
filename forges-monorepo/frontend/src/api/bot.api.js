import { apiClient } from './client';

export const botApi = {
  // Routes utilisateurs
  startSession: () => apiClient.post('/bot/session', {}),
  getActiveSession: () => apiClient.get('/bot/session/active'),
  getSession: (sessionId) => apiClient.get(`/bot/session/${sessionId}`),
  abandonSession: (sessionId) => apiClient.post(`/bot/session/${sessionId}/abandon`, {}),
  submitResponse: (sessionId, payload) =>
    apiClient.post(`/bot/session/${sessionId}/reponse`, payload),

  // Routes backoffice
  getEnquetesCatalogue: (params = {}) => apiClient.get('/bot/backoffice/enquetes', { params }),
  getFeedbacksFormations: (params = {}) => apiClient.get('/bot/backoffice/feedbacks', { params }),
  getDemandesContact: (params = {}) => apiClient.get('/bot/backoffice/demandes-contact', { params }),
};

export default botApi;
