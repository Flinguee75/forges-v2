#!/bin/bash

# FORGES - Trivy Image Scanner
# Scan de sécurité des images Docker avant déploiement
# Usage: ./trivy-scan.sh <image> [environment]
# Date: 4 mai 2026

set -e

IMAGE=${1:-forges-backend:latest}
ENVIRONMENT=${2:-dev}
SEVERITY=${SEVERITY:-"HIGH,CRITICAL"}
OUTPUT_DIR="./trivy-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$OUTPUT_DIR/trivy_${ENVIRONMENT}_${TIMESTAMP}.html"

# Créer le dossier des rapports
mkdir -p "$OUTPUT_DIR"

echo "🔍 Scanning image: $IMAGE for environment: $ENVIRONMENT"
echo "⚠️  Severity levels: $SEVERITY"
echo ""

# Vérifier que Trivy est installé
if ! command -v trivy &> /dev/null; then
    echo "❌ Trivy not found. Install it with: brew install trivy"
    exit 1
fi

# Scan complet avec rapport HTML
echo "📊 Generating detailed report..."
trivy image "$IMAGE" \
    --format template \
    --template '@/contrib/html.tpl' \
    --output "$REPORT_FILE" \
    --severity "$SEVERITY" \
    2>&1 || true

# Scan bloquant (CRITICAL seulement)
echo ""
echo "🛑 Running blocking scan (CRITICAL only)..."
if trivy image "$IMAGE" \
    --severity CRITICAL \
    --exit-code 1 \
    --no-progress \
    2>&1; then
    echo "✅ No CRITICAL vulnerabilities found"
else
    echo "❌ CRITICAL vulnerabilities detected!"
    echo "📄 Full report: $REPORT_FILE"
    exit 1
fi

# Scan de configuration (misconfigurations, secrets)
echo ""
echo "🔐 Scanning for misconfigurations and secrets..."
trivy image "$IMAGE" \
    --scanners config,secret \
    --severity HIGH,CRITICAL \
    2>&1 || true

# SBOM (Software Bill of Materials)
echo ""
echo "📦 Generating SBOM..."
trivy image "$IMAGE" \
    --format cyclonedx \
    --output "$OUTPUT_DIR/sbom_${ENVIRONMENT}_${TIMESTAMP}.json" \
    2>&1 || true

echo ""
echo "✅ Scan completed successfully!"
echo "📄 Report saved to: $REPORT_FILE"
echo "📦 SBOM saved to: $OUTPUT_DIR/sbom_${ENVIRONMENT}_${TIMESTAMP}.json"
