# 📋 Monitoring Stack - Deployment Checklist

## Local Development (Desktop/Mac)

### ✅ Infrastructure Files (LOCAL)
- [x] `docker-compose.monitoring.dev.yml` - Unified Docker Compose with Portainer, Uptime Kuma, Loki, Promtail
- [x] `loki-config.yml` - Loki server configuration
- [x] `promtail-config.yml` - Promtail config with environment tagging (dev/test/demo)
- [x] `monitoring.sh` - Main management script (executable)
- [x] `trivy-scan.sh` - Security scanner script (executable)

### ✅ Backend Integration Files (LOCAL)
- [x] `backend/src/config/sentry.ts` - Sentry SDK configuration
- [x] `backend/src/config/logger.ts` - Better Stack logger integration
- [x] `backend/.env.monitoring.example` - Template for env variables

### ✅ Documentation (LOCAL)
- [x] `README.md` - Overview of monitoring stack
- [x] `SETUP_MONITORING.md` - Detailed configuration guide
- [x] `QUICKSTART.md` - 30-minute quick start
- [x] `INSTALLATION_CHECKLIST.md` - Validation checklist
- [x] `ALERTS_CONFIGURATION.md` - Alert rules and escalation
- [x] `DEPLOYMENT_CHECKLIST.md` - This file

## VPS Deployment Steps

### Phase 1: Git Synchronization

```bash
# On your local machine
cd /Users/tidianecisse/PROJET_INFO/forges-kit\ 2/forges-monorepo
git add infra/monitoring backend/src/config backend/.env.monitoring.example
git commit -m "feat: add unified monitoring stack with separated logs (Portainer, Uptime Kuma, Loki, Promtail)"
git push origin develop
```

### Phase 2: VPS Pull (On production server)

```bash
ssh user@dev-forges.com
cd /forges-v2/forges-monorepo
git pull origin develop

# Verify files arrived
ls -la infra/monitoring/
```

### Phase 3: Environment Configuration (VPS)

#### 3.1 Create Sentry Projects
1. Go to https://sentry.io (create account if needed)
2. Create 3 new projects:
   - `forges-backend-dev` (Node.js)
   - `forges-backend-test` (Node.js)
   - `forges-backend-demo` (Node.js)
3. Copy each project's DSN

#### 3.2 Create .env files (VPS)

```bash
cd /forges-v2/forges-monorepo/backend

# Create .env.dev
cp .env.monitoring.example .env.dev
# Edit and fill:
# - SENTRY_DSN_DEV=https://xxx@xxx.ingest.sentry.io/xxx
# - LOGTAIL_TOKEN_DEV=your_logtail_token_dev
# - ALERT_EMAIL_DEV=your_email@example.com

# Create .env.test
cp .env.monitoring.example .env.test
# Edit and fill with TEST values

# Create .env.demo
cp .env.monitoring.example .env.demo
# Edit and fill with DEMO values
```

#### 3.3 Create Better Stack Sources (Optional but recommended)
1. Go to https://betterstack.com (create account)
2. Create 3 new sources:
   - `forges-dev`
   - `forges-test`
   - `forges-demo`
3. Copy each source's token

### Phase 4: Start Monitoring (VPS)

```bash
cd /forges-v2/forges-monorepo/infra/monitoring

# Start the unified monitoring stack
./monitoring.sh start

# Wait for services to start (30-60 seconds)
sleep 30

# Check health
./monitoring.sh health
```

**Expected output:**
```
✅ Portainer: http://vps_ip:9443
✅ Uptime Kuma: http://vps_ip:3001
✅ Loki: http://vps_ip:3100
```

### Phase 5: Configure Uptime Kuma (VPS)

1. Access: `http://vps_ip:3001`
2. Create 3 monitors:
   ```
   Monitor 1:
   - URL: https://dev-forges.com/api/health
   - Interval: 60 seconds
   - Name: "Forges DEV"
   
   Monitor 2:
   - URL: https://test-forges.com/api/health
   - Interval: 60 seconds
   - Name: "Forges TEST"
   
   Monitor 3:
   - URL: https://demo-forges.com/api/health
   - Interval: 60 seconds
   - Name: "Forges DEMO"
   ```
3. Create notifications (Email/Slack/Telegram)
4. Assign notifications to monitors

### Phase 6: Backend Integration (Development)

In your backend code (`backend/src/app.ts`):

```typescript
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './config/sentry';
import { getLogger } from './config/logger';

// Initialize Sentry first
initSentry();

const app = express();

// Sentry request handler - BEFORE routes
app.use(sentryRequestHandler());

// ... your routes ...

// Sentry error handler - AFTER routes
app.use(sentryErrorHandler());

// Use logger in your code
const logger = getLogger();
logger.info('Application started', { environment: process.env.NODE_ENV });
```

Install Sentry:
```bash
npm install @sentry/node
```

### Phase 7: Verify Deployment

```bash
# On VPS
cd /forges-v2/forges-monorepo/infra/monitoring

# View monitoring logs
./monitoring.sh logs

# Run a security scan on an image
./monitoring.sh trivy-scan forges-backend:latest demo

# Backup configuration
./monitoring.sh backup
```

## Monitoring Usage

### Daily Operations

```bash
cd /forges-v2/forges-monorepo/infra/monitoring

# Check status
./monitoring.sh health

# View all logs
./monitoring.sh logs

# View specific environment logs
docker compose logs loki --tail=100  # View Loki logs

# Backup data
./monitoring.sh backup
```

### Query Logs in Loki

Via Loki API or Portainer:
```
# All DEV logs
{environment="dev"}

# DEV backend only
{environment="dev", service="backend"}

# TEST frontend only
{environment="test", service="frontend"}

# All errors across all environments
{job=~"forges-.*"} | regexp "error"
```

### Restart Services

```bash
cd /forges-v2/forges-monorepo/infra/monitoring
./monitoring.sh restart
```

### Emergency Cleanup

```bash
cd /forges-v2/forges-monorepo/infra/monitoring

# Stop all monitoring
./monitoring.sh stop

# Delete all data (⚠️ WARNING: Data loss!)
./monitoring.sh cleanup

# Start fresh
./monitoring.sh start
```

## Troubleshooting

### Issue: Port Already in Use
```bash
# Find what's using ports
sudo lsof -i :9443
sudo lsof -i :3001
sudo lsof -i :3100

# Kill process if needed
kill -9 <PID>
```

### Issue: Loki Can't Connect to Promtail
```bash
# Check Docker network
docker network ls
docker network inspect monitoring

# Restart services
./monitoring.sh restart
```

### Issue: Logs Not Appearing in Loki
```bash
# Check Promtail scrape config
docker compose logs promtail --tail=50

# Verify Docker socket is readable
ls -la /var/run/docker.sock
```

### Issue: Portainer Can't Connect
```bash
# Check Portainer logs
docker compose logs portainer --tail=50

# Ensure socket is mounted properly
docker inspect portainer | grep -A5 Mounts
```

## Health Indicators

✅ **Everything is OK when:**
- Portainer responds on port 9443
- Uptime Kuma responds on port 3001
- Loki responds on port 3100
- Promtail has no errors in logs
- Monitors show GREEN status in Uptime Kuma
- Logs appear in Loki with dev/test/demo tags

⚠️ **Watch for:**
- Red monitors in Uptime Kuma (endpoint down)
- Promtail connection errors to Loki
- High memory usage in monitoring containers
- Old logs not being cleaned (check Loki retention)

## Support

For issues, check:
1. `SETUP_MONITORING.md` - Configuration details
2. `ALERTS_CONFIGURATION.md` - Alert setup
3. `QUICKSTART.md` - Quick reference
4. Docker logs: `./monitoring.sh logs`

## Timeline Estimate

- Phase 1-2: **5 min** (Git sync)
- Phase 3: **15 min** (External accounts + env files)
- Phase 4: **5 min** (Start stack)
- Phase 5: **10 min** (Uptime Kuma setup)
- Phase 6: **10 min** (Backend integration + test)
- Phase 7: **5 min** (Verification)

**Total: ~50 minutes** ⏱️

---

**Status**: ✅ Ready for VPS deployment
**Last Updated**: 2025-01-[today]
**Version**: 1.0 (Unified monitoring with separated logs)
