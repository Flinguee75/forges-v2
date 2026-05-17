# IPN Race Condition Fix — Design Spec

**Date :** 2026-05-15
**RM :** RM-158 (idempotence IPN NGSER)
**Criticite :** Majeur — double commission possible si deux IPN SUCCESS arrivent simultanement

---

## Probleme

Le check d'idempotence actuel dans `IpnNgserService.traiterIpn()` est un `findFirst` suivi d'une comparaison en memoire :

```ts
const paiementExistant = await this.prisma.paiement.findFirst({
  where: { transaction_id: ipn.transaction_id },
});
if (paiementExistant?.statut === 'CONFIRME') return { already_processed: true };
```

Si deux IPN SUCCESS arrivent en parallele avant que l'un des deux ait commite, les deux passent ce check et appellent tous les deux `traiterSuccess()`. La contrainte UNIQUE sur `CommissionApporteur.paiement_id` empeche la double insertion en DB, mais l'erreur Prisma est avalee silencieusement (`catch(() => undefined)`).

## Solution retenue : mise a jour conditionnelle atomique (Option A)

Remplacer le `update({ where: { id } })` dans `traiterSuccess()` par un `updateMany({ where: { id, statut: { not: 'CONFIRME' } } })`.

- Si `count === 1` : ce process a gagne la course → continuer avec la creation de commissions
- Si `count === 0` : un autre process a deja confirme → logger `IPN_DOUBLON_RACE` et sortir proprement

La garantie est au niveau Postgres : a l'interieur d'une `$transaction`, un seul `UPDATE` peut satisfaire `statut != CONFIRME`. Le second recoit `count=0` de facon deterministe.

## Fichiers touches

| Fichier | Action |
|---|---|
| `src/modules/paiements/ipn-ngser.service.ts` | Modifier `traiterSuccess()` : `update` → `updateMany` conditionnel + guard sur `count` |
| `src/modules/paiements/__tests__/ipn-ngser.service.test.ts` | Ajouter test : deux appels simultanea `traiterSuccess()` → seul le premier cree des commissions |

## Implementation precise

### Avant (ligne ~178)

```ts
await this.prisma.$transaction(async (tx) => {
  await tx.paiement.update({
    where: { id: paiement.id },
    data: {
      statut: 'CONFIRME',
      transaction_id: ipn.transaction_id,
      confirmed_at: new Date(),
      // ...autres champs
    },
  });
  // creation commissions...
});
```

### Apres

```ts
await this.prisma.$transaction(async (tx) => {
  const result = await tx.paiement.updateMany({
    where: { id: paiement.id, statut: { not: 'CONFIRME' } },
    data: {
      statut: 'CONFIRME',
      transaction_id: ipn.transaction_id,
      confirmed_at: new Date(),
      // ...autres champs identiques
    },
  });

  if (result.count === 0) {
    await this.audit.info('IPN_DOUBLON_RACE', {
      paiement_id: paiement.id,
      transaction_id: ipn.transaction_id,
    });
    return; // sortir de la transaction sans commissions
  }

  // creation commissions (inchange)...
});
```

### Valeur de retour si doublon race

```ts
if (result.count === 0) {
  return { already_processed: true, action: 'NONE', race_condition_detected: true };
}
```

## Test a ajouter

```ts
it('ignore le second IPN SUCCESS si le premier a deja confirme (race condition)', async () => {
  // Premier appel : confirme le paiement
  prisma.paiement.updateMany.mockResolvedValueOnce({ count: 1 });
  // Second appel : updateMany retourne count=0 (deja confirme)
  prisma.paiement.updateMany.mockResolvedValueOnce({ count: 0 });

  const result = await service.traiterSuccess(mockPaiement, mockIpn);
  expect(result).toEqual(expect.objectContaining({ already_processed: true }));
  // Aucune commission cree
  expect(prisma.commissionApporteur.create).not.toHaveBeenCalled();
});
```

## Ce qui ne change pas

- La contrainte UNIQUE sur `CommissionApporteur.paiement_id` reste en place comme filet de securite
- Le check d'idempotence initial (`findFirst + statut === CONFIRME`) reste en place pour les doublons non-simultaneus (retry NGSER apres succes connu)
- Aucun changement sur `traiterFail()` ou `traiterPending()`

## Criteres d'acceptation

- Un seul `CommissionApporteur` cree pour un paiement, meme si deux IPN SUCCESS arrivent en parallele
- Le second IPN logue `IPN_DOUBLON_RACE` dans l'AuditLog
- La suite de tests passe a 0 echec
