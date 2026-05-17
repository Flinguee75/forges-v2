#!/bin/bash
# Fix Nginx EDU pour proxy /api vers le backend

set -e

VPS_HOST="92.205.164.97"
VPS_USER="forgesadmin"
SSH_KEY="${HOME}/.ssh/id_ed25519_forges"

echo "=== Fix API EDU ==="
echo ""

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${VPS_USER}@${VPS_HOST} << 'EOF'
  set -e
  
  echo "[1/3] Backup config Nginx EDU..."
  sudo cp /etc/nginx/conf.d/edu.forges-group.com.conf /etc/nginx/conf.d/edu.forges-group.com.conf.backup.$(date +%Y%m%d_%H%M%S)
  
  echo "[2/3] Ajout location /api..."
  
  # Créer le bloc location /api à injecter
  LOCATION_API='\n    location /api {\n        proxy_pass http://127.0.0.1:3001;\n        proxy_http_version 1.1;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_set_header X-Forwarded-Host $host;\n        proxy_set_header X-Forwarded-Port $server_port;\n        proxy_connect_timeout 60s;\n        proxy_send_timeout 60s;\n        proxy_read_timeout 60s;\n    }\n'
  
  # Vérifier si location /api existe déjà
  if grep -q "location /api" /etc/nginx/conf.d/edu.forges-group.com.conf; then
    echo "location /api existe déjà"
  else
    # Injecter avant le premier location
    sudo sed -i "/location \//i\\$LOCATION_API" /etc/nginx/conf.d/edu.forges-group.com.conf
    echo "location /api ajouté"
  fi
  
  echo "[3/3] Test et reload Nginx..."
  sudo nginx -t && sudo systemctl reload nginx
  
  echo ""
  echo "✅ Fix terminé !"
  echo ""
  echo "Test API EDU:"
  echo "  curl https://edu.forges-group.com/api/health"
EOF

echo ""
echo "=== Terminé ==="
