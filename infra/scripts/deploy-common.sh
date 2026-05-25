#!/usr/bin/env bash
set -euo pipefail

if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE_BIN="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE_BIN="docker-compose"
else
  echo "Docker Compose is required on the VPS" >&2
  exit 1
fi

run_compose() {
  if [ "${DOCKER_COMPOSE_BIN}" = "docker-compose" ]; then
    docker-compose "$@"
  else
    docker compose "$@"
  fi
}

wait_for_http() {
  local url="$1"
  local attempts="${2:-24}"
  local sleep_seconds="${3:-5}"

  for ((i = 1; i <= attempts; i++)); do
    if curl --fail --silent --show-error "${url}" >/dev/null; then
      return 0
    fi
    echo "Waiting for ${url} (${i}/${attempts})..."
    sleep "${sleep_seconds}"
  done

  echo "Timed out waiting for ${url}" >&2
  return 1
}

verify_prisma_schema() {
  local backend_container="$1"

  echo "Checking Prisma schema drift in container ${backend_container}..."
  if ! docker exec "${backend_container}" sh -lc \
    'npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code >/tmp/prisma-diff.log 2>&1'; then
    echo "Prisma schema drift detected on ${backend_container}. Deployment blocked." >&2
    docker exec "${backend_container}" sh -lc "cat /tmp/prisma-diff.log || true" >&2
    echo "Run a controlled DB sync before retrying deploy (migrations preferred)." >&2
    return 1
  fi

  echo "Prisma schema check passed on ${backend_container}"
}

deploy_environment() {
  local env_name="$1"
  local compose_file="$2"
  local env_file="$3"
  local frontend_url="$4"
  local backend_port="$5"
  local backend_container="$6"

  : "${IMAGE_TAG:?IMAGE_TAG is required}"
  : "${BACKEND_IMAGE:?BACKEND_IMAGE is required}"
  : "${GHCR_USERNAME:?GHCR_USERNAME is required}"
  : "${GHCR_TOKEN:?GHCR_TOKEN is required}"

  if [ ! -f "${compose_file}" ]; then
    echo "Missing compose file: ${compose_file}" >&2
    exit 1
  fi

  if [ ! -f "${env_file}" ]; then
    echo "Missing env file: ${env_file}" >&2
    exit 1
  fi

  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USERNAME}" --password-stdin

  export BACKEND_IMAGE IMAGE_TAG
  export BACKEND_IMAGE_REF="${BACKEND_IMAGE_REF:-${BACKEND_IMAGE}:${env_name}-${IMAGE_TAG}}"

  run_compose -f "${compose_file}" --env-file "${env_file}" pull
  run_compose -f "${compose_file}" --env-file "${env_file}" rm -sf || true
  run_compose -f "${compose_file}" --env-file "${env_file}" up -d --remove-orphans --force-recreate
  run_compose -f "${compose_file}" --env-file "${env_file}" ps

  wait_for_http "http://127.0.0.1:${backend_port}/health"
  verify_prisma_schema "${backend_container}"

  echo "Deployment ${env_name} succeeded for ${frontend_url}"
}
