#!/bin/bash

# FORGES - Monitoring Management Script
# Gestion du monitoring UNIQUE pour dev, test et demo
# Services: Portainer CE, Uptime Kuma, Loki (logs séparés), Promtail
# Date: 4 mai 2026

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITORING_DIR="$SCRIPT_DIR"
COMPOSE_FILE="$MONITORING_DIR/docker-compose.monitoring.dev.yml"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions
log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_section() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Vérifier Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker not installed"
        exit 1
    fi
    log_info "Docker found: $(docker --version)"
}

# Démarrer le monitoring
start_monitoring() {
    log_info "Starting monitoring for dev/test/demo environments..."
    
    cd "$MONITORING_DIR"
    docker compose -f "$COMPOSE_FILE" up -d
    
    sleep 3
    log_info "Monitoring started successfully"
    
    # Afficher les URLs d'accès
    echo ""
    log_section "Monitoring URLs"
    echo "Portainer:   https://localhost:9443"
    echo "Uptime Kuma: http://localhost:3001"
    echo "Loki Logs:   http://localhost:3100"
    echo ""
    
    # Afficher les prochaines étapes
    log_section "Next Steps"
    echo "1. Access Portainer: https://localhost:9443"
    echo "   - Create admin account"
    echo "   - Verify containers are visible (dev, test, demo)"
    echo ""
    echo "2. Configure Uptime Kuma: http://localhost:3001"
    echo "   - Create monitors for the 3 environments:"
    echo "     • dev-forges.com/api/health"
    echo "     • test-forges.com/api/health"
    echo "     • demo-forges.com/api/health"
    echo "   - Configure notifications (email/Slack)"
    echo ""
    echo "3. View logs in Loki: http://localhost:3100"
    echo "   - Query format: {environment=\"dev\"} (or test/demo)"
    echo "   - Logs are separated by environment tag"
    echo ""
    echo "4. Configure Sentry:"
    echo "   - Create projects for dev, test, demo"
    echo "   - Add DSN to .env files"
    echo ""
    echo "5. Configure Better Stack:"
    echo "   - Create sources for dev, test, demo"
    echo "   - Add tokens to .env files"
    echo ""
}

# Arrêter le monitoring
stop_monitoring() {
    log_info "Stopping monitoring..."
    
    cd "$MONITORING_DIR"
    docker compose -f "$COMPOSE_FILE" down
    
    log_info "Monitoring stopped"
}

# Redémarrer le monitoring
restart_monitoring() {
    stop_monitoring
    sleep 2
    start_monitoring
}

# Voir les logs
view_logs() {
    cd "$MONITORING_DIR"
    docker compose -f "$COMPOSE_FILE" logs -f --tail=100
}

# Voir les logs d'un service
view_service_logs() {
    local service=$1
    if [ -z "$service" ]; then
        log_error "Service name required"
        exit 1
    fi
    
    cd "$MONITORING_DIR"
    docker compose -f "$COMPOSE_FILE" logs -f --tail=100 "$service"
}

# Statut des conteneurs
show_status() {
    log_info "Monitoring status:"
    echo ""
    cd "$MONITORING_DIR"
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
}

# Santé complète du monitoring
health_check() {
    log_info "Performing health checks for monitoring..."
    echo ""
    
    # Portainer
    if curl -s -k https://localhost:9443 > /dev/null 2>&1; then
        log_info "Portainer: OK (https://localhost:9443)"
    else
        log_error "Portainer: FAILED"
    fi
    
    # Uptime Kuma
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        log_info "Uptime Kuma: OK (http://localhost:3001)"
    else
        log_error "Uptime Kuma: FAILED"
    fi
    
    # Loki
    if curl -s http://localhost:3100/ready > /dev/null 2>&1; then
        log_info "Loki: OK (http://localhost:3100)"
    else
        log_error "Loki: FAILED"
    fi
    
    echo ""
    log_section "Docker Containers Overview"
    
    echo ""
    echo "Monitoring containers:"
    docker ps --filter "label=monitoring=true" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    echo "Application containers (dev, test, demo):"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "dev|test|demo" || echo "No containers found"
    
    echo ""
}

# Backup de la configuration
backup_config() {
    log_info "Backing up monitoring configuration..."
    
    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"
    
    cd "$MONITORING_DIR"
    
    # Backup Portainer
    docker compose -f "$COMPOSE_FILE" cp portainer:/data "$BACKUP_DIR/portainer_$(date +%Y%m%d_%H%M%S)" 2>/dev/null || log_warn "Could not backup Portainer data"
    
    # Backup Uptime Kuma
    docker compose -f "$COMPOSE_FILE" cp uptime-kuma:/app/data "$BACKUP_DIR/uptime_kuma_$(date +%Y%m%d_%H%M%S)" 2>/dev/null || log_warn "Could not backup Uptime Kuma data"
    
    # Backup Loki
    docker compose -f "$COMPOSE_FILE" cp loki:/loki "$BACKUP_DIR/loki_$(date +%Y%m%d_%H%M%S)" 2>/dev/null || log_warn "Could not backup Loki data"
    
    log_info "Backup saved to: $BACKUP_DIR"
}

# Nettoyer les données
cleanup() {
    log_warn "This will remove all monitoring data"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        stop_monitoring
        docker volume rm portainer_data uptime_kuma_data loki_data 2>/dev/null || true
        log_info "Cleanup completed"
    fi
}

# Afficher un résumé complet
show_summary() {
    log_section "FORGES Monitoring Summary"
    echo ""
    echo "Environment: ALL (dev, test, demo)"
    echo ""
    echo "Monitoring Stack:"
    echo "  • Portainer CE (Interface Docker)"
    echo "  • Uptime Kuma (Disponibilité)"
    echo "  • Loki (Agrégation logs)"
    echo "  • Promtail (Collecteur logs)"
    echo "  • Sentry (External - crash reporting)"
    echo "  • Better Stack (External - logs + alertes)"
    echo "  • Trivy (CLI - scan images)"
    echo ""
    echo "Services Monitored:"
    echo "  • dev-forges.com"
    echo "  • test-forges.com"
    echo "  • demo-forges.com"
    echo ""
    echo "Access URLs:"
    echo "  • Portainer: https://localhost:9443"
    echo "  • Uptime Kuma: http://localhost:3001"
    echo "  • Loki Logs: http://localhost:3100"
    echo ""
    echo "Log Queries (in Loki):"
    echo "  • DEV logs: {environment=\"dev\"}"
    echo "  • TEST logs: {environment=\"test\"}"
    echo "  • DEMO logs: {environment=\"demo\"}"
    echo "  • Backend logs: {environment=\"dev\", service=\"backend\"}"
    echo ""
}

# Afficher l'aide
show_help() {
    cat << EOF
FORGES Monitoring - Management Script
Usage: $(basename "$0") <command> [options]

Commands:
  start        - Start monitoring (Portainer + Uptime Kuma + Loki + Promtail)
  stop         - Stop monitoring
  restart      - Restart monitoring
  status       - Show container status
  health       - Run health checks
  logs         - View all logs
  logs:service - View logs for specific service (e.g., logs:portainer)
  backup       - Backup monitoring data
  summary      - Show summary
  cleanup      - Remove all monitoring data (WARNING: irreversible)
  help         - Show this help message

Examples:
  $(basename "$0") start
  $(basename "$0") health
  $(basename "$0") backup
  $(basename "$0") status

For more information, see:
  - README.md
  - SETUP_MONITORING.md
  - QUICKSTART.md

EOF
}

# Main
main() {
    check_docker
    
    local command=${1:-help}
    
    case $command in
        start)
            start_monitoring
            ;;
        stop)
            stop_monitoring
            ;;
        restart)
            restart_monitoring
            ;;
        status)
            show_status
            ;;
        health)
            health_check
            ;;
        logs)
            view_logs
            ;;
        logs:*)
            service=${command#logs:}
            view_service_logs "$service"
            ;;
        backup)
            backup_config
            ;;
        summary)
            show_summary
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
