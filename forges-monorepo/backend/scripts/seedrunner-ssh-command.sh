#!/usr/bin/env bash
set -euo pipefail

COMMAND="${SSH_ORIGINAL_COMMAND:-check}"

case "$COMMAND" in
  check|--check)
    exec /opt/forges-seed/run-seed-validation.sh --check --env-test
    ;;
  reset|--reset)
    exec /opt/forges-seed/run-seed-validation.sh --reset --env-test
    ;;
  *)
    echo "Commande autorisee: check ou reset" >&2
    exit 2
    ;;
esac
