#!/usr/bin/env bash
# Disable monitoring stack (edu) on the VPS
# Run this script locally -- it copies files then stops + cleans the stack via SSH
set -euo pipefail

VPS_USER="forgesadmin"
VPS_HOST="92.205.164.97"
VPS_KEY="$HOME/.ssh/id_ed25519_forges"
VPS_DIR="/home/forgesadmin/forges-v2/forges-monorepo/infra/monitoring"

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
  if [ ! -f "${SCRIPT_DIR}/.env.monitoring.edu" ]; then
    log_error ".env.monitoring.edu not found. Copy it and fill in SMTP values."
    exit 1
  fi
  if grep -q "^SMTP_HOST=$" "${SCRIPT_DIR}/.env.monitoring.edu"; then
    log_error "SMTP_HOST is empty in .env.monitoring.edu. Fill in SMTP values first."
    exit 1
  fi
}

sync_files() {
  log_info "Syncing edu monitoring files to VPS..."

  $SSH "mkdir -p ${VPS_DIR}/grafana/provisioning/datasources \
    ${VPS_DIR}/grafana/provisioning/dashboards \
    ${VPS_DIR}/grafana/provisioning/alerting \
    ${VPS_DIR}/grafana/dashboards"

  # Edu-specific compose and management script
  $SCP "${SCRIPT_DIR}/docker-compose.monitoring.edu.yml" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/"
  $SCP "${SCRIPT_DIR}/monitoring-edu.sh" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/"
  $SCP "${SCRIPT_DIR}/.env.monitoring.edu" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/.env.monitoring.edu"

  # Shared config files (also update on VPS)
  $SCP "${SCRIPT_DIR}/loki-config.yml" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/"
  $SCP "${SCRIPT_DIR}/promtail-config.edu.yml" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/"
  $SCP "${SCRIPT_DIR}/silent-check.sh" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/"

  # Grafana provisioning (shared, only overwrite if changed)
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

  # Edu dashboard
  $SCP "${SCRIPT_DIR}/grafana/dashboards/forges-edu.json" \
       "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/grafana/dashboards/"

  # Make scripts executable
  $SSH "chmod +x ${VPS_DIR}/monitoring-edu.sh ${VPS_DIR}/silent-check.sh"

  log_info "Files synced."
}

start_stack() {
  log_info "Stopping and cleaning edu monitoring stack on VPS..."
  $SSH "cd ${VPS_DIR} && printf 'y\n' | ./monitoring-edu.sh cleanup"
}

check_health() {
  log_info "Waiting 15s for services to start..."
  sleep 15
  $SSH "cd ${VPS_DIR} && ./monitoring-edu.sh health"
}

print_access() {
  echo ""
  echo "============================================"
  echo "  Monitoring stack (edu) disabled"
  echo "============================================"
  echo ""
  echo "  Existing monitoring containers were stopped and volumes cleaned on the VPS."
  echo "============================================"
}

check_env
sync_files
start_stack
check_health
print_access
