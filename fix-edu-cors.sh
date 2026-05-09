#!/bin/bash
# Fix CORS pour edu.forges-group.com
# Ce script met à jour les variables d'environnement sur le VPS pour accepter edu.forges-group.com

set -e

VPS_HOST="92.205.164.97"
VPS_USER="forgesadmin"
ENV_PATH="/var/www/vhosts/dev.forges-group.com/httpdocs/.env"
SSH_KEY="${HOME}/.ssh/id_ed25519_forges"

echo "=== Fix CORS pour edu.forges-group.com ==="
echo ""

# Vérifier que la clé SSH existe
if [ ! -f "$SSH_KEY" ]; then
  echo "❌ Clé SSH non trouvée: $SSH_KEY"
  echo "Cherche clé alternative..."
  SSH_KEY="${HOME}/.ssh/id_rsa"
  if [ ! -f "$SSH_KEY" ]; then
    echo "❌ Aucune clé SSH trouvée. Utilisez ssh-keygen ou indiquez le chemin manuellement."
    exit 1
  fi
fi

echo "✅ Utilisation de la clé: $SSH_KEY"
echo ""

# SSH et modification de l'env
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${VPS_USER}@${VPS_HOST} << 'EOF'
  set -e
  
  ENV_PATH="/var/www/vhosts/dev.forges-group.com/httpdocs/.env"
  
  echo "[1/4] Vérification de l'environnement actuel..."
  if [ -f "$ENV_PATH" ]; then
    echo "Fichier .env trouvé"
    grep -E "^(CORS_ORIGINS|FRONTEND_URL)=" "$ENV_PATH" || echo "Variables CORS non trouvées"
  else
    echo "ERREUR: Fichier .env non trouvé à $ENV_PATH"
    exit 1
  fi
  
  echo ""
  echo "[2/4] Mise à jour CORS_ORIGINS..."
  
  # Backup
  cp "$ENV_PATH" "${ENV_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
  
  # Supprimer ancienne ligne CORS_ORIGINS si existe
  sed -i '/^CORS_ORIGINS=/d' "$ENV_PATH"
  
  # Ajouter nouvelle ligne avec dev et edu
  echo "CORS_ORIGINS=https://dev.forges-group.com,https://edu.forges-group.com" >> "$ENV_PATH"
  
  echo "CORS_ORIGINS mis à jour:"
  grep "^CORS_ORIGINS=" "$ENV_PATH"
  
  echo ""
  echo "[3/4] Mise à jour FRONTEND_URL (pour compatibilité)..."
  sed -i '/^FRONTEND_URL=/d' "$ENV_PATH"
  echo "FRONTEND_URL=https://dev.forges-group.com" >> "$ENV_PATH"
  
  echo "FRONTEND_URL mis à jour:"
  grep "^FRONTEND_URL=" "$ENV_PATH"
  
  echo ""
  echo "[4/4] Redémarrage du container backend..."
  cd /var/www/vhosts/dev.forges-group.com/httpdocs
  
  # Redémarrer le backend pour prendre en compte les nouvelles variables
  docker restart forges-backend-dev
  
  echo "Attente du redémarrage..."
  sleep 10
  
  # Vérifier healthcheck
  for i in $(seq 1 12); do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' forges-backend-dev 2>/dev/null || echo "unknown")
    echo "  [$i/12] Health status: $STATUS"
    if [ "$STATUS" = "healthy" ]; then
      echo "✅ Backend redémarré avec succès"
      break
    fi
    sleep 5
  done
  
  echo ""
  echo "=== Fix terminé ==="
  echo ""
  echo "Testez maintenant:"
  echo "  curl -I https://edu.forges-group.com/api/health"
  echo "  curl -H 'Origin: https://edu.forges-group.com' -I https://dev.forges-group.com/api/health"
EOF

echo ""
echo "Script exécuté avec succès !"
