#!/usr/bin/env bash
# backup-edu.sh — Sauvegarde PostgreSQL pour l'environnement EDU
# Usage: ./backup-edu.sh [--pre-deploy]
# Cron recommande: 0 2 * * * bash /opt/forges/infra/scripts/backup-edu.sh >> /var/log/forges-backup-edu.log 2>&1
set -euo pipefail

CONTAINER="${CONTAINER:-forges-postgres-edu}"
# Utilise le home de l'utilisateur courant pour eviter les problemes de droits
# sur /var/backups (appartient a root sur Ubuntu).
# Peut etre surcharge : BACKUP_DIR=/autre/chemin bash backup-edu.sh
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/forges/edu}"
RETAIN_DAYS="${RETAIN_DAYS:-7}"
RETAIN_WEEKS="${RETAIN_WEEKS:-4}"
PRE_DEPLOY="${1:-}"

mkdir -p "$BACKUP_DIR"

# Verifie que le container postgres tourne
if ! docker inspect --format='{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true; then
  echo "[backup-edu] ERREUR: container $CONTAINER non disponible — backup annule" >&2
  exit 1
fi

# Recupere les credentials depuis le container (evite de dupliquer les secrets)
PGUSER=$(docker exec "$CONTAINER" printenv POSTGRES_USER 2>/dev/null || echo "forges_edu")
PGDB=$(docker exec   "$CONTAINER" printenv POSTGRES_DB   2>/dev/null || echo "forges_edu")
PGPASSWORD=$(docker exec "$CONTAINER" printenv POSTGRES_PASSWORD)

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PREFIX="forges_edu"
[ "$PRE_DEPLOY" = "--pre-deploy" ] && PREFIX="forges_edu_predeploy"
FILENAME="${PREFIX}_${TIMESTAMP}.sql.gz"
FILEPATH="$BACKUP_DIR/$FILENAME"

# Nettoie le fichier partiel si le script echoue en cours de route
trap 'if [ -f "$FILEPATH" ]; then rm -f "$FILEPATH"; echo "[backup-edu] Fichier partiel supprime: $FILEPATH" >&2; fi' ERR

echo "[backup-edu] $(date -Iseconds) Debut backup $PGDB depuis $CONTAINER"

docker exec \
  -e PGPASSWORD="$PGPASSWORD" \
  "$CONTAINER" \
  pg_dump -U "$PGUSER" -d "$PGDB" --no-password \
  | gzip > "$FILEPATH"

# Verifie que le fichier est non vide (pg_dump silencieusement vide = corruption)
FILESIZE=$(stat -c%s "$FILEPATH" 2>/dev/null || stat -f%z "$FILEPATH")
if [ "$FILESIZE" -lt 1000 ]; then
  echo "[backup-edu] ERREUR: fichier trop petit (${FILESIZE} octets) — backup corrompu ou DB vide" >&2
  rm -f "$FILEPATH"
  exit 1
fi

SIZE=$(du -sh "$FILEPATH" | cut -f1)
echo "[backup-edu] Cree: $FILEPATH ($SIZE)"

# Desactive le trap ERR maintenant que le backup est valide
trap - ERR

# Retention quotidienne: supprime les backups de routine de plus de RETAIN_DAYS jours
find "$BACKUP_DIR" -maxdepth 1 -name "forges_edu_[0-9]*.sql.gz" -mtime "+$RETAIN_DAYS" -delete
echo "[backup-edu] Retention: fichiers >$RETAIN_DAYS jours supprimes"

# Retention pre-deploy: garde les 10 derniers
mapfile -t predeploy_files < <(find "$BACKUP_DIR" -maxdepth 1 -name "forges_edu_predeploy_*.sql.gz" | sort)
KEEP=10
if [ "${#predeploy_files[@]}" -gt "$KEEP" ]; then
  EXCESS=$(( ${#predeploy_files[@]} - KEEP ))
  for f in "${predeploy_files[@]:0:$EXCESS}"; do
    rm -f "$f"
    echo "[backup-edu] Pre-deploy ancien supprime: $f"
  done
fi

# Sauvegarde hebdomadaire le dimanche (copie du backup du jour)
if [ "$(date +%u)" = "7" ] && [ "$PRE_DEPLOY" != "--pre-deploy" ]; then
  WEEKLY="${BACKUP_DIR}/forges_edu_weekly_${TIMESTAMP}.sql.gz"
  cp "$FILEPATH" "$WEEKLY"
  # Garde les 4 derniers weekly
  mapfile -t weekly_files < <(find "$BACKUP_DIR" -maxdepth 1 -name "forges_edu_weekly_*.sql.gz" | sort)
  if [ "${#weekly_files[@]}" -gt "$RETAIN_WEEKS" ]; then
    EXCESS=$(( ${#weekly_files[@]} - RETAIN_WEEKS ))
    for f in "${weekly_files[@]:0:$EXCESS}"; do
      rm -f "$f"
    done
  fi
  echo "[backup-edu] Weekly cree: $WEEKLY"
fi

echo "[backup-edu] $(date -Iseconds) Backup termine: $FILEPATH"
