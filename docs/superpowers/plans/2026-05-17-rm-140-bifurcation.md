# RM-140 Bifurcation Inscription — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer un fichier de test dédié qui valide explicitement les 7 cas de la règle RM-140 (bifurcation inscription selon type_formation × source_financement) et leurs assertions négatives.

**Architecture:** Un seul fichier `tests/integration/rm-140-bifurcation.test.js` couvrant chaque cas isolément avec un compte apprenant frais par cas. Les cas nécessitant un abonnement actif utilisent `accounts.apprenantRetail` (seeded). Les cas voucher utilisent les codes prédéfinis dans le seed E2E.

**Tech Stack:** Jest, Supertest, helpers.js existant (`createApprenantAccount`, `auth`, `request`, `ids`, `accounts`), Prisma pour assertions directes DB.

---

## Contexte métier

La règle RM-140 détermine le statut initial du dossier à la création :

| Formation | source_financement | voucher | Statut attendu |
|---|---|---|---|
| STANDARD | RETAIL | — | `PAYE_DIRECTEMENT` |
| STANDARD | B2B | — | `PAYE_DIRECTEMENT` |
| STANDARD | RETAIL | org (`VORG-E2E-UCS12-01`) | `PAYE` |
| STANDARD | VOUCHER | promo (`ORG-E2E-VOUCHER-01`) | `PAYE_DIRECTEMENT` |
| PREMIUM | RETAIL | — | `EN_ATTENTE_VERIFICATION` |
| PREMIUM | B2B | — | `PAYE_DIRECTEMENT` |
| PREMIUM | ABONNEMENT | — | `PAYE_DIRECTEMENT` |

Assertion négative clé : seul PREMIUM+RETAIL produit `EN_ATTENTE_VERIFICATION`.

## Fichiers concernés

- **Créer :** `forges-monorepo/backend/tests/integration/rm-140-bifurcation.test.js`
- **Modifier :** `forges-monorepo/backend/tests/integration/helpers.js` (ajout de 2 comptes)

---

## Task 1 : Ajouter les comptes manquants dans helpers.js

`accounts.apprenantRetail` et `accounts.apprenantVoucher` sont seedés dans `prisma/seed.e2e.ts` mais absents de `helpers.js`.

**Fichiers :**
- Modifier : `forges-monorepo/backend/tests/integration/helpers.js`

- [ ] **Step 1 : Ouvrir helpers.js et repérer le bloc `accounts`**

Le bloc commence ligne ~22. Les comptes `apprenantRetail` et `apprenantVoucher` sont définis dans `prisma/seed.e2e.ts` avec les emails :
- `apprenant-retail-e2e@forges.ci` (a un AbonnementRetail ACTIF dans le seed)
- `apprenant-voucher-e2e@forges.ci` (beneficiaire d'une organisation dans le seed)

- [ ] **Step 2 : Ajouter les deux comptes**

Dans `helpers.js`, après la ligne `apprenantPremiumRetail: ...`, ajouter :

```js
  apprenantRetail: { email: 'apprenant-retail-e2e@forges.ci', password: PASSWORD },
  apprenantVoucher: { email: 'apprenant-voucher-e2e@forges.ci', password: PASSWORD },
```

- [ ] **Step 3 : Vérifier que le seed connaît ces comptes**

```bash
cd forges-monorepo/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.apprenant.findMany({ where: { email: { in: ['apprenant-retail-e2e@forges.ci','apprenant-voucher-e2e@forges.ci'] } }, select: { email: true, statut: true } })
  .then(r => { console.log(r); p.\$disconnect(); });
"
```

Résultat attendu : 2 enregistrements avec `statut: 'ACTIF'`.

Si vide → relancer le seed : `node seed_for_test.js --reset && node seed_for_test.js --check`.

- [ ] **Step 4 : Commit**

```bash
git add forges-monorepo/backend/tests/integration/helpers.js
git commit -m "test: ajouter comptes apprenantRetail et apprenantVoucher dans helpers"
```

---

## Task 2 : Écrire le fichier de test rm-140-bifurcation.test.js

**Fichiers :**
- Créer : `forges-monorepo/backend/tests/integration/rm-140-bifurcation.test.js`

- [ ] **Step 1 : Écrire le fichier complet (tests qui échouent si la logique est cassée)**

```js
const {
  accounts,
  auth,
  createApprenantAccount,
  ids,
  request,
  API_URL,
} = require('./helpers');

// RM-140 : bifurcation statut dossier selon type_formation × source_financement
//
// Règle : seul Premium+Retail produit EN_ATTENTE_VERIFICATION.
// Tous les autres cas produisent PAYE_DIRECTEMENT (ou PAYE pour voucher org).

describe('RM-140 — Bifurcation statut dossier à l'inscription', () => {
  // ──────────────────────────────────────────────
  // CAS 1 : STANDARD + RETAIL → PAYE_DIRECTEMENT
  // ──────────────────────────────────────────────
  test('CAS-1 — Standard+Retail → PAYE_DIRECTEMENT', async () => {
    const headers = await auth(await createApprenantAccount('rm140-c1'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    expect(res.status).toBe(201);
    expect(res.body.dossier.statut).toBe('PAYE_DIRECTEMENT');
    expect(res.body.dossier.statut).not.toBe('EN_ATTENTE_VERIFICATION');
  });

  // ──────────────────────────────────────────────
  // CAS 2 : STANDARD + B2B → PAYE_DIRECTEMENT
  // ──────────────────────────────────────────────
  test('CAS-2 — Standard+B2B → PAYE_DIRECTEMENT', async () => {
    const headers = await auth(await createApprenantAccount('rm140-c2'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'B2B' });

    expect(res.status).toBe(201);
    expect(res.body.dossier.statut).toBe('PAYE_DIRECTEMENT');
    expect(res.body.dossier.statut).not.toBe('EN_ATTENTE_VERIFICATION');
  });

  // ──────────────────────────────────────────────
  // CAS 3 : STANDARD + VOUCHER ORG → PAYE
  // L'organisation couvre le paiement intégralement (RM-41)
  // ──────────────────────────────────────────────
  test('CAS-3 — Standard+VoucherOrg → PAYE', async () => {
    const headers = await auth(await createApprenantAccount('rm140-c3'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL', voucher_code: 'VORG-E2E-UCS12-01' });

    expect(res.status).toBe(201);
    expect(res.body.dossier.statut).toBe('PAYE');
    expect(res.body.dossier.statut).not.toBe('EN_ATTENTE_VERIFICATION');
  });

  // ──────────────────────────────────────────────
  // CAS 4 : STANDARD + VOUCHER PROMO → PAYE_DIRECTEMENT
  // Réduction appliquée, paiement reste à initier
  // ──────────────────────────────────────────────
  test('CAS-4 — Standard+VoucherPromo → PAYE_DIRECTEMENT', async () => {
    const headers = await auth(await createApprenantAccount('rm140-c4'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'VOUCHER', voucher_code: ids.orgVoucherCode });

    expect(res.status).toBe(201);
    expect(res.body.dossier.statut).toBe('PAYE_DIRECTEMENT');
    expect(res.body.dossier.statut).not.toBe('EN_ATTENTE_VERIFICATION');
  });

  // ──────────────────────────────────────────────
  // CAS 5 : PREMIUM + RETAIL → EN_ATTENTE_VERIFICATION
  // Seul cas produisant ce statut (RM-140)
  // ──────────────────────────────────────────────
  test('CAS-5 — Premium+Retail → EN_ATTENTE_VERIFICATION', async () => {
    const headers = await auth(await createApprenantAccount('rm140-c5'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.premiumRetailSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    expect(res.status).toBe(201);
    expect(res.body.dossier.statut).toBe('EN_ATTENTE_VERIFICATION');
  });

  // ──────────────────────────────────────────────
  // CAS 6 : PREMIUM + B2B → PAYE_DIRECTEMENT
  // ──────────────────────────────────────────────
  test('CAS-6 — Premium+B2B → PAYE_DIRECTEMENT', async () => {
    const headers = await auth(await createApprenantAccount('rm140-c6'));
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.premiumB2bSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'B2B' });

    expect(res.status).toBe(201);
    expect(res.body.dossier.statut).toBe('PAYE_DIRECTEMENT');
    expect(res.body.dossier.statut).not.toBe('EN_ATTENTE_VERIFICATION');
  });

  // ──────────────────────────────────────────────
  // CAS 7 : PREMIUM + ABONNEMENT → PAYE_DIRECTEMENT
  // apprenantRetail a un AbonnementRetail ACTIF dans le seed
  // ──────────────────────────────────────────────
  test('CAS-7 — Premium+Abonnement → PAYE_DIRECTEMENT', async () => {
    const headers = await auth(accounts.apprenantRetail);
    const res = await request(API_URL)
      .post(`/api/sessions/${ids.premiumRetailSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'ABONNEMENT' });

    expect(res.status).toBe(201);
    expect(res.body.dossier.statut).toBe('PAYE_DIRECTEMENT');
    expect(res.body.dossier.statut).not.toBe('EN_ATTENTE_VERIFICATION');
  });

  // ──────────────────────────────────────────────
  // ASSERTION NÉGATIVE GLOBALE
  // EN_ATTENTE_VERIFICATION interdit hors Premium+Retail
  // ──────────────────────────────────────────────
  test('NEG — EN_ATTENTE_VERIFICATION jamais produit hors Premium+Retail', async () => {
    const cases = [
      { session: ids.standardSession, body: { source_financement: 'RETAIL' }, label: 'Standard+Retail' },
      { session: ids.standardSession, body: { source_financement: 'B2B' }, label: 'Standard+B2B' },
      { session: ids.premiumB2bSession, body: { source_financement: 'B2B' }, label: 'Premium+B2B' },
    ];

    for (const cas of cases) {
      const headers = await auth(await createApprenantAccount(`rm140-neg-${cas.label}`));
      const res = await request(API_URL)
        .post(`/api/sessions/${cas.session}/inscrire`)
        .set(headers)
        .send(cas.body);

      expect(res.status).toBe(201);
      expect(res.body.dossier.statut).not.toBe('EN_ATTENTE_VERIFICATION');
    }
  });
});
```

- [ ] **Step 2 : Lancer uniquement ce fichier pour vérifier qu'il échoue si on brise la règle**

```bash
cd forges-monorepo/backend
npx jest tests/integration/rm-140-bifurcation.test.js --no-coverage 2>&1 | tail -30
```

Résultat attendu : tous les tests **PASS** (le code est correct, on documente le comportement existant).

Si un test FAIL → identifier lequel et vérifier si c'est un bug réel (comportement ne respecte pas RM-140) ou un problème de fixture (seed non relancé, compte déjà utilisé).

- [ ] **Step 3 : Commit**

```bash
git add forges-monorepo/backend/tests/integration/rm-140-bifurcation.test.js
git commit -m "test(rm-140): couvrir les 7 cas de bifurcation inscription + assertion negative"
```

---

## Task 3 : Vérifier la non-régression sur la suite existante

- [ ] **Step 1 : Relancer les tests intégration liés aux inscriptions**

```bash
cd forges-monorepo/backend
npx jest tests/integration/rm-dossiers.test.js tests/integration/rm-inscriptions.test.js tests/integration/rm-140-bifurcation.test.js --no-coverage 2>&1 | tail -30
```

Résultat attendu : 0 échec.

- [ ] **Step 2 : Si échec sur rm-dossiers ou rm-inscriptions**

Ces suites utilisent les mêmes sessions et comptes. Un échec signale une collision de fixture (même apprenant inscrit deux fois). Vérifier le préfixe passé à `createApprenantAccount` — il doit être unique par test.

- [ ] **Step 3 : Relancer le seed et recommencer si persistant**

```bash
cd forges-monorepo/backend
node seed_for_test.js --reset && node seed_for_test.js --check
npx jest tests/integration/rm-140-bifurcation.test.js --no-coverage 2>&1 | tail -20
```

- [ ] **Step 4 : Commit final si propre**

```bash
git add -A
git commit -m "test(rm-140): validation complete bifurcation — suite non-regression verte"
```

---

## Self-review

**Couverture spec RM-140 (CLAUDE.md section 10.1) :**

| Cas spec | Couvert | Test |
|---|---|---|
| STANDARD + RETAIL → PAYE_DIRECTEMENT | ✓ | CAS-1 |
| STANDARD + B2B → PAYE_DIRECTEMENT | ✓ | CAS-2 |
| STANDARD + VOUCHER (org) → PAYE | ✓ | CAS-3 |
| STANDARD + VOUCHER (promo) → PAYE_DIRECTEMENT | ✓ | CAS-4 |
| PREMIUM + RETAIL → EN_ATTENTE_VERIFICATION | ✓ | CAS-5 |
| PREMIUM + B2B → PAYE_DIRECTEMENT | ✓ | CAS-6 |
| PREMIUM + ABONNEMENT → PAYE_DIRECTEMENT | ✓ | CAS-7 |
| Refus EN_ATTENTE_VERIFICATION hors Premium+Retail | ✓ | NEG |

**Risques résiduels :**
- CAS-3 (voucher org) : le voucher `VORG-E2E-UCS12-01` a un quota de 10. Si d'autres tests l'utilisent, le quota peut s'épuiser et faire échouer CAS-3. Surveiller si flakiness.
- CAS-7 (abonnement) : `apprenantRetail` ne doit pas avoir de dossier actif sur `premiumRetailSession` avant le test. Le seed ne crée pas ce dossier — OK à date.
- CAS-4 (voucher promo) : `ORG-E2E-VOUCHER-01` a un quota de 5. Si d'autres suites l'épuisent, le test retournera 422. Isoler si nécessaire.
