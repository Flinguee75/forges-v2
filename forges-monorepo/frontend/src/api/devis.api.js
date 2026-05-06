import { apiClient } from './client';

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  );
}

function unwrapPayload(response) {
  return response?.data ?? response;
}

export const devisApi = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/admin/devis', { params: cleanQueryParams(params) });
    const payload = unwrapPayload(response);
    const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    return {
      data: items,
      meta: payload?.meta || { total: items.length, page: 1, totalPages: 1 },
    };
  },

  getById: async (id) => {
    const response = await apiClient.get(`/admin/devis/${id}`);
    return unwrapPayload(response);
  },

  create: async (data) => {
    const response = await apiClient.post('/admin/devis', {
      organisation_id: data.organisation_id,
      formation_id: data.formation_id,
      session_id: data.session_id || undefined,
      nb_places: Number(data.nb_places),
      tarif_unitaire_xof: Number(data.tarif_unitaire_xof),
      notes_admin: data.notes_admin || undefined,
    });
    return unwrapPayload(response);
  },

  payer: async (id, notes_admin) => {
    const response = await apiClient.patch(`/admin/devis/${id}/payer`, { notes_admin });
    return unwrapPayload(response);
  },

  annuler: async (id, notes_admin) => {
    const response = await apiClient.patch(`/admin/devis/${id}/annuler`, { notes_admin });
    return unwrapPayload(response);
  },

  telechargerDocx: async (id) => {
    const response = await apiClient.get(`/admin/devis/${id}/docx`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data ?? response]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `devis-${id}.docx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getMesDevis: async () => {
    const response = await apiClient.get('/organisation/devis');
    const payload = unwrapPayload(response);
    return Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  },
};

export default devisApi;
