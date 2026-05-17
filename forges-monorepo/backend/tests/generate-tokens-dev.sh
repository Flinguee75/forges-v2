#!/usr/bin/env bash
# Generate fresh JWT tokens for Newman against dev environment
# Writes tokens directly into forges-v4.8.dev.postman_environment.json
# Run before newman on dev
set -euo pipefail

BASE_URL="https://dev.forges-group.com/api"
# Note: base_url in Newman env = https://dev.forges-group.com (sans /api)
# La collection ajoute /api/ elle-meme : {{base_url}}/api/auth/login
ENV_FILE="$(dirname "$0")/forges-v4.8.dev.postman_environment.json"
PASS="Test@FORGES2026!"

RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

login() {
  local email="$1"
  local role="$2"
  local token
  token=$(curl -sf -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${PASS}\"}" \
    | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

  if [ -z "$token" ]; then
    log_error "Login failed for ${email} (${role})"
    return
  fi

  # Inject token into environment file using node (available on the machine)
  node -e "
    const fs = require('fs');
    const env = JSON.parse(fs.readFileSync('${ENV_FILE}', 'utf8'));
    const entry = env.values.find(v => v.key === 'token_${role}');
    if (entry) entry.value = '${token}';
    fs.writeFileSync('${ENV_FILE}', JSON.stringify(env, null, 2));
  "
  log_info "token_${role} updated"
}

log_info "Generating tokens against ${BASE_URL}..."

login "admin@forges.ci"                    "admin"
login "agent-e2e@forges.ci"                "agent"
login "responsable-e2e@forges.ci"          "responsable"
login "superviseur-e2e@forges.ci"          "superviseur"
login "partenaire-e2e@forges.ci"           "partenaire"
login "apporteur-e2e@forges.ci"            "apporteur"
login "apprenant@forges.ci"                "apprenant"
login "apprenant3@forges.ci"               "apprenant3"
login "org@forges.ci"                      "organisation"
login "org2@forges.ci"                     "organisation2"

log_info "Done. Run Newman:"
echo ""
echo "  npx newman run tests/forges-v4.8-complete.postman_collection.json \\"
echo "    --environment tests/forges-v4.8.dev.postman_environment.json \\"
echo "    --reporters cli,htmlextra \\"
echo "    --reporter-htmlextra-export newman-report-dev.html"
