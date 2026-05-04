# FORGES - Installation Checklist

_Checklist d'installation complète du monitoring_

## ✅ PRÉ-REQUIS

### Infrastructure

- [ ] Docker installé et fonctionnel
- [ ] Docker Compose v2+ installé
- [ ] Ports 9443 (Portainer), 3001 (Uptime Kuma) disponibles
- [ ] Accès internet pour services externes (Sentry, Better Stack)
- [ ] Git configuré pour push/pull

### Outils (optionnel)

- [ ] Trivy installé (pour scans sécurité)
- [ ] Curl installé (pour tests)

---

## 📦 ÉTAPE 1: TÉLÉCHARGER & PRÉPARER

### Repository Setup

- [ ] Repository FORGES cloné
- [ ] Branche `develop` active
- [ ] Dossier `infra/monitoring` existe
- [ ] Fichiers `.sh` téléchargés

### Fichiers Nécessaires

- [ ] `docker-compose.monitoring.dev.yml` ✓
- [ ] `docker-compose.monitoring.test.yml` ✓
- [ ] `docker-compose.monitoring.demo.yml` ✓
- [ ] `monitoring-dev.sh` ✓
- [ ] `monitoring-test.sh` ✓
- [ ] `monitoring-demo.sh` ✓
- [ ] `trivy-scan.sh` ✓

### Permissions

- [ ] Scripts `.sh` sont exécutables (`chmod +x *.sh`)
- [ ] Utilisateur a accès au socket Docker (`sudo usermod -aG docker $USER`)

---

## 🔧 ÉTAPE 2: DEV ENVIRONMENT

### Installation

- [ ] `./monitoring-dev.sh start` exécuté avec succès
- [ ] Conteneurs `portainer-dev` et `uptime-kuma-dev` running
- [ ] Volumes `portainer_data_dev` et `uptime_kuma_data_dev` créés

### Configuration Portainer

- [ ] Portainer accessible: https://localhost:9443
- [ ] Compte admin créé
- [ ] Environnement Docker "local" sélectionné
- [ ] Conteneurs FORGES visibles

### Configuration Uptime Kuma

- [ ] Uptime Kuma accessible: http://localhost:3001
- [ ] Database initialisée

### Test

- [ ] `./monitoring-dev.sh status` affiche conteneurs running
- [ ] `./monitoring-dev.sh health` affiche tout OK
- [ ] `./monitoring-dev.sh logs` affiche logs sans erreur

---

## 🎯 ÉTAPE 3: TEST ENVIRONMENT

### Comptes Externes

#### Sentry

- [ ] Compte Sentry créé (https://sentry.io)
- [ ] Projet `forges-backend-test` créé
- [ ] Platform: Node.js / Express
- [ ] DSN sauvegarder (format: `https://xxx@sentry.io/xxx`)

#### Better Stack

- [ ] Compte Better Stack créé (https://betterstack.com)
- [ ] Source `FORGES Test Logs` créée
- [ ] Type: Node.js
- [ ] SOURCE TOKEN sauvegardé

### Configuration Locale

- [ ] `.env.test` créé dans `backend/`
- [ ] `SENTRY_DSN_TEST` configuré dans .env.test
- [ ] `LOGTAIL_TOKEN_TEST` configuré dans .env.test
- [ ] `NODE_ENV=test` défini

### Installation Monitoring

- [ ] `./monitoring-test.sh start` exécuté
- [ ] Conteneurs TEST running
- [ ] `./monitoring-test.sh health` OK

### Configuration Uptime Kuma

- [ ] Monitor "Frontend Test" créé
- [ ] Monitor "Backend API Test" créé
- [ ] Tous les monitors affichent "UP"
- [ ] Notifications configurées (email/Slack)

### Test Intégration

- [ ] Sentry SDK installé: `npm install @sentry/node`
- [ ] Sentry initialisé dans `backend/src/app.ts`
- [ ] Erreur test capturée et visible dans Sentry
- [ ] Better Stack reçoit les logs (vérifier console)

---

## 🚀 ÉTAPE 4: DEMO ENVIRONMENT

### Comptes Externes

#### Sentry

- [ ] Projet `forges-backend-demo` créé dans Sentry
- [ ] DSN sauvegardé

#### Better Stack

- [ ] Source `FORGES Demo Logs` créée dans Better Stack
- [ ] SOURCE TOKEN sauvegardé

### Configuration Locale

- [ ] `.env.demo` créé dans `backend/`
- [ ] `SENTRY_DSN_DEMO` configuré dans .env.demo
- [ ] `LOGTAIL_TOKEN_DEMO` configuré dans .env.demo
- [ ] `NODE_ENV=demo` défini

### Installation Monitoring

- [ ] `./monitoring-demo.sh start` exécuté
- [ ] Conteneurs DEMO running
- [ ] `./monitoring-demo.sh health` affiche tous les services OK

### Configuration Uptime Kuma

- [ ] Monitor "Frontend Demo" créé (30s intervalle)
- [ ] Monitor "Backend API Demo" créé (30s intervalle)
- [ ] Monitor "Payment API Demo" créé (60s intervalle)
- [ ] Tous les monitors "UP"
- [ ] Notifications configurées (email + Slack prioritaire)

### Backup Initial

- [ ] `./monitoring-demo.sh backup` exécuté
- [ ] Fichier `kuma.db` sauvegardé dans `backups/`

---

## 🔒 ÉTAPE 5: SÉCURITÉ & IMAGES

### Préparation Images

- [ ] Images backend et frontend buildées
- [ ] Noms d'images standardisés:
  - `forges-backend:latest`
  - `forges-frontend:latest`

### Scan Trivy

- [ ] `./trivy-scan.sh forges-backend:latest dev` exécuté
- [ ] `./trivy-scan.sh forges-frontend:latest demo` exécuté
- [ ] Aucune vulnérabilité CRITICAL détectée
- [ ] Rapports HTML générés dans `trivy-reports/`
- [ ] SBOM JSON générés

### Mise en Place Trivy

- [ ] Trivy installé sur la machine
- [ ] Scans exécutés avant chaque déploiement
- [ ] Procédure documentée dans CI/CD

---

## 📝 ÉTAPE 6: VARIABLES D'ENVIRONNEMENT

### Backend .env files

- [ ] `.env.dev` créé et configuré
- [ ] `.env.test` créé et configuré
- [ ] `.env.demo` créé et configuré
- [ ] `.env` files ajoutés au `.gitignore`

### Contenu Minimal Requis

Chaque `.env.[env]` doit avoir:

```
✓ NODE_ENV
✓ SENTRY_DSN_[ENV]
✓ SENTRY_ENVIRONMENT
✓ LOGTAIL_TOKEN_[ENV]
✓ LOG_LEVEL
```

---

## 🧪 ÉTAPE 7: TESTS D'INTÉGRATION

### Sentry

- [ ] Erreur test générée dans backend
- [ ] Erreur capturée dans Sentry dashboard
- [ ] Stack trace complète visible
- [ ] Environnement correct affiché (dev/test/demo)

### Better Stack

- [ ] Logger utilisé dans le code
- [ ] Logs visibles dans Better Stack dashboard
- [ ] Recherche par mot-clé fonctionne
- [ ] Filtrage par niveau (info/warn/error) fonctionne

### Uptime Kuma

- [ ] Tous les monitors en statut "UP"
- [ ] Alerte test envoyée (créer un monitor test vers localhost:9999)
- [ ] Alerte reçue (email/Slack)
- [ ] Notification confirmée

### Portainer

- [ ] Tous les conteneurs visibles
- [ ] Logs consultables pour chaque conteneur
- [ ] Restart manuel possible d'un conteneur
- [ ] Volumes affichés et consultables

---

## 📊 ÉTAPE 8: DOCUMENTATION & ONBOARDING

### Documentation

- [ ] [README.md](./README.md) - Lu et compris
- [ ] [SETUP_MONITORING.md](./SETUP_MONITORING.md) - Lu et compris
- [ ] [QUICKSTART.md](./QUICKSTART.md) - Lu et compris
- [ ] Cette checklist - Complétée

### Équipe

- [ ] Accès Sentry donné aux devs
- [ ] Accès Better Stack donné aux ops
- [ ] Accès Uptime Kuma documenté
- [ ] Accès Portainer documenté

### Procédures

- [ ] Procédure démarrage monitoring documentée
- [ ] Procédure maintenance quotidienne documentée
- [ ] Procédure arrêt monitoring documentée
- [ ] Contacts d'urgence documentés

---

## ✅ ÉTAPE 9: VALIDATION FINALE

### Checklists Techniques

- [ ] All DEV checks ✓
- [ ] All TEST checks ✓
- [ ] All DEMO checks ✓

### Checklists Sécurité

- [ ] Images scannées avec Trivy ✓
- [ ] Aucun CRITICAL ✓
- [ ] Tokens stockés en .env (pas commités) ✓
- [ ] .gitignore mis à jour ✓

### Checklists Opérationnelles

- [ ] Scripts exécutables et testés ✓
- [ ] Health checks fonctionnent ✓
- [ ] Alertes testées et reçues ✓
- [ ] Backups en place (DEMO) ✓

### Checklists Documentation

- [ ] README complètes ✓
- [ ] SETUP complète ✓
- [ ] QUICKSTART complète ✓
- [ ] Variables d'env documentées ✓

---

## 🎉 STATUT: PRÊT POUR PRODUCTION ✅

Date de completion: _____________

Personne responsable: _____________

Signature: _____________

---

## 📞 Contacts d'Urgence

| Outil | Contact | Escalade |
|-------|---------|----------|
| Sentry | ops@forges.com | support@sentry.io |
| Better Stack | ops@forges.com | support@betterstack.com |
| Uptime Kuma | ops@forges.com | github.com/louislam/uptime-kuma |
| Portainer | devops@forges.com | support@portainer.io |

---

## 📚 Ressources Principales

- [FORGES Monitoring README](./README.md)
- [Setup Complet](./SETUP_MONITORING.md)
- [Quick Start](./QUICKSTART.md)
- [Sentry Docs](https://docs.sentry.io)
- [Better Stack Docs](https://docs.betterstack.com)
- [Uptime Kuma](https://github.com/louislam/uptime-kuma)
- [Portainer Docs](https://docs.portainer.io)

---

**Checklist créée**: 4 mai 2026  
**Version**: 1.0.0  
**Statut**: Production Ready
