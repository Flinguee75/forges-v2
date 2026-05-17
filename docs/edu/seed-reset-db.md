# Seed et reset de la DB edu

Ce guide explique comment initialiser ou remettre à zéro la base de données edu.

## Journal d'exécution réel

Ce document reflète aussi le run réel effectué sur le VPS `edu` le 2026-05-11.

### Ce qui a été vérifié

- le backend `edu` tourne dans le conteneur Docker `forges-backend-edu`
- la base PostgreSQL `edu` est portée par `forges-postgres-edu`
- le bon fichier d'environnement n'est pas le `.env` local du repo, mais `/var/www/vhosts/edu.forges-group.com/httpdocs/.env`
- ce fichier contient bien les valeurs `edu` attendues:
  - `APP_ENV=edu`
  - `DATABASE_URL=postgresql://forges_edu:...@postgres:5432/forges_edu`
  - `FRONTEND_URL=https://edu.forges-group.com`
  - `SMTP_HOST=smtp.office365.com`
  - `SMTP_USER=contact@forges-group.com`
  - `SMTP_PASS=...`

### Problème rencontré puis corrigé

- un `source` brut du fichier `.env` VPS échouait à cause d'une ligne non exécutable
- la solution retenue a été de ne charger que les lignes `KEY=VALUE` valides
- le seed a ensuite été lancé avec:
  - `DATABASE_URL` construit sur l'IP du conteneur `forges-postgres-edu`
  - `FRONTEND_URL=https://edu.forges-group.com`

### Seed `Point Focal`

Le script `scripts/admin/script_organisations_point_focal.ts` a été testé sur le VPS avec:

- organisation:
  - `Point Focal`
  - email référent: `redfoo923@gmail.com`
- apprenant:
  - `TidianeCisse9@outlook.fr`

Résultat du run réel:

- organisation créée
- apprenant créé
- voucher organisation créé
- devis créé et envoyé
- email de mot de passe temporaire envoyé à l'organisation
- email de mot de passe temporaire envoyé à l'apprenant

Le log de seed a été enregistré dans:

- `/home/forgesadmin/forges-v2/forges-monorepo/backend/scripts/admin/enrolement_organisations_log.json`

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

Version exacte utilisée pendant le run réel:

```bash
while IFS= read -r line; do export "$line"; done < <(grep -E '^[A-Z0-9_]+=' /var/www/vhosts/edu.forges-group.com/httpdocs/.env)
PG_IP=$(docker inspect forges-postgres-edu --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' | head -1)
PG_PASS=$(docker exec forges-postgres-edu printenv POSTGRES_PASSWORD)
PG_PASS_ENC=$(printf "%s" "$PG_PASS" | python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.stdin.read().strip(), safe=\"\"))")
cd ~/forges-v2/forges-monorepo/backend
DATABASE_URL="postgresql://forges_edu:${PG_PASS_ENC}@${PG_IP}:5432/forges_edu" \
  FRONTEND_URL=https://edu.forges-group.com \
  node -r ts-node/register/transpile-only scripts/admin/script_organisations_point_focal.ts
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

---

## Notes utiles

- le reset `edu` doit toujours être lancé depuis le VPS, jamais depuis la machine locale
- le seed `Point Focal` doit pointer vers `edu` en frontend, sinon les liens d'email retombent sur le mauvais contexte
- les erreurs SMTP `535` observées auparavant venaient d'un mauvais environnement chargé, pas du workflow métier lui-même
- la DB locale et la DB `edu` sont distinctes; ne pas confondre les deux lors des tests
