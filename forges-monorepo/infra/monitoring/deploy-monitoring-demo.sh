#!/usr/bin/env bash
# Deploy monitoring stack (demo) on the VPS
# Run this script locally — it copies files then starts the stack via SSH
set -euo pipefail

VPS_USER="forgesadmin"
VPS_HOST="92.205.164.97"
VPS_KEY="$HOME/.ssh/id_ed25519_forges"
VPS_DIR="$HOME/forges-v2/forges-monorepo/infra/monitoring"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

SSH="ssh -i ${VPS_KEY} ${VPS_USER}@${VPS_HOST}"
SCP="scp -i ${VPS_KEY}"

check_env() {
  if [ ! -f "${SCRIPT_DIR}/.env.monitoring.demo" ]; then
    log_error ".env.monitoring.demo not found. Copy it and fill in SMTP values."
    exit 1
  fi
  if grep -q "^SMTP_HOST=$" "${SCRIPT_DIR}/.env.monitoring.demo"; then
    log_error "SMTP_HOST is empty in .env.monitoring.demo. Fill in SMTP values first."
    exit 1
  fi
}

sync_files() {
  log_info "Syncing monitoring files to VPS..."

  $SSH "mkdir -p ${VPS_DIR}/grafana/provisioning/datasources \
    ${VPS_DIR}/grafana/provisioning/dashboards \
    ${VPS_DIR}/grafana/provisioning/alerting \
    ${VPS_DIR}/grafana/dashboards"

  # Core config files
  $SCP "${SCRIPT_DIR}/docker-compose.monitoring.demo.yml" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/"
  $SCP "${SCRIPT_DIR}/monitoring-demo.sh" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/"
  $SCP "${SCRIPT_DIR}/loki-config.yml" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/"
  $SCP "${SCRIPT_DIR}/promtail-config.yml" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/"
  $SCP "${SCRIPT_DIR}/.env.monitoring.demo" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/.env"

  # Grafana provisioning
  $SCP "${SCRIPT_DIR}/grafana/provisioning/datasources/loki.yml" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/grafana/provisioning/datasources/"
  $SCP "${SCRIPT_DIR}/grafana/provisioning/dashboards/dashboards.yml" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/grafana/provisioning/dashboards/"
  $SCP "${SCRIPT_DIR}/grafana/provisioning/alerting/rules.yml" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/grafana/provisioning/alerting/"
  $SCP "${SCRIPT_DIR}/grafana/provisioning/alerting/contactpoints.yml" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/grafana/provisioning/alerting/"
  $SCP "${SCRIPT_DIR}/grafana/provisioning/alerting/policies.yml" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/grafana/provisioning/alerting/"

  # Dashboards
  $SCP "${SCRIPT_DIR}/grafana/dashboards/forges-demo.json" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/grafana/dashboards/"

  # Silent checker
  $SCP "${SCRIPT_DIR}/silent-check.sh" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/"

  # Uptime Kuma provisioner
  $SCP "${SCRIPT_DIR}/provision-uptime-kuma.sh" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/"

  # Make scripts executable
  $SSH "chmod +x ${VPS_DIR}/monitoring-demo.sh ${VPS_DIR}/provision-uptime-kuma.sh ${VPS_DIR}/silent-check.sh"

  log_info "Files synced."
}

start_stack() {
  log_info "Starting monitoring stack on VPS..."
  $SSH "cd ${VPS_DIR} && ./monitoring-demo.sh start"
}

check_health() {
  log_info "Waiting 15s for services to start..."
  sleep 15
  $SSH "cd ${VPS_DIR} && ./monitoring-demo.sh health"
}

provision_uptime_kuma() {
  log_info "Provisioning Uptime Kuma monitors..."
  log_warn "NOTE: Uptime Kuma requires a one-time manual account creation on first run."
  log_warn "If this is the first deploy, open the tunnel, go to http://localhost:3001,"
  log_warn "create the admin account (admin / forges2026!), then run:"
  log_warn "  ssh -i ~/.ssh/id_ed25519_forges forgesadmin@92.205.164.97 \\"
  log_warn "    'cd ~/forges-v2/forges-monorepo/infra/monitoring && ./provision-uptime-kuma.sh'"
}

print_access() {
  echo ""
  echo "============================================"
  echo "  Monitoring stack deployed"
  echo "============================================"
  echo ""
  echo "  SSH tunnel (all services):"
  echo "    ssh -i ~/.ssh/id_ed25519_forges \\"
  echo "      -L 3050:localhost:3050 \\"
  echo "      -L 3001:localhost:3001 \\"
  echo "      forgesadmin@92.205.164.97"
  echo ""
  echo "  Grafana:     http://localhost:3050  (admin / forges2026!)"
  echo "  Uptime Kuma: http://localhost:3001"
  echo ""
  echo "  Silent checker: logs every 5 min in Grafana"
  echo "    Panel: 'Silent Checks — Erreurs detectees'"
  echo "============================================"
}

check_env
sync_files
start_stack
check_health
provision_uptime_kuma
print_access
