# HMAC Webhook Signature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Écrire les tests HMAC manquants sur les endpoints webhook paiement, corriger le bug de signature absente acceptée sur `handleWebhook`, et valider la non-régression.

**Architecture:** Bug-first TDD — test échouant d'abord, puis fix minimal dans le controller, puis non-régression.

**Tech Stack:** Jest, Supertest, Node.js crypto (HMAC SHA-256), `paiement.controller.ts`.

---

## Contexte — Bug découvert

Le handler `handleWebhook` (`POST /api/paiements/webhook`, monté via `app.use('/api', paiementRoutes)`) contient :

```typescript
// paiement.controller.ts ligne ~111
if (signature && signature !== expectedSig) {
  return res.status(401)...
}
```

**Problème :** si `signature` est absente (`undefined`), la condition est `false` → le webhook passe sans authentification. Un attaquant peut déclencher un `confirmerPaiement` sans aucune clé.

Le handler `traiterIpnNgser` (`POST /webhooks/paiement`) est correct :
```typescript
if (!signature) { return 401 }
if (signature !== expectedSig) { return 401 }
```

**Fix requis :** remplacer `if (signature && signature !== expectedSig)` par deux checks séparés identiques à `traiterIpnNgser`.

---

## Fichiers concernés

- **Créer :** `tests/integration/rm-09-hmac-webhook.test.js`
- **Modifier :** `src/modules/paiements/paiement.controller.ts` (fix bug ligne ~111)

---

## Task 1 : Écrire les tests HMAC (dont le test qui révèle le bug)

**Fichiers :**
- Créer : `forges-monorepo/backend/tests/integration/rm-09-hmac-webhook.test.js`

- [ ] **Step 1 : Créer le fichier de test**

```js
const crypto = require('crypto');
const {
  createApprenantAccount,
  ids,
  prisma,
  request,
  API_URL,
} = require('./helpers');

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-secret';

function sign(payload) {
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
}

async function creerDossierPaiement(prefix) {
  const apprenant = await createApprenantAccount(prefix);
  const dossier = await prisma.dossier.create({
    data: {
      apprenant_id: apprenant.id,
      formation_id: ids.standardFormation,
      session_id: ids.standardSession,
      statut: 'PAYE_DIRECTEMENT',
      source_financement: 'RETAIL',
    },
  });
  const formation = await prisma.formation.findUnique({
    where: { id: ids.standardFormation },
  });
  const paiement = await prisma.paiement.create({
    data: {
      dossier_id: dossier.id,
      montant_catalogue: formation.cout_catalogue,
      montant_final: formation.cout_catalogue,
      montant_initie: formation.cout_catalogue,
      methode: 'MOBILE_MONEY',
      statut: 'EN_ATTENTE',
      tentatives: 0,
      provider: 'LEGACY',
    },
  });
  return { dossier, paiement, formation };
}

describe('RM-09 — Sécurité HMAC webhook paiement', () => {

  // ── /api/paiements/webhook (handler legacy handleWebhook) ─────────────

  test('HMAC-1 — signature valide → 200', async () => {
    const { dossier, paiement } = await creerDossierPaiement('hmac1');
    const payload = {
      transaction_id: `TX-HMAC1-${Date.now()}`,
      dossier_id: dossier.id,
      statut: 'SUCCESS',
      montant: paiement.montant_final,
    };
    const res = await request(API_URL)
      .post('/api/paiements/webhook')
      .set('x-webhook-signature', sign(payload))
      .send(payload);

    expect(res.status).toBe(200);
  });

  test('HMAC-2 — signature invalide → 401', async () => {
    const { dossier, paiement } = await creerDossierPaiement('hmac2');
    const payload = {
      transaction_id: `TX-HMAC2-${Date.now()}`,
      dossier_id: dossier.id,
      statut: 'SUCCESS',
      montant: paiement.montant_final,
    };
    const res = await request(API_URL)
      .post('/api/paiements/webhook')
      .set('x-webhook-signature', 'mauvaise-signature')
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/INVALID_SIGNATURE/);
  });

  test('HMAC-3 — signature absente → 401 (RM-09)', async () => {
    const { dossier, paiement } = await creerDossierPaiement('hmac3');
    const payload = {
      transaction_id: `TX-HMAC3-${Date.now()}`,
      dossier_id: dossier.id,
      statut: 'SUCCESS',
      montant: paiement.montant_final,
    };
    const res = await request(API_URL)
      .post('/api/paiements/webhook')
      .send(payload);

    expect(res.status).toBe(401);
  });

  // ── /webhooks/paiement (handler traiterIpnNgser — déjà correct) ───────

  test('HMAC-4 — NGSER : signature absente → 401', async () => {
    const payload = { reference: 'TX-NGSER-TEST', statut: 'SUCCESS' };
    const res = await request(API_URL)
      .post('/webhooks/paiement')
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/SIGNATURE_MANQUANTE/);
  });

  test('HMAC-5 — NGSER : signature invalide → 401', async () => {
    const payload = { reference: 'TX-NGSER-TEST', statut: 'SUCCESS' };
    const res = await request(API_URL)
      .post('/webhooks/paiement')
      .set('x-webhook-signature', 'fausse')
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/INVALID_SIGNATURE/);
  });
});
```

- [ ] **Step 2 : Lancer les tests — HMAC-3 doit échouer (il révèle le bug)**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend"
npx jest tests/integration/rm-09-hmac-webhook.test.js --no-coverage --forceExit 2>&1 | tail -30
```

Résultat attendu :
- HMAC-1 : PASS
- HMAC-2 : PASS
- **HMAC-3 : FAIL** (reçoit 200 au lieu de 401 — confirme le bug)
- HMAC-4 : PASS
- HMAC-5 : PASS

Si HMAC-3 passe déjà → le bug a été corrigé entre-temps. Vérifier le code et documenter.

- [ ] **Step 3 : Commit du test (rouge)**

```bash
git add forges-monorepo/backend/tests/integration/rm-09-hmac-webhook.test.js
git commit -m "test(rm-09): exposer bug signature absente acceptee sur handleWebhook"
```

---

## Task 2 : Corriger le bug dans paiement.controller.ts

**Fichiers :**
- Modifier : `forges-monorepo/backend/src/modules/paiements/paiement.controller.ts`

- [ ] **Step 1 : Localiser le code bugué**

Dans `handleWebhook`, chercher le bloc :

```typescript
const signature = req.headers['x-webhook-signature'];
const payload = JSON.stringify(req.body);
const expectedSig = createHmac('sha256', process.env.WEBHOOK_SECRET || 'dev-secret')
  .update(payload).digest('hex');

if (signature && signature !== expectedSig) {
  return res.status(401).json({ statusCode: 401, error: 'INVALID_SIGNATURE', message: 'Signature webhook invalide' });
}
```

- [ ] **Step 2 : Appliquer le fix minimal**

Remplacer ce bloc par :

```typescript
const signature = req.headers['x-webhook-signature'];
if (!signature) {
  return res.status(401).json({
    statusCode: 401,
    error: 'SIGNATURE_MANQUANTE',
    message: 'Header x-webhook-signature absent',
  });
}
const payload = JSON.stringify(req.body);
const expectedSig = createHmac('sha256', process.env.WEBHOOK_SECRET || 'dev-secret')
  .update(payload).digest('hex');
if (signature !== expectedSig) {
  return res.status(401).json({
    statusCode: 401,
    error: 'INVALID_SIGNATURE',
    message: 'Signature webhook invalide',
  });
}
```

- [ ] **Step 3 : Relancer les tests — tous doivent être verts**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend"
npx jest tests/integration/rm-09-hmac-webhook.test.js --no-coverage --forceExit 2>&1 | tail -20
```

Résultat attendu : 5/5 PASS.

- [ ] **Step 4 : Commit du fix**

```bash
git add forges-monorepo/backend/src/modules/paiements/paiement.controller.ts
git commit -m "fix(rm-09): rejeter webhook sans signature HMAC sur handleWebhook"
```

---

## Task 3 : Non-régression

**Fichiers :**
- Lire uniquement (pas de modification)

- [ ] **Step 1 : Relancer les suites webhook existantes**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend"
npx jest tests/integration/ucs09-legacy-webhook-backend.integration.test.js \
         tests/integration/ucs09-fineo-backend.integration.test.js \
         tests/integration/rm-09-hmac-webhook.test.js \
         --no-coverage --forceExit --runInBand 2>&1 | tail -30
```

Résultat attendu : 0 échec.

- [ ] **Step 2 : Si un test existant échoue**

Vérifier si `ucs09-legacy-webhook-backend` envoie des requêtes sans signature (ce ne devrait pas être le cas — le helper `signWebhook` est utilisé dans toutes ses requêtes). Si c'est le cas, c'est que ces tests testaient un comportement bugué : les adapter pour toujours inclure une signature valide.

- [ ] **Step 3 : Commit final**

```bash
git add -A
git commit -m "test(rm-09): non-regression verte — suite webhook HMAC complete"
```

---

## Self-review

**Couverture RM-09 :**

| Cas | Test |
|---|---|
| Signature valide → 200 | HMAC-1 |
| Signature invalide → 401 | HMAC-2 |
| Signature absente → 401 (bug fix) | HMAC-3 |
| NGSER signature absente → 401 | HMAC-4 |
| NGSER signature invalide → 401 | HMAC-5 |

**Risque résiduel :** le handler `/webhooks/fineo` (FineoPay) n'a pas de HMAC (commentaire dans le code : "pas de HMAC dans leur API"). Non couvert ici — hors scope RM-09.
