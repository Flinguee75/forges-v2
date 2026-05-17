# 📊 FORGES Monitoring Stack

**Unified monitoring for dev, test, and demo environments with separated logs**

> ⚡ **TL;DR**: Run `./monitoring.sh start` and access dashboards at `localhost:9443` (Portainer), `localhost:3001` (Uptime Kuma), `localhost:3100` (Loki)

---

## 🎯 What's in the Box

### Core Services (Docker Compose)
- **Portainer CE** - Unified Docker management interface
- **Uptime Kuma** - Endpoint availability monitoring
- **Loki** - Centralized log aggregation with environment tags
- **Promtail** - Docker log collector (auto-discovery)

### External Services (Configuration)
- **Sentry** - Crash reporting & error tracking
- **Better Stack** - Centralized logs + alerts
- **Trivy** - Docker image security scanning

### Key Features
✅ Unified interface for dev/test/demo  
✅ Separated logs by environment (Loki tags)  
✅ Health checks on all services  
✅ Automatic Docker log collection  
✅ Single management script  
✅ Production-ready configuration  

---

## 📁 File Structure

```
infra/monitoring/
├── 📋 DOCUMENTATION
│   ├── INDEX.md                          ← Start here for navigation
│   ├── README.md                         ← This file
│   ├── QUICKSTART.md                     ← 30-min quick start
│   ├── SETUP_MONITORING.md               ← Detailed setup
│   ├── DEPLOYMENT_CHECKLIST.md           ← VPS deployment
│   ├── INSTALLATION_CHECKLIST.md         ← Validation
│   └── ALERTS_CONFIGURATION.md           ← Alert rules
│
├── 🐳 DOCKER
│   ├── docker-compose.monitoring.dev.yml ← Main (unified)
│   ├── loki-config.yml                   ← Loki config
│   └── promtail-config.yml               ← Promtail config
│
├── 🛠️ SCRIPTS
│   ├── monitoring.sh                     ← Main management
│   └── trivy-scan.sh                     ← Security scanner
│
└── 📚 BACKEND INTEGRATION (backend/ dir)
    ├── src/config/sentry.ts              ← Sentry config
    ├── src/config/logger.ts              ← Better Stack logger
    └── .env.monitoring.example           ← Env template
```

---

## 🚀 Quick Start

### 1. Start Monitoring Stack

```bash
cd infra/monitoring
./monitoring.sh start
```

### 2. Access Dashboards

| Service | URL | Port |
|---------|-----|------|
| Portainer | https://localhost:9443 | 9443 |
| Uptime Kuma | http://localhost:3001 | 3001 |
| Loki Logs | http://localhost:3100 | 3100 |

### 3. Check Health

```bash
./monitoring.sh health
```

---

## 📋 Management Commands

```bash
cd infra/monitoring

./monitoring.sh start              # Start all services
./monitoring.sh stop               # Stop all services
./monitoring.sh restart            # Restart services
./monitoring.sh health             # Show health status
./monitoring.sh logs               # View all logs
./monitoring.sh backup             # Backup data
./monitoring.sh cleanup            # Delete all data (⚠️)
./monitoring.sh summary            # Show config summary
```

---

## 🎯 Quick Navigation

| Need | File | Time |
|------|------|------|
| **Start Now** | [`QUICKSTART.md`](./QUICKSTART.md) | 30 min |
| **Full Documentation** | [`INDEX.md`](./INDEX.md) | 5 min |
| **Setup Instructions** | [`SETUP_MONITORING.md`](./SETUP_MONITORING.md) | 1-2 hrs |
| **Deploy to VPS** | [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md) | 50 min |
| **Validation** | [`INSTALLATION_CHECKLIST.md`](./INSTALLATION_CHECKLIST.md) | 15 min |
| **Alert Configuration** | [`ALERTS_CONFIGURATION.md`](./ALERTS_CONFIGURATION.md) | 20 min |

---

## 📚 Integration with Backend

To integrate Sentry & Better Stack in your backend:

```bash
# 1. Install Sentry SDK
npm install @sentry/node

# 2. Copy environment template
cp backend/.env.monitoring.example backend/.env.dev

# 3. Fill in your Sentry DSN and Better Stack token

# 4. Initialize in app.ts
import { initSentry } from './config/sentry';
initSentry();
```

See [`SETUP_MONITORING.md`](./SETUP_MONITORING.md) for full integration steps.

---

## 🔍 Query Logs in Loki

### Query Syntax

```promql
# All DEV logs
{environment="dev"}

# DEV backend only
{environment="dev", service="backend"}

# All errors
{job=~"forges-.*"} | regexp "error"

# TEST frontend
{environment="test", service="frontend"}
```

---

## � Architecture

```
┌──────────────────────────────────────┐
│    UNIFIED MONITORING INTERFACE      │
├──────────────────────────────────────┤
│  Portainer (Docker Mgmt)             │
│  Uptime Kuma (Availability)          │
├──────────────────────────────────────┤
│    CENTRALIZED LOG AGGREGATION       │
├──────────────────────────────────────┤
│  Loki (Storage)  ← Promtail (Collect)│
├──────────────────────────────────────┤
│   ENVIRONMENT SEPARATION             │
├──────────────────────────────────────┤
│  {environment="dev"}                 │
│  {environment="test"}                │
│  {environment="demo"}                │
└──────────────────────────────────────┘
```

---

## ⚙️ System Requirements

- Docker & Docker Compose installed
- Ports available: 9443, 9000, 3001, 3100
- ~2GB disk space for logs (varies by retention)
- 1-2 CPU cores minimum

---

## ⚠️ Common Issues

### Port Already in Use
```bash
sudo lsof -i :9443
kill -9 <PID>
```

### Logs Not Appearing
```bash
./monitoring.sh logs
# Check Promtail connection to Loki
```

### Services Won't Start
```bash
docker compose config  # Validate syntax
./monitoring.sh logs   # Check errors
```

See [`SETUP_MONITORING.md`](./SETUP_MONITORING.md) troubleshooting section for more.

---

## 🔒 Security

- All services run in isolated Docker containers
- Portainer HTTPS on port 9443
- Trivy for image vulnerability scanning
- Environment-based access control via Sentry/Better Stack

---

## 📞 Need Help?

1. **Quick help**: Read [`QUICKSTART.md`](./QUICKSTART.md)
2. **Setup help**: Read [`SETUP_MONITORING.md`](./SETUP_MONITORING.md)
3. **Navigation**: Check [`INDEX.md`](./INDEX.md) for full guide index
4. **View logs**: Run `./monitoring.sh logs`

---

## 🚀 Deployment Path

**Local Development** → **Git Sync** → **VPS Deployment** → **Configure External** → **Monitor**

Follow [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md) for step-by-step VPS deployment.

---

## ✅ Status

**Version**: 1.0 (Unified)  
**Status**: ✅ Production Ready  
**Last Updated**: May 4, 2026  
**Environments**: dev, test, demo  

---

**Ready to start?** → Go to [`QUICKSTART.md`](./QUICKSTART.md) or [`INDEX.md`](./INDEX.md)

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
