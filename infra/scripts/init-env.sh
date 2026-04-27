#!/usr/bin/env bash
# =============================================================
# init-env.sh — Pose les fichiers .env sur le VPS (une seule fois)
# Usage : bash infra/scripts/init-env.sh
#
# Prérequis :
#   - Avoir rempli infra/env/.env.dev.deploy, .env.test.deploy, .env.demo.deploy
#   - Avoir accès SSH au VPS avec id_ed25519_forges_v2
# =============================================================
set -euo pipefail

SSH_KEY="$HOME/.ssh/id_ed25519_forges_v2"
USER="forgesadmin"
ENV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../env" && pwd)"

declare -A HOSTS=(
  [dev]="dev.forges-group.com"
  [test]="test.forges-group.com"
  [demo]="demo.forges-group.com"
)

declare -A PATHS=(
  [dev]="/var/www/vhosts/dev.forges-group.com/httpdocs"
  [test]="/var/www/vhosts/test.forges-group.com/httpdocs"
  [demo]="/var/www/vhosts/demo.forges-group.com/httpdocs"
)

for ENV in dev test demo; do
  ENV_FILE="${ENV_DIR}/.env.${ENV}.deploy"
  HOST="${HOSTS[$ENV]}"
  DEPLOY_PATH="${PATHS[$ENV]}"

  if [ ! -f "$ENV_FILE" ]; then
    echo "SKIP $ENV — fichier $ENV_FILE introuvable"
    continue
  fi

  echo "=== Déploiement .env sur $ENV ($HOST) ==="
  scp -i "$SSH_KEY" "$ENV_FILE" "${USER}@${HOST}:${DEPLOY_PATH}/.env"
  echo "  .env posé dans $DEPLOY_PATH"

  ssh -i "$SSH_KEY" "${USER}@${HOST}" bash << ENDSSH
    set -euo pipefail
    INFRA_DIR="${DEPLOY_PATH}/infra/docker"
    mkdir -p "\$INFRA_DIR"
    echo "  Dossier infra/docker prêt"
ENDSSH

  echo "  OK"
done

echo ""
echo "Initialisation terminée. Lance maintenant le docker compose manuellement ou via le pipeline CI/CD."
