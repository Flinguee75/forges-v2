#!/usr/bin/env bash
set -euo pipefail

# Script d'exécution du load test paiements NGSER
# Usage: ./run-load-test.sh [local|staging]

ENVIRONMENT="${1:-local}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOAD_SCRIPT="${SCRIPT_DIR}/paiements-ngser-load.js"

echo "=== FORGES Load Test Paiements NGSER ==="
echo "Environnement: ${ENVIRONMENT}"
echo ""

# Configuration par environnement
case "${ENVIRONMENT}" in
  local)
    export API_URL="http://127.0.0.1:3000/api"
    export ADMIN_EMAIL="admin@forges-test.ci"
    export ADMIN_PASSWORD="Test@FORGES2026!"
    export WEBHOOK_SECRET="dev-secret"
    ;;
  staging)
    export API_URL="https://recette.forges.ci/api"
    export ADMIN_EMAIL="${STAGING_ADMIN_EMAIL:-admin@forges-staging.ci}"
    export ADMIN_PASSWORD="${STAGING_ADMIN_PASSWORD}"
    export WEBHOOK_SECRET="${STAGING_WEBHOOK_SECRET}"
    ;;
  production)
    echo "ERREUR: Load test non autorisé en production"
    exit 1
    ;;
  *)
    echo "ERREUR: Environnement invalide. Usage: ./run-load-test.sh [local|staging]"
    exit 1
    ;;
esac

# Vérifier que k6 est installé
if ! command -v k6 &> /dev/null; then
  echo "ERREUR: k6 n'est pas installé"
  echo ""
  echo "Installation:"
  echo "  macOS:   brew install k6"
  echo "  Linux:   sudo apt-get install k6"
  echo "  Docker:  docker pull grafana/k6"
  echo ""
  exit 1
fi

# Vérifier que le backend est accessible
echo "Vérification connectivité backend..."
if ! curl -f -s "${API_URL}/../../health" > /dev/null; then
  echo "ERREUR: Backend non accessible à ${API_URL}"
  exit 1
fi
echo "✓ Backend accessible"
echo ""

# Note: Base de données doit être seedée avant de lancer le load test
# Utilise: cd backend && node seed_for_test.js --reset
echo "Note: Ensure database is seeded before running load test"
echo "      Run: cd ../.. && node seed_for_test.js --reset"
echo ""

# Exécuter le load test
echo "=== Démarrage load test ==="
echo "Configuration:"
echo "  - Durée totale: ~4 minutes"
echo "  - VUs max: 50"
echo "  - Scénario: Inscription → Paiement → Webhook"
echo ""

k6 run \
  --out json=load-test-results.json \
  --summary-export=load-test-summary.json \
  "${LOAD_SCRIPT}"

# Afficher résumé
echo ""
echo "=== RÉSULTATS ==="
if [[ -f "load-test-summary.json" ]]; then
  cat load-test-summary.json | jq '.metrics | {
    "Total requêtes": .http_reqs.values.count,
    "Requêtes échouées": .failed_requests.values.rate,
    "Latence p95 (ms)": .http_req_duration.values."p(95)",
    "Initiation paiement p95 (ms)": .paiement_duration.values."p(95)",
    "Webhook p95 (ms)": .webhook_duration.values."p(95)"
  }'
else
  echo "⚠ Fichier résumé non trouvé"
fi

echo ""
echo "Fichiers générés:"
echo "  - load-test-results.json (détails complets)"
echo "  - load-test-summary.json (résumé métriques)"
echo ""
echo "Analyse détaillée:"
echo "  k6 cloud load-test-results.json  # Upload vers k6 Cloud (optionnel)"
echo "  cat load-test-results.json | jq '.metrics'  # Voir toutes les métriques"
