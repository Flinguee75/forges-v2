#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

source "${SCRIPT_DIR}/deploy-common.sh"

deploy_environment \
  "demo" \
  "${PROJECT_ROOT}/infra/docker/docker-compose.demo.deploy.yml" \
  "${PROJECT_ROOT}/infra/env/.env.demo.deploy" \
  "https://demo.forges-group.com" \
  "3003" \
  "forges-backend-demo"
