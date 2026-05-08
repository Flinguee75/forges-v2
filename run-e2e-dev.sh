#!/usr/bin/env bash
# Lance Newman + Playwright contre dev.forges-group.com
# Usage:
#   ./run-e2e-dev.sh          — Newman + Playwright
#   ./run-e2e-dev.sh newman   — Newman uniquement
#   ./run-e2e-dev.sh playwright — Playwright uniquement
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="${ROOT}/forges-monorepo/backend"
FRONTEND="${ROOT}/forges-monorepo/frontend"

DEV_URL="https://dev.forges-group.com"
DEV_API="${DEV_URL}/api"
WEBHOOK_SECRET="e8854038db4e69b9e6702357ea818fe0d99f00994c142b9af40caa6d4c066c08"

MODE="${1:-all}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_reachable() {
  log_info "Checking dev is reachable..."
  curl -sf --max-time 5 "${DEV_URL}/health" > /dev/null || {
    log_error "${DEV_URL}/health is not reachable. Is the dev backend running?"
    exit 1
  }
  log_info "Dev is up."
}

run_newman() {
  log_info "Generating fresh tokens..."
  bash "${BACKEND}/tests/generate-tokens-dev.sh"

  log_info "Running Newman..."
  cd "${BACKEND}"
  npx newman run tests/forges-v4.8-complete.postman_collection.json \
    --environment tests/forges-v4.8.dev.postman_environment.json \
    --delay-request 500 \
    --timeout-request 30000 \
    --reporters cli,htmlextra \
    --reporter-htmlextra-export newman-report-dev.html
  log_info "Newman report: ${BACKEND}/newman-report-dev.html"
}

run_playwright() {
  log_info "Running Playwright E2E..."
  cd "${FRONTEND}"
  E2E_BASE_URL="${DEV_URL}" \
  E2E_API_URL="${DEV_API}" \
  WEBHOOK_SECRET="${WEBHOOK_SECRET}" \
  E2E_HEADLESS="true" \
    npx playwright test --reporter=html
  log_info "Playwright report: ${FRONTEND}/playwright-report/index.html"
}

check_reachable

case "$MODE" in
  newman)     run_newman ;;
  playwright) run_playwright ;;
  all)        run_newman && run_playwright ;;
  *)
    echo "Usage: $0 [newman|playwright|all]"
    exit 1
    ;;
esac

log_info "E2E suite complete against ${DEV_URL}"
