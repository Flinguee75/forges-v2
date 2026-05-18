import { apiClient } from './client';

/**
 * API client pour l'espace organisation
 * Référence: MOD-10 Espace Organisation (CLAUDE.md backend)
 * Référence: F-7 Espace Organisation (Todo_front.pdf)
 */

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null
    )
  );
}

function unwrapData(response) {
  return response?.data ?? response;
}

function buildMeta(total = 0, page = 1, limit = 20) {
  const normalizedTotal = Number(total || 0);
  const normalizedPage = Number(page || 1);
  const normalizedLimit = Number(limit || 20);

  return {
    total: normalizedTotal,
    page: normalizedPage,
    limit: normalizedLimit,
    totalPages: normalizedLimit > 0 ? Math.max(1, Math.ceil(normalizedTotal / normalizedLimit)) : 1,
  };
}

function normalizeDashboard(response) {
  const data = unwrapData(response);
  const stats = data?.stats || {};
  const organisation = data?.organisation || {};

  return {
    organisation: {
      ...organisation,
      nom: organisation?.nom || organisation?.raison_sociale || '-',
    },
    stats: {
      // Clés alignées avec le retour backend getStatsOrganisation() (repository.ts:91-96)
      // backend retourne: nb_beneficiaires, nb_inscriptions, nb_vouchers_actifs, montant_paye_total
      effectifs_inscrits: stats.nb_inscriptions ?? 0,
      // montant_paye_total = aggregate sur paiement.montant_final (déjà en centimes dans DB)
      budget_engage: stats.montant_paye_total ?? 0,
      vouchers_actifs: stats.nb_vouchers_actifs ?? 0,
      total_employes: stats.nb_beneficiaires ?? 0,
    },
    recent_inscriptions: Array.isArray(data?.recent_inscriptions) ? data.recent_inscriptions : [],
    recent_paiements: Array.isArray(data?.recent_paiements) ? data.recent_paiements : [],
    subscription_summary: {
      organisation: organisation?.abonnement_org ? normalizeOrganisationSubscription(organisation.abonnement_org) : null,
      b2b: organisation?.abonnement_b2b ? normalizeB2BSubscription(organisation.abonnement_b2b) : null,
    },
  };
}

function normalizeOrganisationSubscription(response) {
  const raw = unwrapData(response);
  if (!raw) return null;
  const data = raw?.abonnement ?? raw;
  const montantAnnuelXof = Number(data.montant_annuel_xof ?? data.montant_annuel ?? raw.montant_annuel_xof ?? 0);

  return {
    ...(raw?.abonnement ? raw : {}),
    ...data,
    montant_annuel_xof: montantAnnuelXof,
    montant_annuel: montantAnnuelXof,
    date_renouvellement: data.date_renouvellement || data.date_fin || null,
    is_trial: data.is_trial || data.statut === 'ESSAI',
    can_subscribe: data.can_subscribe ?? !['ACTIF', 'ESSAI'].includes(data.statut),
  };
}

function normalizeB2BSubscription(response) {
  const raw = unwrapData(response);
  if (!raw) return null;
  const data = raw?.abonnement ?? raw;

  const nbActifs = Number(data.nb_actifs || 0);
  const nbMax = Number(data.nb_max || 0);
  const taux = Number(data.taux_utilisation || 0);
  const montantAnnuelXof = Number(
    data.montant_annuel_xof ?? data.prix_annuel_xof ?? data.montant_annuel ?? data.prix_annuel ?? raw.prix_annuel_xof ?? 0
  );

  return {
    ...(raw?.abonnement ? raw : {}),
    ...data,
    exists: true,
    montant_annuel_xof: montantAnnuelXof,
    prix_annuel_xof: Number(data.prix_annuel_xof ?? data.prix_annuel ?? montantAnnuelXof),
    montant_annuel: montantAnnuelXof,
    prix_annuel: Number(data.prix_annuel_xof ?? data.prix_annuel ?? montantAnnuelXof),
    date_renouvellement: data.date_renouvellement || data.date_fin || null,
    ratio_utilisation: data.ratio_utilisation ?? (nbMax > 0 ? nbActifs / nbMax : taux / 100),
    message:
      data.message ||
      (nbMax > 0 ? `${nbActifs} / ${nbMax} apprenants actifs` : 'Abonnement B2B actif'),
  };
}

function normalizeMembres(response) {
  const data = unwrapData(response);

  // Support both old format (dossiers) and new format (membres)
  if (Array.isArray(data?.membres)) {
    // New format: direct list of membres
    return {
      data: data.membres.map(membre => ({
        id: membre.id,
        email: membre.email || '',
        nom: membre.nom || '',
        prenom: membre.prenom || membre.prenoms || '',
        statut: membre.statut || 'ACTIF',
        created_at: membre.created_at,
        derniere_inscription: membre.derniere_inscription,
      })),
      meta: buildMeta(data?.total, data?.page, data?.limit, data?.totalPages),
    };
  }

  // Old format: dossiers grouped by apprenant
  const dossiers = Array.isArray(data?.dossiers) ? data.dossiers : Array.isArray(data) ? data : [];
  const membres = new Map();

  dossiers.forEach((dossier) => {
    const apprenant = dossier?.apprenant;
    if (!apprenant?.id) return;

    const current = membres.get(apprenant.id) || {
      id: apprenant.id,
      email: apprenant.email || '',
      nom: apprenant.nom || '',
      prenom: apprenant.prenom || apprenant.prenoms || '',
      statut: apprenant.statut || 'ACTIF',
      dossiers: [],
    };

    current.dossiers.push({
      ...dossier,
      formation: dossier?.formation
        ? {
            ...dossier.formation,
            titre: dossier.formation.titre || dossier.formation.intitule || '',
          }
        : dossier?.formation,
    });

    membres.set(apprenant.id, current);
  });

  return {
    data: Array.from(membres.values()),
    meta: buildMeta(data?.total, data?.page, data?.limit),
  };
}

function normalizeVouchers(response) {
  const data = unwrapData(response);
  const vouchers = Array.isArray(data) ? data : Array.isArray(data?.vouchers) ? data.vouchers : [];

  return {
    data: vouchers.map((voucher) => ({
      ...voucher,
      formation: voucher?.formation
        ? {
            ...voucher.formation,
            titre: voucher.formation.titre || voucher.formation.intitule || '',
          }
        : null,
    })),
    meta: buildMeta(data?.total ?? vouchers.length, data?.page ?? 1, data?.limit ?? (vouchers.length || 10)),
  };
}

function normalizeInscriptions(response) {
  const data = unwrapData(response);
  const dossiers = Array.isArray(data?.dossiers) ? data.dossiers : Array.isArray(data) ? data : [];

  return {
    data: dossiers.map((dossier) => ({
      ...dossier,
      etudiant: dossier?.etudiant || dossier?.apprenant
        ? {
            ...(dossier.etudiant || dossier.apprenant),
            prenom: dossier?.etudiant?.prenom || dossier?.apprenant?.prenom || dossier?.apprenant?.prenoms || '',
          }
        : null,
      session: dossier?.session
        ? {
            ...dossier.session,
            formation: dossier?.formation
              ? {
                  ...dossier.formation,
                  titre: dossier.formation.titre || dossier.formation.intitule || '',
                  tarif: dossier.formation.tarif || dossier.formation.cout_catalogue || 0,
                }
              : dossier.session.formation,
          }
        : null,
    })),
    meta: buildMeta(data?.total, data?.page, data?.limit),
  };
}

function normalizePaiements(response) {
  const data = unwrapData(response);
  const paiements = Array.isArray(data?.paiements) ? data.paiements : Array.isArray(data) ? data : [];

  return {
    data: paiements.map((paiement) => ({
      ...paiement,
      // montant_final est déjà en centimes dans la DB (Paiement.montant_final)
      montant: paiement.montant_final ?? paiement.montant_catalogue ?? paiement.montant ?? 0,
      methode_paiement: paiement.methode_paiement || paiement.methode || null,
      dossier: paiement?.dossier
        ? {
            ...paiement.dossier,
            etudiant: paiement.dossier?.etudiant || paiement.dossier?.apprenant
              ? {
                  ...(paiement.dossier.etudiant || paiement.dossier.apprenant),
                  prenom:
                    paiement?.dossier?.etudiant?.prenom ||
                    paiement?.dossier?.apprenant?.prenom ||
                    paiement?.dossier?.apprenant?.prenoms ||
                    '',
                }
              : null,
            session: {
              ...paiement.dossier.session,
              formation: paiement.dossier.formation
                ? {
                    ...paiement.dossier.formation,
                    titre: paiement.dossier.formation.titre || paiement.dossier.formation.intitule || '',
                  }
                : paiement.dossier.session?.formation,
            },
          }
        : null,
    })),
    meta: buildMeta(data?.total, data?.page, data?.limit),
  };
}

function normalizeOrganisationProfile(response) {
  const raw = unwrapData(response);
  if (!raw) return null;

  // Le PUT /espace-organisation/profil retourne { message, organisation: {...} }
  // Le GET /espace-organisation/profil retourne l'objet org directement
  const data = raw?.organisation ?? raw;

  return {
    ...data,
    // Alias de lecture conservés pour les écrans historiques; l'écriture utilise les champs Prisma.
    nom_legal: data.nom_legal || data.raison_sociale || '',
    raison_sociale: data.raison_sociale || data.nom_legal || '',
    email_contact: data.email_contact || data.email || '',
    contact_referent: data.contact_referent || '',
  };
}

function serializeOrganisationProfile(data = {}) {
  return cleanQueryParams({
    raison_sociale: data.raison_sociale,
    email: data.email,
    contact_referent: data.contact_referent,
    pays: data.pays,
    langue_preferee: data.langue_preferee,
  });
}

function buildCsvContent(rows = []) {
  const header = 'email,nom,prenoms';
  const lines = rows.map((row) => [row.email, row.nom, row.prenom || row.prenoms].join(','));
  return [header, ...lines].join('\n');
}

export const organisationApi = {
  // Dashboard
  getDashboard: async () => normalizeDashboard(await apiClient.get('/espace-organisation/dashboard')),

  // Abonnements organisation
  getAbonnementOrganisation: async () => normalizeOrganisationSubscription(await apiClient.get('/abonnements/organisation/me')),

  souscrireOrganisation: async (data) =>
    normalizeOrganisationSubscription(await apiClient.post('/abonnements/organisation', data)),

  // Abonnements B2B
  getAbonnementB2B: async () => normalizeB2BSubscription(await apiClient.get('/abonnements/b2b/me')),

  souscrireB2B: async (data) =>
    normalizeB2BSubscription(await apiClient.post('/abonnements/b2b', data)),

  changerPalierB2B: async (data) =>
    unwrapData(await apiClient.put('/abonnements/b2b/monter-palier', {
      nouveau_palier: data?.nouveau_palier || data?.palier,
    })),

  // Membres (employés/bénéficiaires)
  getMembres: async (params = {}) => {
    const response = await apiClient.get('/espace-organisation/membres', {
      params: cleanQueryParams(params),
    });
    return normalizeMembres(response);
  },

  createMembre: (data) => {
    return apiClient.post('/espace-organisation/membres', data);
  },

  deleteMembre: (membreId) => {
    return apiClient.delete(`/espace-organisation/membres/${membreId}`);
  },

  importB2BMembres: (data) => {
    return apiClient.post('/espace-organisation/membres/import-b2b', {
      csv_content: buildCsvContent(data?.rows || []),
    });
  },

  // Inscrire un bénéficiaire à une formation (UCS12)
  inscrireBeneficiaire: (data) =>
    apiClient.post('/espace-organisation/inscrire-beneficiaire', data),

  // Vouchers
  getVouchers: async (params = {}) => {
    const response = await apiClient.get('/espace-organisation/vouchers', {
      params: cleanQueryParams(params),
    });
    return normalizeVouchers(response);
  },

  // Inscriptions
  getInscriptions: async (params = {}) => {
    const response = await apiClient.get('/espace-organisation/inscriptions', {
      params: cleanQueryParams(params),
    });
    return normalizeInscriptions(response);
  },

  // Paiements
  getPaiements: async (params = {}) => {
    const response = await apiClient.get('/espace-organisation/paiements', {
      params: cleanQueryParams(params),
    });
    return normalizePaiements(response);
  },

  // Profil
  getProfil: async () => normalizeOrganisationProfile(await apiClient.get('/espace-organisation/profil')),

  updateProfil: async (data) =>
    normalizeOrganisationProfile(await apiClient.put('/espace-organisation/profil', serializeOrganisationProfile(data))),
};
