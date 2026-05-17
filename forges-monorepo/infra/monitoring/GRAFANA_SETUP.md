# 📊 Grafana Setup Guide

**Unified dashboard for all 3 environments (dev, test, demo)**

---

## 🚀 Quick Start

### 1. Start Monitoring Stack
```bash
cd infra/monitoring
./monitoring-dev.sh start
```

The dev script reads [`./.env.monitoring.dev`](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/infra/monitoring/.env.monitoring.dev) directly, so you do not need to copy it to `.env`.

### 2. Access Grafana
```
URL: http://localhost:3051
Login: admin / forges2026!
```

### 3. Loki Datasource (Already Configured ✅)
- **Name**: Loki
- **URL**: http://loki:3100
- **Status**: Ready to use

### 4. If the login does not work
The dev stack reads Grafana credentials from environment variables:
- `GRAFANA_ADMIN_USER` defaults to `admin`
- `GRAFANA_ADMIN_PASSWORD` is set to `forges2026!` in `.env.monitoring.dev`

If you already started Grafana once with a different password, the existing Docker volume keeps the old credentials. In that case:
```bash
cd infra/monitoring
./monitoring-dev.sh stop
docker volume rm forges-grafana-dev
./monitoring-dev.sh start
```
Warning: removing the volume deletes Grafana dashboards stored locally in that volume.

---

## 📊 Create Your First Dashboard

### Step 1: Create New Dashboard
1. Click **"+"** (top left)
2. Select **"Create Dashboard"** 
3. Click **"Add new panel"**

### Step 2: Add Panel 1 - DEV Logs

**Panel Settings:**
```
Query: {environment="dev"}
Datasource: Loki
Format: Logs
Title: DEV Logs
```

**How to set it:**
1. In the panel, select **Loki** datasource
2. Under "LogQL", enter: `{environment="dev"}`
3. Click **"Run query"**
4. Set title to "DEV Logs"
5. Click **"Apply"**

### Step 3: Add Panel 2 - TEST Logs

**Panel Settings:**
```
Query: {environment="test"}
Datasource: Loki
Format: Logs
Title: TEST Logs
```

### Step 4: Add Panel 3 - DEMO Logs

**Panel Settings:**
```
Query: {environment="demo"}
Datasource: Loki
Format: Logs
Title: DEMO Logs
```

### Step 5: Add Panel 4 - All Errors

**Panel Settings:**
```
Query: {level="error"} | regexp "error|Error|ERROR"
Datasource: Loki
Format: Logs
Title: All Errors
```

### Step 6: Add Panel 5 - Status Overview

**Panel Settings:**
```
Title: Uptime Status
Type: Text (or use Markdown)
Content: 
- Uptime Kuma: http://localhost:3001
- Backend Status: Check logs above
- All systems OK if no errors shown
```

---

## 💾 Save Your Dashboard

1. Click **"Save dashboard"** (top right)
2. Name: **"FORGES Monitoring"**
3. Click **"Save"**

**Done!** Your dashboard is now saved and available at next login.

---

## 🔍 Useful LogQL Queries

### View All DEV Logs
```
{environment="dev"}
```

### View All TEST Logs
```
{environment="test"}
```

### View All DEMO Logs
```
{environment="demo"}
```

### View Only Backend Logs
```
{service="backend", environment="dev"}
```

### View Only Errors
```
{level="error"}
```

### View Errors + Warnings
```
{level=~"error|warn|ERROR|WARN"}
```

### Search for Specific Text
```
{environment="dev"} | regexp "database|connection|failed"
```

### Count Errors Per Environment
```
sum by (environment) (rate({level="error"} [5m]))
```

---

## 🎨 Dashboard Tips

### Organize Your Panels

**Row 1: Overview**
- Status overview
- Quick stats

**Row 2: Logs by Environment**
- DEV Logs (left)
- TEST Logs (middle)
- DEMO Logs (right)

**Row 3: Errors & Debugging**
- All Errors
- Warnings
- Performance metrics

### Change Panel Colors
1. Click panel title → Edit
2. Go to "Panel" tab
3. Customize colors & thresholds

### Add Alert Rules (Advanced)
1. Edit panel
2. Go to "Alert" tab
3. Set thresholds
4. Add notification channel

---

## 🔐 Change Grafana Password (Optional)

1. Click your profile (bottom left)
2. Select **"Preferences"**
3. Click **"Change password"**
4. Enter new password
5. Click **"Save"**

---

## 🆘 Troubleshooting

### Q: Logs not showing?
**A:** 
1. Check if Loki is running: `./monitoring-dev.sh health`
2. Check if containers are logging: `./monitoring-dev.sh logs`
3. Verify environment tags: Query `{environment="dev"}` should return something

### Q: Datasource connection error?
**A:**
1. Loki runs on `http://loki:3100` inside Docker network
2. This is auto-configured, should work
3. If error persists, check Loki health

### Q: Forgot admin password?
**A:**
```bash
# Reset to default (admin/forges2026!)
# Delete Grafana volume
docker volume rm forges-grafana-dev
# Restart
./monitoring-dev.sh restart
```

### Q: Want to export dashboard?
**A:**
1. Click dashboard title
2. Go to "Dashboard settings" (gear icon)
3. Click "Export as JSON"
4. Save file for backup

---

## 📱 Access from VPS

Once deployed to VPS:
```
URL: http://your-vps-ip:3051
Login: admin / forges2026!
Password: [same as local]
```

Same setup applies - create dashboards the same way.

---

## 🎓 Next Steps

1. ✅ Create basic dashboard (this guide)
2. 📊 Explore more LogQL queries
3. 🔔 Set up alert rules
4. 📈 Add custom panels
5. 🚀 Deploy to VPS

---

**Document**: Grafana Setup Guide  
**Version**: 1.0  
**Date**: May 4, 2026  
**Status**: Ready for Production
