#!/bin/bash
# =============================================================
# deploy.sh — Déploiement FORGES multi-environnements
# Infra : OVH VPS + Plesk + Passenger (backend Node.js)
#         + Docker Compose (PostgreSQL 16 + Redis 7)
#
# Usage : ./infra/deploy.sh <dev|test|demo> [tag] [options]
#
# Options :
#   --fix-nginx    Fix Plesk/Nginx (proxy_pass Node.js)
#                  Utiliser après une mise à jour Plesk ou
#                  premier déploiement sur un nouveau VPS.
#
# Exemples :
#   ./infra/deploy.sh dev
#   ./infra/deploy.sh test v1.2.0
#   ./infra/deploy.sh demo v1.2.0 --fix-nginx
#
# Variables d'environnement :
#   Créer infra/.env.deploy (jamais versionné) avec :
#     FORGES_REPO_URL=https://github.com/votre-org/forges-backend.git
#   Ou exporter : export FORGES_REPO_URL=...
# =============================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

# Charger .env.deploy si présent
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$SCRIPT_DIR/.env.deploy" ]] && source "$SCRIPT_DIR/.env.deploy" && \
  echo -e "${BLUE}ℹ️  .env.deploy chargé${NC}"

# Repo Git — settable sans modifier ce script
REPO_URL="${FORGES_REPO_URL:-https://github.com/forges-group/forges-backend.git}"

# Paramètres
ENV="${1:-}"; TAG="${2:-}"; FIX_NGINX=false
for arg in "${@:3}"; do
  [[ "$arg" == "--fix-nginx" ]] && FIX_NGINX=true || \
    echo -e "${YELLOW}⚠️  Option inconnue ignorée : $arg${NC}"
done

# Validation
if [[ -z "$ENV" ]]; then
  echo -e "${RED}❌ Usage: $0 <dev|test|demo> [tag] [--fix-nginx]${NC}"; exit 1
fi
if [[ ! "$ENV" =~ ^(dev|test|demo)$ ]]; then
  echo -e "${RED}❌ Environnement invalide : dev | test | demo${NC}"; exit 1
fi

# ── Configuration par environnement ──────────────────────────
declare -A SERVER_HOST SERVER_USER DEPLOY_PATH TARGET_BRANCH \
            NODE_ENV_TARGET BACKEND_PORT FRONTEND_PORT PASSENGER_DIR

SERVER_HOST=(   [dev]="dev.forges-group.com"   [test]="test.forges-group.com"  [demo]="demo.forges-group.com" )
SERVER_USER=(   [dev]="plesk-ssh-user"          [test]="plesk-ssh-user"         [demo]="plesk-ssh-user" )
DEPLOY_PATH=(
  [dev]="/var/www/vhosts/forges-group.com/dev.forges-group.com/httpdocs"
  [test]="/var/www/vhosts/forges-group.com/test.forges-group.com/httpdocs"
  [demo]="/var/www/vhosts/forges-group.com/demo.forges-group.com/httpdocs"
)
TARGET_BRANCH=(   [dev]="develop"  [test]="test"  [demo]="main" )
NODE_ENV_TARGET=( [dev]="development"  [test]="test"  [demo]="production" )
BACKEND_PORT=(    [dev]="3000"  [test]="3001"  [demo]="3002" )
FRONTEND_PORT=(   [dev]="5173"  [test]="5175"  [demo]="5176" )  # demo=5176, pas 5174
PASSENGER_DIR=(
  [dev]="${DEPLOY_PATH[dev]}/tmp"
  [test]="${DEPLOY_PATH[test]}/tmp"
  [demo]="${DEPLOY_PATH[demo]}/tmp"
)

# ── Récapitulatif ─────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      FORGES — Déploiement sur : $ENV                  ${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  🌐 Serveur  : ${SERVER_HOST[$ENV]}"
echo -e "  📁 Chemin   : ${DEPLOY_PATH[$ENV]}"
echo -e "  🌿 Branche  : ${TARGET_BRANCH[$ENV]}"
echo -e "  📦 Repo     : $REPO_URL"
[[ -n "$TAG" ]] && echo -e "  🏷️  Tag      : $TAG"
$FIX_NGINX && echo -e "  🔧 Fix Nginx : ${YELLOW}ACTIVÉ${NC}" || echo -e "  🔧 Fix Nginx : désactivé"
echo ""

read -rp "$(echo -e "${YELLOW}⚠️  Confirmer le déploiement sur $ENV ? (oui/non) : ${NC}")" CONFIRM
[[ "$CONFIRM" != "oui" ]] && echo -e "${YELLOW}Déploiement annulé.${NC}" && exit 0

# ── Build local ───────────────────────────────────────────────
BUILD_DIR="/tmp/forges-build-$(date +%s)"
mkdir -p "$BUILD_DIR"; cd "$BUILD_DIR"
trap 'echo -e "${YELLOW}🧹 Nettoyage $BUILD_DIR${NC}"; rm -rf "$BUILD_DIR"' EXIT

echo -e "\n${GREEN}📥 Clonage du dépôt...${NC}"
if [[ -n "$TAG" ]]; then
  git clone --depth 50 "$REPO_URL" .
  git checkout "tags/$TAG" -b "deploy-$TAG"
  echo -e "  ✅ Tag $TAG extrait"
else
  git clone --depth 50 --branch "${TARGET_BRANCH[$ENV]}" "$REPO_URL" .
  echo -e "  ✅ Branche ${TARGET_BRANCH[$ENV]} extraite"
fi

echo -e "\n${GREEN}📦 Dépendances...${NC}"
npm ci --no-audit --no-fund && echo -e "  ✅ OK"

echo -e "\n${GREEN}⚙️  Prisma generate...${NC}"
npx prisma generate && echo -e "  ✅ OK"

echo -e "\n${GREEN}🧪 Tests unitaires (bloquants)...${NC}"
mkdir -p test-reports
if ! npm run test:coverage -- --json --outputFile=test-reports/results.json; then
  echo -e "${RED}❌ Tests échoués — déploiement annulé.${NC}"; exit 1
fi
echo -e "  ✅ Tous les tests passent"

echo -e "\n${GREEN}🔧 Build TypeScript...${NC}"
npm run build && echo -e "  ✅ OK"

# ── Transfert rsync ───────────────────────────────────────────
echo -e "\n${GREEN}📤 Transfert rsync vers ${SERVER_HOST[$ENV]}...${NC}"
rsync -avz --delete \
  --exclude='.env*' --exclude='node_modules/.cache' \
  --exclude='test-reports/' --exclude='*.test.js' --exclude='*.spec.js' \
  dist/ package.json package-lock.json prisma/ node_modules/ \
  "${SERVER_USER[$ENV]}@${SERVER_HOST[$ENV]}:${DEPLOY_PATH[$ENV]}/"
echo -e "  ✅ Fichiers transférés"

# ── Migrations Prisma (SSH) ───────────────────────────────────
echo -e "\n${GREEN}🔄 Migrations Prisma...${NC}"
ssh "${SERVER_USER[$ENV]}@${SERVER_HOST[$ENV]}" bash <<ENDSSH
  set -euo pipefail
  cd "${DEPLOY_PATH[$ENV]}"
  ENV_FILE=".env.${ENV}"
  [[ ! -f "\$ENV_FILE" ]] && echo "❌ \$ENV_FILE absent" && exit 1
  # grep -m1 "^VAR=" — sécurisé si la valeur contient des signes =
  DB_URL=\$(grep -m1 '^DATABASE_URL=' "\$ENV_FILE" | cut -d'=' -f2-)
  [[ -z "\$DB_URL" ]] && echo "❌ DATABASE_URL introuvable" && exit 1
  export DATABASE_URL="\$DB_URL"
  export NODE_ENV="${NODE_ENV_TARGET[$ENV]}"
  # Fix Docker Compose : résoudre une migration en échec avant deploy (Fix 2)
  FAILED_MIG=\$(npx prisma migrate status 2>/dev/null | grep 'failed' | awk '{print \$1}' | head -1)
  [[ -n "\$FAILED_MIG" ]] && npx prisma migrate resolve --rolled-back "\$FAILED_MIG" 2>/dev/null || true
  npx prisma migrate deploy
  echo "✅ Migrations OK"
ENDSSH

# ── Seed interactif ───────────────────────────────────────────
echo ""
echo -e "${YELLOW}┌────────────────────────────────────────────────────────┐${NC}"
echo -e "${YELLOW}│  🌱 Initialiser la base de données avec un seed ?      │${NC}"
echo -e "${YELLOW}└────────────────────────────────────────────────────────┘${NC}"
echo -e "  ${RED}⚠️  ATTENTION : le seed réinitialise les données existantes${NC}"
echo ""
echo -e "  ${GREEN}1${NC} — seed-dev.js           (données minimales développement)"
echo -e "  ${GREEN}2${NC} — seed-validation.js    (Plan Validation v1.1 — 72 tests)"
echo -e "  ${GREEN}3${NC} — seed-demo-pejedec.js  (50 bénéficiaires PEJEDEC — démo live)"
echo -e "  ${GREEN}n${NC} — Ne pas exécuter de seed"
echo ""
read -rp "👉 Choix [1/2/3/n] : " SEED_CHOICE

if [[ "$SEED_CHOICE" =~ ^[123]$ ]]; then
  declare -A SEED_FILES=([1]="seed-dev.js" [2]="seed-validation.js" [3]="seed-demo-pejedec.js")
  SEED_FILE="${SEED_FILES[$SEED_CHOICE]}"

  if [[ "$SEED_CHOICE" == "3" ]]; then
    echo ""
    echo -e "${YELLOW}⚠️  DÉMO PEJEDEC : BEN-01 Jean KOUASSI sera créé SANS dossier.${NC}"
    echo -e "${YELLOW}    Ne PAS créer son dossier avant la démonstration !${NC}"
    echo ""
  fi

  read -rp "$(echo -e "${YELLOW}⚠️  Confirmer seed '$SEED_FILE' sur $ENV ? (oui/non) : ${NC}")" SEED_CONFIRM
  if [[ "$SEED_CONFIRM" == "oui" ]]; then
    echo -e "\n${GREEN}🌱 Exécution de $SEED_FILE...${NC}"
    ssh "${SERVER_USER[$ENV]}@${SERVER_HOST[$ENV]}" bash <<ENDSSH
      set -euo pipefail
      cd "${DEPLOY_PATH[$ENV]}"
      DB_URL=\$(grep -m1 '^DATABASE_URL=' ".env.${ENV}" | cut -d'=' -f2-)
      export DATABASE_URL="\$DB_URL"
      export NODE_ENV="${NODE_ENV_TARGET[$ENV]}"
      [[ ! -f "prisma/$SEED_FILE" ]] && echo "❌ prisma/$SEED_FILE introuvable" && exit 0
      node "prisma/$SEED_FILE" --reset
      echo "✅ Seed $SEED_FILE OK"
ENDSSH
    echo -e "  ✅ Seed '$SEED_FILE' appliqué"
  else
    echo -e "  ⏭️  Seed annulé."
  fi
else
  echo -e "  ⏭️  Seed ignoré — base de données inchangée."
fi

# ── Fix Plesk/Nginx (optionnel — --fix-nginx) ─────────────────
if $FIX_NGINX; then
  BPORT="${BACKEND_PORT[$ENV]}"
  DOMAIN="${SERVER_HOST[$ENV]}"
  echo -e "\n${GREEN}🔧 Fix Plesk/Nginx (port backend : $BPORT)...${NC}"
  ssh "${SERVER_USER[$ENV]}@${SERVER_HOST[$ENV]}" bash <<ENDSSH
    set -euo pipefail
    NGINX_CONF="/etc/nginx/plesk.conf.d/vhosts/${DOMAIN}.conf"
    VHOST_NGINX="/var/www/vhosts/system/${DOMAIN}/conf/vhost_nginx.conf"
    [[ ! -f "\$NGINX_CONF" ]] && echo "❌ Nginx conf introuvable : \$NGINX_CONF" && exit 1
    # Sauvegarde horodatée
    cp "\$NGINX_CONF" "\${NGINX_CONF}.bak.\$(date +%Y%m%d%H%M%S)"
    echo "  ✅ Sauvegarde créée"
    # Remplacer proxy_pass Plesk (7081) → port Node.js
    sed -i "s|proxy_pass http://127.0.0.1:7081|proxy_pass http://127.0.0.1:${BPORT}|g" "\$NGINX_CONF"
    echo "  ✅ proxy_pass → port ${BPORT}"
    # Vider vhost_nginx.conf (obligatoire après toute modif Plesk)
    [[ -f "\$VHOST_NGINX" ]] && > "\$VHOST_NGINX" && echo "  ✅ vhost_nginx.conf vidé"
    # Rechargement Nginx
    nginx -t && nginx -s reload
    echo "  ✅ Nginx rechargé"
ENDSSH
  echo -e "  ✅ Fix Plesk/Nginx appliqué"
fi

# ── Redémarrage Passenger (Plesk) ────────────────────────────
echo -e "\n${GREEN}🔄 Redémarrage Passenger...${NC}"
ssh "${SERVER_USER[$ENV]}@${SERVER_HOST[$ENV]}" bash <<ENDSSH
  mkdir -p "${PASSENGER_DIR[$ENV]}"
  touch "${PASSENGER_DIR[$ENV]}/restart.txt"
  echo "✅ Passenger redémarré"
ENDSSH

# ── Services Docker Compose (PostgreSQL + Redis) ──────────────
echo -e "\n${GREEN}🐳 Services Docker Compose (PostgreSQL + Redis)...${NC}"
ssh "${SERVER_USER[$ENV]}@${SERVER_HOST[$ENV]}" bash <<ENDSSH
  set -euo pipefail
  cd "${DEPLOY_PATH[$ENV]}"
  if [[ -f "infra/docker-compose.yml" ]]; then
    RUNNING=\$(docker compose -f infra/docker-compose.yml ps --status running --quiet 2>/dev/null | wc -l)
    if [[ "\$RUNNING" -lt 2 ]]; then
      echo "  ⚠️  Containers non actifs — démarrage..."
      docker compose -f infra/docker-compose.yml up -d
    else
      echo "  ✅ \$RUNNING containers actifs"
    fi
  else
    echo "  ℹ️  Pas de docker-compose.yml — skip"
  fi
ENDSSH

# ── Healthcheck post-déploiement ──────────────────────────────
echo -e "\n${GREEN}🩺 Healthcheck...${NC}"
sleep 3
HEALTH_URL="https://${SERVER_HOST[$ENV]}/api/health"
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
  echo -e "  ✅ API répond (HTTP $HTTP_CODE)"
else
  echo -e "  ${YELLOW}⚠️  Healthcheck HTTP $HTTP_CODE — vérifier manuellement${NC}"
fi

# ── Résumé final ──────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Déploiement terminé — $ENV                        ${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  🌐 https://${SERVER_HOST[$ENV]}                      ${NC}"
echo -e "${GREEN}║  📋 Swagger : https://${SERVER_HOST[$ENV]}/api/docs    ${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
