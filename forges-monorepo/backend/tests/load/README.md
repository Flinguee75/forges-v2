# Load Test Paiements NGSER - FORGES v4.9

## Description

Script de load test pour valider la performance du système paiement NGSER sous charge.

**Scénario testé**:
1. Inscription apprenant
2. Login
3. Inscription session STANDARD
4. Initiation paiement NGSER
5. Webhook IPN SUCCESS

**Objectif**: Valider que le système peut gérer 50 paiements simultanés avec un taux de succès >95% et une latence p95 <5s.

---

## Installation k6

### macOS
```bash
brew install k6
```

### Linux (Ubuntu/Debian)
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Docker
```bash
docker pull grafana/k6
```

### Vérification
```bash
k6 version
```

---

## Utilisation

### 1. Load Test Local

```bash
cd backend/tests/load
./run-load-test.sh local
```

**Prérequis**:
- Backend démarré sur `http://localhost:3000`
- Base de données seedée avec `seed_for_test.js`

### 2. Load Test Staging

```bash
cd backend/tests/load

# Configurer credentials staging
export STAGING_ADMIN_EMAIL="admin@forges-staging.ci"
export STAGING_ADMIN_PASSWORD="your_staging_password"
export STAGING_WEBHOOK_SECRET="your_staging_webhook_secret"

./run-load-test.sh staging
```

---

## Configuration Load Test

### Profil de Charge (fichier `paiements-ngser-load.js`)

```javascript
stages: [
  { duration: '30s', target: 10 },  // Montée progressive à 10 VUs
  { duration: '1m', target: 50 },   // Montée à 50 VUs
  { duration: '2m', target: 50 },   // Maintien 50 VUs
  { duration: '30s', target: 0 },   // Descente progressive
]
```

**Durée totale**: ~4 minutes
**VUs maximum**: 50 utilisateurs virtuels simultanés
**Paiements simulés**: ~150-200

### Seuils de Succès

```javascript
thresholds: {
  http_req_duration: ['p(95)<5000'],  // 95% requêtes < 5s
  failed_requests: ['rate<0.05'],     // Taux échec < 5%
  paiement_duration: ['p(95)<3000'],  // Initiation < 3s
  webhook_duration: ['p(95)<1000'],   // Webhook < 1s
}
```

---

## Modification du Profil de Charge

### Test Rapide (validation)

Modifier `paiements-ngser-load.js`:

```javascript
stages: [
  { duration: '10s', target: 5 },
  { duration: '20s', target: 5 },
  { duration: '10s', target: 0 },
]
```

### Test Intensif (stress test)

```javascript
stages: [
  { duration: '1m', target: 50 },
  { duration: '2m', target: 100 },
  { duration: '3m', target: 100 },
  { duration: '1m', target: 0 },
]
```

---

## Interprétation des Résultats

### Fichiers Générés

1. **load-test-results.json**
   - Résultats complets
   - Toutes les métriques par VU et itération

2. **load-test-summary.json**
   - Résumé agrégé
   - Métriques clés (p95, p99, moyenne)

### Métriques Clés

```json
{
  "Total requêtes": 1234,
  "Requêtes échouées": 0.02,        // 2% échec = OK (<5%)
  "Latence p95 (ms)": 3456,          // 3.5s = OK (<5s)
  "Initiation paiement p95 (ms)": 2100,  // 2.1s = OK (<3s)
  "Webhook p95 (ms)": 456            // 456ms = OK (<1s)
}
```

### Critères de Validation

#### ✅ PASS
- Taux échec < 5%
- Latence p95 < 5s
- Initiation paiement p95 < 3s
- Webhook p95 < 1s
- Aucune erreur 500

#### ⚠️ WARNING
- Taux échec 5-10%
- Latence p95 5-10s
- Quelques erreurs 500 isolées

#### ❌ FAIL
- Taux échec > 10%
- Latence p95 > 10s
- Erreurs 500 répétées
- Timeouts NGSER

---

## Analyse Détaillée

### Voir toutes les métriques

```bash
cat load-test-results.json | jq '.metrics'
```

### Filtrer les échecs

```bash
cat load-test-results.json | jq '.points[] | select(.metric == "failed_requests")'
```

### Graphique latence (avec k6 cloud)

```bash
k6 cloud load-test-results.json
# Ouvre dashboard web avec graphiques
```

---

## Monitoring Pendant le Test

### Backend

```bash
# Terminal 1: Logs backend
cd backend
npm run dev

# Terminal 2: Logs AuditLog
psql $DATABASE_URL -c "
  SELECT action, COUNT(*)
  FROM \"AuditLog\"
  WHERE timestamp > now() - interval '10 minutes'
  GROUP BY action
  ORDER BY COUNT(*) DESC;
"
```

### Stats Temps Réel

```bash
# Pendant le load test
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/admin/paiements/stats?period=1h | jq
```

### Paiements PENDING

```bash
psql $DATABASE_URL -c "
  SELECT statut, COUNT(*)
  FROM \"Paiement\"
  WHERE provider='NGSER'
  GROUP BY statut;
"
```

---

## Troubleshooting

### Erreur: "Backend non accessible"

```bash
# Vérifier backend démarré
curl http://localhost:3000/health
```

### Erreur: "k6 n'est pas installé"

Voir section Installation ci-dessus.

### Taux échec élevé

1. Vérifier logs backend
2. Vérifier base de données pas saturée
3. Vérifier Redis accessible
4. Réduire charge (moins de VUs)

### Latence élevée

1. Vérifier CPU/RAM serveur
2. Vérifier connexions DB (max_connections)
3. Vérifier mode mock NGSER activé (plus rapide)
4. Optimiser queries N+1

---

## Recommandations Production

### Avant Mise en Production

1. **Load test staging réussi**
   - Taux succès >95%
   - Latence p95 <5s

2. **Monitoring actif**
   - Dashboard Grafana
   - Alertes Slack configurées

3. **Circuit-breaker testé**
   - Simuler panne NGSER
   - Vérifier passage OPEN → HALF_OPEN

### Capacité Requise

D'après le load test, pour 50 paiements/min:

- **CPU**: 2 cores minimum
- **RAM**: 2GB minimum
- **DB Connections**: 20 minimum
- **Redis**: 256MB
- **Bande passante**: 10 Mbps

---

## Références

- Script: `tests/load/paiements-ngser-load.js`
- Runner: `tests/load/run-load-test.sh`
- Doc k6: https://k6.io/docs/
- Plan prod: `docs/implementation-4.9/plan_prod_4.9.md:349-355`
