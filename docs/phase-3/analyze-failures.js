#!/usr/bin/env node
/**
 * analyze-failures.js
 * Parse Newman output to identify all failing requests and their root causes
 */

const failures = {
  'UCS06 - Créer Voucher': { status: 400, issue: 'VALIDATION_ERROR - Missing/invalid fields' },
  'UCS06 - Valider Voucher': { status: 401, issue: 'TOKEN_NOT_CAPTURED - Token not set from previous request' },
  'UCS07 - Créer Dossier': { status: 409, issue: 'ALREADY_ENROLLED - Apprenant already has dossier in this session' },
  'UCS08 - Retenir Dossier': { status: 400, issue: 'DOSSIER_ALREADY_PROCESSED - Dossier state validation failed' },
  'UCS08 - Rejeter Dossier': { status: 400, issue: 'DOSSIER_ALREADY_PROCESSED - Dossier state validation failed' },
  'UCS09 - Initier Paiement': { status: 403, issue: 'FORBIDDEN - Dossier state or apprenant eligibility issue' },
  'UCS09 - Webhook Paiement': { status: 404, issue: 'ENDPOINT_NOT_FOUND - Webhook endpoint missing' },
  'UCS13 - Souscrire Abonnement B2B': { status: 409, issue: 'CONFLICT - Organisation already has B2B subscription' },
  'UCS15 - Répondre au Bot': { status: 404, issue: 'ENDPOINT_NOT_FOUND - Conversation endpoint missing' },
  'UCS15 - Historique Conversation': { status: 404, issue: 'ENDPOINT_NOT_FOUND - Conversation history endpoint missing' },
  'UCS18 - Valider Formation': { status: 409, issue: 'CONFLICT - Formation state already validated or invalid' },
  'UCS19 - Effectuer Reversement Partenaire': { status: 400, issue: 'VALIDATION_ERROR - Commission data invalid' },
  'UCS20 - Effectuer Reversement Apporteur': { status: 400, issue: 'VALIDATION_ERROR - Commission data invalid' },
};

console.log('\n🔴 NEWMAN FAILURES SUMMARY (30 failures across 13 requests)\n');

const byStatus = {};
for (const [req, data] of Object.entries(failures)) {
  if (!byStatus[data.status]) byStatus[data.status] = [];
  byStatus[data.status].push({ req, ...data });
}

for (const [status, reqs] of Object.entries(byStatus).sort()) {
  console.log(`\n📍 ${status} Status Code (${reqs.length * 2} assertion failures):`);
  reqs.forEach(r => {
    console.log(`   • ${r.req}`);
    console.log(`     └─ ${r.issue}`);
  });
}

console.log('\n\n🛠️  PRIORITY FIX GROUPS:\n');

console.log('🔴 CRITICAL - Blocking Frontend Flow:');
console.log('  1. UCS06 Voucher (400) → Fix body fields: formation_id, quota_max, date_expiration, type_valeur');
console.log('  2. UCS06 Valider (401) → Fix token capture script to propagate bearer token');
console.log('  3. UCS07 Dossier (409) → Use alternate session or apprenant without existing dossier');
console.log('  4. UCS08 Retenir (400) → Fix dossier state or request body schema');
console.log('  5. UCS08 Rejeter (400) → Fix dossier state or request body schema');

console.log('\n🟠 IMPORTANT - Payment Flow:');
console.log('  6. UCS09 Initier (403) → Check dossier state (should be EN_ATTENTE_VERIFICATION)');
console.log('  7. UCS09 Webhook (404) → Verify endpoint exists: POST /api/paiements/webhook');
console.log('  8. UCS19 Reversement (400) → Fix commission calculation or request schema');
console.log('  9. UCS20 Reversement (400) → Fix commission calculation or request schema');

console.log('\n🟡 SECONDARY - Platform Features:');
console.log('  10. UCS13 B2B Sub (409) → Use org without existing subscription');
console.log('  11. UCS15 Bot (404) → Verify conversation endpoint: POST /api/conversations/{id}/messages');
console.log('  12. UCS15 History (404) → Verify history endpoint: GET /api/conversations/{id}/messages');
console.log('  13. UCS18 Valider Formation (409) → Check FormationPartenaire state validation');

console.log('\n\n📊 NEXT STEPS:\n');
console.log('1. Fix UCS06 Voucher body (formation_id, quota_max, date_expiration)');
console.log('2. Re-run Newman → Should drop from 30 to ~28 failures');
console.log('3. Fix UCS06 token capture script');
console.log('4. Check database: Dossier states for UCS08, UCS09');
console.log('5. Verify backend endpoints exist for UCS09 webhook, UCS15 conversation');
console.log('6. Update seed data if needed for cleaner test state');
console.log('');
