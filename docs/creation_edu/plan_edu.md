# Plan — Environnement `edu` indépendant de `dev`

## Contexte

Actuellement, `edu.forges-group.com` est un simple alias DNS/nginx qui pointe vers le
même container Docker (`forges-backend-dev`, port 3001), la même DB et le même `.env`
que `dev`. Le workflow GitHub Actions `deploy-edu.yml` se déclenche après le succès de
`deploy-dev` et ne déploie que le frontend (sans rebuilder l'image backend).

Problème : toute modification sur dev est immédiatement visible sur edu, les envs
partagent les mêmes secrets, la même base de données et il n'y a aucun monitoring dédié.

Objectif : rendre `edu` totalement autonome, avec ses propres containers, DB, Redis,
secrets, image backend, pipeline CI/CD et stack de monitoring (Grafana, Loki, Promtail,
Uptime Kuma).

---

## Allocation des ports (edu) — vérifié sur VPS

Ports confirmés en écoute sur le VPS :
- 3001 dev backend, 3004 dev uptime-kuma, 3005 demo uptime-kuma
- 3050 demo grafana, 3051 dev grafana, 3100 demo loki, 3101 dev loki

| Service          | Port hôte | Port container | Statut   |
|------------------|-----------|----------------|----------|
| backend-edu      | **3006**  | 3006           | Libre    |
| uptime-kuma-edu  | **3007**  | 3001           | Libre    |
| grafana-edu      | **3052**  | 3000           | Libre    |
| loki-edu         | **3102**  | 3100           | Libre    |

## État constaté sur le VPS

- Vhosts Plesk existants : `dev.forges-group.com`, `demo.forges-group.com`, `test.forges-group.com`
- Vhost `edu.forges-group.com` : **n'existe pas** — à créer
- `infra/env/` sur le VPS : vide — les .env vivent dans les httpdocs Plesk
- Env backend lu depuis : `/var/www/vhosts/[env].forges-group.com/httpdocs/.env`
- GitHub repo : `Flinguee75/forges-v2`
- Secrets GitHub existants : SSH_PRIVATE_KEY, SSH_KNOWN_HOSTS, GHCR_TOKEN, DEV_*, tous repo-level

---

## Fichiers à créer (9 nouveaux)

1. `infra/docker/docker-compose.edu.deploy.yml`
2. `infra/env/.env.edu.deploy`
3. `infra/scripts/deploy-edu.sh`
4. `forges-monorepo/infra/monitoring/docker-compose.monitoring.edu.yml`
5. `forges-monorepo/infra/monitoring/.env.monitoring.edu`
6. `forges-monorepo/infra/monitoring/grafana/dashboards/forges-edu.json`
7. `forges-monorepo/infra/monitoring/deploy-monitoring-edu.sh`
8. `forges-monorepo/infra/monitoring/monitoring-edu.sh`
9. `infra/nginx/edu.vhost_nginx.conf` (directives nginx Plesk pour edu, port 3006)

## Fichiers à modifier (3 modifiés)

9.  `.github/workflows/deploy-edu.yml` — réécriture complète
10. `forges-monorepo/infra/monitoring/promtail-config.yml` — ajout job forges-edu
11. `VPS-CONNEXION.md` — documentation edu

---

## Détail des fichiers

### 1. `infra/docker/docker-compose.edu.deploy.yml`

Copie de `docker-compose.dev.deploy.yml` avec :
- `name: forges-edu`
- Containers : `forges-postgres-edu`, `forges-redis-edu`, `forges-backend-edu`
- Image : `${BACKEND_IMAGE}:edu-${IMAGE_TAG}`
- Labels : `environment: edu`, `com.docker.compose.project: forges-edu`
- env_file : `/var/www/vhosts/edu.forges-group.com/httpdocs/.env`
- DATABASE_URL pointer vers `forges_edu`
- Port : `${BACKEND_PORT}:${BACKEND_INTERNAL_PORT}` → 3005:3005
- Network : `forges-edu`
- Volumes : `forges-postgres-edu`, `forges-redis-edu`

### 2. `infra/env/.env.edu.deploy`

Copie de `.env.dev.deploy` avec ces différences :
```
APP_ENV=edu
PORT=3005
POSTGRES_DB=forges_edu
POSTGRES_USER=forges_edu
POSTGRES_PASSWORD=<nouveau_secret>      # openssl rand -base64 32
REDIS_PASSWORD=RedisEduForges2026!      # ou openssl rand -hex 16
DATABASE_URL=postgresql://forges_edu:<encoded_pass>@postgres:5432/forges_edu
REDIS_URL=redis://:RedisEduForges2026!@localhost:6379
JWT_SECRET=<nouveau_64_hex>             # openssl rand -hex 64
JWT_REFRESH_SECRET=<nouveau_64_hex>
ENCRYPTION_KEY=<nouveau_base64_32>      # openssl rand -base64 32
HMAC_KEY=<nouveau_64_hex>
FRONTEND_URL=https://edu.forges-group.com
API_URL=https://edu.forges-group.com/api
CORS_ORIGINS=https://edu.forges-group.com
NGSER_NOTIFICATION_URL=https://edu.forges-group.com/api/webhooks/paiement
NGSER_RETURN_URL=https://edu.forges-group.com/api/paiements/retour
FINEO_CALLBACK_URL=https://edu.forges-group.com/api/webhooks/fineo
BACKEND_IMAGE=ghcr.io/flinguee75/forges-backend
IMAGE_TAG=edu
BACKEND_PORT=3005
BACKEND_INTERNAL_PORT=3005
```

### 3. `infra/scripts/deploy-edu.sh`

Copie de `deploy-dev.sh` :
```bash
deploy_environment \
  "edu" \
  "${PROJECT_ROOT}/infra/docker/docker-compose.edu.deploy.yml" \
  "${PROJECT_ROOT}/infra/env/.env.edu.deploy" \
  "https://edu.forges-group.com" \
  "3005" \
  "forges-backend-edu"
```

### 4. `forges-monorepo/infra/monitoring/docker-compose.monitoring.edu.yml`

Copie de `docker-compose.monitoring.dev.yml` avec :
- `name: forges-monitoring-edu`
- Loki : port `3102:3100`, container `forges-loki-edu`, volume `forges-loki-edu`
- Grafana : port `3052:3000`, container `forges-grafana-edu`, volume `forges-grafana-edu`
  - Dashboard home : `forges-edu.json`
  - GRAFANA_ROOT_URL : `${GRAFANA_ROOT_URL:-http://localhost:3052}`
- Uptime Kuma : port `3007:3001`, container `forges-uptime-edu`, volume `forges-uptime-edu`
- Checker : `FORGES_BASE_URL: http://forges-backend-edu:3005`, `FORGES_ENVIRONMENT: edu`
- Networks : `forges-monitoring-edu` (bridge) + `forges-edu` (external)
- env_file : `.env.monitoring.edu`

### 5. `forges-monorepo/infra/monitoring/.env.monitoring.edu`

```
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=forges2026!
GRAFANA_ROOT_URL=http://localhost:3052
ALERT_EMAIL_RECIPIENTS=TidianeCisse9@outlook.fr
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=contact@forges-group.com
SMTP_PASS=@Forges2026!@2
```

### 6. `forges-monorepo/infra/monitoring/grafana/dashboards/forges-edu.json`

Copie de `forges-dev.json` avec remplacement global de `"dev"` → `"edu"` dans les
requêtes Loki (labels `environment="edu"`, `job="forges-edu"`).

### 7. `forges-monorepo/infra/monitoring/deploy-monitoring-edu.sh`

Copie de `deploy-monitoring-dev.sh` avec :
- Référence `docker-compose.monitoring.edu.yml` à la place de dev
- Référence `.env.monitoring.edu`
- Dashboard `forges-edu.json`
- Script `monitoring-edu.sh`

### 8. `forges-monorepo/infra/monitoring/monitoring-edu.sh`

Copie de `monitoring-dev.sh` avec les références edu (compose file, env file).

---

### 9. `.github/workflows/deploy-edu.yml` — Réécriture complète

**Stratégie retenue :** edu se déclenche via `workflow_run` après le succès de deploy-dev.
Pas de build backend séparé — edu réutilise l'image `dev-$SHA` déjà poussée par dev.
Seul le frontend est rebuildé (nécessaire car `VITE_API_URL` doit pointer vers edu, pas dev).

**Concurrency :** `forges-edu-deploy` (séparé de `forges-server-deploy` : edu tourne
après dev, donc pas de race Docker possible).

```yaml
on:
  workflow_run:
    workflows: ['Deploy → https://dev.forges-group.com']
    types: [completed]
    branches: [develop]
  workflow_dispatch:

concurrency:
  group: forges-edu-deploy
  cancel-in-progress: false

jobs:
  build-frontend:    # Build Vite avec VITE_API_URL=https://edu.forges-group.com/api
                     # VITE_ENV: edu
  deploy:
    environment:
      name: edu      # Environnement GitHub Actions dédié (à créer sur GitHub)
      url: https://edu.forges-group.com
    # 1. rsync frontend → /var/www/vhosts/edu.forges-group.com/httpdocs/
    # 2. rsync docker-compose.edu.deploy.yml → VPS
    # 3. Sur VPS : docker pull ghcr.io/flinguee75/forges-backend:dev-$SHA
    #              re-tag en edu-$SHA (optionnel, simplement utiliser l'image dev)
    #    docker compose -f docker-compose.edu.deploy.yml --env-file infra/env/.env.edu.deploy up -d
    # 4. prisma db push sur forges-backend-edu
    # 5. healthcheck https://edu.forges-group.com/health
```

Note : `docker-compose.edu.deploy.yml` utilise l'image `${BACKEND_IMAGE}:dev-${IMAGE_TAG}`
(même image que dev, mais dans un container séparé avec son propre .env).

**Secrets GitHub à ajouter** (même VPS, paths différents) :
- `EDU_FRONTEND_DEPLOY_PATH` = `/var/www/vhosts/edu.forges-group.com/httpdocs`
- Réutiliser : `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`, `DEV_SERVER_USER`, `DEV_SERVER_HOST`,
  `DEV_DEPLOY_PATH`, `GHCR_TOKEN`

### 10. `promtail-config.yml` — Ajout job forges-edu

```yaml
- job_name: forges-edu
  docker_sd_configs:
    - host: unix:///var/run/docker.sock
      refresh_interval: 5s
  relabel_configs:
    - source_labels: ['__meta_docker_container_label_com_docker_compose_project']
      regex: 'forges-edu'
      action: keep
    - source_labels: ['__meta_docker_container_name']
      target_label: container
    - source_labels: ['__meta_docker_container_label_com_docker_compose_service']
      target_label: service
    - source_labels: ['__meta_docker_container_label_com_docker_compose_service']
      target_label: service_name
    - target_label: environment
      replacement: edu
    - target_label: job
      replacement: forges-edu
    - target_label: __path__
      replacement: /var/lib/docker/containers/*/*.log
  pipeline_stages:
    - json:
        expressions:
          level: level
    - labels:
        level:
```

### 11. `VPS-CONNEXION.md` — Ajout entrée edu

Ajouter dans le tableau des containers :
```
| `forges-backend-edu` | edu | 3005 | https://edu.forges-group.com |
| `forges-postgres-edu` | edu | — | interne Docker |
```

Et une section dédiée pour les commandes edu (psql, logs, redémarrage).

---

## État nginx actuel (critique)

`edu.forges-group.com` est actuellement configuré comme une **simple redirection** vers
`dev.forges-group.com` à l'intérieur de la conf nginx auto-générée de dev.
Il n'existe pas de vrai vhost Plesk pour edu.

Les directives custom de dev (proxy `/api/` et `/health`) sont dans :
```
/var/www/vhosts/system/dev.forges-group.com/conf/vhost_nginx.conf  → port 3001
```
Ce fichier est le seul qu'on peut modifier sans que Plesk l'écrase.

Pour edu, il faudra :
1. Créer un vrai site Plesk `edu.forges-group.com` (via web UI ou CLI)
2. Placer les directives proxy dans :
   ```
   /var/www/vhosts/system/edu.forges-group.com/conf/vhost_nginx.conf  → port 3006
   ```

Contenu du fichier vhost_nginx.conf pour edu :
```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3006/api/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

location = /health {
  proxy_pass http://127.0.0.1:3006/health;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Actions exécutées dans l'implémentation

### Étape 1 — Fichiers locaux (via Write/Edit)
Créer tous les fichiers : docker-compose, env, scripts, monitoring, workflow CI/CD.

### Étape 2 — GitHub secret (via gh CLI) — 1 seul nouveau secret

Les secrets SSH, GHCR, DEV_SERVER_*, DEV_DEPLOY_PATH sont réutilisés.
Le nouveau workflow edu référencera `secrets.DEV_SERVER_HOST`, `secrets.DEV_SERVER_USER`, etc.
Seul le path frontend change :

```bash
gh secret set EDU_FRONTEND_DEPLOY_PATH \
  --body "/var/www/vhosts/edu.forges-group.com/httpdocs" \
  --repo Flinguee75/forges-v2
```

Problème identifié dans l'ancien deploy-edu.yml : il utilisait `DEV_FRONTEND_DEPLOY_PATH`,
ce qui déployait edu dans le même httpdocs que dev. Corrigé dans la réécriture.

### Étape 3 — Vhost Plesk VPS (via SSH)
```bash
# Tenter Plesk CLI
ssh -i ~/.ssh/id_ed25519_forges forgesadmin@92.205.164.97 \
  "plesk bin site --create edu.forges-group.com -webspace-name forgesadmin \
   -www-root /var/www/vhosts/edu.forges-group.com/httpdocs 2>&1 || echo PLESK_CLI_FAIL"
```
Si Plesk CLI indisponible :
- Créer le vhost via l'interface Plesk web (https://92.205.164.97:8443)
- Activer SSL Let's Encrypt depuis Plesk
- La création du vhost génère automatiquement `/var/www/vhosts/system/edu.forges-group.com/`

### Étape 4 — Nginx directives edu (via SSH/scp)
```bash
# Créer le répertoire conf si nécessaire
ssh -i ~/.ssh/id_ed25519_forges forgesadmin@92.205.164.97 \
  "sudo mkdir -p /var/www/vhosts/system/edu.forges-group.com/conf/"

# Envoyer le fichier vhost_nginx.conf pour edu
scp -i ~/.ssh/id_ed25519_forges infra/nginx/edu.vhost_nginx.conf \
  forgesadmin@92.205.164.97:/tmp/edu.vhost_nginx.conf

ssh -i ~/.ssh/id_ed25519_forges forgesadmin@92.205.164.97 \
  "sudo cp /tmp/edu.vhost_nginx.conf \
   /var/www/vhosts/system/edu.forges-group.com/conf/vhost_nginx.conf \
   && plesk bin nginx --restart 2>/dev/null || sudo nginx -s reload"
```

### Étape 5 — .env edu sur VPS (via scp)
```bash
scp -i ~/.ssh/id_ed25519_forges infra/env/.env.edu.deploy \
  forgesadmin@92.205.164.97:/var/www/vhosts/edu.forges-group.com/httpdocs/.env
```

### Étape 6 — Commit + push → CI/CD
Push sur `develop` → deploy-dev se lance → deploy-edu se lance automatiquement après.

### Étape 7 — Monitoring edu (via script local)
```bash
./forges-monorepo/infra/monitoring/deploy-monitoring-edu.sh
```

## Génération des secrets

Avant de créer `.env.edu.deploy`, générer des valeurs fraîches :
```bash
openssl rand -hex 64   # JWT_SECRET, JWT_REFRESH_SECRET, HMAC_KEY
openssl rand -base64 32 # ENCRYPTION_KEY
openssl rand -base64 24 # POSTGRES_PASSWORD (URL-encodé dans DATABASE_URL)
```
Ces valeurs sont insérées dans `.env.edu.deploy` et **ne sont pas commitées** (.gitignore).

---

## Vérification end-to-end

```bash
# 1. Health backend
curl -i https://edu.forges-group.com/api/health

# 2. Health frontend
curl -i https://edu.forges-group.com/health

# 3. Login edu (DB indépendante — nécessite seed edu ou reset)
curl -X POST https://edu.forges-group.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@forges-test.ci","password":"Test@FORGES2026!"}'

# 4. Monitoring
ssh -i ~/.ssh/id_ed25519_forges \
  -L 3052:localhost:3052 \
  -L 3007:localhost:3007 \
  forgesadmin@92.205.164.97
# Grafana edu : http://localhost:3052
# Uptime Kuma edu : http://localhost:3007

# 5. Vérifier isolation : une modif sur dev ne doit pas affecter edu
docker exec forges-backend-edu sh -c 'echo $APP_ENV'  # → "edu"
docker exec forges-backend-dev sh -c 'echo $APP_ENV'  # → "dev"
```
