#!/usr/bin/env bash
# Disable monitoring stack (demo) on the VPS
# Run this script locally — it stops the existing stack via SSH
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

print_access() {
  echo ""
  echo "============================================"
  echo "  Monitoring stack disabled"
  echo "============================================"
  echo ""
  echo "  Existing monitoring containers were stopped on the VPS."
  echo "  Demo monitoring start/restart commands now no-op."
  echo "============================================"
}

stop_stack() {
  log_info "Stopping monitoring stack on VPS..."
  $SSH "cd ${VPS_DIR} && ./monitoring-demo.sh stop"
}

stop_stack
print_access
