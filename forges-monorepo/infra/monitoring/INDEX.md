# 📊 Forges Monitoring Stack - Documentation Index

## 🎯 Quick Navigation

### 🚀 Getting Started (Choose One)

| Need | File | Time |
|------|------|------|
| **I want to start monitoring NOW** | [`QUICKSTART.md`](./QUICKSTART.md) | ⏱️ 30 min |
| **I want to setup Grafana dashboards** | [`GRAFANA_SETUP.md`](./GRAFANA_SETUP.md) | ⏱️ 15 min |
| **I want to deploy to VPS** | [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md) | ⏱️ 50 min |
| **I'm setting up for first time** | [`SETUP_MONITORING.md`](./SETUP_MONITORING.md) | ⏱️ 1-2 hours |
| **I want to validate setup** | [`INSTALLATION_CHECKLIST.md`](./INSTALLATION_CHECKLIST.md) | ⏱️ 15 min |
| **I want full overview** | [`README.md`](./README.md) | ⏱️ 10 min |

---

## 📁 Repository Structure

```
infra/monitoring/
├── 📋 DOCUMENTATION
│   ├── INDEX.md                          ← You are here
│   ├── README.md                         ← Overview of entire stack
│   ├── QUICKSTART.md                     ← 30-min quick start guide
│   ├── GRAFANA_SETUP.md                  ← How to create dashboards [NEW]
│   ├── SETUP_MONITORING.md               ← Detailed setup instructions
│   ├── DEPLOYMENT_CHECKLIST.md           ← VPS deployment steps
│   └── INSTALLATION_CHECKLIST.md         ← Validation checklist
│
├── 🐳 DOCKER CONFIGURATION
│   ├── docker-compose.monitoring.dev.yml ← Main orchestration file
│   ├── loki-config.yml                   ← Loki log aggregation config
│   └── promtail-config.yml               ← Promtail log collection config
│
├── 🛠️ SCRIPTS
│   ├── monitoring.sh                     ← Main management script
│   └── trivy-scan.sh                     ← Security scanner script
│
└── 📚 INTEGRATION FILES (in backend/)
    ├── backend/src/config/sentry.ts      ← Sentry crash reporting
    ├── backend/src/config/logger.ts      ← Better Stack logger
    └── backend/.env.monitoring.example   ← Environment template
```

---

## 🏗️ Architecture Overview

### Monitoring Stack Components

```
┌─────────────────────────────────────────────────────────────┐
│                   MONITORING STACK                          │
│                   (Unified Interface)                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │   Portainer CE   │  │  Uptime Kuma     │                │
│  │  (Docker Mgmt)   │  │ (Availability)   │                │
│  │  Port: 9443/9000 │  │  Port: 3001      │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                   LOG AGGREGATION                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │      Loki        │  │    Promtail      │                │
│  │  (Log Storage)   │  │  (Log Collection)│                │
│  │  Port: 3100      │  │   Docker Host    │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│              EXTERNAL SERVICES (Configuration)               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │     Sentry       │  │  Better Stack    │                │
│  │ (Crash Reporting)│  │ (Logs + Alerts)  │                │
│  │ sentry.io        │  │ betterstack.com  │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
│  ┌──────────────────┐                                       │
│  │      Trivy       │                                       │
│  │ (Security Scan)  │                                       │
│  │  CLI Tool        │                                       │
│  └──────────────────┘                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Environment Separation

Logs are **separated by environment** using Promtail tags:

```
┌─────────────────────────────────────────────┐
│         UNIFIED LOG AGGREGATION              │
│              (via Loki)                      │
├─────────────────────────────────────────────┤
│                                              │
│  DEV Environment    {environment="dev"}     │
│  ├── Backend logs                           │
│  ├── Frontend logs                          │
│  ├── Database logs                          │
│  └── Redis logs                             │
│                                              │
│  TEST Environment   {environment="test"}    │
│  ├── Backend logs                           │
│  ├── Frontend logs                          │
│  ├── Database logs                          │
│  └── Redis logs                             │
│                                              │
│  DEMO Environment   {environment="demo"}    │
│  ├── Backend logs                           │
│  ├── Frontend logs                          │
│  ├── Database logs                          │
│  └── Redis logs                             │
│                                              │
└─────────────────────────────────────────────┘
```

---

## 🔧 Essential Commands

### Start/Stop Monitoring

```bash
cd infra/monitoring

# Start all services
./monitoring.sh start

# Stop all services
./monitoring.sh stop

# Restart services
./monitoring.sh restart

# Check health status
./monitoring.sh health

# View all logs
./monitoring.sh logs

# Backup all data
./monitoring.sh backup

# Cleanup (⚠️ WARNING: Deletes all data)
./monitoring.sh cleanup

# Show configuration summary
./monitoring.sh summary
```

### Security Scanning

```bash
cd infra/monitoring

# Scan a Docker image
./trivy-scan.sh forges-backend:latest demo

# View reports
ls trivy-reports/
```

---

## 📊 Access Portals

### Local Development

| Service | URL | Port |
|---------|-----|------|
| **Portainer** | https://localhost:9443 | 9443 (HTTPS) |
| **Uptime Kuma** | http://localhost:3001 | 3001 (HTTP) |
| **Loki Logs** | http://localhost:3100 | 3100 (HTTP) |

### VPS Deployment

Replace `localhost` with your VPS IP:
- **Portainer**: https://vps_ip:9443
- **Uptime Kuma**: http://vps_ip:3001
- **Loki**: http://vps_ip:3100

---

## 📋 Configuration Files

### Docker Compose
**File**: `docker-compose.monitoring.dev.yml`

Services included:
- ✅ Portainer CE (Docker management)
- ✅ Uptime Kuma (Availability monitoring)
- ✅ Loki (Centralized log storage)
- ✅ Promtail (Log collection from Docker)

**Start with:**
```bash
docker compose -f docker-compose.monitoring.dev.yml up -d
```

### Loki Configuration
**File**: `loki-config.yml`

Key settings:
- Storage: boltdb-shipper with filesystem backend
- Retention: Indefinite (configure retention_period as needed)
- Listen port: 3100
- Log indexing enabled

### Promtail Configuration
**File**: `promtail-config.yml`

Key settings:
- 8 scrape jobs (backend/frontend for dev/test/demo + postgres/redis)
- Environment tagging: dev/test/demo labels on all logs
- Docker socket integration for auto-discovery
- Routes all logs to Loki

---

## 🚀 Deployment Phases

### Phase 1: Local Testing
```bash
# Validate Docker Compose syntax
docker compose -f infra/monitoring/docker-compose.monitoring.dev.yml config

# Start locally
cd infra/monitoring
./monitoring.sh start

# Test access
curl -k https://localhost:9443  # Portainer
curl http://localhost:3001      # Uptime Kuma
curl http://localhost:3100      # Loki
```

### Phase 2: Git Synchronization
```bash
git add infra/monitoring backend/src/config backend/.env.monitoring.example
git commit -m "feat: add unified monitoring stack"
git push origin develop
```

### Phase 3: VPS Deployment
```bash
ssh user@vps
cd /forges-v2/forges-monorepo
git pull origin develop
cd infra/monitoring
./monitoring.sh start
```

### Phase 4: Configuration
- Create Sentry projects (dev/test/demo)
- Create Better Stack sources
- Configure .env files
- Setup Uptime Kuma monitors
- Test alert notifications

---

## 🔍 Logging & Queries

### Loki Query Examples

```promql
# All logs from DEV environment
{environment="dev"}

# Backend logs only
{environment="dev", service="backend"}

# Frontend logs only
{environment="test", service="frontend"}

# All errors across all environments
{job=~"forges-.*"} | regexp "error"

# Database logs from DEMO
{environment="demo", service="postgres"}

# Container metrics
{container_name="uptime-kuma"}
```

### Access Loki Logs

**Option 1**: Via Loki API
```bash
curl 'http://localhost:3100/loki/api/v1/query_range?query={environment="dev"}&start=<timestamp>'
```

**Option 2**: Via Portainer (when integrated)
- Navigate to Portainer
- Go to Containers
- Select container → Logs

**Option 3**: Via Docker CLI
```bash
docker compose logs promtail --tail=100
docker compose logs loki --tail=50
```

---

## ⚠️ Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
sudo lsof -i :9443
sudo lsof -i :3001
sudo lsof -i :3100

# Kill process
kill -9 <PID>
```

### Services Won't Start

```bash
# Check Docker daemon
docker ps

# Validate compose syntax
docker compose config

# View error logs
./monitoring.sh logs
```

### Logs Not Appearing in Loki

```bash
# Check Promtail connection
docker compose logs promtail

# Verify Loki is running
docker compose logs loki

# Test Loki endpoint
curl http://localhost:3100/ready
```

### Portainer Can't Connect

```bash
# Ensure Docker socket is accessible
ls -la /var/run/docker.sock

# Restart Portainer
docker compose restart portainer
```

---

## 📞 Support Resources

| Issue | Resource |
|-------|----------|
| Setup help | [`SETUP_MONITORING.md`](./SETUP_MONITORING.md) |
| Quick start | [`QUICKSTART.md`](./QUICKSTART.md) |
| Deployment | [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md) |
| Validation | [`INSTALLATION_CHECKLIST.md`](./INSTALLATION_CHECKLIST.md) |
| Alerts | [`ALERTS_CONFIGURATION.md`](./ALERTS_CONFIGURATION.md) |
| Overview | [`README.md`](./README.md) |

---

## ✅ Maintenance Checklist

### Weekly
- [ ] Check Uptime Kuma dashboard for any RED monitors
- [ ] Review Sentry for new errors
- [ ] Check disk space usage: `du -sh loki_data/`

### Monthly
- [ ] Backup monitoring data: `./monitoring.sh backup`
- [ ] Review alert thresholds in Uptime Kuma
- [ ] Test alert notifications
- [ ] Update Docker images: `docker compose pull`

### Quarterly
- [ ] Security scan all images: `./trivy-scan.sh`
- [ ] Review Loki retention settings
- [ ] Audit Better Stack logs
- [ ] Performance review & optimization

---

## 📞 Version Information

| Item | Value |
|------|-------|
| **Version** | 1.0 (Unified) |
| **Date** | May 4, 2026 |
| **Status** | ✅ Production Ready |
| **Environments** | dev, test, demo |
| **Main Script** | `monitoring.sh` |
| **Docker Compose** | `docker-compose.monitoring.dev.yml` |

---

## 🎯 Next Steps

1. **Choose your starting point** from Quick Navigation above
2. **Follow the appropriate guide** for your use case
3. **Execute the commands** in the specified order
4. **Validate with INSTALLATION_CHECKLIST.md**
5. **Deploy to VPS** using DEPLOYMENT_CHECKLIST.md
6. **Monitor continuously** using the dashboards

---

**Happy Monitoring! 🚀**

For questions or issues, refer to the relevant documentation file or check the logs with `./monitoring.sh logs`
