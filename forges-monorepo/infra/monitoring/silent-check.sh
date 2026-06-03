#!/usr/bin/env sh
# Silent endpoint checker — runs every 5 min inside a container
# Logs structured JSON to stdout so Promtail/Loki picks it up
# An ERROR log triggers the Grafana alert rule

BASE_URL="${FORGES_BASE_URL:-http://forges-backend-dev:3001}"
INTERVAL="${CHECK_INTERVAL:-300}"
ENVIRONMENT="${FORGES_ENVIRONMENT:-dev}"

log() {
  level="$1"
  check="$2"
  msg="$3"
  printf '{"level":"%s","service":"checker","environment":"%s","check":"%s","msg":"%s","ts":"%s"}\n' \
    "$level" "$ENVIRONMENT" "$check" "$msg" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}

check_health() {
  body=$(curl -sf --max-time 5 "${BASE_URL}/health") || {
    log "error" "health" "GET /health failed — no response"
    return
  }
  echo "$body" | grep -q '"status":"ok"' || {
    log "error" "health" "GET /health returned unexpected body: ${body}"
    return
  }
  log "info" "health" "ok"
}

check_catalogue() {
  body=$(curl -sf --max-time 5 "${BASE_URL}/api/catalogue") || {
    log "error" "catalogue" "GET /api/catalogue failed — no response"
    return
  }
  echo "$body" | grep -q '"statusCode":200' || {
    log "error" "catalogue" "GET /api/catalogue missing statusCode:200 — body: ${body}"
    return
  }
  echo "$body" | grep -q '"data"' || {
    log "error" "catalogue" "GET /api/catalogue missing data field — body: ${body}"
    return
  }
  log "info" "catalogue" "ok"
}


check_catalogue_item_structure() {
  body=$(curl -sf --max-time 5 "${BASE_URL}/api/catalogue") || return
  # Empty catalogue is normal on a fresh env — not an error
  echo "$body" | grep -q '"data":\[\]' && {
    log "info" "catalogue-structure" "catalogue vide (env non seede)"
    return
  }
  echo "$body" | grep -q '"data":\[{' && ! echo "$body" | grep -q '"id"' && {
    log "error" "catalogue-structure" "GET /api/catalogue items sans champ id — schema change possible"
    return
  }
  log "info" "catalogue-structure" "ok"
}

run_checks() {
  log "info" "cycle" "starting checks"
  check_health
  check_catalogue
  check_catalogue_item_structure
  log "info" "cycle" "done"
}

# Run once immediately, then loop
run_checks
while true; do
  sleep "$INTERVAL"
  run_checks
done
