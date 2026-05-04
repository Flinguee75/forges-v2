# FORGES - Critical Alerts Configuration

_Configuration des alertes pour les événements critiques_

**Date**: 4 mai 2026  
**Version**: 1.0.0

## 📋 Vue d'ensemble

Ce document définit les alertes critiques à configurer dans Sentry, Better Stack et Uptime Kuma.

---

## 🔴 ALERTES CRITIQUES

### 1. Disponibilité (Uptime Kuma)

| Alerte | Condition | Seuil | Notification | Escalade |
|--------|-----------|-------|--------------|----------|
| Frontend Down | HTTP Status ≠ 200 | Immédiat | Email + Slack | 5 min |
| Backend API Down | /api/health ≠ 200 | Immédiat | Email + Slack | 5 min |
| Payment API Down | /api/payments/health ≠ 200 | Immédiat | Email + Slack + SMS | Immédiat |
| SSL Certificate Expiry | < 14 jours | Quotidien | Email | N/A |

### 2. Erreurs Backend (Sentry)

| Alerte | Condition | Seuil | Notification | Escalade |
|--------|-----------|-------|--------------|----------|
| Erreur 500 | HTTP 500 | 1+ par 5 min | Email + Slack | 15 min |
| Erreur Prisma DB | Database error | 1+ | Email + Slack | 15 min |
| Webhook Paiement Failed | PAYMENT_WEBHOOK_FAILED | 1+ | Email + Slack + SMS | 5 min |
| Authentication Failed | Auth error | 10+ par 5 min | Email + Slack | 15 min |
| Timeout Timeout | API timeout | 5+ par 5 min | Email + Slack | 15 min |

### 3. Logs Critiques (Better Stack)

| Alerte | Recherche | Seuil | Notification | Escalade |
|--------|-----------|-------|--------------|----------|
| CRITICAL Event | `level:error AND event:CRITICAL` | 1+ | Email + Slack + SMS | Immédiat |
| Payment Error | `PAYMENT_WEBHOOK_FAILED OR PAYMENT_ERROR` | 1+ | Email + Slack + SMS | 5 min |
| Database Error | `DB_ERROR OR connection timeout` | 1+ | Email + Slack | 15 min |
| Authentication Error | `AUTH_ERROR OR login failed` | 5+ | Email + Slack | 15 min |
| High Error Rate | `level:error` | 50+ par 5 min | Email + Slack | 15 min |

---

## 🟡 ALERTES IMPORTANTES

### 4. Performance (Uptime Kuma)

| Alerte | Condition | Seuil | Notification |
|--------|-----------|-------|--------------|
| Response Time High | Response > 3s | 3+ occurrences | Email |
| API Latency | API Response > 2s | 5+ par 5 min | Email |
| Frontend Load Slow | Load time > 5s | 3+ occurrences | Email |

### 5. Ressources (Portainer)

| Alerte | Condition | Seuil | Notification |
|--------|-----------|-------|--------------|
| Disk Usage High | > 80% | Quotidien | Email |
| Memory Usage High | > 90% | Immédiat | Email |
| Container Restart Loop | 3+ restart/5 min | Immédiat | Email + Slack |

---

## 🟢 ALERTES INFORMATIVES

### 6. Événements Normaux (Better Stack)

| Alerte | Recherche | Seuil | Notification |
|--------|-----------|-------|--------------|
| Deployment | `event:DEPLOYMENT_SUCCESS` | 1+ | Slack #deployments |
| Payment Received | `PAYMENT_SUCCESS` | Quotidien résumé | Slack #payments |
| New User | `event:USER_REGISTERED` | Quotidien résumé | Slack #users |

---

## ⚙️ SETUP PAR ENVIRONNEMENT

### DEV Environment

**Uptime Kuma**:
```
Monitor: http://localhost:3000 (Frontend)
Monitor: http://localhost:3001/health (Backend)
Notification: Console/Local
```

**Sentry**: Non configuré (utiliser les logs console)

**Better Stack**: Non configuré (utiliser les logs console)

### TEST Environment

**Uptime Kuma**:
```
Monitor 1: https://test-forges.com
Monitor 2: https://test-forges.com/api/health
Notification: Email (test@forges.com)
```

**Sentry**:
```
Alert 1: Error rate > 5 errors/hour
Alert 2: New crash detected
Notification: Email (devs@forges.com)
```

**Better Stack**:
```
Alert 1: ERROR log detected
Alert 2: PAYMENT_WEBHOOK_FAILED detected
Notification: Email (ops@forges.com)
```

### DEMO Environment

**Uptime Kuma**:
```
Monitor 1: https://demo-forges.com
Monitor 2: https://demo-forges.com/api/health
Monitor 3: https://demo-forges.com/api/payments/health
Notification: Email + Slack #demo-alerts
```

**Sentry**:
```
Alert 1: Error rate > 10 errors/hour
Alert 2: New crash detected
Alert 3: Payment webhook error
Notification: Email + Slack #sentry-alerts
```

**Better Stack**:
```
Alert 1: CRITICAL event log
Alert 2: PAYMENT_WEBHOOK_FAILED
Alert 3: DB_ERROR detected
Alert 4: High error rate (50+ errors/5min)
Notification: Email + Slack #better-stack-alerts
```

---

## 🔔 CONFIGURATION UPTIME KUMA

### Créer une alerte

1. Aller sur http://localhost:3001
2. Cliquer sur le monitor
3. Aller à "Notifications"
4. Ajouter notification:
   - **Email**: Ajouter email
   - **Slack**: Ajouter webhook URL
   - **Telegram**: Ajouter bot token + chat ID

### Test d'alerte

```bash
# Créer un monitor test vers adresse invalide
Monitor Name: Test Alert
URL: http://localhost:9999
Interval: 10 seconds

# Attendre l'alerte
# Si reçue: OK ✅
# Si non reçue: Vérifier config notification
```

---

## 🔔 CONFIGURATION SENTRY

### Créer une alerte

1. Aller sur https://sentry.io
2. Sélectionner le projet
3. Aller à "Alerts"
4. Cliquer "Create Alert Rule"
5. Configurer:
   - **Condition**: When... (ex: error.level is error)
   - **Threshold**: (ex: 5 errors in 5 minutes)
   - **Action**: Send notification to (email/Slack/etc)

### Exemples d'alertes

**Alert 1: Error Rate High**
```
Condition: error.level is error
Threshold: 10 events in 5 minutes
Action: Send to Email + Slack
```

**Alert 2: Payment Error**
```
Condition: message contains "PAYMENT_WEBHOOK_FAILED"
Threshold: 1 event
Action: Send to Email + Slack + SMS
```

**Alert 3: Database Error**
```
Condition: exception.type is PrismaClientKnownRequestError
Threshold: 1 event
Action: Send to Email + Slack
```

---

## 🔔 CONFIGURATION BETTER STACK

### Créer une alerte

1. Aller sur https://betterstack.com
2. Sélectionner la source
3. Aller à "Alerts"
4. Cliquer "Create Alert"
5. Configurer:
   - **Query**: (ex: message contains "ERROR")
   - **Condition**: (ex: > 1 match)
   - **Window**: (ex: 5 minutes)
   - **Notification**: (email/Slack/etc)

### Exemples d'alertes

**Alert 1: Critical Event**
```
Query: level:error AND event:CRITICAL
Condition: > 1 match in 5 minutes
Window: 5 minutes
Notification: Email + Slack + SMS
```

**Alert 2: Payment Error**
```
Query: message contains "PAYMENT_WEBHOOK_FAILED"
Condition: > 1 match in 5 minutes
Window: 5 minutes
Notification: Email + Slack + SMS
```

**Alert 3: Database Error**
```
Query: message contains "DB_ERROR"
Condition: > 1 match in 5 minutes
Window: 5 minutes
Notification: Email + Slack
```

---

## 📧 CONFIGURATION NOTIFICATIONS

### Email

**Recipients**:
- Dev Team: `devs@forges.com`
- Ops Team: `ops@forges.com`
- Payments Team: `payments@forges.com`
- Management: `director@forges.com`

**Fréquence**:
- Critical: Immédiat
- High: 15 min
- Medium: 1 heure
- Low: Daily digest

### Slack

**Channels**:
- `#alerts-critical`: Alertes critiques
- `#alerts-api`: Erreurs API
- `#alerts-payments`: Erreurs paiement
- `#alerts-infrastructure`: Infra issues
- `#uptime-status`: Uptime Kuma
- `#sentry-errors`: Sentry errors
- `#logs-errors`: Better Stack logs

**Webhook Setup**:
1. Créer app Slack dans workspace
2. Activer "Incoming Webhooks"
3. Créer webhook par channel
4. Copier URL webhook
5. Ajouter dans alertes (Sentry/Better Stack/Uptime Kuma)

### SMS (Optional)

Pour alertes critiques uniquement (paiements):
- Provider: Twilio / AWS SNS
- Recipients: OPS team only
- Fréquence: Critical events only

---

## 🧪 PROCÉDURE DE TEST D'ALERTE

### Test Uptime Kuma

```bash
# Créer un monitor test vers URL invalide
cd infra/monitoring

# Dans Uptime Kuma UI: créer monitor vers http://localhost:9999
# Attendre quelques secondes
# Alerte devrait être reçue ✓
```

### Test Sentry

```bash
cd backend
npm run dev

# En autre terminal:
curl -X POST http://localhost:3000/test-error

# Vérifier dans Sentry dashboard: alerte reçue ✓
```

### Test Better Stack

```bash
cd backend

# Ajouter log test:
import { getLogger } from './config/logger';
const logger = getLogger();

// Endpoint de test
app.get('/test-error-log', (req, res) => {
  logger.error('TEST ERROR FOR ALERTING');
  res.send('Error logged');
});

npm run dev

# En autre terminal:
curl http://localhost:3000/test-error-log

# Vérifier dans Better Stack dashboard: alerte reçue ✓
```

---

## 📊 TABLEAU DE BORD DE VALIDATION

### Checklist d'Implémentation

- [ ] **Uptime Kuma**: 3+ monitors créés
- [ ] **Uptime Kuma**: Notifications configurées
- [ ] **Uptime Kuma**: Test d'alerte réussi
- [ ] **Sentry**: 3+ alert rules créées
- [ ] **Sentry**: Test d'erreur capturée
- [ ] **Better Stack**: 3+ alert rules créées
- [ ] **Better Stack**: Test de log reçu
- [ ] **Email**: Alertes reçues
- [ ] **Slack**: Webhooks configurés + Alertes reçues
- [ ] **Documentation**: Alertes documentées
- [ ] **Formation**: Équipe formée

---

## 🚨 ESCALADE DES ALERTES

### Niveau 1: Warning (15 min)

Conditions:
- Erreur 5xx < 10 par 5 min
- Response time 2-3 secondes
- Log warning reçu

Actions:
- Email à dev team
- Log dans Slack #alerts

### Niveau 2: Critical (5 min)

Conditions:
- Erreur 5xx > 10 par 5 min
- Service down < 5 min
- Payment webhook failed
- Database error

Actions:
- Email + SMS à ops team
- Alert Slack immediate
- Pager oncall

### Niveau 3: Emergency (Immédiat)

Conditions:
- Service down > 5 min
- Multiple services down
- Payment system down
- Data loss risk

Actions:
- Email + SMS + Call tous contacts
- War room Slack immediat
- CEO notification

---

## 📞 CONTACTS D'ESCALADE

| Niveau | Contact | Temps | Méthode |
|--------|---------|-------|---------|
| L1 | dev@forges.com | 15 min | Email |
| L2 | ops@forges.com | 5 min | Email + SMS |
| L3 | director@forges.com | Immédiat | Email + SMS + Call |
| Payment Critical | payments@forges.com | Immédiat | Email + SMS + Call |

---

## 🔄 MAINTENANCE DES ALERTES

### Mensuel

- [ ] Vérifier tous les alerts toujours valides
- [ ] Ajuster seuils selon tendances
- [ ] Vérifier contacts up-to-date
- [ ] Tester chaque alerte

### Trimestriel

- [ ] Revoir stratégie alertes
- [ ] Ajouter nouvelles règles si besoin
- [ ] Supprimer alertes obsolètes
- [ ] Former équipe sur nouvelles alertes

### Annuel

- [ ] Audit complet des alertes
- [ ] Review ROI de chaque outil
- [ ] Évaluer outils alternatifs
- [ ] Planifier scaling si besoin

---

**Document créé**: 4 mai 2026  
**Auteur**: FORGES DevOps Team  
**Statut**: Production Ready
