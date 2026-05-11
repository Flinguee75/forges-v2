#!/usr/bin/env bash
# restore-edu.sh — Restauration PostgreSQL pour l'environnement EDU
# Usage: ./restore-edu.sh <fichier_backup.sql.gz>
# ATTENTION: ecrase la base forges_edu existante
set -euo pipefail

CONTAINER="${CONTAINER:-forges-postgres-edu}"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <fichier_backup.sql.gz>" >&2
  echo ""
  echo "Backups disponibles dans /var/backups/forges/edu/ :"
  find /var/backups/forges/edu -maxdepth 1 -name "*.sql.gz" | sort -r | head -10 || true
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERREUR: fichier introuvable: $BACKUP_FILE" >&2
  exit 1
fi

# Verifie que le container postgres tourne
if ! docker inspect --format='{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true; then
  echo "ERREUR: container $CONTAINER non disponible" >&2
  exit 1
fi

PGUSER=$(docker exec "$CONTAINER" printenv POSTGRES_USER 2>/dev/null || echo "forges_edu")
PGDB=$(docker exec "$CONTAINER" printenv POSTGRES_DB 2>/dev/null || echo "forges_edu")
PGPASSWORD=$(docker exec "$CONTAINER" printenv POSTGRES_PASSWORD)

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo ""
echo "============================================================"
echo "  RESTAURATION EDU — OPERATION DESTRUCTIVE"
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

# Cree un backup de securite avant de restaurer
echo ""
echo "[restore-edu] Creation d'un backup de securite pre-restore..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER="$CONTAINER" bash "${SCRIPT_DIR}/backup-edu.sh" --pre-deploy || true

echo "[restore-edu] Restauration en cours..."

# Arrete le backend pour eviter les connexions actives
if docker inspect forges-backend-edu >/dev/null 2>&1; then
  echo "[restore-edu] Arret du backend edu..."
  docker stop forges-backend-edu || true
fi

# Drop et recrée la base
docker exec \
  -e PGPASSWORD="$PGPASSWORD" \
  "$CONTAINER" \
  psql -U "$PGUSER" postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$PGDB' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS $PGDB;" \
  -c "CREATE DATABASE $PGDB OWNER $PGUSER;"

# Restaure depuis le backup
echo "[restore-edu] Chargement du backup..."
gunzip -c "$BACKUP_FILE" | docker exec \
  -i \
  -e PGPASSWORD="$PGPASSWORD" \
  "$CONTAINER" \
  psql -U "$PGUSER" -d "$PGDB" -v ON_ERROR_STOP=1

# Redarre le backend
if docker inspect forges-backend-edu >/dev/null 2>&1; then
  echo "[restore-edu] Redemarrage du backend edu..."
  docker start forges-backend-edu || true
fi

echo ""
echo "[restore-edu] Restauration terminee depuis $BACKUP_FILE"
