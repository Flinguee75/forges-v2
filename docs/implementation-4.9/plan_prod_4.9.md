# Plan de Fiabilisation Production FORGES v4.9

## 📊 État Actuel (Mise à jour: 2026-05-01)

### ✅ Phase 1 : COMPLÈTE (100%)
- Scheduler réconciliation activé
- Bug montant hardcodé corrigé
- Queue IPN Redis persistante implémentée
- **13 tests E2E paiement NGSER créés et prêts**
- Endpoint scheduler manuel ajouté
- Tous tests backend passent (484/484)

### ✅ Phase 2 : COMPLÈTE (100%)
- Circuit-breaker NGSER implémenté et testé
- Endpoint stats paiements temps réel opérationnel
- Script d'alertes critiques déployable
- Documentation monitoring complète
- Timeout NGSER optimisé (60s)
- Load test k6 créé et documenté

### 🔄 Phase 3 : EN COURS
- **13/13 tests E2E paiement NGSER PASS** (seed E2E + backend actif) ✅
- Fixes isolation comptes E2E (apprenantRecon5 ajouté au seed, RM-145 API-only) ✅
- Load test k6 local : à exécuter
- Smoke tests + Newman baseline : à exécuter
- Validation staging NGSER réel : dépend accès staging HTTPS + credentials sandbox

---

## Contexte

FORGES v4.9 intègre le système de paiement NGSER (RM-157 à RM-162) avec:
- Tests backend: 484/484 PASS (100%)
- Tests E2E paiement: 13 tests créés (Phase 1 complète)
- Décision: **GO VALIDATION LOCALE → STAGING**
- **Prochaine étape**: Exécution tests E2E + load test local

## Problèmes Critiques Identifiés

### 🔴 BLOQUANTS (à corriger avant production)

1. **Scheduler réconciliation NON ACTIVÉ** — ✅ corrigé
   - Fichier: `src/app.ts`
   - Statut: `ReconciliationNgserScheduler` démarre avec les autres schedulers hors `NODE_ENV=test`.

2. **Bug montant hardcodé dans réconciliation** — ✅ corrigé
   - Fichier: `src/schedulers/reconciliation-ngser.scheduler.ts` ligne 157
   - Statut: le mock récupère `paiement.montant_initie` avant de simuler l'IPN.

3. **Queue IPN en mémoire (non persistante)** — ✅ corrigé
   - Fichier: `src/shared/queue/ipn-queue.service.ts`
   - Statut: les routes paiement utilisent `IpnQueueRedisService`.

4. **Item queue supprimé avant traitement** — ✅ corrigé
   - Fichier: `src/shared/queue/ipn-queue-redis.service.ts`
   - Statut: déplacement atomique vers liste `processing`, retry, puis DLQ après échecs.

5. **Aucun test E2E du flux paiement complet** — ✅ corrigé
   - Statut: 13 tests E2E créés couvrant 100% des scénarios Phase 1.4
   - Fichiers: `frontend/e2e/ucs09-paiement-*.spec.js`
   - Couverture: idempotence, validation montant, réconciliation, initiation NGSER

### 🟡 IMPORTANTS (avant production finale)

6. **Pas de circuit-breaker NGSER API**
   - Statut: ✅ corrigé avec `CircuitBreakerService` intégré au client NGSER.

7. **Aucun monitoring/alerting temps réel** — ✅ corrigé
   - Statut: endpoint `/api/admin/paiements/stats` et script `check-critical-alerts.sh` implémentés
   - Documentation: `backend/docs/MONITORING_ALERTES.md`
   - Reste (infra): configuration cron serveur production, webhook Slack production

8. **Timeout NGSER trop strict (30s)** — ✅ corrigé
   - Fichier: `backend/.env.example`
   - Statut: `NGSER_REQUEST_TIMEOUT_MS=60000` (était 30000)

## Approche Recommandée

### Phase 1: Corrections Bloquantes (J8 - 1 jour)

**Statut actuel**: corrections bloquantes backend terminées et validées par build + tests complets. Le test E2E paiement complet reste à stabiliser avant de déclarer la Phase 1 totalement fermée côté production.

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

#### 2.1 Implémenter circuit-breaker NGSER ✅

**Nouveau fichier**: `src/shared/circuit-breaker/circuit-breaker.service.ts`

**Logique**:
- État: CLOSED → OPEN → HALF_OPEN
- Seuil: > 50% erreurs sur 10 appels → OPEN
- Timeout OPEN: 30s avant HALF_OPEN
- En OPEN: fail-fast sans appeler NGSER

**Intégration**: Dans `src/modules/paiements/ngser.client.ts`

---

#### 2.2 Améliorer logs audit pour monitoring ⚠️ partiel

**Fichier**: `src/shared/audit/audit.logger.ts`

**Améliorations**:
- Ajouter timestamps précis (ms)
- Structurer métadonnées critiques paiements
- Logger tous les chemins d'erreur

**Nouveau**: Endpoint admin pour statistiques temps réel

**Fichier**: `src/modules/paiements/paiement.controller.ts`

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

#### 2.3 Alertes critiques via AuditLog ⚠️ partiel

**Script cron**: `backend/scripts/check-critical-alerts.sh` (toutes les 5 min)

```bash
APP_LOG=logs/app.log \
PENDING_THRESHOLD=5 \
SLACK_WEBHOOK=https://hooks.slack.com/services/... \
./scripts/check-critical-alerts.sh
```

**Statut**:
- Script ajouté côté backend.
- À configurer sur le serveur via cron toutes les 5 min.
- À valider avec le webhook Slack réel hors dépôt.

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
8. `src/modules/paiements/paiement.controller.ts` - Endpoint stats temps réel
9. `backend/scripts/check-critical-alerts.sh` - Nouveau (cron alertes)

### Recommandés (Phase 3)

10. `infra/docker-compose.staging.yml` - Config staging
11. `infra/scripts/smoke-test-v49.sh` - Nouveau script
12. `.env.staging` - Variables NGSER réelles

---

## Checklist de Validation

### Phase 1 (Bloquants)

- [x] Scheduler réconciliation activé et testé
- [x] Bug montant corrigé avec tests
- [x] Queue IPN Redis fonctionnelle
- [x] Tests E2E paiement passent (13/13) ✅ 100%
- [x] Tous tests backend passent (484/484)
- [x] Endpoint scheduler réconciliation manuel ajouté

**Détails tests E2E** :
- ucs09-paiement-commissions.spec.js (4 tests)
- ucs09-paiement-idempotence.spec.js (2 tests)
- ucs09-paiement-montant-mismatch.spec.js (3 tests)
- ucs09-paiement-reconciliation.spec.js (4 tests)

### Phase 2 (Importants)

- [x] Circuit-breaker implémenté et testé (2/2 tests PASS)
- [x] Endpoint stats paiements créé (`/api/admin/paiements/stats`)
- [x] Script alertes ajouté (`scripts/check-critical-alerts.sh`)
- [x] Documentation monitoring complète (`docs/MONITORING_ALERTES.md`)
- [x] Timeout NGSER augmenté à 60s
- [x] Load test k6 créé (`tests/load/paiements-ngser-load.js`)
- [ ] Script alertes cron configuré sur serveur (infra - hors dev)
- [ ] Webhook Slack testé (infra - hors dev)
- [ ] Load test exécuté et validé

### Phase 3 (Staging)

- [x] 13/13 tests E2E paiement NGSER PASS (seed E2E propre + backend actif)
- [x] Fix isolation comptes E2E (apprenantRecon5, RM-145 API-only)
- [ ] Load test k6 exécuté et validé localement
- [ ] Smoke tests passent (Newman baseline v4.8)
- [ ] Mode mock désactivé en staging
- [ ] Paiement sandbox SUCCESS testé
- [ ] IPN reçu depuis NGSER réel
- [ ] Réconciliation fonctionne avec API réelle

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
✅ Queue Redis implémentée
⚠️ Tests E2E paiement complet à stabiliser avant production limitée

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

**RECOMMANDATION**: finaliser le test E2E paiement complet puis exécuter le gate staging NGSER réel avant tout déploiement production.

**NO-GO PRODUCTION** tant que:
1. Tests E2E paiement complet ne passent pas
2. Staging public HTTPS n'est pas accessible
3. Paiement sandbox réel NGSER à 200 XOF non validé
4. IPN réel non reçu et traité

**GO PRODUCTION LIMITÉE** après test E2E paiement complet, Phase 2, PASS complet J8 staging réel et observation staging 24h.
