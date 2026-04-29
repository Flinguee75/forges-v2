#!/usr/bin/env bash
set -euo pipefail

CONTAINER="${SEED_CONTAINER:-forges-backend-test}"
SEED_FILE="seed-validation.js"
TARGET="/app/seed-validation.js"

if [ ! -f "$SEED_FILE" ]; then
  echo "Seed introuvable: $SEED_FILE" >&2
  exit 1
fi

if ! docker ps --format "{{.Names}}" | grep -qx "$CONTAINER"; then
  echo "Conteneur introuvable ou arrete: $CONTAINER" >&2
  exit 1
fi

docker cp "$SEED_FILE" "$CONTAINER:$TARGET"
docker exec "$CONTAINER" node "$TARGET" "$@"
