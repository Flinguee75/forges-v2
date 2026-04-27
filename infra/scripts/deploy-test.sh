#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

source "${SCRIPT_DIR}/deploy-common.sh"

deploy_environment \
  "test" \
  "${PROJECT_ROOT}/infra/docker/docker-compose.test.deploy.yml" \
  "${PROJECT_ROOT}/infra/env/.env.test.deploy" \
  "https://test.forges-group.com" \
  "3002" \
  "forges-backend-test"
