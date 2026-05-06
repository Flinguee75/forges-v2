## NEWMAN TEST RESULTS - POST UCS06 FIX

**Current Status:** 161 assertions, **28 failures**, 133 passing (82.6%)

### Failures Breakdown by Status Code

#### 401 Unauthorized (2 failures)
- **#01-#02:** UCS06 / Public - Valider Voucher
  - Status: Expected 200, got 401
  - Root Cause: Token not being captured from previous UCS06 request
  - Fix: Token capture script in UCS06 test phase

#### 400 Bad Request (4 failures)  
- **#05-#06:** UCS08 / RESPONSABLE - Retenir Dossier
  - Status: Expected 200, got 400
  - Root Cause: Dossier state validation or payload schema issue
  
- **#07-#08:** UCS08 / RESPONSABLE - Rejeter Dossier
  - Status: Expected 200, got 400
  - Root Cause: Dossier state validation or payload schema issue
  
- **#25-#26:** UCS19 / AGENT - Effectuer Reversement Partenaire
  - Status: Expected 201, got 400
  - Root Cause: Commission data validation or threshold issue
  
- **#27-#28:** UCS20 / AGENT - Effectuer Reversement Apporteur
  - Status: Expected 201, got 400
  - Root Cause: Commission data validation or threshold issue

#### 403 Forbidden (2 failures)
- **#09-#10:** UCS09 / APPRENANT - Initier Paiement
  - Status: Expected 201, got 403
  - Root Cause: Business rule enforcement (dossier state or eligibility)
  - Likely Correct: This may be intended behavior (permission denied)

#### 404 Not Found (6 failures)
- **#11-#12:** UCS09 / Public - Webhook Paiement
  - Status: Expected 200, got 404
  - Root Cause: Endpoint `/api/paiements/webhook` missing or incorrect path
  
- **#15-#16:** UCS12 / APPRENANT - Résilier Abonnement
  - Status: Expected 200, got 404
  - Root Cause: Cancel subscription endpoint missing
  
- **#19-#20:** UCS15 / APPRENANT - Répondre au Bot
  - Status: Expected 200, got 404
  - Root Cause: Conversation endpoint missing or incorrect path
  
- **#21-#22:** UCS15 / APPRENANT - Historique Conversation
  - Status: Expected 200, got 404
  - Root Cause: Conversation history endpoint missing or incorrect path

#### 409 Conflict (6 failures)
- **#03-#04:** UCS07 / APPRENANT - Créer Dossier Inscription
  - Status: Expected 201, got 409
  - Root Cause: Apprenant already enrolled in this formation/session
  - Fix: Use different apprenant or session
  
- **#13-#14:** UCS12 / APPRENANT - Souscrire Abonnement
  - Status: Expected 201, got 409
  - Root Cause: Apprenant already has active AbonnementRetail
  - Fix: Use apprenant without existing subscription
  
- **#17-#18:** UCS13 / ORGANISATION - Souscrire Abonnement B2B
  - Status: Expected 201, got 409
  - Root Cause: Organisation already has B2B subscription
  - Fix: Use organisation without existing subscription
  
- **#23-#24:** UCS18 / RESPONSABLE - Valider Formation
  - Status: Expected 200, got 409
  - Root Cause: FormationPartenaire state already validated
  - Fix: Check data state or use new formation

### Priority Fix Strategy

**Phase 1: Quick Wins (2-3 failures)**
1. Fix token capture in UCS06 → Should eliminate #01-#02 (401 errors)
2. Use alternate data IDs for UCS07, UCS12, UCS13, UCS18 → Should eliminate #03-#04, #13-#14, #17-#18, #23-#24 (409 errors)

**Phase 2: Endpoint Verification (6-8 failures)**
3. Verify/add missing endpoints → UCS09 webhook, UCS12 cancel, UCS15 bot/history
4. If endpoints don't exist, mark as "not implemented"

**Phase 3: Backend Data Issues (2-4 failures)**
5. Investigate UCS08 dossier state handling → 400 errors
6. Investigate UCS19/UCS20 commission calculation → 400 errors

### Immediate Actions

1. Update Postman environment with alternate data IDs (apprenant2, different formation/session combinations)
2. Add token capture script to UCS06 test phase
3. Check backend routes for missing endpoints
4. Re-run Newman after each fix group
