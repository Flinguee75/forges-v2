#!/bin/bash
set -e
ENV=$1
TAG=$2
if [ -z "$ENV" ]; then
  echo "Usage: $0 <dev|test|demo|edu> [tag]"
  exit 1
fi
# Construction temporaire
BUILD_DIR="/tmp/forges-build-$(date +%s)"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"
if [ -n "$TAG" ]; then
  git clone --branch "$TAG" https://github.com/forges-group/forges.git .
else
  git clone https://github.com/forges-group/forges.git .
fi
cd backend
npm ci
npm run build
npx prisma generate
# Tests (facultatif)
npm run test || { echo "Tests échoués, déploiement annulé"; exit 1; }
# Seed: non-interactif en CI via FORCE_SEED, interactif en local.
if [ -n "${FORCE_SEED:-}" ]; then
  SEED="$FORCE_SEED"
else
  read -p "Voulez-vous executer le seed (vider + recharger donnees) ? (oui/non) " SEED
fi
if [ "$SEED" = "true" ]; then
  SEED="oui"
fi
if [ "$SEED" = "oui" ]; then
  npx prisma migrate reset --force
  npx prisma db seed
fi
# Déploiement vers serveur Plesk (exemple)
# rsync -avz dist/ package.json prisma/ user@$ENV.forges-group.com:/var/www/vhosts/...
echo "Déploiement sur $ENV.forges-group.com terminé"
