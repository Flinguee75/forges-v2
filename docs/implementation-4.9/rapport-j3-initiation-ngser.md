# Rapport J3 — Initiation paiement NGSER

Date: 2026-04-29

## Objectif

Implémenter l'initiation paiement NGSER backend-only en mode mock pour FORGES v4.9, sans appel réel à l'API NGSER.

## Changements réalisés

- Ajout de `PaiementNgserService` pour l'initiation NGSER.
- Ajout de l'endpoint `POST /api/paiements/initier`.
- Ajout d'un DTO minimal `InitierPaiementNgserSchema` avec `dossier_id` uniquement.
- Recalcul systématique du montant côté backend depuis le dossier, la formation et les réductions applicables.
- Génération de `order_ngser` au format `FRG-YYYY-SEQ-XXXXXX`, par exemple `FRG-2026-119-A3F7B2`.
- Vérification d'unicité applicative avant création, en complément de la contrainte unique DB.
- Stockage dans `Paiement` des champs J3 requis:
  - `provider = "NGSER"`
  - `payment_token_ngser`
  - `order_ngser`
  - `montant_initie`
  - `statut = "PENDING"`
- Retour d'une URL mock `https://mock-ngser.forges.ci/pay?order=...`.
- Préparation d'un point d'extension `createRealNgserSession()` pour J6, volontairement non implémenté en J3.

## Points de sécurité

- Le montant fourni par le client est ignoré par le DTO et par le service.
- Aucun secret NGSER n'est lu ni journalisé en J3.
- Les logs d'audit contiennent uniquement des identifiants métier, `order_ngser`, provider et montant initié.
- `NGSER_MOCK_MODE` est traité en mode mock par défaut, sauf si explicitement positionné à `false`.

## Tests ajoutés

- Unitaires:
  - montant client ignoré;
  - format `order_ngser`;
  - unicité `order_ngser`;
  - champs NGSER stockés;
  - dossier inexistant rejeté;
  - dossier déjà payé rejeté;
  - réduction Premium -15% conservée.
- Routage:
  - `POST /api/paiements/initier` branché sur l'initiation NGSER.
- Intégration:
  - parcours API complet avec création de dossiers de test et persistance DB.

## Validations

```bash
npm test -- src/modules/paiements
npm run test:integration -- --runTestsByPath src/modules/paiements/__tests__/paiement.routes.test.ts
npm run test:integration -- --runTestsByPath tests/integration/j3-initiation-ngser.test.js
npm run build
```

Résultat:

- Tests unitaires paiement ciblés: PASS, 43 tests.
- Tests routes paiement ciblés: PASS, 3 tests.
- Tests intégration J3: PASS, 4 tests.
- Build backend: PASS.

## Hors périmètre J3

- Aucun appel réel à NGSER.
- Aucun traitement IPN/webhook NGSER.
- Aucune réconciliation scheduler.
- Aucun correctif Newman legacy.
