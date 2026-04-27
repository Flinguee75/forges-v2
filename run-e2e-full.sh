#!/bin/bash

# Script pour exécuter les tests E2E avec seed frais
# Garantit l'idempotence en réinitialisant la DB avant chaque run

set -e  # Arrêter en cas d'erreur

echo "=========================================="
echo "FORGES - Suite E2E complète avec seed"
echo "=========================================="
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -d "forges-monorepo" ]; then
  echo "❌ Erreur: doit être exécuté depuis la racine du projet"
  exit 1
fi

# 1. Reset de la base de données
echo "📦 Étape 1/3: Réinitialisation de la base de données..."
cd forges-monorepo/backend
npx prisma db push --force-reset --accept-data-loss --skip-generate > /dev/null 2>&1
echo "✅ Base réinitialisée"
echo ""

# 2. Seed E2E
echo "🌱 Étape 2/3: Exécution du seed E2E..."
npm run prisma:seed:e2e > /dev/null 2>&1
echo "✅ Seed E2E complété"
echo ""

# 3. Tests Playwright
echo "🧪 Étape 3/3: Exécution des tests E2E Playwright..."
cd ../frontend
npx playwright test

# Afficher résumé
echo ""
echo "=========================================="
echo "Tests E2E terminés"
echo "=========================================="
