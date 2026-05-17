#!/bin/bash
# Fix Nginx EDU pour /api/health → /health

set -e

VPS_HOST="92.205.164.97"
VPS_USER="forgesadmin"
SSH_KEY="${HOME}/.ssh/id_ed25519_forges"

echo "=== Fix /api/health EDU ==="
echo ""

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${VPS_USER}@${VPS_HOST} << 'EOF'
  set -e
  
  echo "[1/2] Backup config..."
  sudo cp /etc/nginx/conf.d/edu.forges-group.com.conf /etc/nginx/conf.d/edu.forges-group.com.conf.backup.$(date +%Y%m%d_%H%M%S)
  
  echo "[2/2] Ajout règle /api/health..."
  
  # Créer le bloc location spécifique pour /api/health
  LOCATION_HEALTH='\n    location = /api/health {\n        rewrite ^/api/health$ /health break;\n        proxy_pass http://127.0.0.1:3001;\n        proxy_http_version 1.1;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n'
  
  # Vérifier si la règle existe
  if grep -q "location = /api/health" /etc/nginx/conf.d/edu.forges-group.com.conf; then
    echo "Règle /api/health existe déjà"
  else
    # Ajouter avant le location /api général
    sudo sed -i "/location \/api.*{/i\\$LOCATION_HEALTH" /etc/nginx/conf.d/edu.forges-group.com.conf
    echo "Règle /api/health ajoutée"
  fi
  
  echo "Test Nginx..."
  sudo nginx -t && sudo systemctl reload nginx
  
  echo "✅ Terminé !"
  echo ""
  echo "Test: curl https://edu.forges-group.com/api/health"
EOF

echo ""
echo "=== Done ==="
