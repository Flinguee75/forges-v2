# NEWMAN Phase 3 - Status Report v4.9
**Date:** 1 May 2026  
**Branch:** implementation-4.9  
**Target:** Phase 3 closure with 0 assertion failures

---

## Current Status

| Metric | Value | %ile |
|--------|-------|------|
| **Requests Executed** | 53 | 100% ✅ |
| **Request Failures** | 0 | 0% ✅ |
| **Assertions Total** | 161 | 100% |
| **Assertions Passing** | 133 | 82.6% ✅ |
| **Assertions Failing** | **28** | 17.4% 🔴 |

---

## Failure Breakdown by Category

### 404 Not Found (4 failures - 14% of total)
Missing or incorrect endpoint paths

| Request | Issue | Root Cause |
|---------|-------|-----------|
| UCS09 Webhook Paiement (2) | `/api/paiements/webhook` not found | Endpoint missing or incorrect path |
| UCS12 Résilier Abonnement (2) | Subscription cancel endpoint missing | Feature not implemented |
| UCS15 Répondre au Bot (2) | `/api/conversations/{id}/messages` not found | Conversation API missing |
| UCS15 Historique Conversation (2) | Conversation history endpoint missing | Feature not implemented |

**Fix Required:** Implement missing endpoints or update paths in Postman collection

---

### 409 Conflict (4 failures - 14% of total)
Pre-existing test data creating collisions

| Request | Issue | Root Cause | Solution |
|---------|-------|-----------|----------|
| UCS07 Créer Dossier (2) | ALREADY_ENROLLED | Apprenant1 already has dossier in session | Use apprenant2 or different session |
| UCS12 Souscrire Abonnement (2) | Subscription exists | AbonnementRetail already created in seed | Use apprenant without existing subscription |
| UCS13 Souscrire B2B (2) | B2B exists | Organisation already has B2B subscription | Use different organisation or skip |
| UCS18 Valider Formation (1) | State conflict | FormationPartenaire already validated | Use new FormationPartenaire |

**Fix Required:** Use alternate test data IDs or implement test data cleanup

---

### 400 Bad Request (4 failures - 14% of total)
Validation failures in request bodies or dossier states

| Request | Issue | Expected | Got | Solution |
|---------|-------|----------|-----|----------|
| UCS08 Retenir Dossier (2) | DOSSIER_ALREADY_PROCESSED | 200 | 400 | Check dossier state or decision payload |
| UCS08 Rejeter Dossier (2) | Validation error | 200 | 400 | Check rejection reason payload |
| UCS19 Reversement Partenaire (2) | Commission threshold | 201 | 400 | Commission amount below threshold |
| UCS20 Reversement Apporteur (2) | Commission calculation | 201 | 400 | Commission data invalid |

**Fix Required:** Investigate backend validation logic or update request payloads

---

### 401 Unauthorized (1 failure - 3.5% of total)
Token issue

| Request | Issue | Root Cause |
|---------|-------|-----------|
| UCS06 Valider Voucher (1) | Token not valid | Voucher code capture script not executing |

**Fix Required:** Verify test script token capture

---

### 403 Forbidden (1 failure - 3.5% of total)
Permission or business rule enforcement

| Request | Issue | Root Cause |
|---------|-------|-----------|
| UCS09 Initier Paiement (1) | Access denied | Dossier state or user eligibility |

**Note:** May be correct behavior (intentional rejection)

---

## Summary by Severity

### 🔴 **Critical (Must Fix)**
- **404 errors (4):** Endpoints missing - blocks feature testing
- **409 errors (4):** Test data conflicts - causes cascade failures
- **400 errors (4):** Validation issues - need investigation

### 🟡 **Important (Should Fix)**
- **401 errors (1):** Token capture script not working
- **403 errors (1):** May be intentional business logic

---

## Recent Fixes Applied

✅ **UCS06 Voucher Creation (201 response)**
- Fixed DTO to derive `organisation_id` from JWT token
- Refactored repository to handle both VoucherOrganisation and VoucherApporteur models
- Removed incorrect `cree_par` field from service

✅ **Token Generation**
- Fresh 24-hour JWT tokens generated for all 9 roles
- Auto-updated Postman environment

✅ **Seed Data**
- All D1-D9 fixes applied
- Database reset and re-seeded

---

## Immediate Actions (Priority Order)

### Phase 1: Data Conflicts (15 mins)
1. Create alternate environment variables for apprenant2, different formations/sessions
2. Update UCS07, UCS12, UCS13, UCS18 to use alternate data
3. Re-run Newman → Should eliminate 4 failures (409 errors)

### Phase 2: Endpoint Verification (30 mins)
4. Check backend routes for missing endpoints (UCS09, UCS12, UCS15)
5. Update Postman paths or implement missing endpoints
6. Re-run Newman → Should eliminate 4 failures (404 errors)

### Phase 3: Validation Investigation (45 mins)
7. Debug UCS08 dossier state handling
8. Check UCS19/UCS20 commission calculation thresholds
9. Re-run Newman → Should eliminate 4 failures (400 errors)

### Phase 4: Edge Cases (15 mins)
10. Verify token capture script in UCS06
11. Investigate UCS09 403 response (accept if intentional)
12. Final run → Target: 161/161 passing (100%)

---

## Estimated Time to 0 Failures

- **Best case:** 20 mins (endpoints exist, just path fixes)
- **Realistic:** 60 mins (data conflicts + validation fixes)
- **Worst case:** 2 hours (endpoints need implementation)

---

## Commands

**Run full Newman test:**
```bash
npx newman run tests/forges-v4.8-complete.postman_collection.json \
  --environment tests/forges-v4.8-complete.postman_environment.json \
  --reporters cli,htmlextra
```

**Quick status check:**
```bash
npx newman run tests/forges-v4.8-complete.postman_collection.json \
  --environment tests/forges-v4.8-complete.postman_environment.json \
  --reporters cli 2>&1 | grep -E "(assertions|requests)"
```

**Regenerate tokens:**
```bash
node scripts/generate-test-tokens.js
```

**Reset database:**
```bash
npx prisma db push --skip-generate --force-reset
node seed_for_test.js
```
