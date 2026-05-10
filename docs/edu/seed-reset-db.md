# Seed et reset de la DB edu

Ce guide explique comment initialiser ou remettre à zéro la base de données edu.

---

## Quand en avoir besoin

- Premier déploiement de l'env edu (DB vide, auth impossible)
- Remise à zéro complète pour tests
- Recréation du compte admin après corruption

---

## Ce que le script fait

1. Vide toutes les tables métier (ordre FK respecté)
2. Crée le compte admin `admin@forges-group.com`
3. Crée la formation Masterclass GWU/CCDL et sa session juin 2026

---

## Commande

Depuis le VPS (SSH) :

```bash
ssh -i ~/.ssh/id_ed25519_forges forgesadmin@92.205.164.97
```

Une fois connecté :

```bash
# Récupérer l'IP du container postgres-edu
PG_IP=$(docker inspect forges-postgres-edu --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' | head -1)

# Récupérer le mot de passe postgres
PG_PASS=$(docker exec forges-postgres-edu printenv POSTGRES_PASSWORD)
PG_PASS_ENC=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$PG_PASS', safe=''))")

# Lancer le seed
cd ~/forges-v2/forges-monorepo/backend
DATABASE_URL="postgresql://forges_edu:${PG_PASS_ENC}@${PG_IP}:5432/forges_edu" \
  node -r ts-node/register/transpile-only scripts/admin/reset-edu.ts
```

---

## Résultat attendu

```
=== RESET DB EDU ===

[reset] Suppression des données métier...
  -> Vidé: CommissionApporteur
  ...

[admin] Création du compte admin...
  -> Admin créé: admin@forges-group.com (usr-admin-forges-edu-0000000001)

[formation] Création Masterclass GWU/CCDL...
  -> Formation: Masterclass GWU/CCDL — Cybersécurité & IA
  -> Session: 01/06/2026 — 11/06/2026

=== Résumé ===
Admin email    : admin@forges-group.com
Admin password : Admin@FORGES2026!
```

---

## Comptes créés

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| ADMIN | admin@forges-group.com | Admin@FORGES2026! |

---

## Dry-run (vérification sans écriture)

```bash
DATABASE_URL="..." \
  node -r ts-node/register/transpile-only scripts/admin/reset-edu.ts --dry-run
```

---

## Équivalent pour dev

Le même pattern avec le script dev :

```bash
PG_IP=$(docker inspect forges-postgres-dev --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' | head -1)
PG_PASS=$(docker exec forges-postgres-dev printenv POSTGRES_PASSWORD)
PG_PASS_ENC=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$PG_PASS', safe=''))")

cd ~/forges-v2/forges-monorepo/backend
DATABASE_URL="postgresql://forges_dev:${PG_PASS_ENC}@${PG_IP}:5432/forges_dev" \
  node -r ts-node/register/transpile-only scripts/admin/reset-dev.ts
```
