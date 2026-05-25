#!/usr/bin/env bash
# backup-demo.sh - Sauvegarde PostgreSQL pour l'environnement DEMO
# Usage: ./backup-demo.sh [--pre-deploy]
set -euo pipefail

CONTAINER="${CONTAINER:-forges-postgres-demo}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/forges/demo}"
RETAIN_DAYS="${RETAIN_DAYS:-7}"
RETAIN_WEEKS="${RETAIN_WEEKS:-4}"
PRE_DEPLOY="${1:-}"

mkdir -p "$BACKUP_DIR"

if ! docker inspect --format='{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true; then
  echo "[backup-demo] ERREUR: container $CONTAINER non disponible - backup annule" >&2
  exit 1
fi

PGUSER=$(docker exec "$CONTAINER" printenv POSTGRES_USER 2>/dev/null || echo "forges_demo")
PGDB=$(docker exec "$CONTAINER" printenv POSTGRES_DB 2>/dev/null || echo "forges_demo")
PGPASSWORD=$(docker exec "$CONTAINER" printenv POSTGRES_PASSWORD)

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PREFIX="forges_demo"
[ "$PRE_DEPLOY" = "--pre-deploy" ] && PREFIX="forges_demo_predeploy"
FILENAME="${PREFIX}_${TIMESTAMP}.sql.gz"
FILEPATH="$BACKUP_DIR/$FILENAME"

trap 'if [ -f "$FILEPATH" ]; then rm -f "$FILEPATH"; echo "[backup-demo] Fichier partiel supprime: $FILEPATH" >&2; fi' ERR

echo "[backup-demo] $(date -Iseconds) Debut backup $PGDB depuis $CONTAINER"

docker exec \
  -e PGPASSWORD="$PGPASSWORD" \
  "$CONTAINER" \
  pg_dump -U "$PGUSER" -d "$PGDB" --no-password \
  | gzip > "$FILEPATH"

FILESIZE=$(stat -c%s "$FILEPATH" 2>/dev/null || stat -f%z "$FILEPATH")
if [ "$FILESIZE" -lt 1000 ]; then
  echo "[backup-demo] ERREUR: fichier trop petit (${FILESIZE} octets) - backup corrompu ou DB vide" >&2
  rm -f "$FILEPATH"
  exit 1
fi

SIZE=$(du -sh "$FILEPATH" | cut -f1)
echo "[backup-demo] Cree: $FILEPATH ($SIZE)"

trap - ERR

find "$BACKUP_DIR" -maxdepth 1 -name "forges_demo_[0-9]*.sql.gz" -mtime "+$RETAIN_DAYS" -delete
echo "[backup-demo] Retention: fichiers >$RETAIN_DAYS jours supprimes"

mapfile -t predeploy_files < <(find "$BACKUP_DIR" -maxdepth 1 -name "forges_demo_predeploy_*.sql.gz" | sort)
KEEP=10
if [ "${#predeploy_files[@]}" -gt "$KEEP" ]; then
  EXCESS=$(( ${#predeploy_files[@]} - KEEP ))
  for f in "${predeploy_files[@]:0:$EXCESS}"; do
    rm -f "$f"
    echo "[backup-demo] Pre-deploy ancien supprime: $f"
  done
fi

if [ "$(date +%u)" = "7" ] && [ "$PRE_DEPLOY" != "--pre-deploy" ]; then
  WEEKLY="${BACKUP_DIR}/forges_demo_weekly_${TIMESTAMP}.sql.gz"
  cp "$FILEPATH" "$WEEKLY"
  mapfile -t weekly_files < <(find "$BACKUP_DIR" -maxdepth 1 -name "forges_demo_weekly_*.sql.gz" | sort)
  if [ "${#weekly_files[@]}" -gt "$RETAIN_WEEKS" ]; then
    EXCESS=$(( ${#weekly_files[@]} - RETAIN_WEEKS ))
    for f in "${weekly_files[@]:0:$EXCESS}"; do
      rm -f "$f"
    done
  fi
  echo "[backup-demo] Weekly cree: $WEEKLY"
fi

echo "[backup-demo] $(date -Iseconds) Backup termine: $FILEPATH"
