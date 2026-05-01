import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métriques personnalisées
const failureRate = new Rate('failed_requests');
const paiementDuration = new Trend('paiement_duration');
const webhookDuration = new Trend('webhook_duration');

// Configuration load test
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Montée progressive à 10 utilisateurs
    { duration: '1m', target: 50 },   // Montée à 50 utilisateurs
    { duration: '2m', target: 50 },   // Maintien 50 utilisateurs
    { duration: '30s', target: 0 },   // Descente progressive
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% des requêtes < 5s
    failed_requests: ['rate<0.05'],    // Taux échec < 5%
    paiement_duration: ['p(95)<3000'], // Initiation paiement < 3s
    webhook_duration: ['p(95)<1000'],  // Traitement webhook < 1s
  },
};

// Variables d'environnement
const BASE_URL = __ENV.API_URL || 'http://127.0.0.1:3000/api';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@forges-test.ci';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'Test@FORGES2026!';
const WEBHOOK_SECRET = __ENV.WEBHOOK_SECRET || 'dev-secret';

// Données de test
let adminToken = null;
let sessionId = null;

// Setup: créer une session de test dans la DB pour les apprenants
export function setup() {
  // Pas besoin d'auth admin - on va utiliser l'endpoint public
  // Une session STANDARD doit être créée par seed_for_test.js
  
  console.log('Setup: Load test ready');
  console.log(`Base URL: ${BASE_URL}`);
  
  return {
    // ID de session STANDARD créée par seed_for_test.js (s_open_01)
    sessionId: 'ses-open-00001-0000-0000-000000000001',
    apprenantEmail: 'apprenant1@forges-test.ci',
  };
}

// Scénario principal
export default function(data) {
  const apprenantEmail = `load-test-${__VU}-${__ITER}@forges-load.ci`;
  const headers = {
    'Content-Type': 'application/json',
  };

  // 1. Inscription apprenant
  const registerResponse = http.post(`${BASE_URL}/apprenants/register`, JSON.stringify({
    nom: 'LoadTest',
    prenoms: `User ${__VU}`,
    email: apprenantEmail,
    telephone: `+22500${String(__VU).padStart(8, '0')}`,
    mot_de_passe: 'Test@123456',
    date_naissance: '1990-01-01',
    genre: 'M',
    ville: 'Abidjan',
    quartier: 'Cocody',
    niveau_etudes: 'BAC',
    situation_professionnelle: 'SALARIE',
    accepte_conditions: true,
  }), { headers });

  const registerSuccess = check(registerResponse, {
    'registration successful': (r) => r.status === 201,
  });

  if (!registerSuccess) {
    failureRate.add(1);
    return;
  }

  sleep(0.5);

  // 2. Login apprenant
  const loginResponse = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: apprenantEmail,
    password: 'Test@123456',
  }), { headers });

  const loginSuccess = check(loginResponse, {
    'login successful': (r) => r.status === 200,
  });

  if (!loginSuccess) {
    failureRate.add(1);
    return;
  }

  const apprenantToken = loginResponse.json('data.accessToken');
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apprenantToken}`,
  };

  sleep(0.5);

  // 3. Inscription session
  const inscriptionResponse = http.post(
    `${BASE_URL}/sessions/${data.sessionId}/inscrire`,
    JSON.stringify({
      source_financement: 'RETAIL',
    }),
    { headers: authHeaders }
  );

  const inscriptionSuccess = check(inscriptionResponse, {
    'inscription successful': (r) => r.status === 200 || r.status === 201,
  });

  if (!inscriptionSuccess) {
    failureRate.add(1);
    return;
  }

  const dossierId = inscriptionResponse.json('dossier.id') || inscriptionResponse.json('data.dossier.id');
  sleep(0.5);

  // 4. Initiation paiement NGSER
  const paiementStart = new Date();
  const paiementResponse = http.post(
    `${BASE_URL}/paiements`,
    JSON.stringify({
      dossier_id: dossierId,
      methode: 'MOBILE_MONEY',
    }),
    { headers: authHeaders }
  );

  const paiementDurationMs = new Date() - paiementStart;
  paiementDuration.add(paiementDurationMs);

  const paiementSuccess = check(paiementResponse, {
    'paiement initiation successful': (r) => r.status === 200 || r.status === 201,
    'order_ngser created': (r) => {
      const data = r.json('data') || r.json();
      return data && data.order_ngser && data.order_ngser.startsWith('FORGES-');
    },
    'payment_url present': (r) => {
      const data = r.json('data') || r.json();
      return data && data.payment_url;
    },
  });

  if (!paiementSuccess) {
    failureRate.add(1);
    return;
  }

  sleep(1);

  // 5. Simuler webhook IPN SUCCESS
  const transactionId = `TXN-LOAD-${__VU}-${__ITER}-${Date.now()}`;
  const webhookPayload = {
    transaction_id: transactionId,
    dossier_id: dossierId,
    statut: 'SUCCESS',
    montant: 150000,
  };

  // Calculer signature HMAC (simplifié pour k6)
  const signature = 'mock-signature-for-load-test';

  const webhookStart = new Date();
  const webhookResponse = http.post(
    `${BASE_URL}/paiements/webhook`,
    JSON.stringify(webhookPayload),
    {
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
    }
  );

  const webhookDurationMs = new Date() - webhookStart;
  webhookDuration.add(webhookDurationMs);

  const webhookSuccess = check(webhookResponse, {
    'webhook accepted': (r) => r.status === 200,
  });

  if (!webhookSuccess) {
    failureRate.add(1);
  }

  sleep(1);
}

// Teardown: vérifier stats finales
export function teardown(data) {
  const statsResponse = http.get(
    `${BASE_URL}/admin/paiements/stats?period=1h`,
    {
      headers: {
        'Authorization': `Bearer ${data.adminToken}`,
      },
    }
  );

  console.log('\n=== STATS FINALES PAIEMENTS ===');
  console.log(JSON.stringify(statsResponse.json(), null, 2));
}
