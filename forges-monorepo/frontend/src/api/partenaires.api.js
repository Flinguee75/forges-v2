import { apiClient } from './client';

const PARTENAIRES_BASE_URL = '/partenaires';
const PARTENAIRES_ADMIN_BASE_URL = '/admin';

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  );
}

function unwrapPayload(response) {
  return response?.data ?? response;
}

function runtimeUnavailable(operation) {
  const error = new Error(`${operation} n'est pas exposé par le runtime backend actuel`);
  error.code = 'ROUTE_ABSENTE';
  return error;
}

function normalizeFormation(formation = {}) {
  return {
    ...formation,
    titre: formation.titre || formation.intitule || '',
    intitule: formation.intitule || formation.titre || '',
    description: formation.description || formation.description_courte || '',
    description_courte: formation.description_courte || formation.description || '',
    domaine: formation.domaine || formation.public_cible || '',
    duree: formation.duree || formation.duree_jours || 0,
    duree_jours: formation.duree_jours || formation.duree || 0,
    prix_coutant: formation.prix_coutant ?? formation.prix_coutant_soumis ?? 0,
    prix_coutant_soumis: formation.prix_coutant_soumis ?? formation.prix_coutant ?? 0,
    motif_rejet: formation.motif_rejet || formation.corrections_suggerees || '',
    corrections_suggerees: formation.corrections_suggerees || formation.motif_rejet || '',
  };
}

function normalizeReversement(reversement = {}) {
  return {
    ...reversement,
    id: reversement.id || `${reversement.formation?.intitule || 'reversement'}-${reversement.date_reversement || reversement.date_creation || ''}`,
    montant_net: reversement.montant_net ?? reversement.montant_reverse_xof ?? reversement.montant_reverse ?? 0,
    statut_validation: reversement.statut_validation || reversement.statut || 'EN_ATTENTE',
    formation: {
      ...(reversement.formation || {}),
      titre: reversement.formation?.titre || reversement.formation?.intitule || reversement.formation_intitule || '-',
    },
    date_validation: reversement.date_validation || reversement.date_reversement || reversement.created_at || null,
    date_reversement: reversement.date_reversement || reversement.date_validation || null,
    message: reversement.message || (reversement.statut === 'REVERSEE' ? 'Reversement effectué' : 'En attente de reversement'),
  };
}

function normalizeDashboard(dashboard = {}) {
  const formations = Array.isArray(dashboard.formations) ? dashboard.formations.map(normalizeFormation) : [];
  const reversements = Array.isArray(dashboard.reversements) ? dashboard.reversements.map(normalizeReversement) : [];

  return {
    ...dashboard,
    stats: dashboard.stats || {
      total_formations: formations.length,
      formations_validees: formations.filter((item) => item.statut_validation === 'VALIDEE').length,
      formations_rejetees: formations.filter((item) => item.statut_validation === 'REJETEE').length,
      formations_suspendues: formations.filter((item) => item.statut_validation === 'SUSPENDUE').length,
      reversements_nets_mois: dashboard.reversements?.percus_xof ?? 0,
    },
    formations,
    reversements,
  };
}

function normalizePartenaire(partenaire = {}) {
  return {
    ...partenaire,
    id: partenaire.id || '',
    raison_sociale: partenaire.raison_sociale || '',
    type: partenaire.type || 'AUTRE',
    email: partenaire.email || partenaire.email_principal || '',
    email_principal: partenaire.email_principal || '',
    pays: partenaire.pays || 'CI',
    commission_forges_pct: partenaire.commission_forges_pct ?? 0,
    statut: partenaire.statut || 'EN_ATTENTE_VERIFICATION',
    mode_inscription: partenaire.mode_inscription || 'AUTO_INSCRIPTION',
    created_at: partenaire.created_at || null,
    counts: partenaire.counts || partenaire._count || {},
  };
}

export const getPartenaireStats = async () => {
  const response = await apiClient.get(`${PARTENAIRES_BASE_URL}/dashboard`);
  return normalizeDashboard(unwrapPayload(response));
};

export const getMesFormations = async (params = {}) => {
  const response = await apiClient.get(`${PARTENAIRES_BASE_URL}/formations`, {
    params: cleanQueryParams(params),
  });
  const payload = unwrapPayload(response);
  const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];

  return {
    data: items.map(normalizeFormation),
    meta: {
      page: 1,
      limit: items.length || 0,
      total: items.length,
      totalPages: 1,
    },
  };
};

export const getFormationDetail = async (formationId) => {
  const response = await apiClient.get(`${PARTENAIRES_BASE_URL}/formations/${formationId}`);
  return normalizeFormation(unwrapPayload(response));
};

function mapSoumissionPayload(formationData = {}, brouillon = false) {
  const objectifs = Array.isArray(formationData.objectifs_pedagogiques)
    ? formationData.objectifs_pedagogiques
    : String(formationData.objectifs || '').split(/\r?\n|,|;/).map((item) => item.trim()).filter(Boolean);

  const languesDisponibles = Array.isArray(formationData.langues_disponibles)
    ? formationData.langues_disponibles
    : [formationData.langue || 'FR'].filter(Boolean);

  return {
    intitule: formationData.intitule || formationData.titre || '',
    description_courte: formationData.description_courte || formationData.description || '',
    description_longue: formationData.description_longue || formationData.description || '',
    duree_jours: Number(formationData.duree_jours || Math.max(1, Math.ceil(Number(formationData.duree_heures || 1) / 8))),
    mode_formation: formationData.mode_formation || 'AVEC_SESSION',
    langues_disponibles: languesDisponibles,
    certification_delivree: Boolean(formationData.certification_delivree ?? formationData.certification),
    organisme_certificateur: formationData.organisme_certificateur || formationData.certification || undefined,
    public_cible: formationData.public_cible || '',
    objectifs_pedagogiques: objectifs.length > 0 ? objectifs : [formationData.objectifs || formationData.titre || 'Objectif non précisé'],
    prerequis: formationData.prerequis || undefined,
    programme_syllabus: formationData.programme_syllabus || formationData.programme || undefined,
    modalite: formationData.modalite || undefined,
    nb_places_max_session: Number(formationData.nb_places_max_session || formationData.capacite_max || 1),
    prix_coutant_propose: Number(formationData.prix_coutant_propose || formationData.prix_coutant || 0),
    commentaire_positionnement: formationData.commentaire_positionnement || formationData.sous_domaine || undefined,
    brouillon,
  };
}

export const createFormationPartenaire = async (formationData, brouillon = false) => {
  const response = await apiClient.post(`${PARTENAIRES_BASE_URL}/formations`, mapSoumissionPayload(formationData, brouillon));
  return unwrapPayload(response);
};

export const soumettreFormation = createFormationPartenaire;

export const updateFormationBrouillon = async (formationId, formationData) => {
  const response = await apiClient.put(`${PARTENAIRES_BASE_URL}/formations/${formationId}`, mapSoumissionPayload(formationData, true));
  return unwrapPayload(response);
};

export const soumettreFormationBrouillon = async (formationId) => {
  const response = await apiClient.put(`${PARTENAIRES_BASE_URL}/formations/${formationId}/soumettre`);
  return unwrapPayload(response);
};

export const getMesReversements = async (params = {}) => {
  const response = await apiClient.get(`${PARTENAIRES_BASE_URL}/reversements`, {
    params: cleanQueryParams(params),
  });
  const payload = unwrapPayload(response);
  const items = Array.isArray(payload?.reversements) ? payload.reversements : Array.isArray(payload?.data) ? payload.data : [];

  return {
    data: items.map(normalizeReversement),
    meta: {
      page: 1,
      limit: items.length || 0,
      total: items.length,
      totalPages: 1,
    },
    totaux: payload?.totaux || {},
  };
};

export const getMonProfilPartenaire = async () => {
  const response = await apiClient.get(`${PARTENAIRES_BASE_URL}/profil`);
  return normalizePartenaire(unwrapPayload(response));
};

export const updateMonProfilPartenaire = async (data = {}) => {
  const payload = {
    raison_sociale: data.raison_sociale?.trim?.() || data.raison_sociale || '',
    email_principal: data.email_principal?.trim?.() || data.email_principal || data.email || '',
    pays: data.pays || 'CI',
  };

  const response = await apiClient.put(`${PARTENAIRES_BASE_URL}/profil`, payload);
  return normalizePartenaire(unwrapPayload(response));
};

export const getProfilPartenaire = getMonProfilPartenaire;
export const updateProfilPartenaire = updateMonProfilPartenaire;

export const registerPartenaire = async (registerData = {}) => {
  const payload = {
    raison_sociale: registerData.raison_sociale?.trim?.() || registerData.raison_sociale || '',
    type: registerData.type || registerData.type_partenaire || 'AUTRE',
    pays: registerData.pays || 'CI',
    email_principal: registerData.email_principal || registerData.email || '',
    password: registerData.password || '',
    telephone: registerData.telephone || undefined,
    langue_preferee: registerData.langue_preferee || 'FR',
    responsable_designe_id: registerData.responsable_designe_id || undefined,
  };

  const response = await apiClient.post(`${PARTENAIRES_BASE_URL}/register`, payload);
  return unwrapPayload(response);
};

export const confirmEmailPartenaire = async (token, password) => {
  if (!password) {
    throw runtimeUnavailable('L\'activation partenaire');
  }

  const response = await apiClient.post(`${PARTENAIRES_BASE_URL}/activate`, { token, password });
  return unwrapPayload(response);
};

export const getAllPartenaires = () => {
  return apiClient.get('/admin/partenaires').then((response) => {
    const payload = unwrapPayload(response);
    const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    return {
      data: items.map(normalizePartenaire),
      meta: payload?.meta || { page: 1, limit: items.length || 0, total: items.length, totalPages: 1 },
    };
  });
};

export const getPartenaireAdmin = (id) => {
  return apiClient.get(`/admin/partenaires/${id}`).then((response) => normalizePartenaire(unwrapPayload(response)));
};

export const inviterPartenaire = async (data = {}) => {
  const payload = {
    email: data.email?.trim?.() || data.email || '',
    raison_sociale: data.raison_sociale?.trim?.() || data.raison_sociale || '',
    type: data.type || 'AUTRE',
    commission_forges_pct: Number(data.commission_forges_pct ?? 20),
  };

  const response = await apiClient.post(`${PARTENAIRES_ADMIN_BASE_URL}/partenaires`, payload);
  return unwrapPayload(response);
};

export const approuverPartenaire = (id, data = {}) => {
  return apiClient.put(`/admin/partenaires/${id}/approuver`, data).then(unwrapPayload);
};

export const refuserPartenaire = (id) => {
  return apiClient.put(`/admin/partenaires/${id}/refuser`).then(unwrapPayload);
};

export const suspendrePartenaire = (id) => {
  return apiClient.put(`/admin/partenaires/${id}/suspendre`).then(unwrapPayload);
};

export const reactiverPartenaire = (id) => {
  return apiClient.put(`/admin/partenaires/${id}/reactiver`).then(unwrapPayload);
};

const partenairesApi = {
  getPartenaireStats,
  getMesFormations,
  getFormationDetail,
  createFormationPartenaire,
  soumettreFormation,
  updateFormationBrouillon,
  soumettreFormationBrouillon,
  getMesReversements,
  getMonProfilPartenaire,
  getProfilPartenaire,
  updateMonProfilPartenaire,
  updateProfilPartenaire,
  registerPartenaire,
  confirmEmailPartenaire,
  getAllPartenaires,
  getPartenaireAdmin,
  inviterPartenaire,
  approuverPartenaire,
  refuserPartenaire,
  suspendrePartenaire,
  reactiverPartenaire,
};

export default partenairesApi;
