# FORGES - Setup Monitoring Complet (DEV/TEST/DEMO)

_Mise à jour: 4 mai 2026_

## 📋 Vue d'ensemble

Cette documentation couvre l'installation et la configuration de la stack monitoring pour les trois environnements: **DEV**, **TEST**, et **DEMO**.

**Stack retenue:**
- **Portainer CE** - Interface Docker
- **Uptime Kuma** - Surveillance disponibilité
- **Sentry** - Crash reporting applicatif
- **Better Stack / Logtail** - Centralisation des logs
- **Trivy** - Scan sécurité des images

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│  Environnement (DEV/TEST/DEMO)      │
├─────────────────────────────────────┤
│ Backend | Frontend | PostgreSQL     │
│         | Redis    |                │
└──────────┬──────────────────────────┘
           │
        ┌──┴──────────────────┐
        │ Local Monitoring    │
        ├──────────────────────┤
        │ - Portainer CE       │
        │ - Uptime Kuma        │
        │ - Trivy              │
        └──┬────────────────────┘
           │
        ┌──┴──────────────────┐
        │ External Monitoring │
        ├──────────────────────┤
        │ - Sentry             │
        │ - Better Stack       │
        └──────────────────────┘
```

---

## 🚀 Installation Rapide

### Prérequis

```bash
# Vérifier Docker
docker --version
docker compose version

# Vérifier les outils (optionnel en DEV)
curl --version
```

### 1️⃣ DEV Environment

```bash
cd forges-monorepo/infra/monitoring

# Rendre les scripts exécutables
chmod +x monitoring-dev.sh

# Démarrer le monitoring
./monitoring-dev.sh start

# Vérifier le statut
./monitoring-dev.sh status

# Accéder aux interfaces
# - Portainer: https://localhost:9443
# - Uptime Kuma: http://localhost:3001
```

### 2️⃣ TEST Environment

```bash
# Démarrer le monitoring
./monitoring-test.sh start

# Vérifier le statut
./monitoring-test.sh status

# Configuration post-installation requise ⚠️
# Voir "Configuration Sentry" et "Configuration Better Stack"
```

### 3️⃣ DEMO Environment

```bash
# Démarrer le monitoring
./monitoring-demo.sh start

# Vérifier le statut et l'intégrité
./monitoring-demo.sh health

# Backup de la configuration
./monitoring-demo.sh backup
```

---

## 🔧 Configuration Détaillée

### A. Configuration Sentry (Backend)

#### 1. Installer Sentry SDK

```bash
cd forges-monorepo/backend
npm install @sentry/node
```

#### 2. Créer des projets Sentry

Aller sur https://sentry.io/ et créer **3 projets**:
- `forges-backend-dev`
- `forges-backend-test`
- `forges-backend-demo`

**Configuration pour chacun:**
- Platform: Node.js / Express
- Environment: Respectivement dev, test, demo
- Récupérer les **DSN**

#### 3. Ajouter les variables d'environnement

Créer `.env.dev`, `.env.test`, `.env.demo` dans `backend/`:

```env
# .env.dev
NODE_ENV=development
SENTRY_DSN_DEV=https://YOUR_DEV_DSN@sentry.io/PROJ_ID_DEV
SENTRY_ENVIRONMENT=dev
LOG_LEVEL=debug

# .env.test
NODE_ENV=test
SENTRY_DSN_TEST=https://YOUR_TEST_DSN@sentry.io/PROJ_ID_TEST
SENTRY_ENVIRONMENT=test
LOG_LEVEL=info

# .env.demo
NODE_ENV=demo
SENTRY_DSN_DEMO=https://YOUR_DEMO_DSN@sentry.io/PROJ_ID_DEMO
SENTRY_ENVIRONMENT=demo
LOG_LEVEL=warn
```

#### 4. Initialiser Sentry dans app.ts

```typescript
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './config/sentry';

// Au démarrage
initSentry();

// Avant les routes
app.use(sentryRequestHandler());

// Après les routes (dernière position)
app.use(sentryErrorHandler());
```

#### 5. Tester l'intégration

```bash
# Dans le backend
npm run dev

# En autre terminal, déclencher une erreur de test
curl -X POST http://localhost:3000/test-error

# Vérifier dans Sentry dashboard
```

### B. Configuration Better Stack / Logtail

#### 1. Créer des sources logs

Aller sur https://betterstack.com/:

1. Créer **3 sources** (une par environnement):
   - DEV source
   - TEST source
   - DEMO source

2. Pour chacune:
   - Type: **Node.js**
   - Sauvegarder le **SOURCE TOKEN**

#### 2. Ajouter les tokens aux .env

```env
# .env.dev
LOGTAIL_TOKEN_DEV=your_dev_token_here

# .env.test
LOGTAIL_TOKEN_TEST=your_test_token_here

# .env.demo
LOGTAIL_TOKEN_DEMO=your_demo_token_here
```

#### 3. Utiliser le logger dans le backend

```typescript
import { getLogger } from './config/logger';

const logger = getLogger(process.env.NODE_ENV);

// Logs simples
logger.info('Application started', { port: 3000 });

// Erreurs
logger.error('Failed to connect to DB', dbError);

// Événements critiques
logger.criticalEvent('PAYMENT_WEBHOOK_FAILED', {
  dossierId: '123',
  error: 'Timeout',
});

// Webhooks
logger.webhook('payment.completed', 200, body);
```

#### 4. Configurer les alertes dans Better Stack

1. Aller dans "Alerts"
2. Créer une alerte par environnement:
   - Condition: `message contains "ERROR"` ou `"CRITICAL"`
   - Notification: Email ou Slack
   - Seuil: Immédiat

---

## 📊 Configuration Uptime Kuma

### Monitors à créer par environnement

#### DEV Environment

| Monitor | URL | Intervalle | Timeout |
|---------|-----|-----------|---------|
| Frontend Dev | http://localhost:3000 | 60s | 30s |
| Backend Dev | http://localhost:3001/health | 60s | 30s |

#### TEST Environment

| Monitor | URL | Intervalle | Timeout |
|---------|-----|-----------|---------|
| Frontend Test | https://test-forges.com | 60s | 30s |
| Backend Test | https://test-forges.com/api/health | 60s | 30s |

#### DEMO Environment

| Monitor | URL | Intervalle | Timeout |
|---------|-----|-----------|---------|
| Frontend Demo | https://demo-forges.com | 30s | 30s |
| Backend Demo | https://demo-forges.com/api/health | 30s | 30s |
| Payment API | https://demo-forges.com/api/payments/health | 60s | 30s |

### Configurer les alertes

1. Accéder à Uptime Kuma: http://localhost:3001
2. Pour chaque monitor:
   - Cliquer sur "Edit"
   - Aller à "Notifications"
   - Configurer: Email, Slack, ou Telegram
   - Sauvegarder

---

## 🔐 Scan Sécurité avec Trivy

### Avant chaque déploiement

```bash
cd forges-monorepo/infra/monitoring

# Scan DEV
./trivy-scan.sh forges-backend:latest dev
./trivy-scan.sh forges-frontend:latest dev

# Scan TEST
./trivy-scan.sh forges-backend:latest test
./trivy-scan.sh forges-frontend:latest test

# Scan DEMO
./trivy-scan.sh forges-backend:latest demo
./trivy-scan.sh forges-frontend:latest demo
```

### Résultats

- Rapports générés dans `trivy-reports/`
- Format: HTML pour navigation facile
- SBOM généré en JSON pour traçabilité

### Règles

- ⚠️ **HIGH** vulnerability: À analyser avant déploiement
- 🛑 **CRITICAL** vulnerability: Blocage déploiement sauf exception documentée

---

## 📝 Maintenance Quotidienne

### DEV Environment

```bash
# Voir les logs
./monitoring-dev.sh logs

# Voir les logs Portainer
./monitoring-dev.sh logs:portainer

# Voir les logs Uptime Kuma
./monitoring-dev.sh logs:uptime-kuma

# Redémarrer
./monitoring-dev.sh restart
```

### TEST Environment

```bash
# Même commandes que DEV
./monitoring-test.sh start
./monitoring-test.sh status
./monitoring-test.sh health
./monitoring-test.sh logs
```

### DEMO Environment

```bash
# Avec options supplémentaires
./monitoring-demo.sh health    # Santé complète
./monitoring-demo.sh backup    # Backup Uptime Kuma
./monitoring-demo.sh status    # Statut détaillé
```

---

## ✅ Checklist de Validation

### Portainer

- [ ] Accessible en HTTPS sur le port 9443
- [ ] Compte admin créé
- [ ] Tous les conteneurs visibles
- [ ] Logs consultables
- [ ] Volumes visibles et accessibles
- [ ] Redémarrage manuel possible

### Uptime Kuma

- [ ] Accessible sur http://localhost:3001
- [ ] Tous les monitors créés
- [ ] Tous les monitors affichent "UP"
- [ ] Alertes configurées
- [ ] Test d'alerte reçu (déclencher volontairement)

### Sentry

- [ ] Projet créé sur sentry.io
- [ ] DSN configuré dans .env
- [ ] Erreur test capturée et visible
- [ ] Stack trace complète visible
- [ ] Environnement correct affiché

### Better Stack / Logtail

- [ ] Source créée sur betterstack.com
- [ ] Token configuré dans .env
- [ ] Logs du backend visibles
- [ ] Recherche par mot-clé fonctionne
- [ ] Alerte configurée pour les erreurs

### Trivy

- [ ] Images scannées sans CRITICAL
- [ ] Rapports générés en HTML
- [ ] SBOM générés en JSON
- [ ] Résultats consultables

---

## 🚨 Procédure Post-Déploiement

Après chaque mise à jour:

```bash
# 1. Vérifier le statut
./monitoring-[env].sh status

# 2. Vérifier la santé
./monitoring-[env].sh health

# 3. Vérifier les logs
./monitoring-[env].sh logs

# 4. Vérifier dans Portainer:
#    - Conteneurs en state "running"
#    - Aucun restart inattendu
#    - Pas d'erreur visible

# 5. Vérifier dans Sentry:
#    - Aucun crash backend
#    - Aucune nouvelle erreur

# 6. Vérifier dans Better Stack:
#    - Pas d'erreur CRITICAL
#    - Logs ingérés normalement

# 7. Vérifier dans Uptime Kuma:
#    - Tous les monitors UP
#    - Pas d'alerte active
```

---

## 🔄 Gestion des Erreurs

### Portainer ne démarre pas

```bash
docker logs portainer-[env]
docker volume ls | grep portainer
docker compose -f docker-compose.monitoring.[env].yml restart portainer
```

### Uptime Kuma ne démarre pas

```bash
docker logs uptime-kuma-[env]
docker volume ls | grep uptime
docker compose -f docker-compose.monitoring.[env].yml restart uptime-kuma
```

### Sentry ne capture pas les erreurs

```bash
# Vérifier le DSN
echo $SENTRY_DSN_[ENV]

# Vérifier l'initialisation dans app.ts
# Vérifier les logs Sentry

# Test manuel
npm run dev
curl -X POST http://localhost:3000/test-error
```

### Better Stack ne reçoit pas les logs

```bash
# Vérifier le token
echo $LOGTAIL_TOKEN_[ENV]

# Vérifier l'utilisation du logger
// Dans le code: logger.info(), logger.error()

# Vérifier dans Better Stack dashboard
```

---

## 📚 Ressources & Documentation

| Outil | Documentation | Support |
|-------|--------------|---------|
| Portainer | https://docs.portainer.io | Commercial |
| Uptime Kuma | https://github.com/louislam/uptime-kuma | Community |
| Sentry | https://docs.sentry.io | Commercial |
| Better Stack | https://docs.betterstack.com | Commercial |
| Trivy | https://github.com/aquasecurity/trivy | Community |

---

## 📞 Support & Questions

Pour des questions spécifiques à FORGES:
1. Consulter les logs (voir "Maintenance Quotidienne")
2. Consulter Sentry pour les erreurs backend
3. Consulter Better Stack pour les logs
4. Consulter Uptime Kuma pour la disponibilité

---

**Document créé: 4 mai 2026**
**Auteur: FORGES DevOps Team**
**Statut: Production Ready**
