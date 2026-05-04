# FORGES - Monitoring Infrastructure

_Maintenance et monitoring Docker pour DEV, TEST, DEMO_

**Version**: 1.0.0  
**Date**: 4 mai 2026  
**Statut**: Production Ready

## 📋 Vue d'ensemble

Ce dossier contient tous les outils et scripts nécessaires pour monitorer les environnements Docker de FORGES.

## 📁 Structure du projet

```
monitoring/
├── docker-compose.monitoring.dev.yml    # Stack monitoring DEV
├── docker-compose.monitoring.test.yml   # Stack monitoring TEST
├── docker-compose.monitoring.demo.yml   # Stack monitoring DEMO
├── monitoring-dev.sh                    # Script gestion DEV
├── monitoring-test.sh                   # Script gestion TEST
├── monitoring-demo.sh                   # Script gestion DEMO
├── trivy-scan.sh                        # Scanner sécurité images Docker
├── SETUP_MONITORING.md                  # Documentation complète
├── README.md                            # Ce fichier
└── backups/                             # Backups des configurations
```

## 🚀 Démarrage Rapide

### DEV Environment

```bash
cd infra/monitoring
chmod +x *.sh

# Démarrer
./monitoring-dev.sh start

# Accéder
# - Portainer: https://localhost:9443
# - Uptime Kuma: http://localhost:3001

# Arrêter
./monitoring-dev.sh stop
```

### TEST Environment

```bash
# Démarrer
./monitoring-test.sh start

# Vérifier
./monitoring-test.sh health
```

### DEMO Environment

```bash
# Démarrer avec backup automatique
./monitoring-demo.sh start

# Vérifier la santé complète
./monitoring-demo.sh health

# Faire un backup
./monitoring-demo.sh backup
```

## 🛠️ Commandes Principales

### Gestion générale

| Commande | DEV | TEST | DEMO | Effet |
|----------|-----|------|------|-------|
| `./monitoring-[env].sh start` | ✅ | ✅ | ✅ | Démarrer la stack |
| `./monitoring-[env].sh stop` | ✅ | ✅ | ✅ | Arrêter la stack |
| `./monitoring-[env].sh restart` | ✅ | ✅ | ✅ | Redémarrer la stack |
| `./monitoring-[env].sh status` | ✅ | ✅ | ✅ | Voir le statut |
| `./monitoring-[env].sh logs` | ✅ | ✅ | ✅ | Voir tous les logs |
| `./monitoring-[env].sh health` | ✅ | ✅ | ✅ | Vérifier la santé |
| `./monitoring-[env].sh cleanup` | ✅ | ✅ | ✅ | Nettoyer (⚠️ destructif) |
| `./monitoring-demo.sh backup` | ✗ | ✗ | ✅ | Backup config |

### Scan Sécurité

```bash
# Scanner une image
./trivy-scan.sh forges-backend:latest dev

# Scanner le frontend
./trivy-scan.sh forges-frontend:latest test

# Résultats dans trivy-reports/
```

## 📊 Stack Monitoring

### 1. Portainer CE - Interface Docker

- **Port**: 9443 (HTTPS)
- **URL**: https://localhost:9443
- **Rôle**: Gestion des conteneurs, volumes, réseaux
- **Première visite**: Créer compte admin
- **Accès**: Lecture logs, restart conteneurs, voir volumes

### 2. Uptime Kuma - Surveillance Disponibilité

- **Port**: 3001 (HTTP)
- **URL**: http://localhost:3001
- **Rôle**: Monitorer endpoints, alerter si down
- **Configuration**: Via interface web
- **Alertes**: Email, Slack, Telegram

### 3. Sentry - Crash Reporting

- **URL**: https://sentry.io
- **Rôle**: Capturer erreurs 500, stack traces
- **Configuration**: Require DSN + installation SDK
- **Intégration**: Dans backend via `config/sentry.ts`

### 4. Better Stack / Logtail - Logs Centralisés

- **URL**: https://betterstack.com
- **Rôle**: Centraliser logs applicatifs
- **Configuration**: Require token + initialization
- **Utilisation**: Via `config/logger.ts`

### 5. Trivy - Scan Sécurité

- **Type**: CLI
- **Rôle**: Scan vulnérabilités des images
- **Résultats**: HTML reports + SBOM JSON
- **Blocage**: CRITICAL vulnerabilities

## ⚙️ Configuration

### Prérequis

```bash
# Vérifier Docker
docker --version
docker compose version

# Optionnel: Trivy
brew install trivy  # macOS
apt-get install trivy  # Linux
```

### Variables d'Environnement

Voir `backend/.env.monitoring.example`:

```env
# Sentry
SENTRY_DSN_DEV=https://...
SENTRY_DSN_TEST=https://...
SENTRY_DSN_DEMO=https://...

# Better Stack
LOGTAIL_TOKEN_DEV=...
LOGTAIL_TOKEN_TEST=...
LOGTAIL_TOKEN_DEMO=...
```

### Setup Sentry

1. Créer compte sur https://sentry.io
2. Créer 3 projets (dev/test/demo)
3. Copier les DSN
4. Ajouter dans .env.dev/.env.test/.env.demo
5. Installer SDK: `npm install @sentry/node`

### Setup Better Stack

1. Créer compte sur https://betterstack.com
2. Créer 3 sources (dev/test/demo)
3. Copier les tokens
4. Ajouter dans .env.dev/.env.test/.env.demo

### Setup Uptime Kuma

1. Accéder http://localhost:3001
2. Créer monitors:
   - Frontend endpoint
   - Backend /health endpoint
   - API endpoint
3. Configurer notifications (email/Slack)

## 📈 Monitoring Pattern

### Erreur dans Backend

```
Backend Error
    ↓
Sentry captée
    ↓
Stack trace visible sur Sentry
    ↓
Alert Sentry (email/Slack)
    ↓
Better Stack logs l'erreur
```

### Service Down

```
Endpoint Down
    ↓
Uptime Kuma détecte (30-60s)
    ↓
Alert Uptime Kuma
    ↓
Vérifier dans Portainer
```

### Webhook Paiement Échoue

```
Webhook Failed
    ↓
Backend log "WEBHOOK_FAILED"
    ↓
Better Stack alerte
    ↓
Sentry capture exception
    ↓
OPS averties
```

## 🔒 Sécurité

### Images Docker

```bash
# Avant chaque déploiement
./trivy-scan.sh forges-backend:latest demo
./trivy-scan.sh forges-frontend:latest demo

# Règle: Aucun CRITICAL sans exception documentée
```

### Secrets & Tokens

- 🔐 Ne jamais committer .env files
- 🔐 Ne jamais partager tokens en clair
- 🔐 Rotationner tokens tous les 3 mois
- 🔐 Ajouter .env.* au .gitignore

## 📊 Checklist de Validation

### ✅ Portainer

- [ ] Accessible https://localhost:9443
- [ ] Compte admin créé
- [ ] Conteneurs visibles
- [ ] Logs consultables
- [ ] Restart possible

### ✅ Uptime Kuma

- [ ] Accessible http://localhost:3001
- [ ] Monitors créés
- [ ] Tous les monitors "UP"
- [ ] Alertes configurées
- [ ] Test d'alerte reçu

### ✅ Sentry

- [ ] Projet créé
- [ ] DSN configuré
- [ ] Erreur test capturée
- [ ] Stack trace visible

### ✅ Better Stack

- [ ] Source créée
- [ ] Token configuré
- [ ] Logs visibles
- [ ] Alertes configurées

### ✅ Trivy

- [ ] Images scannées
- [ ] Rapports générés
- [ ] Aucun CRITICAL

## 🐛 Dépannage

### Portainer ne démarre pas

```bash
docker logs portainer-[env]
docker compose -f docker-compose.monitoring.[env].yml up -d portainer --force-recreate
```

### Uptime Kuma ne démarre pas

```bash
docker logs uptime-kuma-[env]
docker volume rm uptime_kuma_data_[env]
docker compose -f docker-compose.monitoring.[env].yml up -d uptime-kuma
```

### Sentry ne capture pas

```bash
# Vérifier DSN
echo $SENTRY_DSN_[ENV]

# Test manuel
npm run dev
curl -X POST http://localhost:3000/test-error
```

### Better Stack ne reçoit pas de logs

```bash
# Vérifier token
echo $LOGTAIL_TOKEN_[ENV]

# Vérifier utilisation du logger dans le code
```

## 📚 Documentation Complète

Voir [SETUP_MONITORING.md](./SETUP_MONITORING.md) pour:
- Installation détaillée
- Configuration complète par outil
- Procédures de maintenance
- Gestion des erreurs avancées

## 🔗 Ressources Externes

| Outil | Docs | Support |
|-------|------|---------|
| Portainer | https://docs.portainer.io | Commercial |
| Uptime Kuma | https://github.com/louislam/uptime-kuma | Community |
| Sentry | https://docs.sentry.io | Commercial |
| Better Stack | https://docs.betterstack.com | Commercial |
| Trivy | https://trivy.dev | Community |

## 📞 Support

Pour questions spécifiques:
1. Consulter [SETUP_MONITORING.md](./SETUP_MONITORING.md)
2. Vérifier les logs: `./monitoring-[env].sh logs`
3. Consulter Sentry dashboard
4. Consulter Better Stack dashboard
5. Consulter Uptime Kuma dashboard

## 📝 Notes Importantes

⚠️ **Pour DEMO environment:**
- Faire un backup régulier: `./monitoring-demo.sh backup`
- Les données sont persistantes entre redémarrages
- Nettoyer tous les 3 mois: `./monitoring-demo.sh cleanup`

⚠️ **Pour TEST environment:**
- Les données peuvent être réinitialisées entre tests
- Recréer les monitors après cleanup

⚠️ **Pour DEV environment:**
- À usage personnel
- Configuration peut varier
- Ne pas passer en production

## 📊 Statut de Production

| Composant | Status | Notes |
|-----------|--------|-------|
| Portainer CE | ✅ Ready | Open source, stable |
| Uptime Kuma | ✅ Ready | Self-hosted, gratuit |
| Sentry | ✅ Ready | Plans payants recommandés |
| Better Stack | ✅ Ready | Plans payants recommandés |
| Trivy | ✅ Ready | Open source, CLI |

---

**Document créé**: 4 mai 2026  
**Auteur**: FORGES DevOps Team  
**Version**: 1.0.0  
**Statut**: Production Ready
