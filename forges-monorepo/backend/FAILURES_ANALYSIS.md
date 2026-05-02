#!/usr/bin/env node
/**
 * NEWMAN FAILURES ANALYSIS v2
 * 28 failures grouped by HTTP status code
 */

console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                     NEWMAN FAILURES SUMMARY (28 FAILURES)                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

📊 FAILURES BY HTTP STATUS CODE:

🔴 STATUS 401 UNAUTHORIZED (2 failures - 1 request)
   • UCS06 / Public - Valider Voucher
     └─ Token not captured/passed from UCS06 Créer Voucher
     └─ Issue: Voucher code not in environment or token expired

🟠 STATUS 400 BAD REQUEST (4 failures - 2 requests)
   • UCS08 / RESPONSABLE - Retenir Dossier
     └─ Expected 200, got 400
     └─ Issue: Request body schema or dossier state invalid
   • UCS08 / RESPONSABLE - Rejeter Dossier
     └─ Expected 200, got 400
     └─ Issue: Request body schema or dossier state invalid
   • UCS19 / AGENT - Effectuer Reversement Partenaire
     └─ Expected 201, got 400
     └─ Issue: Commission validation failed
   • UCS20 / AGENT - Effectuer Reversement Apporteur
     └─ Expected 201, got 400
     └─ Issue: Commission validation failed

🟡 STATUS 403 FORBIDDEN (2 failures - 1 request)
   • UCS09 / APPRENANT - Initier Paiement
     └─ Expected 201, got 403
     └─ Issue: Business rule validation (dossier state or eligibility check)

🟢 STATUS 404 NOT FOUND (6 failures - 3 requests)
   • UCS09 / Public - Webhook Paiement
     └─ Expected 200, got 404
     └─ Issue: Endpoint /api/paiements/webhook not found
   • UCS12 / APPRENANT - Résilier Abonnement
     └─ Expected 200, got 404
     └─ Issue: Endpoint missing or incorrect path
   • UCS15 / APPRENANT - Répondre au Bot
     └─ Expected 200, got 404
     └─ Issue: Endpoint /api/conversations missing or wrong path
   • UCS15 / APPRENANT - Historique Conversation
     └─ Expected 200, got 404
     └─ Issue: Endpoint for conversation history missing

🔵 STATUS 409 CONFLICT (14 failures - 5 requests)
   • UCS07 / APPRENANT - Créer Dossier Inscription
     └─ Expected 201, got 409
     └─ Issue: Apprenant already has dossier in this session
   • UCS12 / APPRENANT - Souscrire Abonnement
     └─ Expected 201, got 409
     └─ Issue: Apprenant already has active subscription
   • UCS13 / ORGANISATION - Souscrire Abonnement B2B
     └─ Expected 201, got 409
     └─ Issue: Organisation already has B2B subscription
   • UCS18 / RESPONSABLE - Valider Formation
     └─ Expected 200, got 409
     └─ Issue: FormationPartenaire state conflict or already validated

═══════════════════════════════════════════════════════════════════════════════

📋 FAILURE STATISTICS:

Total Failures: 28 (14 distinct assertions)
Total Requests: 14

By Category:
  🔴 401 Unauthorized........... 2 failures (7%)   → 1 request
  🟠 400 Bad Request............ 4 failures (14%)  → 2 requests
  🟡 403 Forbidden.............. 2 failures (7%)   → 1 request
  🟢 404 Not Found.............. 6 failures (21%)  → 3 requests
  🔵 409 Conflict............... 14 failures (50%) → 5 requests

═══════════════════════════════════════════════════════════════════════════════

🛠️  FIX PRIORITY ORDER:

Priority 1: 🔵 409 CONFLICTS (14 failures - 50%)
   → Easiest to fix: Update seed data or use different test identifiers
   → Affects 5 different requests
   → Actions:
      1. UCS07: Use session without existing dossier for apprenant1
      2. UCS12: Ensure apprenant1 has no subscriptions in seed
      3. UCS13: Use org without existing B2B subscription
      4. UCS18: Check FormationPartenaire state in seed (should be EN_ATTENTE_VALIDATION)

Priority 2: 🟢 404 NOT FOUND (6 failures - 21%)
   → Requires backend verification
   → Actions:
      1. Check if endpoints exist in backend routes
      2. Verify correct paths:
         - UCS09: POST /api/paiements/webhook
         - UCS12: DELETE endpoint for subscription cancellation
         - UCS15: GET/POST /api/conversations endpoints

Priority 3: 🟠 400 BAD REQUEST (4 failures - 14%)
   → Requires request body inspection
   → Actions:
      1. UCS08: Check retenir/rejeter dossier request body schema
      2. UCS19/UCS20: Verify commission data format (structure, fields, values)

Priority 4: 🟡 403 FORBIDDEN (2 failures - 7%)
   → Business logic validation
   → Actions:
      1. Verify dossier state is correct for payment initiation
      2. Check apprenant eligibility rules

Priority 5: 🔴 401 UNAUTHORIZED (2 failures - 7%)
   → Token/environment issue
   → Actions:
      1. Ensure UCS06 Créer captures voucher_code properly
      2. Verify token is passed to UCS06 Valider

═══════════════════════════════════════════════════════════════════════════════

💡 QUICK WINS (Can fix in < 5 minutes each):

1. UCS07 409 → Change apprenant ID or session ID to one without existing dossier
2. UCS12 409 → Remove AbonnementRetail from seed_for_test.js
3. UCS13 409 → Use different organisation or clear B2B subscription from seed
4. UCS18 409 → Verify FormationPartenaire seed has correct state

These 4 changes alone will eliminate 50% of failures (14 → 0)

═══════════════════════════════════════════════════════════════════════════════
`);
