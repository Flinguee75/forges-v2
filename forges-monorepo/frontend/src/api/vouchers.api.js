import { apiClient } from './client';

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  );
}

function unwrapPayload(response) {
  return response?.data ?? response;
}

function normalizeVoucher(voucher = {}) {
  return {
    ...voucher,
    type: voucher.type || 'PROMOTIONNEL',
    statut: voucher.statut || 'ACTIF',
    quota_restant: voucher.quota_restant ?? Math.max(0, Number(voucher.quota_max || 0) - Number(voucher.quota_utilise || 0)),
    formation: voucher.formation
      ? {
          ...voucher.formation,
          titre: voucher.formation.titre || voucher.formation.intitule || '',
        }
      : null,
    organisation: voucher.organisation || null,
    apporteur: voucher.apporteur || null,
  };
}

export const vouchersApi = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/vouchers', { params: cleanQueryParams(params) });
    const payload = unwrapPayload(response);
    const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];

    return {
      data: items.map(normalizeVoucher),
      meta: payload?.meta || {
        page: 1,
        limit: items.length || 0,
        total: items.length,
        totalPages: 1,
      },
    };
  },

  getById: async (id) => {
    const response = await apiClient.get(`/vouchers/${id}`);
    return normalizeVoucher(unwrapPayload(response));
  },

  getByCode: async (code) => {
    const response = await apiClient.get(`/vouchers/code/${code}`);
    return normalizeVoucher(unwrapPayload(response));
  },

  createOrganisation: async (data) => {
    const response = await apiClient.post('/vouchers/organisation', {
      formation_id: data.formation_id,
      organisation_id: data.organisation_id,
      valeur: Number(data.valeur),
      type_valeur: data.type_valeur,
      quota_max: Number(data.quota_max),
      date_expiration: data.date_expiration,
    });
    return normalizeVoucher(unwrapPayload(response));
  },

  createPromotionnel: async (data) => {
    const response = await apiClient.post('/vouchers/promotionnel', {
      formation_id: data.formation_id,
      valeur: Number(data.valeur),
      type_valeur: data.type_valeur,
      quota_max: Number(data.quota_max),
      date_expiration: data.date_expiration,
    });
    return normalizeVoucher(unwrapPayload(response));
  },

  valider: async (id) => {
    const response = await apiClient.patch(`/vouchers/${id}/validate`);
    return normalizeVoucher(unwrapPayload(response));
  },

  refuser: async (id, motif = '') => {
    const response = await apiClient.patch(`/vouchers/${id}/reject`, { motif });
    return normalizeVoucher(unwrapPayload(response));
  },

  checkApporteurCode: async (code, params = {}) => {
    const response = await apiClient.get(`/vouchers/apporteur/${code}/check`, {
      params: cleanQueryParams(params),
    });
    return unwrapPayload(response);
  },

  update: async (id, data) => {
    const response = await apiClient.patch(`/vouchers/${id}`, data);
    return normalizeVoucher(unwrapPayload(response));
  },

  delete: async (id) => {
    return apiClient.delete(`/vouchers/${id}`);
  },
};

export default vouchersApi;
