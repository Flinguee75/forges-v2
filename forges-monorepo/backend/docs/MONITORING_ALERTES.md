# Configuration Monitoring et Alertes - FORGES v4.9

## Script d'Alertes Critiques

### Description

Le script `scripts/check-critical-alerts.sh` surveille les conditions critiques du système paiement NGSER et envoie des alertes via Slack ou console.

### Détections

1. **Scheduler réconciliation absent**
   - Vérifie présence de `RECONCILIATION_NGSER_DEBUT` dans les logs récents
   - Alerte si aucun signal dans les 5000 dernières lignes

2. **Montant IPN mismatch**
   - Détecte `IPN_MONTANT_MISMATCH` dans les logs
   - Alerte en cas de tentative de fraude ou erreur système

3. **Paiements PENDING bloqués**
   - Compte les paiements NGSER PENDING > 60 minutes
   - Alerte si seuil dépassé (défaut: 5 paiements)

---

## Configuration Serveur Production/Staging

### 1. Variables d'Environnement

Ajouter dans `/app/backend/.env.production`:

```bash
# Alertes monitoring
APP_LOG=/app/backend/logs/app.log
PENDING_THRESHOLD=5
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 2. Créer Webhook Slack

#### Étapes:

1. Aller sur https://api.slack.com/apps
2. Créer une nouvelle app "FORGES Monitoring"
3. Activer "Incoming Webhooks"
4. Ajouter webhook au canal `#forges-alerts`
5. Copier l'URL du webhook
6. Ajouter `SLACK_WEBHOOK=...` dans `.env.production`

#### Format des alertes Slack:

```
FORGES: scheduler reconciliation NGSER sans signal recent dans logs/app.log
FORGES: IPN_MONTANT_MISMATCH detecte dans les logs recents
FORGES: 8 paiements NGSER PENDING depuis plus de 60 minutes
```

---

### 3. Configuration Cron

#### Staging

Ajouter dans crontab serveur staging:

```bash
# Alertes critiques FORGES - Toutes les 5 minutes
*/5 * * * * cd /app/backend && \
  APP_LOG=logs/app.log \
  PENDING_THRESHOLD=5 \
  SLACK_WEBHOOK="https://hooks.slack.com/services/STAGING/WEBHOOK" \
  ./scripts/check-critical-alerts.sh >> /var/log/forges-alerts.log 2>&1
```

#### Production

Ajouter dans crontab serveur production:

```bash
# Alertes critiques FORGES - Toutes les 5 minutes
*/5 * * * * cd /app/backend && \
  APP_LOG=logs/app.log \
  PENDING_THRESHOLD=3 \
  SLACK_WEBHOOK="https://hooks.slack.com/services/PROD/WEBHOOK" \
  ./scripts/check-critical-alerts.sh >> /var/log/forges-alerts.log 2>&1
```

**Note**: Seuil plus strict en production (3 au lieu de 5)

---

### 4. Installer le Cron

```bash
# SSH sur le serveur
ssh user@forges-staging.ci

# Éditer crontab
crontab -e

# Ajouter la ligne cron ci-dessus

# Vérifier installation
crontab -l | grep forges

# Vérifier logs
tail -f /var/log/forges-alerts.log
```

---

### 5. Tester le Script Manuellement

```bash
# Sur le serveur
cd /app/backend

# Test sans Slack (console uniquement)
APP_LOG=logs/app.log \
PENDING_THRESHOLD=5 \
./scripts/check-critical-alerts.sh

# Test avec Slack
APP_LOG=logs/app.log \
PENDING_THRESHOLD=5 \
SLACK_WEBHOOK="https://hooks.slack.com/services/..." \
./scripts/check-critical-alerts.sh
```

---

## Endpoint Stats Paiements Temps Réel

### Utilisation

```bash
# Stats 1h
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.forges.ci/api/admin/paiements/stats?period=1h

# Stats 24h
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.forges.ci/api/admin/paiements/stats?period=24h

# Stats 7 jours
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.forges.ci/api/admin/paiements/stats?period=7d
```

### Réponse

```json
{
  "statusCode": 200,
  "data": {
    "period": "24h",
    "total": 150,
    "success": 142,
    "fail": 3,
    "pending": 5,
    "success_rate": 94.67,
    "avg_confirmation_time_seconds": 8.2,
    "pending_over_30min": 2
  }
}
```

---

## Dashboard Monitoring (Optionnel)

### Grafana / Prometheus

Si Grafana est disponible, créer dashboard avec:

1. **Métriques clés**:
   - Taux de succès paiements (>95%)
   - Latence moyenne confirmation (<10s)
   - Paiements PENDING >30min (<5)

2. **Alertes**:
   - Taux succès <90%
   - Latence moyenne >15s
   - PENDING >30min >10 paiements

3. **Source données**:
   - Endpoint `/api/admin/paiements/stats`
   - Table `AuditLog` PostgreSQL
   - Table `Paiement` PostgreSQL

---

## Logs AuditLog à Surveiller

### Événements critiques

```sql
-- IPN montant mismatch (fraude potentielle)
SELECT * FROM "AuditLog"
WHERE action = 'IPN_MONTANT_MISMATCH'
ORDER BY timestamp DESC
LIMIT 10;

-- Réconciliation échouée
SELECT * FROM "AuditLog"
WHERE action = 'RECONCILIATION_ERREUR'
ORDER BY timestamp DESC
LIMIT 10;

-- Circuit-breaker ouvert (NGSER indisponible)
SELECT * FROM "AuditLog"
WHERE action = 'NGSER_CIRCUIT_BREAKER_OPENED'
ORDER BY timestamp DESC
LIMIT 10;
```

---

## Checklist Déploiement Monitoring

### Avant Staging

- [ ] Webhook Slack créé canal #forges-staging
- [ ] Variable `SLACK_WEBHOOK` ajoutée `.env.staging`
- [ ] Script `check-critical-alerts.sh` testé manuellement
- [ ] Cron configuré (*/5 * * * *)
- [ ] Logs `/var/log/forges-alerts.log` créés
- [ ] Endpoint stats testé avec token ADMIN

### Avant Production

- [ ] Webhook Slack créé canal #forges-production
- [ ] Variable `SLACK_WEBHOOK` ajoutée `.env.production`
- [ ] Seuil `PENDING_THRESHOLD=3` configuré (plus strict)
- [ ] Cron configuré (*/5 * * * *)
- [ ] Rotation logs configurée (`logrotate`)
- [ ] Dashboard Grafana créé (optionnel)
- [ ] Alertes PagerDuty configurées (optionnel)

---

## Références

- Script: `backend/scripts/check-critical-alerts.sh`
- Endpoint stats: `backend/src/modules/paiements/paiement.controller.ts:131`
- Service stats: `backend/src/modules/paiements/paiement.service.ts:340`
- Plan prod: `docs/implementation-4.9/plan_prod_4.9.md:307-324`
