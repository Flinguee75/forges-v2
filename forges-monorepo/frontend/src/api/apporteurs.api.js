import { apiClient as client } from './client';

/**
 * API Apporteurs d'Affaires — v4.8
 * Gestion du code parrainage, commissions et reversements
 * Référence: CLAUDE.md MOD-13, RM-141 à RM-148
 */

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

const APPORTEURS_ADMIN_BASE_URL = '/admin';

function formatMontantDate(dateValue) {
  if (!dateValue) {
    return '';
  }

  const date = new Date(dateValue);
  return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' });
}

function normalizeCommission(commission = {}) {
  return {
    ...commission,
    created_at: commission.created_at || commission.date || null,
    montant_base: commission.montant_base ?? commission.montant_base_xof ?? 0,
    montant_commission: commission.montant_commission ?? commission.commission_xof ?? 0,
    statut: commission.statut || 'EN_ATTENTE',
    mois_reference: commission.mois_reference || formatMontantDate(commission.created_at || commission.date),
    paiement: commission.paiement || {
      transaction_id: commission.transaction_id || commission.paiement_id || 'N/A',
      confirmed_at: commission.confirmed_at || commission.created_at || null,
    },
  };
}

function normalizeTopApporteur(apporteur = {}) {
  const countValue =
    typeof apporteur._count === 'number'
      ? apporteur._count
      : apporteur._count?.id ?? apporteur._count?.apporteur_id ?? 0;

  return {
    ...apporteur,
    apporteur_id: apporteur.apporteur_id || apporteur.id || '',
    nom: apporteur.nom || apporteur.apporteur?.nom || '',
    email: apporteur.email || apporteur.apporteur?.email || '',
    code_apporteur: apporteur.code_apporteur || apporteur.apporteur?.code_apporteur || '',
    nb_transactions: countValue,
    montant_base: apporteur._sum?.montant_base ?? apporteur.montant_base ?? 0,
    montant_commission: apporteur._sum?.montant_commission ?? apporteur.montant_commission ?? 0,
  };
}

function normalizeDashboard(dashboard = {}) {
  const historiqueReversements = Array.isArray(dashboard.historique_reversements) ? dashboard.historique_reversements : [];
  const reversements = historiqueReversements.map((item) => ({
    id: item.id || `${item.date || item.reverse_le || ''}-${item.montant_xof || 0}`,
    mois: formatMontantDate(item.date || item.reverse_le),
    nb_transactions: item.nb_transactions || 0,
    montant_base: item.montant_base_xof || item.montant_base || item.montant_xof || 0,
    montant_commission: item.montant_xof || item.montant_commission || 0,
    statut: item.statut || 'REVERSEE',
    message: item.message || 'Reversement effectué',
    date_validation: item.date || item.reverse_le || null,
    formation: item.formation || { titre: item.formation_intitule || '-' },
  }));

  const statsMois = dashboard.stats_mois || {};
  const cumulEnCours = Number(dashboard.cumul_du_xof || 0);
  const cumulTotalPercu = reversements
    .filter((item) => item.statut === 'REVERSEE')
    .reduce((sum, item) => sum + Number(item.montant_commission || 0), 0);

  return {
    ...dashboard,
    langue_preferee: dashboard.langue_preferee || 'FR',
    referral_url: dashboard.referral_url || dashboard.lien_parrainage || '',
    stats_mois_courant: dashboard.stats_mois_courant || {
      nb_transactions_mois: statsMois.nb_transactions || 0,
      montant_base_mois: statsMois.ca_genere_xof || 0,
      montant_commission_mois: statsMois.commission_xof || 0,
    },
    cumul_en_cours: dashboard.cumul_en_cours ?? cumulEnCours,
    cumul_total_percu: dashboard.cumul_total_percu ?? cumulTotalPercu,
    reversements,
  };
}

function normalizeApporteur(apporteur = {}) {
  return {
    ...apporteur,
    id: apporteur.id || '',
    nom: apporteur.nom || '',
    type: apporteur.type || 'INDIVIDU',
    email: apporteur.email || '',
    telephone: apporteur.telephone || '',
    pays: apporteur.pays || '',
    code_apporteur: apporteur.code_apporteur || '',
    taux_commission_pct: apporteur.taux_commission_pct ?? 0,
    statut: apporteur.statut || 'ACTIF',
    date_inscription: apporteur.date_inscription || null,
    commissions_count: apporteur.commissions_count ?? apporteur._count?.commissions ?? 0,
    voucher: apporteur.voucher || null,
  };
}

const apporteursApi = {
  // ============================================
  // DASHBOARD & STATISTIQUES
  // ============================================

  /**
   * Récupère le dashboard de l'apporteur connecté
   * Retourne: code UUID, stats mois courant, cumul total
   */
  getDashboard: async () => {
    const response = await client.get('/apporteurs/dashboard');
    return normalizeDashboard(unwrapPayload(response));
  },

  /**
   * Route absente du backend actuel.
   * Utiliser getDashboard() ou getMesCommissions() selon le besoin.
   */
  getApporteurById: async () => {
    throw runtimeUnavailable('getApporteurById');
  },

  /**
   * Route absente du backend actuel.
   * Utiliser getDashboard() pour le dashboard de l'apporteur connecte.
   */
  getApporteurDashboard: async () => {
    throw runtimeUnavailable('getApporteurDashboard');
  },

  /**
   * Route absente du backend actuel.
   * Utiliser getMesCommissions() pour les commissions de l'apporteur connecte.
   */
  getApporteurCommissions: async () => {
    throw runtimeUnavailable('getApporteurCommissions');
  },

  /**
   * Route absente du backend actuel.
   * Utiliser getMesReversements() pour les reversements de l'apporteur connecte.
   */
  getApporteurReversements: async () => {
    throw runtimeUnavailable('getApporteurReversements');
  },

  // ============================================
  // COMMISSIONS
  // ============================================

  /**
   * Liste des commissions de l'apporteur connecté
   * Paramètres optionnels: mois, annee, statut
   */
  getMesCommissions: async (params = {}) => {
    const response = await client.get('/apporteurs/commissions', {
      params: cleanQueryParams(params),
    });
    const payload = unwrapPayload(response);
    const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];

    return {
      data: items.map(normalizeCommission),
      meta: {
        page: 1,
        limit: items.length || 0,
        total: items.length,
        totalPages: 1,
      },
    };
  },

  // ============================================
  // REVERSEMENTS
  // ============================================

  /**
   * Historique des reversements de l'apporteur connecte.
   * Delegue a getMesCommissions avec statut REVERSEE par defaut.
   * Le caller peut surcharger le statut via params.
   */
  getMesReversements: async (params = {}) => {
    return apporteursApi.getMesCommissions({ statut: 'REVERSEE', ...params });
  },

  // ============================================
  // PROFIL
  // ============================================

  /**
   * Récupère le profil de l'apporteur connecté
   */
  getMonProfil: async () => {
    const response = await client.get('/apporteurs/profil');
    return normalizeApporteur(unwrapPayload(response));
  },

  /**
   * Met à jour le profil de l'apporteur connecté
   */
  updateProfil: async (data) => {
    const response = await client.put('/apporteurs/profil', data);
    return normalizeApporteur(unwrapPayload(response));
  },

  // ============================================
  // INSCRIPTION PUBLIQUE (Flux B — RM-126)
  // ============================================

  /**
   * Auto-inscription apporteur (statut EN_ATTENTE_VERIFICATION)
   * Flux B — pas de token invitation
   */
  register: async (data) => {
    const response = await client.post('/apporteurs/register', data);
    return unwrapPayload(response);
  },

  // ============================================
  // ADMIN — GESTION APPORTEURS
  // ============================================

  /**
   * Route absente du backend actuel.
   * La liste des apporteurs n'est pas exposee via /admin/apporteurs.
   */
  getAllApporteurs: async () => {
    throw runtimeUnavailable('getAllApporteurs');
  },

  /**
   * Route absente du backend actuel.
   * La creation admin d'apporteur n'est pas exposee via /admin/apporteurs.
   * Utiliser register() pour l'auto-inscription (Flux B).
   */
  createApporteur: async () => {
    throw runtimeUnavailable('createApporteur');
  },

  /**
   * Route absente du backend actuel.
   * L'approbation admin n'est pas exposee via /admin/apporteurs/:id/approuver.
   */
  approuverApporteur: async () => {
    throw runtimeUnavailable('approuverApporteur');
  },

  // ============================================
  // ADMIN — REVERSEMENTS APPORTEURS (RM-147)
  // ============================================

  /**
   * Tableau de bord Superviseur — Top 10 apporteurs (RM-148)
   */
  getRapportMensuel: async (params = {}) => {
    const response = await client.get('/superviseur/apporteurs/tdb', {
      params: cleanQueryParams(params),
    });
    const payload = unwrapPayload(response);

    return {
      nb_apporteurs_actifs: payload?.nb_apporteurs_actifs || 0,
      commissions_totales_dues_xof: payload?.commissions_totales_dues_xof || 0,
      top_apporteurs: Array.isArray(payload?.top_apporteurs)
        ? payload.top_apporteurs.map(normalizeTopApporteur)
        : [],
    };
  },

  /**
   * Helper hérité conservé uniquement pour compatibilité.
   * Le runtime actuel expose un reversement global côté agent via
   * POST /api/agent/reversements/apporteurs/:id/execute.
   */
  reverserReversementMensuel: async (apporteurId, mois) => {
    const error = runtimeUnavailable('Le reversement mensuel apporteur');
    error.details = { apporteurId, mois };
    throw error;
  },
};

export default apporteursApi;
