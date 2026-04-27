import { apiClient } from './client';

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  );
}

function unwrapData(response) {
  return response?.data ?? response;
}

export const apprenantApi = {
  getMesDossiers: (params = {}) =>
    apiClient.get('/espace-apprenant/dossiers', {
      params: cleanQueryParams(params),
    }),

  getProfil: async () => unwrapData(await apiClient.get('/apprenants/profil')),

  updateProfil: async (data) => unwrapData(await apiClient.put('/apprenants/profil', data)),

  getDossierDetail: (dossierId) => apiClient.get(`/dossiers/${dossierId}`),

  getMesAttestations: () => apiClient.get('/attestations'),
  getAttestation: (dossierId) => apiClient.get(`/attestations/${dossierId}/download`, {
    responseType: 'blob',
  }),
  annulerDossier: (dossierId) => apiClient.delete(`/espace-apprenant/dossiers/${dossierId}`),

  getMonAbonnementRetail: async () => unwrapData(await apiClient.get('/abonnements/retail/me')),
  souscrireAbonnementRetail: async (data) => unwrapData(await apiClient.post('/abonnements/retail', data)),
  upgradeAbonnementRetail: async (data) => unwrapData(await apiClient.put('/abonnements/retail/upgrade', data)),
  downgradeAbonnementRetail: async (data) => unwrapData(await apiClient.put('/abonnements/retail/downgrade', data)),
  suspendreAbonnementRetail: async (data = {}) => unwrapData(await apiClient.put('/abonnements/retail/suspendre', data)),
  getFormationsInclusesParAbonnement: async (_abonnementId) =>
    unwrapData(await apiClient.get('/abonnements/retail/formations-incluses')),
  getMesFormationsDemande: (params = {}) =>
    apiClient.get('/espace-apprenant/formations-demande', {
      params: cleanQueryParams(params),
    }),
  getAccesFormationDemande: (accesId) =>
    apiClient.get(`/espace-apprenant/formations-demande/${accesId}`),
  updateProgressionFormationDemande: async (accesId, progression) =>
    unwrapData(await apiClient.patch(`/espace-apprenant/formations-demande/${accesId}/progression`, {
      progression: Number(progression),
    })),
  accederFormationDemande: (formationId) => apiClient.post(`/formations/${formationId}/acceder`),
  inscrireSession: (sessionId, data) => apiClient.post(`/sessions/${sessionId}/inscrire`, data),
};

export default apprenantApi;
