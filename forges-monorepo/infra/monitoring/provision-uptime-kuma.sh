#!/usr/bin/env bash
# Provision Uptime Kuma monitors via API after first start
# Run once after ./monitoring-demo.sh start
set -euo pipefail

KUMA_URL="${KUMA_URL:-http://localhost:3001}"
KUMA_USER="${KUMA_ADMIN_USER:-admin}"
KUMA_PASS="${KUMA_ADMIN_PASSWORD:-forges2026!}"
BASE_URL="${FORGES_BASE_URL:-https://demo.forges-group.com}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

wait_for_kuma() {
  log_info "Waiting for Uptime Kuma to be ready..."
  for i in $(seq 1 30); do
    if curl -sf "${KUMA_URL}/api/entry-page" > /dev/null 2>&1; then
      log_info "Uptime Kuma is up."
      return
    fi
    sleep 2
  done
  log_error "Uptime Kuma not reachable after 60s"
  exit 1
}

login() {
  log_info "Logging in to Uptime Kuma..."
  TOKEN=$(curl -sf -X POST "${KUMA_URL}/api/login/access-token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=${KUMA_USER}&password=${KUMA_PASS}" \
    | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

  if [ -z "$TOKEN" ]; then
    log_warn "Could not get token — Uptime Kuma may need initial setup via browser first."
    log_warn "Open http://localhost:3001, create admin account (${KUMA_USER} / ${KUMA_PASS}), then re-run this script."
    exit 1
  fi
  log_info "Logged in."
}

add_monitor() {
  local name="$1"
  local url="$2"
  local keyword="$3"
  local method="${4:-GET}"

  log_info "Adding monitor: ${name}"

  payload=$(cat <<EOF
{
  "type": "keyword",
  "name": "${name}",
  "url": "${url}",
  "method": "${method}",
  "keyword": "${keyword}",
  "interval": 60,
  "retryInterval": 30,
  "maxretries": 2,
  "upsideDown": false,
  "active": true
}
EOF
)

  result=$(curl -sf -X POST "${KUMA_URL}/api/monitors" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "$payload") || {
    log_warn "Failed to add monitor: ${name} (may already exist)"
    return
  }

  echo "$result" | grep -q '"id"' && log_info "Monitor added: ${name}" || log_warn "Unexpected response for: ${name}"
}

setup_monitors() {
  # Health check — verifie que le backend repond et retourne status:ok
  add_monitor "DEMO - Backend Health" \
    "${BASE_URL}/health" \
    '"status":"ok"'

  # Catalogue public — verifie que l'API retourne des donnees
  add_monitor "DEMO - Catalogue API" \
    "${BASE_URL}/api/catalogue" \
    '"statusCode":200'

  # Catalogue structure — verifie que les formations ont un id
  add_monitor "DEMO - Catalogue Structure" \
    "${BASE_URL}/api/catalogue" \
    '"id"'

  # Frontend — verifie que la page HTML se charge
  add_monitor "DEMO - Frontend" \
    "${BASE_URL}" \
    'FORGES'
}

wait_for_kuma
login
setup_monitors

echo ""
log_info "Uptime Kuma provisioned. Open tunnel then: http://localhost:3001"
