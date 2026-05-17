# Phase 3 Closure - Task Manifest

## Objective
**Achieve 161/161 Newman assertions passing (0 failures) by May 5, 2026**

---

## Tasks Breakdown

### Group A: 404 Not Found Errors (4 assertions) - 20 mins
**Requests:** UCS09 (2), UCS12 (1), UCS15 (2)

- [ ] **A1.** Verify endpoint: `/api/paiements/webhook` exists
  - Location: `src/modules/paiements/paiement.routes.ts`
  - If missing: Create or update path in Postman

- [ ] **A2.** Verify endpoint: `/api/subscriptions/cancel` or `/api/abonnements/resilier` exists
  - Location: Check subscription routes
  - If missing: Create endpoint or update path

- [ ] **A3.** Verify endpoints: `/api/conversations/{id}/messages` and history
  - Location: `src/modules/conversations/conversation.routes.ts`
  - If missing: Create conversation endpoints

- [ ] **A4.** Update Postman paths if endpoints found
  - File: `tests/forges-v4.8-complete.postman_collection.json`
  - Run: `npx newman run ... --reporters cli` to verify

**Expected Result:** 4 assertions now passing (404→200)

---

### Group B: 409 Conflict Errors (4 assertions) - 30 mins
**Requests:** UCS07 (1), UCS12 (1), UCS13 (1), UCS18 (1)

- [ ] **B1.** Create alternate test data IDs in environment
  - Add: `apprenant2_id`, `formation2_id`, `session2_id`
  - Add: `org2_id` for test
  - File: `tests/forges-v4.8-complete.postman_environment.json`

- [ ] **B2.** Update UCS07 (Créer Dossier) to use apprenant2
  - Change: `{{apprenant_id_test}}` → `{{apprenant2_id}}`
  - Verify: Uses different session/formation combo

- [ ] **B3.** Update UCS12 (Souscrire Abonnement) to use apprenant without subscription
  - Option 1: Create apprenant3 in seed without AbonnementRetail
  - Option 2: Use different apprenant from seed

- [ ] **B4.** Update UCS13 (B2B Subscription) to use org without B2B
  - Option 1: Create org2 in seed
  - Option 2: Use different org from existing seed

- [ ] **B5.** Update UCS18 (Valider Formation) to use fresh FormationPartenaire
  - Use: `formation_partenaire_id_fresh` (new entry in seed)
  - Verify: State is EN_ATTENTE_VALIDATION

- [ ] **B6.** Re-seed database with new data
  - Run: `npx prisma db push --skip-generate --force-reset`
  - Run: `node seed_for_test.js`
  - Verify: New IDs created

- [ ] **B7.** Run Newman to verify 409 errors resolved
  - Run: `npx newman run ... --reporters cli`
  - Check: 4 assertions now 201/200 responses

**Expected Result:** 4 assertions now passing (409→201/200)

---

### Group C: 400 Bad Request Errors (4 assertions) - 45 mins
**Requests:** UCS08 (2), UCS19 (1), UCS20 (1)

- [ ] **C1.** Investigate UCS08 (Retenir Dossier) 400 errors
  - Get error details: Test manually with curl
  - Check: Dossier state, decision payload requirements
  - File: `src/modules/dossiers/dossier.service.ts`

- [ ] **C2.** Fix UCS08 request body if validation error
  - Update: `tests/forges-v4.8-complete.postman_collection.json`
  - Add missing fields or fix format
  - Verify: With test request

- [ ] **C3.** Investigate UCS08 Rejeter 400 errors
  - Same as C1 but for rejection logic
  - Check: Rejection reason, motif_rejet requirements

- [ ] **C4.** Investigate UCS19/UCS20 commission threshold errors
  - Get error details: Check commission calculation
  - File: `src/modules/commissions/commission.service.ts`
  - Issue: Likely montant < seuil_facturation

- [ ] **C5.** Update seed commission data if needed
  - File: `seed_for_test.js`
  - Ensure: Commission amounts exceed minimum threshold
  - Verify: APT-01 has montant_cumul sufficient

- [ ] **C6.** Re-seed and test
  - Run: `node seed_for_test.js`
  - Run: Newman to check 400 errors

**Expected Result:** 4 assertions now passing (400→200/201)

---

### Group D: Auth & Business Logic Errors (2 assertions) - 15 mins
**Requests:** UCS06 Valider (1), UCS09 Initier (1)

- [ ] **D1.** Verify UCS06 token capture script
  - File: Check test event in `forges-v4.8-complete.postman_collection.json`
  - Verify: `voucher_code_test` being set from response
  - If not working: Debug with manual execution

- [ ] **D2.** Verify UCS09 Initier Paiement 403 is correct
  - Manual test: Send request manually with curl
  - Check: Is it permission error or business logic?
  - If intentional: Mark as PASS
  - If bug: Report to backend team

- [ ] **D3.** Re-run Newman after fixes
  - Verify: 1-2 more assertions passing

**Expected Result:** 2 assertions resolved (1 pass, 1 may be correct rejection)

---

## Validation Checklist

### Pre-Submission
- [ ] All 53 requests execute (0 request failures)
- [ ] 161/161 assertions passing (or 160 if 403 is intentional)
- [ ] No 5xx errors in responses
- [ ] Database re-seeded fresh
- [ ] Fresh tokens generated (24h TTL)
- [ ] All Postman paths verified

### Testing
- [ ] Full Newman run completes without errors
- [ ] HTML report generated: `tests/newman/newman-baseline-v4.9.html`
- [ ] All test comments document fixes applied
- [ ] No skipped tests

### Documentation
- [ ] [NEWMAN_STATUS_REPORT.md](NEWMAN_STATUS_REPORT.md) updated with results
- [ ] [FAILURES_ANALYSIS_v2.md](FAILURES_ANALYSIS_v2.md) updated
- [ ] Commit message documents all fixes
- [ ] Phase 3 marked COMPLETE in git tags

---

## Timing Estimate

| Group | Task | Est. Time | Status |
|-------|------|-----------|--------|
| A | Endpoint verification | 20 min | ⏳ TODO |
| B | Data conflict fixes | 30 min | ⏳ TODO |
| C | Validation investigation | 45 min | ⏳ TODO |
| D | Auth verification | 15 min | ⏳ TODO |
| **Total** | - | **110 min** | **~2 hrs** |

---

## Commands Reference

**Check current status:**
```bash
cd backend && npx newman run tests/forges-v4.8-complete.postman_collection.json \
  --environment tests/forges-v4.8-complete.postman_environment.json \
  --reporters cli 2>&1 | grep -E "(assertions|failed)"
```

**Full run with report:**
```bash
npx newman run tests/forges-v4.8-complete.postman_collection.json \
  --environment tests/forges-v4.8-complete.postman_environment.json \
  --reporters cli,htmlextra
```

**Manual endpoint test:**
```bash
TOKEN=$(jq -r '.values[] | select(.key=="token_organisation") | .value' tests/forges-v4.8-complete.postman_environment.json)
curl -X POST http://localhost:3000/api/endpoint \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Reset everything:**
```bash
npx prisma db push --skip-generate --force-reset && \
node seed_for_test.js && \
node scripts/generate-test-tokens.js
```

---

## Success Criteria

✅ **COMPLETE:** 161/161 assertions passing  
✅ **QUALITY:** All endpoints verified  
✅ **DOCUMENTATION:** All fixes documented  
✅ **REPRODUCIBLE:** Can re-run and get 100% pass on fresh DB

---

**Assigned To:** Tidiane  
**Started:** May 1, 2026  
**Target Completion:** May 5, 2026  
**Current Status:** In Progress (28 failures → targeting 0)
