# 🚀 CI/CD Setup pour Monitoring DEMO

**Intégration du monitoring automatiquement dans le pipeline de déploiement DEMO**

---

## 📋 Vue d'ensemble

Après que le pipeline déploie les conteneurs DEMO:
1. Backend DEMO démarre (`forges-backend-demo` avec labels)
2. CI/CD ajoute une étape pour lancer le monitoring
3. Monitoring détecte les conteneurs DEMO (grâce aux labels)
4. Logs sont collectés et visualisés dans Grafana
5. Sentry capture les erreurs du backend DEMO

---

## 🔧 Configuration du CI/CD

### Étape 1: Ajouter au workflow GitHub Actions

**Fichier**: `.github/workflows/deploy-demo.yml` (ou similaire)

```yaml
# ... après le déploiement des conteneurs DEMO ...

- name: Start Monitoring Stack (DEMO)
  run: |
    cd forges-monorepo/infra/monitoring
    chmod +x monitoring-demo.sh
    ./monitoring-demo.sh start

- name: Health Check Monitoring
  run: |
    cd forges-monorepo/infra/monitoring
    ./monitoring-demo.sh health
```

### Étape 2: S'assurer que Sentry DSN est configuré

**Vérifier que** `.env.demo` sur le VPS contient:
```bash
SENTRY_DSN=https://5d99de5ab7874ab1c2e861e27de62b1b@o4511332591468544.ingest.de.sentry.io/4511332623777872
```

---

## 🎯 Flux complet

```
1. Git push avec tag → GitHub Actions triggered
   ↓
2. Build backend image (with Sentry integrated)
   ↓
3. Push image to registry
   ↓
4. SSH to VPS & git pull
   ↓
5. Deploy DEMO containers (with labels: environment=demo)
   ↓
6. Start monitoring stack
   ├─ Portainer (Docker management)
   ├─ Uptime Kuma (Endpoint monitoring)
   ├─ Grafana (Dashboard)
   ├─ Loki (Log aggregation)
   └─ Promtail (Log collection with environment=demo filter)
   ↓
7. Monitoring detects DEMO containers & collects logs
   ↓
8. Sentry captures errors from backend
   ↓
9. Access Grafana at http://vps:3000 to see:
   - DEMO logs: {environment="demo"}
   - DEMO errors
   - DEMO uptime status
```

---

## 📊 Verification après déploiement

### Sur le VPS, après le pipeline:

**1. Vérifier les conteneurs**
```bash
docker ps --filter "label=environment=demo"
```

**2. Vérifier la santé du monitoring**
```bash
cd infra/monitoring
./monitoring-demo.sh health
```

**3. Vérifier les logs collectés**
```bash
./monitoring-demo.sh logs loki
```

**4. Accéder à Grafana**
```
http://your-vps-ip:3000
Login: admin / admin
Query: {environment="demo"}
```

**5. Vérifier Sentry**
```
https://sentry.io → forges-demo project
```

---

## 🔍 Structure du monitoring DEMO

### Docker Compose (`docker-compose.monitoring.demo.yml`)
- Portainer (9443/9000)
- Uptime Kuma (3001)
- Grafana (3000)
- Loki (3100)
- Promtail (collecteur de logs)

### Log Collection
- **Promtail** scan les conteneurs Docker
- **Filter**: `{environment="demo"}` (depuis le label)
- **Send to**: Loki
- **Query in Grafana**: `{environment="demo"}`

### Error Tracking
- **Backend** a Sentry SDK intégré
- **SENTRY_DSN** configuré dans `.env.demo`
- **Errors** envoyés automatiquement à Sentry
- **Visible** dans Sentry dashboard

### Uptime Monitoring
- **Configure** les endpoints DEMO à monitorer
- **Dashboard** dans Uptime Kuma
- **Alerts** si endpoint down

---

## 🛠️ Commandes utiles

### Lancer le monitoring manuellement (local test)
```bash
cd infra/monitoring
./monitoring-demo.sh start
```

### Voir le statut
```bash
./monitoring-demo.sh status
```

### Voir les logs d'un service
```bash
./monitoring-demo.sh logs grafana
./monitoring-demo.sh logs loki
./monitoring-demo.sh logs promtail
```

### Health check complet
```bash
./monitoring-demo.sh health
```

### Arrêter proprement
```bash
./monitoring-demo.sh stop
```

### Backup avant mise à jour
```bash
./monitoring-demo.sh backup
```

---

## ⚠️ Troubleshooting

### Q: Les logs n'apparaissent pas dans Grafana?
**A**: Vérifier que:
1. Promtail est running: `docker ps | grep promtail`
2. Les conteneurs ont le label `environment=demo`
3. Loki health: `./monitoring-demo.sh logs loki`

### Q: Sentry ne reçoit pas les erreurs?
**A**: Vérifier que:
1. `SENTRY_DSN` est dans `.env.demo` sur le VPS
2. Backend log: `./monitoring-demo.sh logs | grep sentry`
3. Sentry project est actif: https://sentry.io

### Q: Grafana affiche pas les données?
**A**: Vérifier que:
1. Loki datasource est connecté: http://loki:3100
2. Query: `{environment="demo"}` retourne des logs
3. Restart Grafana: `docker restart grafana-demo`

---

## 📝 Notes

- **Labels Docker**: Les conteneurs DEMO doivent avoir `labels: environment=demo`
  - C'est déjà configuré dans `docker-compose.demo.deploy.yml`
  
- **Prometheus/Alerting**: À ajouter si besoin d'alertes avancées

- **Backups**: Faire `./monitoring-demo.sh backup` régulièrement

- **Data Retention**: Loki garde ~5GB de logs par défaut

---

**Documentation**: CI/CD + Monitoring DEMO  
**Version**: 1.0  
**Date**: May 4, 2026  
**Status**: Ready for Production
