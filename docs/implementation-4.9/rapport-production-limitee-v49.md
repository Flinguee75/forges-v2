# Rapport Production Limitée — FORGES v4.9

**Date:** 2026-05-01
**Branche:** `implementation-4.9`
**Commit SHA:** `51633bf`
**Environnement cible:** Production limitée interne
**Décision:** ⛔ NON DÉMARRÉE — dépend du gate J8 staging réel

---

## Objectif

Encadrer J9-J10: production limitée à l'équipe interne, 3 à 5 paiements contrôlés maximum, observation renforcée pendant 48h.

---

## Critères d'Entrée

| Critère | Statut |
|---|---|
| J8 staging public HTTPS accessible | ❌ Non validé |
| Initiation NGSER sandbox réelle OK | ❌ Non validé |
| Redirection checkout `securetest.crossroad-africa.net` OK | ❌ Non validé |
| IPN réel reçu sur `/webhooks/paiement` | ❌ Non validé |
| Paiement `CONFIRME` après IPN SUCCESS | ❌ Non validé |
| Dossier `PAYE` après IPN SUCCESS | ❌ Non validé |
| Rollback documenté | ✅ Oui |
| Tests locaux backend/frontend | ✅ PASS |
| Audit secrets source | ✅ PASS |

Décision: **production limitée bloquée** jusqu'au PASS complet du rapport staging.

---

## Plan d'Exécution Autorisé Après J8 PASS

1. Limiter le test à l'équipe interne autorisée.
2. Exécuter 3 à 5 paiements contrôlés maximum.
3. Utiliser des dossiers explicitement marqués test interne.
4. Observer les logs backend et les statuts DB en temps réel.
5. Documenter chaque paiement avec `order_ngser`, `paiement_id`, statut avant/après, IPN et décision.

---

## Journal Paiements Production Limitée

| # | `order_ngser` | `paiement_id` | Montant | Statut avant | Statut après | IPN | Décision |
|---:|---|---|---:|---|---|---|---|
| 1 | À compléter | À compléter | À compléter | À compléter | À compléter | À compléter | Non exécuté |
| 2 | À compléter | À compléter | À compléter | À compléter | À compléter | À compléter | Non exécuté |
| 3 | À compléter | À compléter | À compléter | À compléter | À compléter | À compléter | Non exécuté |
| 4 | Optionnel | Optionnel | Optionnel | Optionnel | Optionnel | Optionnel | Non exécuté |
| 5 | Optionnel | Optionnel | Optionnel | Optionnel | Optionnel | Optionnel | Non exécuté |

---

## Surveillance Obligatoire

| Signal | Seuil / Action |
|---|---|
| Paiements `PENDING` | Investigation si > seuil `NGSER_RECONCILIATION_PENDING_MINUTES` |
| `NGSER_HTTP_ERROR` | Bloquer nouveaux paiements si répétitif |
| `IPN_MONTANT_MISMATCH` | Rollback immédiat du gate |
| Doublons IPN | Vérifier idempotence et absence de double commission |
| Commissions créées | Vérifier partenaire/apporteur si applicable |
| Secrets en logs | Rollback immédiat et rotation tokens |

---

## Rollback Immédiat Si

- paiement débité sans `Paiement.CONFIRME`;
- dossier non `PAYE` après IPN `SUCCESS`;
- double commission partenaire/apporteur;
- secret visible dans logs, API, HTML ou artefact;
- erreurs NGSER répétées non expliquées;
- réconciliation réelle impossible sur paiements `PENDING`.

---

## Décision

**J9-J10 Production limitée: ⛔ NON AUTORISÉE À CE STADE**

Motif: le gate J8 staging réel n'est pas PASS. Les validations locales sont vertes, mais elles ne remplacent pas la preuve d'un paiement sandbox réel avec IPN entrant public.
