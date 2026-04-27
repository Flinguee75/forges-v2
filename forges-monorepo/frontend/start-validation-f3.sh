#!/bin/bash

# Script de démarrage pour validation F-3
# Lance backend + frontend pour tester l'authentification

echo "🚀 Démarrage de l'environnement de validation F-3"
echo ""

# Vérifier que le backend existe
if [ ! -d "../src" ]; then
  echo "❌ Erreur: backend non trouvé"
  exit 1
fi

# Démarrer le backend en arrière-plan
echo "📦 Démarrage du backend (port 3000)..."
cd .. && npm run dev > /tmp/forges-backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend démarré (PID: $BACKEND_PID)"

# Attendre que le backend soit prêt
echo "⏳ Attente du backend..."
for i in {1..30}; do
  if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Backend prêt!"
    break
  fi
  sleep 1
  if [ $i -eq 30 ]; then
    echo "❌ Timeout: backend ne répond pas"
    kill $BACKEND_PID 2>/dev/null
    exit 1
  fi
done

# Démarrer le frontend
echo "🎨 Démarrage du frontend (port 5173)..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Environnement prêt!"
echo ""
echo "📋 Services démarrés:"
echo "  - Backend:  http://localhost:3000/api"
echo "  - Frontend: http://localhost:5173"
echo ""
echo "🔑 Compte de test disponible:"
echo "  - Email:    admin@forges.ci"
echo "  - Password: Admin123!"
echo "  - Rôle:     ADMIN"
echo ""
echo "📖 Suivre la checklist de validation dans: frontend/VALIDATION_F3.md"
echo ""
echo "🛑 Pour arrêter les services:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Attendre la fin
wait
