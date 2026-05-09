#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.monitoring.dev.yml"
ENV_FILE="${SCRIPT_DIR}/.env.monitoring.dev"
PROJECT_NAME="forges-monitoring-dev"

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
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
}

cmd_start() {
  check_docker
  log_info "Starting FORGES monitoring stack (dev)..."

  if [ ! -f "${ENV_FILE}" ]; then
    log_error "${ENV_FILE} is missing"
    exit 1
  fi

  if ! docker network inspect forges-dev &> /dev/null 2>&1; then
    log_warn "Network 'forges-dev' does not exist. Creating it..."
    docker network create forges-dev
  fi

  compose_cmd up -d
  log_info "Monitoring stack started."
  echo ""
  cmd_status
}

cmd_stop() {
  log_info "Stopping FORGES monitoring stack (dev)..."
  compose_cmd down
  log_info "Monitoring stack stopped."
}

cmd_restart() {
  cmd_stop
  cmd_start
}

cmd_status() {
  echo "============================================"
  echo "  FORGES Monitoring - Dev Environment"
  echo "============================================"
  echo ""
  compose_cmd ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
  echo ""
  echo "-------------------------------------------"
  echo "  Access URLs:"
  echo "    Grafana:     http://localhost:3051"
  echo "    Uptime Kuma: http://localhost:3004"
  echo "    Loki API:    http://localhost:3101"
  echo "-------------------------------------------"
}

cmd_health() {
  log_info "Checking health of monitoring services..."
  echo ""

  local all_healthy=true

  if curl -sf http://localhost:3101/ready > /dev/null 2>&1; then
    echo -e "  Loki:        ${GREEN}HEALTHY${NC}"
  else
    echo -e "  Loki:        ${RED}UNHEALTHY${NC}"
    all_healthy=false
  fi

  if curl -sf http://localhost:3051/api/health > /dev/null 2>&1; then
    echo -e "  Grafana:     ${GREEN}HEALTHY${NC}"
  else
    echo -e "  Grafana:     ${RED}UNHEALTHY${NC}"
    all_healthy=false
  fi

  if curl -sf http://localhost:3004/api/entry-page > /dev/null 2>&1; then
    echo -e "  Uptime Kuma: ${GREEN}HEALTHY${NC}"
  else
    echo -e "  Uptime Kuma: ${RED}UNHEALTHY${NC}"
    all_healthy=false
  fi

  echo ""
  if [ "${all_healthy}" = true ]; then
    log_info "All services are healthy."
  else
    log_warn "Some services are unhealthy. Run './monitoring-dev.sh logs' for details."
  fi
}

cmd_logs() {
  local service="${1:-}"
  if [ -n "${service}" ]; then
    compose_cmd logs -f --tail=100 "${service}"
  else
    compose_cmd logs -f --tail=50
  fi
}

cmd_backup() {
  local backup_dir="${SCRIPT_DIR}/backups/$(date +%Y%m%d_%H%M%S)"
  mkdir -p "${backup_dir}"

  log_info "Backing up monitoring data to ${backup_dir}..."

  docker run --rm \
    -v forges-grafana-dev:/data \
    -v "${backup_dir}":/backup \
    alpine tar czf /backup/grafana-data.tar.gz -C /data .

  docker run --rm \
    -v forges-loki-dev:/data \
    -v "${backup_dir}":/backup \
    alpine tar czf /backup/loki-data.tar.gz -C /data .

  log_info "Backup complete: ${backup_dir}"
}

cmd_cleanup() {
  log_warn "This will DELETE all monitoring data (volumes). Continue? [y/N]"
  read -r confirm
  if [[ "${confirm}" =~ ^[Yy]$ ]]; then
    cmd_stop
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
