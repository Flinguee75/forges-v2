# FORGES - Quick Start Guide - Monitoring

_Mise en place rapide du monitoring - 30 minutes_

## 🎯 Objectif

Mettre en place un monitoring fonctionnel pour dev/test/demo avec alertes actives.

## ⏱️ Estimation Temps

- **DEV**: 5 minutes (gratuit, local)
- **TEST**: 10 minutes (+ 10 min création comptes externes)
- **DEMO**: 15 minutes (+ setup sécurité)

## 🔑 Prérequis

```bash
# Vérifier
docker --version
docker compose version

# Optionnel (Trivy)
brew install trivy  # macOS
apt-get install trivy  # Linux
```

---

## 📌 ÉTAPE 1: DEV Environment (5 min)

### 1.1 Démarrer le monitoring

```bash
cd forges-monorepo/infra/monitoring
chmod +x *.sh

./monitoring-dev.sh start
```

### 1.2 Accéder aux interfaces

```bash
# Dans votre navigateur:
# - Portainer: https://localhost:9443
# - Uptime Kuma: http://localhost:3001
```

### 1.3 Configuration Portainer

1. Aller sur https://localhost:9443
2. Créer un compte admin
3. Sélectionner "Docker local"
4. Vérifier que vos conteneurs sont visibles

### 1.4 Vérifier le statut

```bash
./monitoring-dev.sh status
./monitoring-dev.sh health
```

✅ **DEV prêt!**

---

## 📌 ÉTAPE 2: TEST Environment (20 min)

### 2.1 Créer les comptes externes (10 min)

#### Sentry

1. Aller sur https://sentry.io
2. S'inscrire ou se connecter
3. Créer un nouveau projet:
   - **Platform**: Node.js / Express
   - **Environment**: test
   - **Name**: forges-backend-test
4. Sauvegarder le **DSN** (format: `https://xxx@sentry.io/xxx`)

#### Better Stack

1. Aller sur https://betterstack.com
2. S'inscrire ou se connecter
3. Créer une nouvelle source:
   - **Type**: Node.js
   - **Name**: FORGES Test Logs
4. Sauvegarder le **SOURCE TOKEN**

### 2.2 Configurer les variables d'environnement (5 min)

```bash
cd backend

# Dupliquer le template
cp .env.monitoring.example .env.test

# Éditer
nano .env.test
```

Ajouter:

```env
NODE_ENV=test
SENTRY_DSN_TEST=https://YOUR_TEST_DSN@sentry.io/PROJECT_ID
LOGTAIL_TOKEN_TEST=YOUR_TEST_TOKEN
LOG_LEVEL=info
```

### 2.3 Démarrer le monitoring TEST (3 min)

```bash
cd infra/monitoring

./monitoring-test.sh start

# Vérifier
./monitoring-test.sh status
```

### 2.4 Configuration Uptime Kuma pour TEST (2 min)

1. Accéder http://localhost:3001
2. Créer les monitors:

| Nom | URL | Intervalle |
|-----|-----|-----------|
| Frontend Test | https://test-forges.com | 60s |
| API Test | https://test-forges.com/api/health | 60s |

3. Pour chaque monitor, ajouter notification (email ou Slack)

✅ **TEST configuré!**

---

## 📌 ÉTAPE 3: DEMO Environment (15 min)

### 3.1 Créer les comptes externes (5 min)

Répéter l'ÉTAPE 2.1 avec:
- **Sentry**: forges-backend-demo
- **Better Stack**: FORGES Demo Logs

### 3.2 Configurer les variables d'environnement (3 min)

```bash
cd backend

cp .env.monitoring.example .env.demo

nano .env.demo
```

Ajouter:

```env
NODE_ENV=demo
SENTRY_DSN_DEMO=https://YOUR_DEMO_DSN@sentry.io/PROJECT_ID
LOGTAIL_TOKEN_DEMO=YOUR_DEMO_TOKEN
LOG_LEVEL=warn
```

### 3.3 Démarrer le monitoring DEMO (2 min)

```bash
cd infra/monitoring

./monitoring-demo.sh start

# Vérifier
./monitoring-demo.sh health
```

### 3.4 Configuration Uptime Kuma pour DEMO (3 min)

1. Accéder http://localhost:3001
2. Créer les monitors:

| Nom | URL | Intervalle |
|-----|-----|-----------|
| Frontend Demo | https://demo-forges.com | 30s |
| API Demo | https://demo-forges.com/api/health | 30s |
| Payment API | https://demo-forges.com/api/payments/health | 60s |

3. Ajouter notifications (email + Slack)

### 3.5 Backup de la configuration (1 min)

```bash
./monitoring-demo.sh backup
```

✅ **DEMO configuré!**

---

## ✅ Validation Finale

### DEV

```bash
./monitoring-dev.sh status
# Doit afficher: portainer-dev et uptime-kuma-dev en "running"
```

### TEST

```bash
./monitoring-test.sh health
# Doit afficher: Portainer OK, Uptime Kuma OK
```

### DEMO

```bash
./monitoring-demo.sh health
# Doit afficher tous les services OK + volumes OK
```

### Sentry (TEST & DEMO)

```bash
cd backend
npm run dev

# En autre terminal:
curl -X POST http://localhost:3000/test-error

# Vérifier dans Sentry dashboard: erreur reçue ✅
```

### Better Stack (TEST & DEMO)

```bash
# Dans le code backend, utiliser le logger:
import { getLogger } from './config/logger';
const logger = getLogger();

logger.info('Test log from backend');
logger.error('Test error message');

# Vérifier dans Better Stack dashboard: logs visibles ✅
```

---

## 📊 Dashboard Résumé

| Outil | DEV | TEST | DEMO |
|-------|-----|------|------|
| **Portainer** | https://localhost:9443 | https://localhost:9443 | https://localhost:9443 |
| **Uptime Kuma** | http://localhost:3001 | http://localhost:3001 | http://localhost:3001 |
| **Sentry** | - | https://sentry.io | https://sentry.io |
| **Better Stack** | - | https://betterstack.com | https://betterstack.com |

---

## 🔧 Commandes Rapides

```bash
# DEV
npm run monitoring:dev:start
npm run monitoring:dev:status
npm run monitoring:dev:logs

# TEST
npm run monitoring:test:start
npm run monitoring:test:health

# DEMO
npm run monitoring:demo:start
npm run monitoring:demo:health
npm run monitoring:demo:backup

# Trivy
npm run trivy:scan:backend:demo
npm run trivy:scan:frontend:demo
```

---

## 🚨 Problèmes Courants

### Portainer ne démarre pas

```bash
docker logs portainer-dev
docker compose -f docker-compose.monitoring.dev.yml restart portainer
```

### Uptime Kuma ne démarre pas

```bash
docker logs uptime-kuma-test
# Vérifier les ports 3001 disponibles
```

### Sentry ne reçoit pas d'erreurs

```bash
# Vérifier DSN
echo $SENTRY_DSN_TEST

# Vérifier initialisation dans backend/src/app.ts
# Vérifier npm install @sentry/node
```

### Better Stack ne reçoit pas de logs

```bash
# Vérifier token
echo $LOGTAIL_TOKEN_TEST

# Vérifier utilisation dans le code:
import { getLogger } from './config/logger';
const logger = getLogger();
logger.info('test');
```

---

## 📚 Documentation Complète

Pour aller plus loin, voir:
- [README.md](./README.md) - Vue d'ensemble
- [SETUP_MONITORING.md](./SETUP_MONITORING.md) - Setup détaillé
- [.env.monitoring.example](../backend/.env.monitoring.example) - Variables d'env

---

## ✨ Prochaines Étapes

Après ce setup:

1. **Configurer les alertes** (email/Slack/Telegram)
2. **Tester les alertes** en forçant une erreur
3. **Créer des dashboards** dans Better Stack
4. **Automatiser les scans Trivy** avant déploiement
5. **Monitorer les paiements** (webhook critique)

---

## 🎉 Congratulations!

Vous avez maintenant un monitoring complet pour dev/test/demo! 🚀

Temps total: ~30 minutes  
Coût: **$0** (pour le démarrage)

---

**Guide créé**: 4 mai 2026  
**Auteur**: FORGES DevOps Team
