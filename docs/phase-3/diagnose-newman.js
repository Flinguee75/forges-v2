#!/usr/bin/env node
/**
 * Diagnostic script pour identifier les problèmes Newman
 */

const http = require('http');

// Tokens valides
const tokens = {
  apprenant: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhcHItMDAwMDEtMDAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMSIsInJvbGUiOiJBUFBSRU5BTlQiLCJsYW5ndWUiOiJGUiIsImlhdCI6MTc3NzY4NTYxMCwiZXhwIjoxNzc3NzcyMDEwfQ.KPr2Ncabct7HmvaYTp7VOY1IA7-UyzjgAPq7y5Fq_mM',
  org: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvcmctdGVjaGNvcnAtMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJyb2xlIjoiT1JHQU5JU0FUSU9OIiwibGFuZ3VlIjoiRlIiLCJpYXQiOjE3Nzc2ODU2MTAsImV4cCI6MTc3Nzc3MjAxMH0.Smlw0I1Ubaui4JHE0sz4U7IfFZhHs65IwnEkdEfwZKc',
  responsable: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3ItcmVzcC0wMDAxLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDIiLCJyb2xlIjoiUkVTUE9OU0FCTEUiLCJsYW5ndWUiOiJGUiIsImlhdCI6MTc3NzY4NTYxMCwiZXhwIjoxNzc3NzcyMDEwfQ.BuuuE1nWV96scuIZei__8YAJPXlFM3IeRKdD0AE0wTc'
};

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data ? JSON.parse(data) : null
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runDiagnostics() {
  console.log('🔍 NEWMAN FAILURES DIAGNOSIS\n');

  const tests = [
    {
      name: 'UCS06 - Créer Voucher (400)',
      method: 'POST',
      path: '/api/vouchers/organisation',
      token: tokens.org,
      body: {
        formation_id: 'frm-std-00001-0000-0000-000000000001',
        valeur: 25,
        type_valeur: 'POURCENTAGE',
        quota_max: 10,
        date_expiration: '2027-12-31T23:59:59Z'
      }
    },
    {
      name: 'UCS07 - Créer Dossier (409)',
      method: 'POST',
      path: '/api/dossiers',
      token: tokens.apprenant,
      body: {
        formation_id: 'frm-std-00001-0000-0000-000000000001',
        session_id: 'ses-open-00001-0000-0000-000000000001'
      }
    },
    {
      name: 'UCS08 - Retenir Dossier (400)',
      method: 'PATCH',
      path: '/api/backoffice/dossiers/dos-att-000001-0000-0000-000000000001/retenir',
      token: tokens.responsable,
      body: { decision: 'RETENIR' }
    },
    {
      name: 'UCS09 - Initier Paiement (403)',
      method: 'POST',
      path: '/api/paiements/initier',
      token: tokens.apprenant,
      body: {
        dossier_id: 'dos-att-000001-0000-0000-000000000001',
        montant: 100000,
        methode_paiement: 'MOBILE_MONEY'
      }
    },
    {
      name: 'UCS09 - Webhook Paiement (404)',
      method: 'POST',
      path: '/api/paiements/webhook',
      body: {
        paiement_id: 'test-id',
        statut: 'CONFIRME'
      }
    }
  ];

  for (const test of tests) {
    try {
      console.log(`📋 ${test.name}`);
      const res = await request(test.method, test.path, test.body, test.token);
      console.log(`   Status: ${res.status}`);
      if (res.body?.details || res.body?.error) {
        console.log(`   Error: ${res.body.error}`);
        if (res.body.details) {
          res.body.details.forEach(d => {
            console.log(`     - ${d.message}`);
          });
        }
      }
      console.log();
    } catch (err) {
      console.log(`   ❌ ${err.message}\n`);
    }
  }
}

runDiagnostics();
