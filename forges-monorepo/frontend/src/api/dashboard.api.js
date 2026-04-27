import { apiClient } from './client';
import { getStoredSession } from '../utils/authStorage';

function runtimeUnavailable(operation) {
  const error = new Error(`${operation} n'est pas exposé par le runtime backend actuel`);
  error.code = 'ROUTE_ABSENTE';
  return error;
}

function unwrapRuntimeData(response) {
  return response?.data ?? response;
}

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  );
}

function getCurrentRole() {
  return getStoredSession()?.user?.role;
}

const getDashboardStats = async (params = {}) => {
  const response = await apiClient.get('/dashboard/stats', {
    params: cleanQueryParams(params),
  });
  return unwrapRuntimeData(response);
};

const getInscriptionsEvolution = async (params = {}) => {
  const response = await apiClient.get('/dashboard/inscriptions/evolution', {
    params: cleanQueryParams(params),
  });
  return unwrapRuntimeData(response);
};

const getPaiementsEvolution = async (params = {}) => {
  const response = await apiClient.get('/dashboard/paiements/evolution', {
    params: cleanQueryParams(params),
  });
  return unwrapRuntimeData(response);
};

const getRapportData = async (params = {}) => {
  const response = await apiClient.get('/dashboard/rapports', {
    params: cleanQueryParams(params),
  });
  return unwrapRuntimeData(response);
};

const exportRapportCSV = async (params = {}) => {
  const response = await apiClient.get('/dashboard/rapports/export/csv', {
    params: cleanQueryParams(params),
    responseType: 'blob',
  });
  return unwrapRuntimeData(response);
};

const exportRapportPDF = async (params = {}) => {
  const response = await apiClient.get('/dashboard/rapports/export/pdf', {
    params: cleanQueryParams(params),
    responseType: 'blob',
  });
  return unwrapRuntimeData(response);
};

const getFormationStats = async (formationId, params = {}) => {
  const response = await apiClient.get(`/dashboard/stats/formations/${formationId}`, {
    params: cleanQueryParams(params),
  });
  return unwrapRuntimeData(response);
};

const getSessionStats = async (sessionId, params = {}) => {
  const response = await apiClient.get(`/dashboard/stats/sessions/${sessionId}`, {
    params: cleanQueryParams(params),
  });
  return unwrapRuntimeData(response);
};

const getBackofficeDashboard = async (role = getCurrentRole()) => {
  if (role === 'ADMIN') {
    const response = await apiClient.get('/backoffice/dashboard/admin');
    return unwrapRuntimeData(response);
  }

  if (role === 'SUPERVISEUR') {
    const response = await apiClient.get('/backoffice/dashboard/superviseur');
    return unwrapRuntimeData(response);
  }

  throw runtimeUnavailable('Le dashboard backoffice');
};

const getBackofficeConfig = async () => {
  const response = await apiClient.get('/backoffice/config');
  return unwrapRuntimeData(response);
};

const updateBackofficeConfig = async (payload) => {
  const response = await apiClient.put('/backoffice/config', payload);
  return unwrapRuntimeData(response);
};

const getAdminRetailSubscriptions = () => {
  throw runtimeUnavailable('La vue admin des abonnements Retail');
};

const getAdminB2BSubscriptions = () => {
  throw runtimeUnavailable('La vue admin des abonnements B2B');
};

const getAdminOrganisationSubscriptions = () => {
  throw runtimeUnavailable('La vue admin des abonnements Organisation');
};

const getInstitutionalContracts = () => {
  throw runtimeUnavailable('Les contrats institutionnels');
};

const createInstitutionalContract = () => {
  throw runtimeUnavailable('La création de contrat institutionnel');
};

const getAdminOrganisations = () => {
  throw runtimeUnavailable('La liste admin des organisations');
};

const getAdminConfig = getBackofficeConfig;

const updateAdminConfig = updateBackofficeConfig;

const getAdminEnquetesCatalogue = () => {
  throw runtimeUnavailable('Les enquêtes catalogue');
};

const getEnqueteCatalogueFormations = () => {
  throw runtimeUnavailable('Les formations candidates au catalogue');
};

const cataloguerEnqueteCatalogue = () => {
  throw runtimeUnavailable('La mise en catalogue');
};

const notifyEnqueteCatalogue = () => {
  throw runtimeUnavailable('La notification des enquêtes catalogue');
};

const getAdminFeedbacks = () => {
  throw runtimeUnavailable('Les feedbacks admin');
};

export const dashboardApi = {
  getDashboardStats,
  getInscriptionsEvolution,
  getPaiementsEvolution,
  getRapportData,
  exportRapportCSV,
  exportRapportPDF,
  getFormationStats,
  getSessionStats,
  getBackofficeDashboard,
  getBackofficeConfig,
  updateBackofficeConfig,
  getAdminRetailSubscriptions,
  getAdminB2BSubscriptions,
  getAdminOrganisationSubscriptions,
  getInstitutionalContracts,
  createInstitutionalContract,
  getAdminOrganisations,
  getAdminConfig,
  updateAdminConfig,
  getAdminEnquetesCatalogue,
  getEnqueteCatalogueFormations,
  cataloguerEnqueteCatalogue,
  notifyEnqueteCatalogue,
  getAdminFeedbacks,
};

export default dashboardApi;
