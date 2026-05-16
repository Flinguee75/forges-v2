# IPN Race Condition Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre `traiterSuccess()` atomique pour qu'un second IPN SUCCESS simultane ne puisse pas creer de commission en double.

**Architecture:** Remplacer `tx.paiement.update()` par `tx.paiement.updateMany({ where: { id, statut: { not: 'CONFIRME' } } })`. Si `count === 0`, le paiement etait deja confirme par un autre process — on logue `IPN_DOUBLON_RACE` et on sort sans toucher les commissions. Le test d'integration simule le cas en appelant `traiterIpn()` deux fois avec le meme `transaction_id` sur un paiement deja `CONFIRME`.

**Tech Stack:** Node.js 20, TypeScript, Prisma 5, PostgreSQL 16, Jest (integration avec vraie DB).

---

## Fichiers touches

| Fichier | Action |
|---|---|
| `src/modules/paiements/ipn-ngser.service.ts` | Modifier `traiterSuccess()` lignes 176-204 : `update` → `updateMany` conditionnel + guard `count === 0` |
| `src/modules/paiements/__tests__/ipn-ngser.service.test.ts` | Ajouter test integration : appel `traiterIpn()` sur paiement deja CONFIRME → `IPN_DOUBLON_RACE` logue, 0 commission cree |

---

## Task 1 : Test d'integration — second IPN SUCCESS ignore si paiement deja CONFIRME

Le test existant (`ipn-ngser.service.test.ts`) utilise une vraie DB Prisma. On ajoute un scenario dans le meme style : creer un paiement deja en statut `CONFIRME`, appeler `traiterIpn()` avec un IPN SUCCESS → le service doit retourner `already_processed: true` ET ne pas creer de commission supplementaire.

**Files:**
- Modify: `src/modules/paiements/__tests__/ipn-ngser.service.test.ts`

- [ ] **Step 1 : Lire la fin du fichier de test pour trouver ou ajouter le nouveau describe**

```bash
tail -80 src/modules/paiements/__tests__/ipn-ngser.service.test.ts
```

Reperer la structure `beforeAll` / `afterAll` et le dernier `describe` pour savoir ou inserer.

- [ ] **Step 2 : Ajouter les fixtures et le test de race condition**

Ajouter a la fin du fichier, avant la fermeture du `describe` principal (ou comme nouveau `describe` de meme niveau) :

```ts
describe('RM-158 — Race condition : second IPN SUCCESS ignore', () => {
  const RACE_DOSSIER_ID = 'D-TEST-RACE-001';
  const RACE_PAIEMENT_ID = 'P-TEST-RACE-001';
  const RACE_ORDER = 'FRG-RACE-2026-001';
  const RACE_TX_ID = 'TXN-RACE-001';

  beforeAll(async () => {
    // Nettoyer
    await prisma.commissionApporteur.deleteMany({ where: { paiement_id: RACE_PAIEMENT_ID } });
    await prisma.commissionPartenaire.deleteMany({ where: { paiement_id: RACE_PAIEMENT_ID } });
    await prisma.paiement.deleteMany({ where: { id: RACE_PAIEMENT_ID } });
    await prisma.dossier.deleteMany({ where: { id: RACE_DOSSIER_ID } });

    // Creer dossier PAYE (simule premier IPN deja traite)
    await prisma.dossier.create({
      data: {
        id: RACE_DOSSIER_ID,
        apprenant_id: TEST_IDS.apprenant,
        formation_id: TEST_IDS.formation,
        session_id: TEST_IDS.session,
        source_financement: 'RETAIL',
        statut: 'PAYE',
      },
    });

    // Creer paiement deja CONFIRME (premier IPN deja traite)
    await prisma.paiement.create({
      data: {
        id: RACE_PAIEMENT_ID,
        dossier_id: RACE_DOSSIER_ID,
        montant_catalogue: MONTANT_INITIE_CENTIMES,
        montant_final: MONTANT_INITIE_CENTIMES,
        montant_initie: MONTANT_INITIE_CENTIMES,
        methode: 'MOBILE_MONEY',
        statut: 'CONFIRME',
        transaction_id: RACE_TX_ID,
        confirmed_at: new Date(),
        order_ngser: RACE_ORDER,
        provider: 'NGSER',
        reduction_appliquee: 0,
      },
    });
  });

  afterAll(async () => {
    await prisma.commissionApporteur.deleteMany({ where: { paiement_id: RACE_PAIEMENT_ID } });
    await prisma.commissionPartenaire.deleteMany({ where: { paiement_id: RACE_PAIEMENT_ID } });
    await prisma.paiement.deleteMany({ where: { id: RACE_PAIEMENT_ID } });
    await prisma.dossier.deleteMany({ where: { id: RACE_DOSSIER_ID } });
  });

  it('retourne already_processed et ne cree pas de commission si le paiement est deja CONFIRME', async () => {
    // Simuler un second IPN SUCCESS pour le meme paiement (race condition)
    const result = await service.traiterIpn({
      order_id: RACE_ORDER,
      order_ngser: RACE_ORDER,
      transaction_id: 'TXN-RACE-002', // transaction_id different (nouveau retry NGSER)
      status_id: 1,
      amount: MONTANT_XOF,
    });

    expect(result).toEqual(expect.objectContaining({ already_processed: true }));

    // Verifier qu'aucune commission supplementaire n'a ete creee
    const commissions = await prisma.commissionApporteur.findMany({
      where: { paiement_id: RACE_PAIEMENT_ID },
    });
    expect(commissions).toHaveLength(0);

    const commissionsPartenaire = await prisma.commissionPartenaire.findMany({
      where: { paiement_id: RACE_PAIEMENT_ID },
    });
    expect(commissionsPartenaire).toHaveLength(0);
  });
});
```

- [ ] **Step 3 : Lancer le test pour confirmer qu'il echoue**

```bash
cd forges-monorepo/backend
npx jest ipn-ngser.service.test.ts --no-coverage --testNamePattern="Race condition" 2>&1 | tail -20
```

Attendu : FAIL — le service retourne actuellement `{ paiement_statut: 'CONFIRME', ... }` et non `{ already_processed: true }` car `update` s'execute sans condition.

- [ ] **Step 4 : Commit du test rouge**

```bash
git add src/modules/paiements/__tests__/ipn-ngser.service.test.ts
git commit -m "test(security): test race condition IPN — second SUCCESS doit etre ignore (RED)"
```

---

## Task 2 : Implementation — updateMany conditionnel dans traiterSuccess()

**Files:**
- Modify: `src/modules/paiements/ipn-ngser.service.ts:176-204`

- [ ] **Step 1 : Lire le bloc traiterSuccess() pour avoir le code exact**

```bash
sed -n '171,231p' src/modules/paiements/ipn-ngser.service.ts
```

- [ ] **Step 2 : Remplacer update par updateMany conditionnel**

Dans `traiterSuccess()`, remplacer le bloc `await this.prisma.$transaction(async (tx) => { ... })` (lignes 176-204) par :

```ts
await this.prisma.$transaction(async (tx) => {
  const result = await tx.paiement.updateMany({
    where: { id: paiement.id, statut: { not: 'CONFIRME' } },
    data: {
      statut: 'CONFIRME',
      status_ngser: 'SUCCESS',
      code_ngser: ipn.status_id !== undefined ? String(ipn.status_id) : (ipn.code_ngser ? String(ipn.code_ngser) : null),
      wallet_ngser: ipn.wallet || ipn.wallet_ngser,
      ngser_payload_last: ipn as any,
      transaction_id: ipn.transaction_id,
      confirmed_at: new Date(),
    },
  });

  if (result.count === 0) {
    await this.audit.info('IPN_DOUBLON_RACE', {
      paiement_id: paiement.id,
      transaction_id: ipn.transaction_id,
    });
    return;
  }

  // Mettre a jour dossier
  await tx.dossier.update({
    where: { id: paiement.dossier_id },
    data: { statut: 'PAYE' },
  });

  // Creer commissions dans la transaction (RM-09, RM-145)
  commissions = await this.commissionService.creerCommissionsApresSuccessPayment(
    paiement,
    paiement.dossier,
    paiement.dossier.formation,
    tx
  );
});
```

Puis, juste apres la transaction (avant `commissionsCreated = ...`), ajouter le guard de retour precoce :

```ts
// Si la transaction a detecte un doublon race, sortir proprement
if (!commissions.partenaire && !commissions.apporteur) {
  // Verifier si c'est un doublon race (updateMany count=0) vs un paiement sans commission
  // On utilise le flag interne : si commissions est vide ET dossier est deja PAYE, c'est un doublon
  const dossierActuel = await this.prisma.dossier.findUnique({ where: { id: paiement.dossier_id } });
  if (dossierActuel?.statut === 'PAYE' && paiement.statut === 'CONFIRME') {
    return { already_processed: true, action: 'NONE' };
  }
}
```

**Note :** Cette approche de verifier le statut apres est fragile. Approche plus propre : utiliser une variable `raceDetected` dans le scope de `traiterSuccess()` :

```ts
private async traiterSuccess(paiement: any, ipn: IpnPayload): Promise<IpnResult> {
  let commissionsCreated = false;
  let commissions: { partenaire?: any; apporteur?: any } = {};
  let raceDetected = false;

  await this.prisma.$transaction(async (tx) => {
    const result = await tx.paiement.updateMany({
      where: { id: paiement.id, statut: { not: 'CONFIRME' } },
      data: {
        statut: 'CONFIRME',
        status_ngser: 'SUCCESS',
        code_ngser: ipn.status_id !== undefined ? String(ipn.status_id) : (ipn.code_ngser ? String(ipn.code_ngser) : null),
        wallet_ngser: ipn.wallet || ipn.wallet_ngser,
        ngser_payload_last: ipn as any,
        transaction_id: ipn.transaction_id,
        confirmed_at: new Date(),
      },
    });

    if (result.count === 0) {
      raceDetected = true;
      await this.audit.info('IPN_DOUBLON_RACE', {
        paiement_id: paiement.id,
        transaction_id: ipn.transaction_id,
      });
      return; // sortir de la transaction
    }

    await tx.dossier.update({
      where: { id: paiement.dossier_id },
      data: { statut: 'PAYE' },
    });

    commissions = await this.commissionService.creerCommissionsApresSuccessPayment(
      paiement,
      paiement.dossier,
      paiement.dossier.formation,
      tx
    );
  });

  if (raceDetected) {
    return { already_processed: true, action: 'NONE' };
  }

  commissionsCreated = !!(commissions.partenaire || commissions.apporteur);

  if (commissions.partenaire) {
    await this.audit.info('COMMISSION_PARTENAIRE_CREEE', {
      commission_id: commissions.partenaire.id,
      paiement_id: paiement.id,
      partenaire_id: paiement.dossier?.formation?.partenaire_id,
      montant_reverse: commissions.partenaire.montant_reverse,
    }).catch(() => {});
  }

  await this.audit.info('IPN_SUCCESS_TRAITE', {
    paiement_id: paiement.id,
    transaction_id: ipn.transaction_id,
    dossier_id: paiement.dossier_id,
  });

  this.recuService.genererEtEnvoyerRecu(paiement.dossier_id).catch(() => {});

  return {
    paiement_statut: 'CONFIRME',
    dossier_statut: 'PAYE',
    commissions_created: commissionsCreated,
  };
}
```

**Utiliser cette version complete** — elle remplace entierement la methode `traiterSuccess()` existante de la ligne 171 a 231.

- [ ] **Step 3 : Lancer le test de race condition pour confirmer qu'il passe**

```bash
cd forges-monorepo/backend
npx jest ipn-ngser.service.test.ts --no-coverage --testNamePattern="Race condition" 2>&1 | tail -15
```

Attendu : PASS.

- [ ] **Step 4 : Lancer la suite complete IPN pour verifier zero regression**

```bash
npx jest ipn-ngser.service.test.ts --no-coverage 2>&1 | tail -10
```

Attendu : tous les tests passent, 0 echec.

- [ ] **Step 5 : Lancer la suite complete backend**

```bash
npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 645+ tests, 0 echec.

- [ ] **Step 6 : Commit**

```bash
git add src/modules/paiements/ipn-ngser.service.ts
git commit -m "fix(security): updateMany conditionnel dans traiterSuccess — evite double commission (race condition)"
```

---

## Self-review

**Spec coverage :**
- Faille : second IPN SUCCESS peut creer double commission → couverte par Task 1 (test) + Task 2 (fix)
- `updateMany` conditionnel → Task 2 Step 2
- Log `IPN_DOUBLON_RACE` → Task 2 Step 2 (dans le guard `count === 0`)
- Retour `already_processed: true` → Task 2 Step 2 (`raceDetected`)
- 0 commission cree → verifie en Task 1 Step 2 (`expect(commissions).toHaveLength(0)`)

**Placeholder scan :** aucun TBD, aucun TODO.

**Type consistency :** `raceDetected` defini en debut de methode, utilise apres la transaction. `commissions` initialise `{}`, utilise seulement si `!raceDetected`. Coherent.
