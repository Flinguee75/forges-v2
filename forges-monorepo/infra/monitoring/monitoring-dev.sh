#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.monitoring.dev.yml"
ENV_FILE="${SCRIPT_DIR}/.env.monitoring.dev"
PROJECT_NAME="forges-monitoring-dev"
MONITORING_DISABLED=true

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_docker() {
  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
  fi
  if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running"
    exit 1
  fi
}

compose_cmd() {
  if [ -f "${ENV_FILE}" ]; then
    docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
  else
    docker compose -f "${COMPOSE_FILE}" "$@"
  fi
}

disabled_notice() {
  echo ""
  log_warn "Monitoring is disabled for the dev environment."
  echo "  - Start/restart/health/logs are no-ops"
  echo "  - Stop/cleanup still remove any existing containers or volumes"
  echo ""
}

cmd_start() {
  log_warn "Dev monitoring has been disabled."
  cmd_stop
  disabled_notice
}

cmd_stop() {
  log_info "Stopping FORGES monitoring stack (dev)..."
  if ! command -v docker &> /dev/null || ! docker info &> /dev/null; then
    log_warn "Docker is unavailable; nothing to stop."
    return 0
  fi
  compose_cmd down
  log_info "Monitoring stack stopped."
}

cmd_restart() {
  cmd_stop
  disabled_notice
}

cmd_status() {
  disabled_notice
  echo "============================================"
  echo "  FORGES Monitoring - Dev Environment"
  echo "============================================"
  echo ""
  if command -v docker &> /dev/null && docker info &> /dev/null; then
    compose_cmd ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" || true
  fi
  echo ""
}

cmd_health() {
  disabled_notice
}

cmd_logs() {
  disabled_notice
}

cmd_backup() {
  disabled_notice
}

cmd_cleanup() {
  log_warn "This will DELETE all monitoring data (volumes). Continue? [y/N]"
  read -r confirm
  if [[ "${confirm}" =~ ^[Yy]$ ]]; then
    cmd_stop
    if ! command -v docker &> /dev/null || ! docker info &> /dev/null; then
      log_warn "Docker is unavailable; skipping volume cleanup."
      return 0
    fi
    docker volume rm forges-loki-dev forges-grafana-dev forges-uptime-dev 2>/dev/null || true
    log_info "Cleanup complete."
  else
    log_info "Cleanup cancelled."
  fi
}

cmd_help() {
  echo "Usage: $0 <command> [args]"
  echo ""
  echo "Commands:"
  echo "  start       Disabled for dev"
  echo "  stop        Stop any existing monitoring containers"
  echo "  restart     Disabled for dev"
  echo "  status      Show disabled notice and container status"
  echo "  health      Disabled for dev"
  echo "  logs [svc]  Disabled for dev"
  echo "  backup      Disabled for dev"
  echo "  cleanup     Remove all monitoring data (destructive)"
  echo "  help        Show this help message"
}

case "${1:-help}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_restart ;;
  status)  cmd_status ;;
  health)  cmd_health ;;
  logs)    cmd_logs "${2:-}" ;;
  backup)  cmd_backup ;;
  cleanup) cmd_cleanup ;;
  help|*)  cmd_help ;;
esac
