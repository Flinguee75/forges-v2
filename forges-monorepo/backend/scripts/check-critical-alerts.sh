#!/usr/bin/env bash
set -euo pipefail

APP_LOG="${APP_LOG:-logs/app.log}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
PENDING_THRESHOLD="${PENDING_THRESHOLD:-5}"

notify() {
  local message="$1"

  if [[ -z "$SLACK_WEBHOOK" ]]; then
    echo "[alerts] ${message}"
    return
  fi

  curl -fsS -X POST "$SLACK_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"${message//\"/\\\"}\"}" >/dev/null
}

if [[ -f "$APP_LOG" ]]; then
  if ! tail -n 5000 "$APP_LOG" | grep -q 'RECONCILIATION_NGSER_DEBUT'; then
    notify "FORGES: scheduler reconciliation NGSER sans signal recent dans ${APP_LOG}"
  fi

  if tail -n 5000 "$APP_LOG" | grep -q 'IPN_MONTANT_MISMATCH'; then
    notify "FORGES: IPN_MONTANT_MISMATCH detecte dans les logs recents"
  fi
fi

if [[ -n "${DATABASE_URL:-}" ]] && command -v psql >/dev/null 2>&1; then
  pending_count="$(
    psql "$DATABASE_URL" -Atc \
      "SELECT COUNT(*) FROM \"Paiement\" WHERE statut='PENDING' AND provider='NGSER' AND created_at < now() - interval '60 minutes';"
  )"

  if [[ "${pending_count:-0}" =~ ^[0-9]+$ ]] && (( pending_count > PENDING_THRESHOLD )); then
    notify "FORGES: ${pending_count} paiements NGSER PENDING depuis plus de 60 minutes"
  fi
fi
