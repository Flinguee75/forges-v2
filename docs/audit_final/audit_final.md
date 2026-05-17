# Plan — Audit couverture tests FORGES v4.9 : focus workflow paiements

## Contexte

Audit demandé pour vérifier la couverture des tests E2E et unitaires vs les specs v4.8/v4.9, en priorisant la fiabilité du workflow de paiement. L'implémentation v4.9 est complète (484/484 tests backend passent, J1–J7 validés, J8 bloqué staging réel). Avant de passer au mode NGSER réel et à la production contrôlée, certaines lacunes critiques dans les tests doivent être comblées.

**Note**: `docs/use-cases/USE_CASES_v4.9.md` est vide (0 octets). Les specs v4.9 sont dans `docs/implementation-4.9/Forges_4.9_addendum_spec.md`. Ce fichier de specs ne fait pas partie de ce plan mais doit être complété séparément.

---

## État actuel de la couverture (audit)

### Couverture confirmée (pas de retouche nécessaire)
| RM | Test | Type | Fichier |
|---|---|---|---|
| RM-158 Idempotence IPN | 2 tests, triple IPN vérifié | E2E | `ucs09-paiement-idempotence.spec.js` |
| RM-159 Réconciliation scheduler | 4 tests, mode mock | E2E | `ucs09-paiement-reconciliation.spec.js` |
| RM-160 Montant mismatch | 1 test | E2E | `ucs09-paiement-montant-mismatch.spec.js` |
| RM-09 Webhook SUCCESS → PAYE | 1 test | E2E | `ucs09-paiement-commissions.spec.js` |
| RM-145 Commission apporteur + montant exact | 1 test (7500 XOF = 150k × 5%) | E2E | `ucs09-paiement-commissions.spec.js` |
| RM-157 NGSER order_ngser + payment_url | 1 test | E2E | `ucs09-paiement-commissions.spec.js` |
| RM-06 Un paiement par dossier | test intégration | Integration | `rm-paiements.test.js` |
| RM-07 Délai 72h | tests unitaires service | Unit | `paiement.service.test.ts` |
| RM-08 Max 3 tentatives | test intégration | Integration | `rm-vague3-paiements-reversements.test.js` |
| RM-143 Code apporteur invalide/suspendu | 3 cas | Integration | `rm-143-validation-code-apporteur.test.js` |
| RM-130 Commission FORGES cachée partenaire | 1 test | Integration + E2E | `ucs09-paiement-commissions.spec.js` |

---

## Lacunes identifiées

### P0 — Bloquant (traiter avant staging NGSER réel)

#### 1. RM-140 Bifurcation : 3 cas sur 6 manquants en E2E
**Fichier** : `forges-monorepo/frontend/e2e/ucs07-inscription-bifurcation.spec.js` (42 lignes, 3 tests)

Couverture actuelle vs spec CLAUDE.md §10.1 :
| Formation | Source | Statut attendu | Couvert ? |
|---|---|---|---|
| STANDARD | RETAIL | PAYE_DIRECTEMENT | ✅ |
| PREMIUM | RETAIL | EN_ATTENTE_VERIFICATION | ✅ |
| PREMIUM | B2B | PAYE_DIRECTEMENT | ✅ |
| STANDARD | B2B | PAYE_DIRECTEMENT | ❌ |
| STANDARD | VOUCHER | PAYE_DIRECTEMENT | ❌ |
| PREMIUM | ABONNEMENT | PAYE_DIRECTEMENT | ❌ |

#### 2. Chemin d'échec webhook FAILED absent en E2E
**Fichier** : `forges-monorepo/frontend/e2e/ucs09-paiement-commissions.spec.js`

Manque :
- IPN avec `statut: 'FAILED'` → dossier reste en son statut précédent (ni PAYE, ni annulé)
- Aucune `CommissionApporteur` ni `CommissionPartenaire` créée sur webhook FAILED (RM-145 chemin négatif)

### P1 — Critique (traiter avant production)

#### 3. RM-144 VOUCHER_CUMUL_INTERDIT absent partout
**Fichier intégration** : `forges-monorepo/backend/tests/integration/rm-143-validation-code-apporteur.test.js`

`rm-143-validation-code-apporteur.test.js` couvre uniquement RM-143 (code valide, invalide, suspendu). RM-144 (non-cumul code apporteur + voucher organisation) est absent :
- ❌ code apporteur + voucher organisation → 422 `VOUCHER_CUMUL_INTERDIT`
- ❌ code apporteur + réduction abonné Retail -15% → doit être accepté (cas positif RM-144)
- ❌ Aucun test E2E pour ces scénarios

#### 4. Commission lifecycle apporteur (agrégation mensuelle) non testée
Le scheduler `commission-agregateur.scheduler.ts` (cron `0 6 1 * *`) est sans test :
- ❌ Déclenchement agrégation → commissions EN_ATTENTE → VALIDEE
- ❌ Cumul < seuil → commissions restent VALIDEE, report mois suivant
- ❌ Cumul >= seuil → commissions → REVERSEE + AuditLog
- Endpoint admin requis : `POST /admin/scheduler/commissions-agregation`

#### 5. RM-10 assertion trop faible
**Fichier** : `forges-monorepo/backend/tests/integration/rm-vague3-paiements-reversements.test.js`, ligne 101

```js
expect([200, 201, 404, 400]).toContain(res.status); // accepte même un 404
```
Doit asserter spécifiquement que le remboursement manuel admin est possible (200/201), ou que l'endpoint existe et renvoie la bonne structure.

### P2 — Recommandé

#### 6. Newman : 3 endpoints v4.9 absents de la collection
**Fichier** : `forges-monorepo/backend/tests/forges-v4.8-complete.postman_collection.json`
- `POST /api/paiements/fineo/initier` (RM-157 Fineo)
- `POST /webhooks/paiement` (IPN NGSER canonique, RM-158)
- `POST /admin/scheduler/reconciliation-ngser` (RM-159)

#### 7. Tests E2E code apporteur (RM-143/144) absents
Seulement des tests intégration backend. Aucun E2E vérifiant le rejet depuis l'UI/API en conditions réelles.

---

## Plan d'actions détaillé

### Action 1 — Compléter RM-140 (P0)

**Fichier à modifier** : `forges-monorepo/frontend/e2e/ucs07-inscription-bifurcation.spec.js`

Ajouter 3 tests (après ligne 41) :

```js
// Standard B2B : source_financement='B2B' → PAYE_DIRECTEMENT
test('UCS07 RM-140: Standard B2B passe en paiement direct', async ({ request }) => {
  // POST /api/sessions/:id/inscrire avec source_financement='B2B'
  // Vérifier statut = 'PAYE_DIRECTEMENT'
});

// Standard VOUCHER : code_voucher valide → PAYE_DIRECTEMENT
test('UCS07 RM-140: Standard Voucher passe en paiement direct', async ({ request }) => {
  // POST avec voucher_code valide (depuis E2E_SCENARIO.voucherCode)
  // Vérifier statut = 'PAYE_DIRECTEMENT'
});

// Premium ABONNEMENT : apprenant avec abonnement Retail actif → PAYE_DIRECTEMENT
test('UCS07 RM-140: Premium Abonnement ne passe pas par la vérification', async ({ request }) => {
  // POST avec source_financement='ABONNEMENT'
  // Vérifier statut = 'PAYE_DIRECTEMENT'
});
```

**Seed nécessaire** : vérifier `e2e-data.js` pour les comptes `apprenantAbonnementRetail` et `voucherCode`. Les ajouter dans `E2E_ACCOUNTS` / `E2E_SCENARIO` si absents. Le seed `seed_for_test.js` crée déjà un `AbonnementRetail` et des vouchers.

---

### Action 2 — Chemin d'échec webhook FAILED (P0)

**Fichier à modifier** : `forges-monorepo/frontend/e2e/ucs09-paiement-commissions.spec.js`

Ajouter 1 test après le test RM-157 (ligne 149) :

```js
test('UCS09 RM-145 négatif: webhook FAILED ne crée aucune commission', async ({ request }) => {
  // 1. Créer inscription + initier paiement
  // 2. Envoyer IPN avec statut: 'FAILED'
  // 3. Vérifier dossier.paiement.statut === 'ECHOUE'
  // 4. Vérifier dossier.statut !== 'PAYE' (reste en attente)
  // 5. Vérifier via /apporteurs/commissions qu'aucune commission n'est créée pour ce transaction_id
  // 6. Vérifier via /agent/reversements/partenaires qu'aucune commission partenaire n'est créée
});
```

**Compte seed requis** : un compte apprenant dédié `apprenantPaiementFailed` + un dossier RETENU. Vérifier dans `seed_for_test.js` (un dossier `d_retenu_01` existe déjà).

---

### Action 3 — RM-144 VOUCHER_CUMUL_INTERDIT (P1)

**Fichier à modifier** : `forges-monorepo/backend/tests/integration/rm-143-validation-code-apporteur.test.js`

Ajouter 2 tests après RM-143.3 (ligne 48) :

```js
test('RM-144.1 — Code apporteur + voucher organisation rejeté 422', async () => {
  // POST /api/sessions/:id/inscrire avec code_apporteur + voucher_code organisation
  // Vérifier 422 VOUCHER_CUMUL_INTERDIT
});

test('RM-144.2 — Code apporteur + abonnement Retail -15% accepté', async () => {
  // POST avec code_apporteur sur apprenant avec abonnement Retail actif
  // Vérifier 201 (accepté, les deux sont compatibles)
});
```

---

### Action 4 — Commission lifecycle apporteur (P1)

**Nouveau fichier** : `forges-monorepo/frontend/e2e/ucs20-commission-lifecycle.spec.js`

3 tests :
```js
// Test 1 : Agrégation → EN_ATTENTE → VALIDEE
test('UCS20 RM-146: Scheduler agrégation passe commissions EN_ATTENTE → VALIDEE', async ({ request }) => {
  // Créer des commissions EN_ATTENTE via paiements
  // POST /admin/scheduler/commissions-agregation
  // Vérifier commissions.statut === 'VALIDEE'
});

// Test 2 : Sous le seuil → report
test('UCS20 RM-147: Cumul sous le seuil → report mois suivant', async ({ request }) => {
  // Vérifier que commissions VALIDEE cumul < SEUIL_REVERSEMENT restent VALIDEE sans REVERSEE
});

// Test 3 : Seuil atteint → reversement
test('UCS20 RM-147: Cumul >= seuil → reversement déclenché', async ({ request }) => {
  // Créer cumul >= SEUIL_REVERSEMENT_APPORTEUR_XOF
  // POST /admin/scheduler/commissions-agregation
  // Vérifier statut === 'REVERSEE' + AuditLog créé
});
```

**Prérequis** : Endpoint admin `POST /admin/scheduler/commissions-agregation` (similaire à `/admin/scheduler/reconciliation-ngser`). Vérifier s'il existe déjà.

---

### Action 5 — Corriger assertion RM-10 (P1)

**Fichier à modifier** : `forges-monorepo/backend/tests/integration/rm-vague3-paiements-reversements.test.js`, ligne 101

Remplacer :
```js
expect([200, 201, 404, 400]).toContain(res.status);
```
Par :
```js
expect([200, 201]).toContain(res.status);
if (res.status === 200 || res.status === 201) {
  expect(res.body.statut).toBe('REMBOURSE');
}
```

Si l'endpoint `/api/admin/paiements/:id/rembourser` n'existe pas encore, documenter le cas de non-régression plutôt que de laisser une assertion permissive.

---

### Action 6 — Newman v4.9 (P2)

**Fichier à modifier** : `forges-monorepo/backend/tests/forges-v4.8-complete.postman_collection.json`

Ajouter dans la section UCS09 :
1. `POST /api/paiements/fineo/initier` — assertions : 201, `payment_url` présent, `order_fineo` présent
2. `POST /webhooks/paiement` (IPN NGSER) — assertions : 200, `accepted: true` (idempotence)
3. `POST /admin/scheduler/reconciliation-ngser` — assertions : 200, `reconcilies` count présent

Objectif collection après : 56 requêtes, ~168 assertions.

---

### Action 7 — E2E code apporteur (P2)

**Nouveau fichier** : `forges-monorepo/frontend/e2e/ucs09-paiement-code-apporteur.spec.js`

3 tests reprenant les scénarios de rm-143 en E2E :
- Code UUID inexistant → réponse 422 avec code `CODE_APPORTEUR_INVALIDE`
- Apporteur suspendu → 422 `CODE_APPORTEUR_INACTIF`
- Code apporteur + voucher organisation → 422 `VOUCHER_CUMUL_INTERDIT`

---

## Ordre d'exécution recommandé

1. **Lire `e2e-data.js`** pour inventorier les comptes et scénarios disponibles → identifier ce qui manque dans le seed
2. **Action 3** (RM-144 intégration) — modification simple, 30 min
3. **Action 5** (RM-10 assertion) — correction one-liner
4. **Action 2** (webhook FAILED) — 1 test E2E, ~40 min
5. **Action 1** (RM-140 bifurcation) — 3 tests E2E, ~60 min (seed potentiellement à ajuster)
6. **Action 4** (commission lifecycle) — nécessite de vérifier l'existence du endpoint admin scheduler
7. **Action 6** (Newman) — après validation des actions 1–5
8. **Action 7** (E2E code apporteur) — si temps disponible

---

## Vérification post-implémentation

```bash
# Actions 1–2 : bifurcation + webhook failed
cd forges-monorepo && npx playwright test e2e/ucs07-inscription-bifurcation.spec.js
npx playwright test e2e/ucs09-paiement-commissions.spec.js

# Action 3 : RM-144 intégration
cd backend && npm run test:integration -- rm-143-validation-code-apporteur

# Action 5 : RM-10
cd backend && npm run test:integration -- rm-vague3-paiements-reversements

# Action 4 : commission lifecycle
npx playwright test e2e/ucs20-commission-lifecycle.spec.js

# Régression globale
cd backend && npm test
npx playwright test

# Newman après Action 6
cd backend && npm run dev &
npx newman run tests/forges-v4.8-complete.postman_collection.json \
  --environment tests/forges-v4.8-complete.postman_environment.json
```

**Critère de succès** : 0 régression sur les 484 tests existants + toutes les nouvelles actions au vert.
