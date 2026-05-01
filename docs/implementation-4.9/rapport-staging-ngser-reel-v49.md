# Rapport Staging NGSER Réel — FORGES v4.9

**Date:** 2026-05-01
**Branche:** `implementation-4.9`
**Commit SHA:** `51633bf`
**Environnement cible:** Staging public HTTPS
**URL cible:** `https://staging.forges-group.com`
**Décision:** ❌ FAIL temporaire — environnement staging non disponible

---

## Objectif

Valider le gate J8 avec l'API NGSER sandbox réelle, en désactivant le mode mock et en recevant un IPN réel sur `https://staging.forges-group.com/webhooks/paiement`.

---

## Configuration Préparée

| Paramètre | Statut |
|---|---|
| `forges-monorepo/infra/.env.staging` | ✅ Créé localement, non commité |
| Source tokens | ✅ `forges-monorepo/backend/.env` |
| `NGSER_MOCK_MODE` | ✅ `false` |
| `NGSER_BASE_URL` | ✅ `https://securetest.crossroad-africa.net/` |
| `NGSER_NAME` | ✅ `FORGES TEST` |
| Tokens NGSER sandbox | ✅ Présents, masqués |
| `NGSER_NOTIFICATION_URL` | ✅ `https://staging.forges-group.com/webhooks/paiement` |
| `VITE_API_URL` | ✅ `https://staging.forges-group.com/api` |
| `FRONTEND_URL` | ✅ `https://staging.forges-group.com` |
| `CORS_ORIGINS` | ✅ `https://staging.forges-group.com` |

Preuve sécurité: `forges-monorepo/infra/.env.staging` est ignoré par Git via `.gitignore`.

---

## Préflight Local

| Contrôle | Commande | Résultat |
|---|---|---|
| Tests backend | `npm test` | ✅ 61 suites, 478 tests PASS |
| Build backend | `npm run build` | ✅ PASS |
| Prisma migrations | `npx prisma migrate status` | ✅ Database schema up to date |
| Tests frontend | `npm test -- --run` | ✅ 80 fichiers, 304 tests PASS |
| Build frontend | `npm run build` | ✅ PASS |
| Audit tokens source | `grep -R "NGSER_AUTH_TOKEN=" forges-monorepo/backend/src` | ✅ Aucun résultat |
| Audit operation token source | `grep -R "NGSER_OPERATION_TOKEN_PAIEMENT=" forges-monorepo/backend/src` | ✅ Aucun résultat |

---

## Déploiement Staging

Commande prévue:

```bash
cd forges-monorepo
docker compose --env-file infra/.env.staging -f infra/docker-compose.staging.yml up -d --build
```

Résultat:

```text
FAIL: impossible de se connecter au Docker daemon local.
Socket attendu: /Users/tidianecisse/.docker/run/docker.sock
```

Statut: ❌ Non exécuté.

---

## Santé Staging Public

Commandes prévues:

```bash
curl -i https://staging.forges-group.com/health
curl -i https://staging.forges-group.com/api/formations
```

Résultat:

```text
FAIL: Could not resolve host: staging.forges-group.com
```

Statut: ❌ DNS public non disponible.

---

## Paiement Sandbox Réel

| Preuve | Valeur |
|---|---|
| `order_ngser` | Non généré sur staging |
| `paiement_id` | Non généré sur staging |
| Statut DB avant | Non testé |
| Statut DB après | Non testé |
| Montant attendu | 200 XOF |
| `payment_url` NGSER réelle | Non obtenue sur staging |
| Preuve redirection checkout | Non disponible |
| Preuve IPN | Non disponible |
| Logs audit masqués | Non disponibles staging |

Statut: ❌ Non validé, car le staging public n'est pas accessible.

---

## Critères Gate J8

| Critère | Statut |
|---|---|
| Staging public HTTPS accessible | ❌ FAIL |
| Initiation NGSER réelle OK | ❌ Non exécuté |
| Redirection checkout OK | ❌ Non exécuté |
| IPN réel reçu et traité | ❌ Non exécuté |
| Aucun secret exposé | ✅ Préflight local OK |
| Rapport staging créé | ✅ Oui |

---

## Décision

**J8 Préflight local: ✅ PASS**

**J8 Gate staging réel: ❌ FAIL temporaire / BLOQUÉ ENV**

La production limitée J9-J10 ne doit pas démarrer tant que:
- Docker staging n'a pas démarré;
- `staging.forges-group.com` ne résout pas publiquement;
- un paiement sandbox NGSER réel à 200 XOF n'a pas été confirmé;
- l'IPN réel n'a pas confirmé `Paiement.CONFIRME` et `Dossier.PAYE`.

---

## Actions Requises

1. Démarrer Docker Desktop ou exécuter le compose sur le serveur staging.
2. Configurer DNS public `staging.forges-group.com`.
3. Relancer le déploiement staging avec `infra/.env.staging`.
4. Créer ou réutiliser un dossier payable `RETENU` à 200 XOF.
5. Initier le paiement depuis l'API staging.
6. Finaliser le paiement sandbox sur NGSER.
7. Vérifier DB, IPN, logs masqués et commissions.
