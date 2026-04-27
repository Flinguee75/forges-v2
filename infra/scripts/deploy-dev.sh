#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

source "${SCRIPT_DIR}/deploy-common.sh"

deploy_environment \
  "dev" \
  "${PROJECT_ROOT}/infra/docker/docker-compose.dev.deploy.yml" \
  "${PROJECT_ROOT}/infra/env/.env.dev.deploy" \
  "https://dev.forges-group.com" \
  "3001" \
  "forges-backend-dev"
