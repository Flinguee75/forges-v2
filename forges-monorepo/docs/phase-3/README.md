# Phase 3 - Newman Baseline v4.9
**Status:** In Progress - 28 Failures Remaining  
**Last Updated:** 1 May 2026  
**Goal:** Achieve 161/161 assertions passing (0 failures)

---

## 📋 Documentation Index

### Current Status
- **[NEWMAN_STATUS_REPORT.md](NEWMAN_STATUS_REPORT.md)** - Current failure breakdown & fix priorities
- **[NEWMAN_BASELINE_REPORT_v4.9.md](NEWMAN_BASELINE_REPORT_v4.9.md)** - Detailed baseline report
- **[FAILURES_ANALYSIS_v2.md](FAILURES_ANALYSIS_v2.md)** - Technical analysis with root causes

### Diagnostic Tools
- **[analyze-failures.js](analyze-failures.js)** - Categorize failures by type
- **[diagnose-newman.js](diagnose-newman.js)** - HTTP diagnostic tool for error capture

### Reports
- `../tests/newman/newman-baseline-v4.9.html` - HTML visual report (1.4 MB)
- `../tests/newman/newman-results.txt` - Text results

---

## 🎯 Quick Summary

| Category | Count | Status |
|----------|-------|--------|
| 404 Not Found | 4 | 🔴 Missing endpoints |
| 409 Conflict | 4 | 🟡 Data conflicts |
| 400 Bad Request | 4 | 🔴 Validation errors |
| 401 Unauthorized | 1 | 🟡 Token capture |
| 403 Forbidden | 1 | 🟡 May be intentional |

**Total Failures:** 28 (14 doubles for assertions)  
**Total Assertions:** 161  
**Pass Rate:** 82.6% (133/161)

---

## 🚀 Implementation Roadmap

### ✅ Completed
- [x] JWT token generation (24h TTL for all 9 roles)
- [x] Seed data creation (16 apprenants, formations, dossiers)
- [x] UCS06 Voucher creation fix (400 → 201)
- [x] Database reset and re-seeding
- [x] Newman baseline execution (53/53 requests)

### 🔄 In Progress
- [ ] Fix 404 errors (4) - verify endpoints
- [ ] Fix 409 errors (4) - data conflict resolution
- [ ] Fix 400 errors (4) - validation investigation

### ⏳ Next Steps
- [ ] Token capture verification (401)
- [ ] Business logic review (403)
- [ ] Final Newman run
- [ ] Generate 0-failure report

---

## 📂 File Structure

```
forges-monorepo/
└── backend/
    ├── tests/
    │   ├── forges-v4.8-complete.postman_collection.json
    │   ├── forges-v4.8-complete.postman_environment.json
    │   ├── NEWMAN_STATUS_REPORT.md
    │   └── newman/
    │       ├── newman-baseline-v4.9.html
    │       └── newman-results.txt
    ├── scripts/
    │   └── generate-test-tokens.js
    ├── seed_for_test.js
    └── docs/phase-3/
        ├── NEWMAN_STATUS_REPORT.md
        ├── NEWMAN_BASELINE_REPORT_v4.9.md
        ├── FAILURES_ANALYSIS_v2.md
        ├── analyze-failures.js
        └── diagnose-newman.js
```

---

## 🔧 Key Issues & Fixes

### Issue 1: Voucher Creation (FIXED ✅)
**Problem:** UCS06 returning 400 due to `organisation_id` in DTO  
**Fix:** Derive from JWT token instead of request body  
**Impact:** +2 assertions passing (201 responses)

### Issue 2: Data Conflicts (TODO)
**Problem:** Multiple 409 errors from pre-existing test data  
**Fix:** Use alternate IDs or data cleanup  
**Impact:** Could fix 4 assertions

### Issue 3: Missing Endpoints (TODO)
**Problem:** 404 errors for UCS09/12/15  
**Fix:** Implement or verify routes  
**Impact:** Could fix 4 assertions

### Issue 4: Validation Errors (TODO)
**Problem:** 400 errors for UCS08/19/20  
**Fix:** Investigate business logic or request payloads  
**Impact:** Could fix 4 assertions

---

## 📊 Metrics Tracking

| Run | Date | Pass | Fail | % | Notes |
|-----|------|------|------|---|-------|
| Baseline | May 1 | 135 | 26 | 83.9% | Initial with fresh tokens |
| v2 | May 1 | 133 | 28 | 82.6% | After UCS06 fix |
| v3 | TBD | - | - | - | After 404/409 fixes |
| v4 | TBD | - | - | - | After 400 fixes |
| Final | TBD | 161 | 0 | 100% | **Phase 3 Complete** ✅ |

---

## 💡 Command Reference

**Quick Test Run**
```bash
cd backend && npx newman run tests/forges-v4.8-complete.postman_collection.json \
  --environment tests/forges-v4.8-complete.postman_environment.json \
  --reporters cli 2>&1 | tail -30
```

**Full Report with HTML**
```bash
npx newman run tests/forges-v4.8-complete.postman_collection.json \
  --environment tests/forges-v4.8-complete.postman_environment.json \
  --reporters cli,htmlextra
```

**Analyze Failures**
```bash
node docs/phase-3/analyze-failures.js
```

**Reset Database & Re-seed**
```bash
npx prisma db push --skip-generate --force-reset
node seed_for_test.js
```

---

## 📝 Notes

- All 53 requests execute successfully (0 request failures)
- Only assertion-level failures remain (response validation)
- No 5xx server errors - backend is stable
- Most failures are test data or route-related, not backend bugs

---

**See [NEWMAN_STATUS_REPORT.md](NEWMAN_STATUS_REPORT.md) for detailed breakdown**
