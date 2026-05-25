#!/usr/bin/env bash
# restore-demo.sh - Restauration PostgreSQL pour l'environnement DEMO
# Usage: ./restore-demo.sh <fichier_backup.sql.gz>
# ATTENTION: ecrase la base forges_demo existante
set -euo pipefail

CONTAINER="${CONTAINER:-forges-postgres-demo}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/forges/demo}"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <fichier_backup.sql.gz>" >&2
  echo ""
  echo "Backups disponibles dans $BACKUP_DIR/ :"
  find "$BACKUP_DIR" -maxdepth 1 -name "*.sql.gz" | sort -r | head -10 || true
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERREUR: fichier introuvable: $BACKUP_FILE" >&2
  exit 1
fi

if ! docker inspect --format='{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true; then
  echo "ERREUR: container $CONTAINER non disponible" >&2
  exit 1
fi

PGUSER=$(docker exec "$CONTAINER" printenv POSTGRES_USER 2>/dev/null || echo "forges_demo")
PGDB=$(docker exec "$CONTAINER" printenv POSTGRES_DB 2>/dev/null || echo "forges_demo")
PGPASSWORD=$(docker exec "$CONTAINER" printenv POSTGRES_PASSWORD)

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo ""
echo "============================================================"
echo "  RESTAURATION DEMO - OPERATION DESTRUCTIVE"
echo "============================================================"
echo "  Backup source  : $BACKUP_FILE ($SIZE)"
echo "  Base cible     : $PGDB"
echo "  Container      : $CONTAINER"
echo "============================================================"
echo ""
echo "Cette operation va DROP puis recreer la base $PGDB."
echo "Toutes les donnees actuelles seront PERDUES."
echo ""
read -rp "Confirmer la restauration ? Tapez 'OUI' pour continuer : " CONFIRM

if [ "$CONFIRM" != "OUI" ]; then
  echo "Restauration annulee."
  exit 0
fi

echo ""
echo "[restore-demo] Creation d'un backup de securite pre-restore..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER="$CONTAINER" BACKUP_DIR="$BACKUP_DIR" bash "${SCRIPT_DIR}/backup-demo.sh" --pre-deploy || true

echo "[restore-demo] Restauration en cours..."

if docker inspect forges-backend-demo >/dev/null 2>&1; then
  echo "[restore-demo] Arret du backend demo..."
  docker stop forges-backend-demo || true
fi

docker exec \
  -e PGPASSWORD="$PGPASSWORD" \
  "$CONTAINER" \
  psql -U "$PGUSER" postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$PGDB' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS $PGDB;" \
  -c "CREATE DATABASE $PGDB OWNER $PGUSER;"

echo "[restore-demo] Chargement du backup..."
gunzip -c "$BACKUP_FILE" | docker exec \
  -i \
  -e PGPASSWORD="$PGPASSWORD" \
  "$CONTAINER" \
  psql -U "$PGUSER" -d "$PGDB" -v ON_ERROR_STOP=1

if docker inspect forges-backend-demo >/dev/null 2>&1; then
  echo "[restore-demo] Redemarrage du backend demo..."
  docker start forges-backend-demo || true
fi

echo ""
echo "[restore-demo] Restauration terminee depuis $BACKUP_FILE"
