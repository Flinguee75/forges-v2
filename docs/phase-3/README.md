# Phase 3 - Newman Baseline Testing v4.9

## 📌 Current Status

| Metric | Value |
|--------|-------|
| **Objective** | 161/161 assertions passing (0 failures) |
| **Current** | 133/161 passing, **28 failing** |
| **Pass Rate** | 82.6% ✅ |
| **Status** | In Progress 🔄 |
| **ETA** | May 5, 2026 |

---

## 📂 Documentation Structure

```
docs/phase-3/
├── README.md (this file)          ← START HERE
├── NEWMAN_STATUS_REPORT.md        ← Current failure breakdown
├── TASK_MANIFEST.md               ← Action items & checklist
├── FAILURES_ANALYSIS_v2.md        ← Technical analysis
├── analyze-failures.js            ← Diagnostic tool
└── diagnose-newman.js             ← HTTP error capture tool
```

---

## 🎯 Quick Start

### View Current Status
```bash
cat docs/phase-3/NEWMAN_STATUS_REPORT.md
```

### Run Newman Baseline
```bash
cd forges-monorepo/backend
npx newman run tests/forges-v4.8-complete.postman_collection.json \
  --environment tests/forges-v4.8-complete.postman_environment.json \
  --reporters cli
```

### Analyze Failures
```bash
node docs/phase-3/analyze-failures.js
```

---

## 🔴 Critical Issues (28 failures)

### By Type:
- **404 Not Found** (4) - Missing endpoints
- **409 Conflict** (4) - Data collisions  
- **400 Bad Request** (4) - Validation errors
- **401 Unauthorized** (1) - Token issue
- **403 Forbidden** (1) - Permission/business logic

### See [NEWMAN_STATUS_REPORT.md](NEWMAN_STATUS_REPORT.md) for details

---

## ✅ Recent Fixes

1. **UCS06 Voucher Creation** (Fixed)
   - Issue: `organisation_id` required in DTO but should come from JWT
   - Fix: Updated DTO and repository to handle polymorphic models
   - Result: +2 assertions passing

2. **JWT Token Generation** (Completed)
   - 24-hour valid tokens for 9 roles
   - Auto-updated Postman environment

3. **Database & Seed** (Completed)
   - Fresh reset with all D1-D9 fixes
   - 16 apprenants, multiple formations/sessions

---

## 🚀 Next Steps (Priority Order)

1. **Verify Endpoints** (20 min)
   - Check if UCS09, UCS12, UCS15 endpoints exist
   - Update Postman paths if needed
   - Should fix 4 failures (404s)

2. **Fix Data Conflicts** (30 min)
   - Use alternate test data for UCS07, UCS12, UCS13, UCS18
   - Create apprenant2, org2 in environment
   - Should fix 4 failures (409s)

3. **Investigate Validation** (45 min)
   - Debug UCS08 dossier state issues
   - Review UCS19/UCS20 commission thresholds
   - Should fix 4 failures (400s)

4. **Verify Token & Auth** (15 min)
   - Confirm token capture working
   - Verify 403 is intentional
   - Should resolve 2 edge cases

**Total Time:** ~2 hours

---

## 📊 Failure Distribution

```
404 (4) ▁▁▁▁ Missing endpoints
409 (4) ▁▁▁▁ Data conflicts
400 (4) ▁▁▁▁ Validation errors
401 (1) ▁ Token issue
403 (1) ▁ Permission/logic
─────────────
28 total (14% of 161 assertions)
```

---

## 🛠️ Key Files

### Postman Collection
- `backend/tests/forges-v4.8-complete.postman_collection.json`
- **Contains:** 53 requests across 18 UCS groups
- **Last Updated:** May 1, 2026

### Test Environment
- `backend/tests/forges-v4.8-complete.postman_environment.json`
- **Contains:** Variables, tokens, fixture IDs
- **Tokens:** 24h TTL, auto-generated

### Seed Data
- `backend/seed_for_test.js`
- **Records:** 16 apprenants, 5 formations, 4 sessions, 9 dossiers
- **Reset:** `npx prisma db push --force-reset && node seed_for_test.js`

### Newman Reports
- `backend/tests/newman/newman-baseline-v4.9.html` (1.4 MB visual report)
- `backend/tests/newman/newman-results.txt` (text output)

---

## 📖 How to Use This Documentation

### For Quick Overview
→ Read this README (2 min)

### For Current Failures
→ Read [NEWMAN_STATUS_REPORT.md](NEWMAN_STATUS_REPORT.md) (5 min)

### For Work Items
→ Follow [TASK_MANIFEST.md](TASK_MANIFEST.md) (step-by-step)

### For Technical Deep Dive
→ Read [FAILURES_ANALYSIS_v2.md](FAILURES_ANALYSIS_v2.md) (10 min)

---

## 🔍 Diagnostic Tools

### List All Failures by Category
```bash
node docs/phase-3/analyze-failures.js
```

### Capture Detailed Error Messages
```bash
node docs/phase-3/diagnose-newman.js
```

### Quick Status Check
```bash
cd backend && npx newman run tests/forges-v4.8-complete.postman_collection.json \
  --environment tests/forges-v4.8-complete.postman_environment.json \
  --reporters cli 2>&1 | grep "assertions"
```

---

## 🎓 Background

### Phase 3 Objective
Validate API contract with comprehensive Newman baseline test suite covering:
- 18 UCS (User Centric Scenarios)
- 53 HTTP requests
- 161 assertions
- All major workflows (registration, dossier, paiement, abonnement, etc.)

### Current Phase
**Baseline Validation** - Fixing assertion failures to establish 100% passing baseline

### Success Criteria
✅ All 53 requests execute (0 request failures)  
✅ All 161 assertions pass (0 assertion failures)  
✅ No 5xx server errors  
✅ Reproducible on fresh database  

---

## 📞 Support

### Issues?
1. Check current status: `cat NEWMAN_STATUS_REPORT.md`
2. Review task list: `cat TASK_MANIFEST.md`
3. Run diagnostics: `node analyze-failures.js`
4. Check logs: `tail -50 tests/newman/newman-results.txt`

### Need Help?
- See `docs/analyse-rm/` for API specifications
- Check `backend/src/` for endpoint implementations
- Review `backend/prisma/schema.prisma` for data models

---

## 📈 Progress Timeline

| Date | Milestone | Status |
|------|-----------|--------|
| May 1 | Baseline established (28 failures) | ✅ Done |
| May 2 | Fix 404 + 409 errors | ⏳ TODO |
| May 3 | Fix 400 + auth errors | ⏳ TODO |
| May 4 | Final validation | ⏳ TODO |
| May 5 | Phase 3 Complete (0 failures) | ⏳ Target |

---

**Latest Update:** May 1, 2026  
**Last Newman Run:** 133 passing / 28 failing (82.6%)  
**Next Action:** See [TASK_MANIFEST.md](TASK_MANIFEST.md)
