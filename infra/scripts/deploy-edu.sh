#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

source "${SCRIPT_DIR}/deploy-common.sh"

deploy_environment \
  "edu" \
  "${PROJECT_ROOT}/infra/docker/docker-compose.edu.deploy.yml" \
  "${PROJECT_ROOT}/infra/env/.env.edu.deploy" \
  "https://edu.forges-group.com" \
  "3006" \
  "forges-backend-edu"
