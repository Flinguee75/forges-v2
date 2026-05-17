#!/usr/bin/env bash
# setup-cron-backup-edu.sh — A executer UNE SEULE FOIS sur le VPS pour activer le backup quotidien
# Usage: bash setup-cron-backup-edu.sh <DEPLOY_PATH>
# Exemple: bash setup-cron-backup-edu.sh /opt/forges
set -euo pipefail

DEPLOY_PATH="${1:-/opt/forges}"
BACKUP_SCRIPT="$DEPLOY_PATH/infra/scripts/backup-edu.sh"
LOG_FILE="$HOME/backups/forges/backup-edu.log"
CRON_LINE="0 2 * * * bash $BACKUP_SCRIPT >> $LOG_FILE 2>&1"

echo "=== Setup backup EDU ==="
echo "Script : $BACKUP_SCRIPT"
echo "Log    : $LOG_FILE"
echo ""

# Verifie que le script est present (necessite un premier deploy)
if [ ! -f "$BACKUP_SCRIPT" ]; then
  echo "ERREUR: script introuvable: $BACKUP_SCRIPT" >&2
  echo "Lance d'abord un deploy GitHub Actions pour deposer les scripts." >&2
  exit 1
fi

# Verifie que l'utilisateur courant peut appeler docker
if ! docker info >/dev/null 2>&1; then
  echo ""
  echo "ERREUR: docker n'est pas accessible pour l'utilisateur $(whoami)." >&2
  echo "Ajoute-le au groupe docker puis reconnecte-toi:" >&2
  echo ""
  echo "  sudo usermod -aG docker $(whoami)"
  echo "  newgrp docker   # ou deconnexion/reconnexion SSH"
  echo ""
  exit 1
fi

echo "Docker OK — utilisateur $(whoami) autorise"

# Cree le repertoire de backup (dans le home, pas dans /var/backups)
mkdir -p "$HOME/backups/forges/edu"
echo "Repertoire backup: $HOME/backups/forges/edu"

# Cree le fichier de log
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"
echo "Log: $LOG_FILE"

# Ajoute le cron seulement s'il n'existe pas deja
if crontab -l 2>/dev/null | grep -qF "$BACKUP_SCRIPT"; then
  echo "Cron deja configure — rien a faire."
else
  (crontab -l 2>/dev/null || true; echo "$CRON_LINE") | crontab -
  echo "Cron ajoute: $CRON_LINE"
fi

echo ""
echo "Crons actifs:"
crontab -l

echo ""
echo "=== Test du backup maintenant ==="
bash "$BACKUP_SCRIPT"
echo ""
echo "Setup termine. Le backup tournera chaque nuit a 2h00."
