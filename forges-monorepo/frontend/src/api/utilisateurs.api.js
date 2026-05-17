import { apiClient } from './client';

const utilisateursApi = {
  getAll: async (params = {}) => {
    const res = await apiClient.get('/admin/users', { params });
    return res.data;
  },

  getBackofficeUsers: async (params = {}) => {
    const res = await apiClient.get('/admin/backoffice-users', { params });
    return res.data;
  },

  create: async (data) => {
    const res = await apiClient.post('/admin/users', data);
    return res.data;
  },

  updateStatus: async (id, statut) => {
    const res = await apiClient.put(`/admin/users/${id}/status`, { statut });
    return res.data;
  },
};

export default utilisateursApi;
