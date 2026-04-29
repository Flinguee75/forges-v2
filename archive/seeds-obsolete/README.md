# Seeds Obsolètes - Archive

## 📁 Contenu de ce dossier

Ce dossier contient les fichiers seed qui ont été archivés car ils sont obsolètes ou dupliqués.

### 📄 Fichiers archivés :

- **`seed_for_test.js`** - Ancienne version à la racine (remplacée par `backend/seed_for_test.js`)
- **`seed-dev.js`** - Version développement JavaScript (backend/prisma)
- **`seed.ts`** - Version TypeScript (backend/prisma)
- **`seeds/`** - Dossier contenant :
  - `seed-demo-pejedec.js` - Seed spécifique démo PEJEDEC
  - `seed-dev.js` - Dupliqué de la version backend
  - `seed-validation.js` - Ancienne version de seed_for_test.js

## ✅ Seeds actifs conservés

Les seeds suivants sont toujours actifs et utilisés :

1. **`backend/seed_for_test.js`** - ✅ Seed principal adapté au schéma Prisma v4.8
2. **`backend/prisma/seed.e2e.ts`** - ✅ Seed pour tests E2E automatisés

## 🔄 Date d'archivage

**27 avril 2026** - Nettoyage des seeds obsolètes après adaptation du seed principal au schéma actuel.

## ⚠️ Notes

- Ces fichiers sont conservés pour référence mais ne sont plus utilisés
- Le seed principal (`backend/seed_for_test.js`) a été complètement adapté au schéma Prisma actuel
- Pour le développement, utiliser `backend/seed_for_test.js --reset`
