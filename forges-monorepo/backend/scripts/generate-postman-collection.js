#!/usr/bin/env node
/**
 * Script de génération automatique d'une collection Postman exhaustive
 * à partir du fichier ucs_mapping_endpoit.md
 *
 * Usage: node scripts/generate-postman-collection.js
 */

const fs = require('fs');
const path = require('path');

// Mapping des rôles vers les tokens d'environnement
const ROLE_TO_TOKEN = {
  'Public': null, // Pas d'auth
  'APPRENANT': '{{token_apprenant}}',
  'ORGANISATION': '{{token_organisation}}',
  'PARTENAIRE': '{{token_partenaire}}',
  'APPORTEUR': '{{token_apporteur}}',
  'RESPONSABLE': '{{token_responsable}}',
  'AGENT': '{{token_agent}}',
  'SUPERVISEUR': '{{token_superviseur}}',
  'ADMIN': '{{token_admin}}',
  'GESTIONNAIRE': '{{token_gestionnaire}}',
};

// Endpoints critiques avec body de test
const ENDPOINT_BODIES = {
  'POST /api/apprenants/register': {
    email: 'test.postman.{{$randomUUID}}@forges-ci.local',
    nom: 'TEST',
    prenoms: 'Postman',
    type_apprenant: 'PROFESSIONNEL',
    secteur_activite: 'IT',
    pays_residence: 'CI',
    pays_nationalite: 'CI',
    langue_preferee: 'FR',
    password: 'Test@FORGES2026!',
    consentement_rgpd: true,
  },
  'POST /api/organisations/register': {
    raison_sociale: 'Test Org Postman',
    type: 'ENTREPRISE',
    identifiant_legal: 'CI-TEST-{{$randomUUID}}',
    contact_referent: 'Directeur',
    email: 'test.org.{{$randomUUID}}@forges-ci.local',
    pays: 'CI',
    langue_preferee: 'FR',
    password: 'Test@FORGES2026!',
    consentement_rgpd: true,
  },
  'POST /api/auth/login': {
    email: '{{login_email_apprenant}}',
    password: '{{login_password}}',
  },
  'POST /api/auth/refresh': {
    refreshToken: '{{refresh_token_apprenant}}',
  },
  'POST /api/dossiers': {
    session_id: '{{session_id_test}}',
    source_financement: 'RETAIL',
  },
  'POST /api/partenaires/formations': {
    intitule: 'Formation Test Postman',
    description_courte: 'Test automatique',
    description_longue: '<p>Description complète test</p>',
    mode_formation: 'AVEC_SESSION',
    duree_jours: 5,
    prix_coutant_propose: 100000,
    modalite: 'DISTANCIEL',
    public_cible: 'Professionnels IT',
    objectifs_pedagogiques: ['Objectif 1', 'Objectif 2'],
    langues_disponibles: ['FR'],
    certification_delivree: false,
    nb_places_max_session: 20,
  },
  'PATCH /api/backoffice/formations/:id/validate': {
    type_formation: 'STANDARD',
    pilier_abonnement: 'RETAIL',
    prix_coutant_valide: 100000,
  },
  'PATCH /api/backoffice/formations/:id/reject': {
    motif: 'Dossier de test Newman incomplet pour validation.',
    corrections_suggeres: 'Ajouter les pièces et métadonnées manquantes.',
  },
  'PUT /api/backoffice/config': {
    DEFAULT_COMMISSION_FORGES_PCT: 20,
  },
  'POST /api/vouchers': {
    formation_id: '{{formation_id_test}}',
    quota_max: 10,
    date_expiration: '2027-12-31T23:59:59Z',
  },
  'POST /api/vouchers/validate': {
    code: '{{voucher_code_test}}',
    formation_id: '{{formation_id_test}}',
  },
  'PATCH /api/backoffice/dossiers/:id/rejeter': {
    motif_refus: 'Documents incomplets pour la validation (test Newman).',
  },
  'POST /api/paiements': {
    dossier_id: '{{dossier_retenu_id}}',
    methode: 'MOBILE_MONEY',
  },
  'POST /api/paiements/webhook': {
    transaction_id: 'TXN-TEST-{{$randomUUID}}',
    dossier_id: '{{dossier_retenu_id}}',
    statut: 'SUCCESS',
    montant: 10200000,
  },
  'POST /api/bot/conversation/:id/answer': {
    question_id: 1,
    valeur: 'Certifier mes compétences',
  },
  'POST /api/abonnements-retail/subscribe': {
    offre: 'ESSENTIEL',
  },
  'POST /api/abonnements-b2b/subscribe': {
    palier: 'STARTER',
  },
};

const STATUS_OVERRIDES = {
  'GET /api/apprenants/confirm/:token': 404,
  'POST /api/auth/login': 200,
  'POST /api/auth/refresh': 200,
  'POST /api/auth/logout': 200,
  'POST /api/paiements/webhook': 200,
  'POST /api/vouchers/validate': 200,
  'POST /api/abonnements-retail/cancel': 200,
  'POST /api/bot/conversation/:id/answer': 200,
};

const ASSERTION_MODE_OVERRIDES = {
  'GET /api/apprenants/confirm/:token': 'error',
};

const ROUTE_OVERRIDES = {
  '/api/apprenants/confirm/:token': '/api/apprenants/confirm/{{confirmation_token_test}}',
  '/api/formations/:id': '/api/formations/{{formation_id_test}}',
  '/api/dossiers/:id': '/api/dossiers/{{dossier_id_test}}',
  '/api/backoffice/dossiers/:id/retenir': '/api/backoffice/dossiers/{{dossier_premium_id}}/retenir',
  '/api/backoffice/dossiers/:id/rejeter': '/api/backoffice/dossiers/{{dossier_premium_rejeter_id}}/rejeter',
  '/api/attestations/:dossierId/download': '/api/attestations/{{dossier_id_attestation}}/download',
  '/api/bot/conversation/:id/answer': '/api/bot/conversation/{{conversation_id_test}}/answer',
  '/api/bot/conversation/:id': '/api/bot/conversation/{{conversation_id_test}}',
  '/api/backoffice/formations/:id/validate': '/api/backoffice/formations/{{formation_partenaire_id_validate}}/validate',
  '/api/backoffice/formations/:id/reject': '/api/backoffice/formations/{{formation_partenaire_id_reject}}/reject',
  '/api/backoffice/reversements/partenaires/:id/execute': '/api/backoffice/reversements/partenaires/{{partenaire_id_test}}/execute',
  '/api/backoffice/reversements/apporteurs/:id/execute': '/api/backoffice/reversements/apporteurs/{{apporteur_id_test}}/execute',
};

// Générer les tests standards pour chaque endpoint
function generateTests(method, statusCode = 200, assertionMode = 'default') {
  return `
pm.test("Status code is ${statusCode}", function () {
    pm.response.to.have.status(${statusCode});
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});

${method === 'GET' ? `
pm.test("Response has data field", function () {
    var jsonData = pm.response.json();
    ${assertionMode === 'error'
      ? "pm.expect(jsonData).to.have.property('error');"
      : "pm.expect(jsonData).to.have.property('data');"}
});
` : ''}

${method === 'POST' || method === 'PUT' || method === 'PATCH' ? `
pm.test("Response indicates success", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('statusCode');
    pm.expect(jsonData.statusCode).to.equal(${statusCode});
});
` : ''}
`.trim();
}

// Créer un item de requête Postman
function createRequestItem(method, route, role, description, ucs) {
  const fullRoute = method + ' ' + route;
  const body = ENDPOINT_BODIES[fullRoute];
  const effectiveRoute = ROUTE_OVERRIDES[route] || route;
  const expectedStatus = STATUS_OVERRIDES[fullRoute] || (method === 'POST' ? 201 : 200);
  const assertionMode = ASSERTION_MODE_OVERRIDES[fullRoute] || 'default';

  const item = {
    name: `${role} - ${description}`,
    request: {
      method: method,
      header: [],
      url: {
        raw: '{{base_url}}' + effectiveRoute,
        host: ['{{base_url}}'],
        path: effectiveRoute.split('/').filter(p => p),
      },
    },
    event: [
      {
        listen: 'test',
        script: {
          exec: generateTests(method, expectedStatus, assertionMode).split('\n'),
        },
      },
    ],
  };

  // Ajouter l'authentification si nécessaire
  if (role !== 'Public' && ROLE_TO_TOKEN[role]) {
    item.request.header.push({
      key: 'Authorization',
      value: 'Bearer ' + ROLE_TO_TOKEN[role],
      type: 'text',
    });
  }

  // Ajouter le body si POST/PUT/PATCH
  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body) {
    item.request.body = {
      mode: 'raw',
      raw: JSON.stringify(body, null, 2),
      options: {
        raw: {
          language: 'json',
        },
      },
    };
    item.request.header.push({
      key: 'Content-Type',
      value: 'application/json',
      type: 'text',
    });
  }

  return item;
}

// Parser le fichier ucs_mapping_endpoit.md (version simplifiée)
function parseUCSMapping() {
  const mappingPath = path.join(__dirname, '../../../docs/ucs_mapping_endpoit.md');

  if (!fs.existsSync(mappingPath)) {
    console.warn('⚠️ Fichier ucs_mapping_endpoit.md introuvable. Utilisation d\'endpoints par défaut.');
    return getDefaultEndpoints();
  }

  // Pour cette version, on utilise des endpoints définis manuellement
  // Une version future pourrait parser le markdown
  return getDefaultEndpoints();
}

// Liste des endpoints critiques à tester
function getDefaultEndpoints() {
  return [
    // UCS00 - Inscription Apprenant
    { ucs: 'UCS00', method: 'POST', route: '/api/apprenants/register', role: 'Public', description: 'Inscription Apprenant' },
    { ucs: 'UCS00', method: 'GET', route: '/api/apprenants/confirm/:token', role: 'Public', description: 'Confirmation Email' },

    // UCS01 - Authentification
    { ucs: 'UCS01', method: 'POST', route: '/api/auth/login', role: 'Public', description: 'Login' },
    { ucs: 'UCS01', method: 'POST', route: '/api/auth/refresh', role: 'Public', description: 'Refresh Token' },
    { ucs: 'UCS01', method: 'POST', route: '/api/auth/logout', role: 'APPRENANT', description: 'Logout' },

    // UCS02 - Profil Apprenant
    { ucs: 'UCS02', method: 'GET', route: '/api/apprenants/profil', role: 'APPRENANT', description: 'Get Profil' },
    { ucs: 'UCS02', method: 'PUT', route: '/api/apprenants/profil', role: 'APPRENANT', description: 'Update Profil' },

    // UCS03 - Organisation
    { ucs: 'UCS03', method: 'POST', route: '/api/organisations/register', role: 'Public', description: 'Inscription Organisation' },
    { ucs: 'UCS03', method: 'GET', route: '/api/organisations/profil', role: 'ORGANISATION', description: 'Get Profil Organisation' },

    // UCS04 - Catalogue
    { ucs: 'UCS04', method: 'GET', route: '/api/formations', role: 'Public', description: 'Liste Formations' },
    { ucs: 'UCS04', method: 'GET', route: '/api/formations/:id', role: 'Public', description: 'Détails Formation' },
    { ucs: 'UCS04', method: 'GET', route: '/api/sessions', role: 'Public', description: 'Liste Sessions' },

    // UCS07 - Inscription Formation
    { ucs: 'UCS07', method: 'POST', route: '/api/dossiers', role: 'APPRENANT', description: 'Créer Dossier Inscription' },
    { ucs: 'UCS07', method: 'GET', route: '/api/dossiers', role: 'APPRENANT', description: 'Mes Dossiers' },
    { ucs: 'UCS07', method: 'GET', route: '/api/dossiers/:id', role: 'APPRENANT', description: 'Détails Dossier' },

    // UCS08 - Validation Dossiers (Responsable)
    { ucs: 'UCS08', method: 'GET', route: '/api/backoffice/dossiers', role: 'RESPONSABLE', description: 'Liste Dossiers à Valider' },
    { ucs: 'UCS08', method: 'PATCH', route: '/api/backoffice/dossiers/:id/retenir', role: 'RESPONSABLE', description: 'Retenir Dossier' },
    { ucs: 'UCS08', method: 'PATCH', route: '/api/backoffice/dossiers/:id/rejeter', role: 'RESPONSABLE', description: 'Rejeter Dossier' },

    // UCS09 - Paiements
    { ucs: 'UCS09', method: 'POST', route: '/api/paiements', role: 'APPRENANT', description: 'Initier Paiement' },
    { ucs: 'UCS09', method: 'GET', route: '/api/paiements', role: 'APPRENANT', description: 'Mes Paiements' },
    { ucs: 'UCS09', method: 'POST', route: '/api/paiements/webhook', role: 'Public', description: 'Webhook Paiement' },

    // UCS11 - Attestations
    { ucs: 'UCS11', method: 'GET', route: '/api/attestations', role: 'APPRENANT', description: 'Mes Attestations' },
    { ucs: 'UCS11', method: 'GET', route: '/api/attestations/:dossierId/download', role: 'APPRENANT', description: 'Télécharger Attestation' },

    // UCS06 - Vouchers Organisation
    { ucs: 'UCS06', method: 'POST', route: '/api/vouchers', role: 'ORGANISATION', description: 'Créer Voucher' },
    { ucs: 'UCS06', method: 'GET', route: '/api/vouchers', role: 'ORGANISATION', description: 'Mes Vouchers' },
    { ucs: 'UCS06', method: 'POST', route: '/api/vouchers/validate', role: 'Public', description: 'Valider Voucher' },

    // UCS12 - Abonnements Retail
    { ucs: 'UCS12', method: 'POST', route: '/api/abonnements-retail/subscribe', role: 'APPRENANT', description: 'Souscrire Abonnement' },
    { ucs: 'UCS12', method: 'GET', route: '/api/abonnements-retail/status', role: 'APPRENANT', description: 'Statut Abonnement' },
    { ucs: 'UCS12', method: 'POST', route: '/api/abonnements-retail/cancel', role: 'APPRENANT', description: 'Résilier Abonnement' },

    // UCS13 - Abonnements B2B
    { ucs: 'UCS13', method: 'POST', route: '/api/abonnements-b2b/subscribe', role: 'ORGANISATION', description: 'Souscrire Abonnement B2B' },
    { ucs: 'UCS13', method: 'GET', route: '/api/abonnements-b2b/status', role: 'ORGANISATION', description: 'Statut Abonnement B2B' },
    { ucs: 'UCS13', method: 'GET', route: '/api/abonnements-b2b/apprenants', role: 'ORGANISATION', description: 'Apprenants B2B' },

    // UCS15 - Bot Conseiller Apprenant
    { ucs: 'UCS15', method: 'POST', route: '/api/bot/conversation/start', role: 'APPRENANT', description: 'Démarrer Conversation Bot' },
    { ucs: 'UCS15', method: 'POST', route: '/api/bot/conversation/:id/answer', role: 'APPRENANT', description: 'Répondre au Bot' },
    { ucs: 'UCS15', method: 'GET', route: '/api/bot/conversation/:id', role: 'APPRENANT', description: 'Historique Conversation' },

    // UCS17 - Partenaire
    { ucs: 'UCS17', method: 'POST', route: '/api/partenaires/formations', role: 'PARTENAIRE', description: 'Soumettre Formation' },
    { ucs: 'UCS17', method: 'GET', route: '/api/partenaires/formations', role: 'PARTENAIRE', description: 'Mes Formations' },
    { ucs: 'UCS17', method: 'GET', route: '/api/partenaires/dashboard', role: 'PARTENAIRE', description: 'Dashboard Partenaire' },

    // UCS18 - Validation Formations Partenaire
    { ucs: 'UCS18', method: 'GET', route: '/api/backoffice/formations/pending', role: 'RESPONSABLE', description: 'Formations en Attente' },
    { ucs: 'UCS18', method: 'PATCH', route: '/api/backoffice/formations/:id/validate', role: 'RESPONSABLE', description: 'Valider Formation' },
    { ucs: 'UCS18', method: 'PATCH', route: '/api/backoffice/formations/:id/reject', role: 'RESPONSABLE', description: 'Rejeter Formation' },

    // UCS19 - Reversements Partenaire
    { ucs: 'UCS19', method: 'GET', route: '/api/partenaires/reversements', role: 'PARTENAIRE', description: 'Mes Reversements' },
    { ucs: 'UCS19', method: 'GET', route: '/api/backoffice/reversements/partenaires', role: 'AGENT', description: 'Reversements Partenaires (Agent)' },
    { ucs: 'UCS19', method: 'POST', route: '/api/backoffice/reversements/partenaires/:id/execute', role: 'AGENT', description: 'Effectuer Reversement Partenaire' },

    // UCS20 - Apporteurs
    { ucs: 'UCS20', method: 'GET', route: '/api/apporteurs/dashboard', role: 'APPORTEUR', description: 'Dashboard Apporteur' },
    { ucs: 'UCS20', method: 'GET', route: '/api/apporteurs/commissions', role: 'APPORTEUR', description: 'Mes Commissions' },
    { ucs: 'UCS20', method: 'GET', route: '/api/backoffice/reversements/apporteurs', role: 'AGENT', description: 'Reversements Apporteurs (Agent)' },
    { ucs: 'UCS20', method: 'POST', route: '/api/backoffice/reversements/apporteurs/:id/execute', role: 'AGENT', description: 'Effectuer Reversement Apporteur' },

    // Backoffice - Superviseur
    { ucs: 'UCS10', method: 'GET', route: '/api/backoffice/dashboard/superviseur', role: 'SUPERVISEUR', description: 'TDB Superviseur' },
    { ucs: 'UCS10', method: 'GET', route: '/api/backoffice/apporteurs/stats', role: 'SUPERVISEUR', description: 'Stats Apporteurs' },

    // Backoffice - Admin
    { ucs: 'UCS10', method: 'GET', route: '/api/backoffice/dashboard/admin', role: 'ADMIN', description: 'TDB Admin' },
    { ucs: 'UCS10', method: 'GET', route: '/api/backoffice/config', role: 'ADMIN', description: 'Configuration Système' },
    { ucs: 'UCS10', method: 'PUT', route: '/api/backoffice/config', role: 'ADMIN', description: 'Modifier Configuration' },
  ];
}

// Générer la collection Postman
function generateCollection() {
  const endpoints = parseUCSMapping();

  // Grouper par UCS
  const grouped = {};
  endpoints.forEach(ep => {
    if (!grouped[ep.ucs]) grouped[ep.ucs] = [];
    grouped[ep.ucs].push(ep);
  });

  // Créer les folders
  const folders = Object.keys(grouped).sort().map(ucs => ({
    name: ucs,
    item: grouped[ucs].map(ep => createRequestItem(ep.method, ep.route, ep.role, ep.description, ep.ucs)),
  }));

  const collection = {
    info: {
      name: 'FORGES v4.8 - Collection Complète',
      description: 'Collection exhaustive de tests automatiques pour tous les endpoints FORGES v4.8 avec authentification JWT',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      _postman_id: require('crypto').randomUUID(),
    },
    item: folders,
  };

  return collection;
}

// Main
console.log('🔧 Génération de la collection Postman FORGES v4.8...\n');

const collection = generateCollection();
const outputPath = path.join(__dirname, '../tests/forges-v4.8-complete.postman_collection.json');

fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

console.log(`✅ Collection générée : ${outputPath}`);
console.log(`📊 Total endpoints : ${collection.item.reduce((sum, folder) => sum + folder.item.length, 0)}`);
console.log(`📁 Total folders : ${collection.item.length}`);
console.log('\n🎉 Génération terminée !\n');
console.log('Prochaines étapes :');
console.log('1. Générer les tokens JWT : node scripts/generate-test-tokens.js');
console.log('2. Lancer le backend : npm run dev');
console.log('3. Exécuter Newman : npx newman run tests/forges-v4.8-complete.postman_collection.json --environment tests/forges-v4.8-complete.postman_environment.json');
