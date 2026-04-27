import { apiClient } from './client';

export const botApi = {
  startSession: () => apiClient.post('/bot/session', {}),
  getActiveSession: () => apiClient.get('/bot/session/active'),
  getSession: (sessionId) => apiClient.get(`/bot/session/${sessionId}`),
  abandonSession: (sessionId) => apiClient.post(`/bot/session/${sessionId}/abandon`, {}),
  submitResponse: (sessionId, { value, commentaire }) =>
    apiClient.post(`/bot/session/${sessionId}/reponse`, { value, commentaire }),
};

export default botApi;
