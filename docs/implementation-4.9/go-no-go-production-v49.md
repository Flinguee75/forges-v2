# Rapport J7/J8 — Go/No-Go production v4.9

**Date:** 2026-05-01
**Branche:** `implementation-4.9`
**Décision:** GO STAGING UNIQUEMENT

---

## Synthèse

La v4.9 est techniquement stable en local, mais la production limitée reste conditionnée au gate staging NGSER réel.

Ce rapport remplace l'ancien état intermédiaire où les tests IPN échouaient sur des contraintes FK. Les fixtures de test ont été stabilisées et les suites critiques repassent.

---

## Validations locales

| Contrôle | Résultat |
|---|---|
| Backend `npm test` | PASS — 61 suites, 478 tests |
| IPN NGSER `ipn-ngser.service.test.ts` | PASS — 9/9 |
| IPN + RM-162 credentials | PASS — 25/25 |
| Build backend | PASS |
| Prisma migrate status | Up to date |
| Frontend tests | PASS — 80 fichiers, 304 tests |
| Frontend build | PASS |

---

## Correction IPN

Le problème FK était causé par des tests IPN non isolés qui créaient des `Dossier` avec des références parentes absentes.

État corrigé:
- fixtures minimales créées en `beforeAll`: apprenant, partenaire, formation, session;
- cleanup dans le bon ordre: commissions avant paiements, paiements avant dossiers;
- tests SUCCESS compatibles avec la création de `CommissionPartenaire`.

---

## Gate staging NGSER réel

| Critère | Statut |
|---|---|
| Config staging locale préparée | PASS |
| Secrets non commités | PASS |
| Docker staging lancé | NON EXÉCUTÉ |
| DNS `staging.forges-group.com` disponible | NON VALIDÉ |
| Paiement sandbox NGSER réel initié depuis staging | NON VALIDÉ |
| Redirection checkout NGSER staging | NON VALIDÉ |
| IPN réel reçu sur `/webhooks/paiement` | NON VALIDÉ |
| Paiement `CONFIRME` + dossier `PAYE` après IPN réel | NON VALIDÉ |

---

## Décision

**GO STAGING UNIQUEMENT.**

La production limitée J9-J10 est autorisée uniquement après un PASS complet du gate J8:
- staging public HTTPS accessible;
- paiement sandbox réel à 200 XOF initié depuis staging;
- redirection checkout confirmée;
- IPN réel reçu et traité;
- DB après IPN: `Paiement.CONFIRME`, `Dossier.PAYE`, `transaction_id` rempli, `status_ngser=SUCCESS`;
- aucun secret exposé.

---

## Prochaine action

Déployer depuis `develop` vers staging public, puis exécuter le gate J8 documenté dans `rapport-staging-ngser-reel-v49.md`.
