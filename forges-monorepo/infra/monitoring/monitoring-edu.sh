#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.monitoring.edu.yml"
ENV_FILE="${SCRIPT_DIR}/.env.monitoring.edu"
PROJECT_NAME="forges-monitoring-edu"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

MONITORING_DISABLED=true

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
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
}

disabled_notice() {
  echo ""
  log_warn "Monitoring is disabled for the edu environment."
  echo "  - Start/restart/health/logs are no-ops"
  echo "  - Stop/cleanup still remove any existing containers or volumes"
  echo ""
}

cmd_start() {
  log_warn "Edu monitoring has been disabled."
  cmd_stop
  disabled_notice
}

cmd_stop() {
  log_info "Stopping FORGES monitoring stack (edu)..."
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
  echo "  FORGES Monitoring - Edu Environment"
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
    docker volume rm forges-loki-edu forges-grafana-edu forges-uptime-edu 2>/dev/null || true
    log_info "Cleanup complete."
  else
    log_info "Cleanup cancelled."
  fi
}

cmd_help() {
  echo "Usage: $0 <command> [args]"
  echo ""
  echo "Commands:"
  echo "  start       Start the monitoring stack"
  echo "  stop        Stop the monitoring stack"
  echo "  restart     Restart the monitoring stack"
  echo "  status      Show container status and URLs"
  echo "  health      Check health of all services"
  echo "  logs [svc]  View logs (optionally for a specific service)"
  echo "  backup      Backup Grafana and Loki data"
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
