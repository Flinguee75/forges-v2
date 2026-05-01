# Plan de Fiabilisation Production FORGES v4.9

## Contexte

FORGES v4.9 intègre le système de paiement NGSER (RM-157 à RM-162) avec:
- Tests backend: 478/478 PASS (100%)
- Décision J7: GO PRODUCTION LIMITÉE
- **Problème critique**: Mode mock actif, plusieurs gaps de fiabilité identifiés

## Problèmes Critiques Identifiés

### 🔴 BLOQUANTS (à corriger avant production)

1. **Scheduler réconciliation NON ACTIVÉ**
   - Fichier: `src/app.ts`
   - Impact: Paiements PENDING bloqués indéfiniment
   - Aucune récupération automatique en cas d'IPN perdu

2. **Bug montant hardcodé dans réconciliation**
   - Fichier: `src/schedulers/reconciliation-ngser.scheduler.ts` ligne 157
   - Code: `amount: 150000` (devrait être `paiement.montant_initie`)
   - Impact: RM-160 rejette IPN → paiement reste PENDING

3. **Queue IPN en mémoire (non persistante)**
   - Fichier: `src/shared/queue/ipn-queue.service.ts`
   - Impact: Perte d'IPN en crash serveur
   - Aucun retry automatique

4. **Item queue supprimé avant traitement**
   - Même fichier, méthode `processQueue()`
   - Impact: Item perdu si exception dans processor
   - Pas de dead-letter queue

5. **Aucun test E2E du flux paiement complet**
   - Gap: Inscription → Paiement → IPN → Dossier PAYE
   - Pas de test avec API NGSER réelle

### 🟡 IMPORTANTS (avant production finale)

6. **Pas de circuit-breaker NGSER API**
   - Impact: DDoS involontaire si 100+ paiements PENDING
   - Pas de backoff exponentiel

7. **Aucun monitoring/alerting temps réel**
   - Pas de métriques Prometheus
   - Pas de dashboard paiements
   - Incidents silencieux

8. **Timeout NGSER trop strict (30s)**
   - Peut échouer inutilement en production
   - Recommandé: 60s

## Approche Recommandée

### Phase 1: Corrections Bloquantes (J8 - 1 jour)

#### 1.1 Activer le scheduler réconciliation ✅ PRIORITÉ 1

**Fichier**: `src/app.ts`

**Changement**:
```typescript
// AVANT (lignes 17-51)
if (process.env.NODE_ENV !== 'test') {
  dossierExpirationScheduler.start();
  sessionTransitionScheduler.start();
  commissionAgregateurScheduler.start();
  alerteValidationScheduler.start();
  reversementAbonnementScheduler.start();
  alerteB2BScheduler.start();
  // ReconciliationNgserScheduler MANQUANT !
}

// APRÈS
if (process.env.NODE_ENV !== 'test') {
  dossierExpirationScheduler.start();
  sessionTransitionScheduler.start();
  commissionAgregateurScheduler.start();
  alerteValidationScheduler.start();
  reversementAbonnementScheduler.start();
  alerteB2BScheduler.start();

  // v4.9 - Réconciliation paiements NGSER PENDING
  reconciliationNgserScheduler.start();
  audit.info('SCHEDULER_RECONCILIATION_NGSER_STARTED', {
    interval_minutes: Number(process.env.NGSER_RECONCILIATION_PENDING_MINUTES) || 30,
  });
}
```

**Import à ajouter**:
```typescript
import { reconciliationNgserScheduler } from './schedulers/reconciliation-ngser.scheduler';
```

**Test de validation**:
```bash
# Vérifier que le scheduler démarre
npm start
# Logs attendus: SCHEDULER_RECONCILIATION_NGSER_STARTED
```

---

#### 1.2 Corriger bug montant hardcodé ✅ PRIORITÉ 1

**Fichier**: `src/schedulers/reconciliation-ngser.scheduler.ts`

**Changement ligne 143-158**:
```typescript
// AVANT
private async reconcilierMock(order_ngser: string) {
  await this.ipnService.traiterIpn({
    order_ngser: order_ngser,
    transaction_id: `TXN-RECON-MOCK-${Date.now()}`,
    status: 'SUCCESS',
    amount: 150000, // ❌ HARDCODÉ!
  });

  return { statut_final: 'CONFIRME', dossier_statut: 'PAYE' };
}

// APRÈS
private async reconcilierMock(order_ngser: string) {
  // Récupérer montant réel du paiement
  const paiement = await this.prisma.paiement.findUnique({
    where: { order_ngser },
    select: { montant_initie: true },
  });

  if (!paiement || !paiement.montant_initie) {
    throw new Error('PAIEMENT_NOT_FOUND_OR_NO_MONTANT');
  }

  await this.ipnService.traiterIpn({
    order_ngser: order_ngser,
    transaction_id: `TXN-RECON-MOCK-${Date.now()}`,
    status: 'SUCCESS',
    amount: paiement.montant_initie, // ✅ Montant réel
  });

  return { statut_final: 'CONFIRME', dossier_statut: 'PAYE' };
}
```

**Test de validation**:
```bash
npm test -- reconciliation-ngser.scheduler.test.ts
# Ajouter test spécifique avec montants variables (100k, 150k, 200k)
```

---

#### 1.3 Migrer queue IPN vers Redis ✅ PRIORITÉ 1

**Nouveau fichier**: `src/shared/queue/ipn-queue-redis.service.ts`

**Implémentation**:
```typescript
import { createClient } from 'redis';

export class IpnQueueRedisService {
  private redisClient: ReturnType<typeof createClient>;
  private readonly queueKey = 'forges:ipn:queue';
  private readonly dlqKey = 'forges:ipn:dlq'; // Dead Letter Queue

  constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
  }

  async enqueue(item: QueueItem): Promise<void> {
    await this.redisClient.connect();
    await this.redisClient.rPush(this.queueKey, JSON.stringify(item));
    await this.redisClient.disconnect();
  }

  async processQueue(processor: (item: QueueItem) => Promise<void>): Promise<void> {
    await this.redisClient.connect();

    while (true) {
      const itemStr = await this.redisClient.lPop(this.queueKey);
      if (!itemStr) break;

      const item = JSON.parse(itemStr);
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          await processor(item);
          break; // Succès, sortir de la boucle retry
        } catch (error: any) {
          retries++;
          if (retries >= maxRetries) {
            // Envoyer vers DLQ après 3 échecs
            await this.redisClient.rPush(this.dlqKey, JSON.stringify({
              ...item,
              error: error.message,
              failed_at: new Date(),
            }));
          }
          // Attendre avant retry (backoff exponentiel)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
        }
      }
    }

    await this.redisClient.disconnect();
  }
}
```

**Migration**: Remplacer `IpnQueueService` par `IpnQueueRedisService` dans:
- `src/modules/paiements/paiement.controller.ts`
- `src/app.ts`

**Alternative si Redis indisponible**: Utiliser PostgreSQL comme queue (table `ipn_queue`)

**Test de validation**:
```bash
# Test crash simulation
npm test -- ipn-queue-redis.test.ts
```

---

#### 1.4 Créer test E2E paiement complet ✅ PRIORITÉ 1

**Nouveau fichier**: `frontend/e2e/paiement-ngser-e2e.spec.ts`

**Tests à couvrir**:
```typescript
test('E2E: Inscription → Paiement NGSER → IPN → Dossier PAYE', async ({ page, request }) => {
  // 1. Login apprenant
  // 2. Inscription formation Premium Retail
  // 3. Initiation paiement NGSER
  // 4. Simuler webhook IPN SUCCESS
  // 5. Vérifier dossier passe PAYE
  // 6. Vérifier commission créée
});

test('E2E: Double IPN (idempotence)', async ({ request }) => {
  // Envoyer 2x le même IPN
  // Vérifier 1 seule commission créée
});

test('E2E: IPN montant invalide rejeté', async ({ request }) => {
  // IPN avec montant différent
  // Vérifier MONTANT_MISMATCH loggé
});

test('E2E: Réconciliation scheduler récupère PENDING', async () => {
  // Créer paiement PENDING > 30min
  // Déclencher scheduler manuellement
  // Vérifier passage CONFIRME
});
```

**Temps estimé**: 3h

---

### Phase 2: Améliorations Importantes (J9 - 1 jour)

#### 2.1 Implémenter circuit-breaker NGSER

**Nouveau fichier**: `src/shared/circuit-breaker/circuit-breaker.service.ts`

**Logique**:
- État: CLOSED → OPEN → HALF_OPEN
- Seuil: > 50% erreurs sur 10 appels → OPEN
- Timeout OPEN: 30s avant HALF_OPEN
- En OPEN: fail-fast sans appeler NGSER

**Intégration**: Dans `src/modules/paiements/ngser.client.ts`

---

#### 2.2 Améliorer logs audit pour monitoring

**Fichier**: `src/shared/audit/audit.logger.ts`

**Améliorations**:
- Ajouter timestamps précis (ms)
- Structurer métadonnées critiques paiements
- Logger tous les chemins d'erreur

**Nouveau**: Endpoint admin pour statistiques temps réel

**Fichier**: `src/modules/admin/paiements-stats.controller.ts`

```typescript
GET /api/admin/paiements/stats?period=24h
Response:
{
  total: 150,
  success: 142,
  fail: 3,
  pending: 5,
  success_rate: 94.7,
  avg_confirmation_time_seconds: 8.2,
  pending_over_30min: 2
}
```

**Utilisation**: Dashboard simple via requêtes SQL sur AuditLog

---

#### 2.3 Alertes critiques via AuditLog

**Script cron**: `scripts/check-critical-alerts.sh` (toutes les 5 min)

```bash
#!/bin/bash
# Vérifier si scheduler down
if ! grep -q "RECONCILIATION_NGSER_DEBUT" logs/app.log --after=$(date -d '35 minutes ago' +%s); then
  curl -X POST $SLACK_WEBHOOK -d '{"text":"⚠️ Scheduler réconciliation DOWN"}'
fi

# Vérifier montant mismatch
if grep -q "IPN_MONTANT_MISMATCH" logs/app.log --since=$(date -d '5 minutes ago' +%s); then
  curl -X POST $SLACK_WEBHOOK -d '{"text":"🚨 FRAUD: Montant mismatch détecté"}'
fi

# Vérifier paiements PENDING âgés
PENDING_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM Paiement WHERE statut='PENDING' AND created_at < now() - interval '60 minutes'")
if [ $PENDING_COUNT -gt 5 ]; then
  curl -X POST $SLACK_WEBHOOK -d "{\"text\":\"⚠️ $PENDING_COUNT paiements PENDING > 60min\"}"
fi
```

**Déploiement**: Cron toutes les 5 min sur serveur production

---

### Phase 3: Validation Staging (J10 - 1 jour)

#### 3.1 Désactiver mode mock

**Variables env staging**:
```bash
NGSER_MOCK_MODE=false
NGSER_BASE_URL=https://securetest.crossroad-africa.net/
NGSER_AUTH_TOKEN=<sandbox_token>
NGSER_OPERATION_TOKEN_PAIEMENT=<sandbox_token>
```

#### 3.2 Tester paiements sandbox réels

**Scénarios**:
1. Paiement SUCCESS (Mobile Money)
2. Paiement FAIL (carte rejetée)
3. Paiement PENDING (timeout)
4. IPN reçu depuis NGSER
5. Réconciliation automatique

#### 3.3 Load test

**Outil**: k6 / Artillery

**Scénario**:
- 100 inscriptions parallèles
- 100 initiations paiement
- Mesurer: CPU, RAM, latence, taux d'erreur

#### 3.4 Smoke tests post-déploiement

```bash
./infra/scripts/smoke-test-v49.sh
```

**Checklist**:
- Health checks ✅
- Login admin ✅
- Catalogue formations ✅
- Initiation paiement ✅
- Webhook IPN ✅
- Newman baseline v4.8 ✅

---

### Phase 4: Production Progressive (J11-J13)

#### 4.1 Feature flag

**Variable**: `NGSER_ROLLOUT_PERCENTAGE=10` (augmenter progressivement)

**Logique**:
```typescript
if (Math.random() * 100 < Number(process.env.NGSER_ROLLOUT_PERCENTAGE)) {
  // Utiliser NGSER
} else {
  // Utiliser ancien système
}
```

#### 4.2 Beta users (J11)

- 10-20 utilisateurs tests
- Monitoring renforcé 48h
- Hotline support disponible

#### 4.3 Production 50% (J12)

- Si beta OK, passer à 50%
- Surveiller métriques 24h

#### 4.4 Production 100% (J13)

- Si 50% OK, déployer complètement
- Monitoring standard

---

## Fichiers à Modifier

### Critiques (Phase 1)

1. `src/app.ts` - Activer scheduler
2. `src/schedulers/reconciliation-ngser.scheduler.ts` - Fix montant
3. `src/shared/queue/ipn-queue-redis.service.ts` - Nouvelle queue Redis
4. `src/modules/paiements/paiement.controller.ts` - Utiliser queue Redis
5. `frontend/e2e/paiement-ngser-e2e.spec.ts` - Tests E2E

### Importants (Phase 2)

6. `src/shared/circuit-breaker/circuit-breaker.service.ts` - Nouveau
7. `src/modules/paiements/ngser.client.ts` - Intégrer circuit-breaker
8. `src/modules/admin/paiements-stats.controller.ts` - Nouveau (stats temps réel)
9. `scripts/check-critical-alerts.sh` - Nouveau (cron alertes)

### Recommandés (Phase 3)

10. `infra/docker-compose.staging.yml` - Config staging
11. `infra/scripts/smoke-test-v49.sh` - Nouveau script
12. `.env.staging` - Variables NGSER réelles

---

## Checklist de Validation

### Phase 1 (Bloquants)

- [ ] Scheduler réconciliation activé et testé
- [ ] Bug montant corrigé avec tests
- [ ] Queue IPN Redis fonctionnelle
- [ ] Tests E2E paiement passent (4/4)
- [ ] Tous tests backend passent (478/478)

### Phase 2 (Importants)

- [ ] Circuit-breaker implémenté
- [ ] Endpoint stats paiements créé (`/api/admin/paiements/stats`)
- [ ] Script alertes cron configuré
- [ ] Webhook Slack testé
- [ ] Load test 100 paiements OK

### Phase 3 (Staging)

- [ ] Mode mock désactivé
- [ ] Paiement sandbox SUCCESS testé
- [ ] IPN reçu depuis NGSER
- [ ] Réconciliation fonctionne avec API réelle
- [ ] Smoke tests passent
- [ ] Newman baseline OK

### Phase 4 (Production)

- [ ] Feature flag configuré
- [ ] Beta users testent 48h sans erreur
- [ ] Monitoring actif et dashboards visibles
- [ ] Runbook incident à jour
- [ ] Backup DB avant déploiement

---

## Risques et Mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Queue Redis indisponible | Faible | Critique | Fallback PostgreSQL table |
| Circuit-breaker trop strict | Moyen | Moyen | Configurer seuils progressivement |
| Load test révèle bottleneck | Moyen | Élevé | Identifier avant prod, optimiser |
| NGSER sandbox instable | Faible | Élevé | Garder mode mock comme fallback |
| Rollback nécessaire | Faible | Critique | Procédure testée en staging |

---

## Timeline Recommandée

| Jour | Phase | Tâches | Durée |
|------|-------|--------|-------|
| **J8** | Phase 1 | Corrections bloquantes | 8h |
| **J9** | Phase 2 | Monitoring + circuit-breaker | 8h |
| **J10** | Phase 3 | Validation staging complète | 8h |
| **J11** | Phase 4.1 | Beta users (10%) | 48h |
| **J13** | Phase 4.2 | Production 50% | 24h |
| **J14** | Phase 4.3 | Production 100% | - |

**Total**: 6 jours ouvrés + monitoring continu

---

## Critères de Succès

### Immédiat (J8)

✅ Scheduler activé
✅ Bug montant corrigé
✅ Queue Redis déployée
✅ Tests E2E passent

### Court terme (J10)

✅ Paiement sandbox testé
✅ Monitoring actif
✅ Load test validé
✅ Staging stable 24h

### Moyen terme (J14)

✅ Production 100%
✅ 0 incidents critiques
✅ Taux succès paiements > 95%
✅ Latence p95 < 5s

---

## Décision Finale

**RECOMMANDATION**: Implémenter Phase 1 (bloquants) avant tout déploiement production.

**NO-GO PRODUCTION** tant que:
1. Scheduler réconciliation n'est pas activé
2. Bug montant n'est pas corrigé
3. Queue IPN n'est pas persistante
4. Tests E2E ne passent pas

**GO PRODUCTION LIMITÉE** après Phase 1 + Phase 2 complètes et staging validé 24h.
