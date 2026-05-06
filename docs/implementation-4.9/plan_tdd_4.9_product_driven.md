# Plan TDD FORGES v4.9 — Version Compacte

## Objectif

Implémenter FORGES v4.9 en 7 jours avec une approche **production-driven** : sécuriser d’abord les risques P0, écrire les tests avant le code, valider chaque jour par un gate Go/No-Go.

## Décisions figées

- Branche : `implementation-4.9` depuis `develop`
- Mock NGSER : J3 à J5
- API NGSER sandbox réelle : J6
- IPN canonique : `POST /webhooks/paiement`
- Alias legacy toléré : `POST /api/paiements/webhook`
- IPN : HTTP 200 immédiat, traitement asynchrone
- Scheduler réconciliation : toutes les 30 min
- `order_ngser` : `FRG-YYYY-SEQ-XXXXXX`
- Commission FORGES défaut : 30%
- CSV partenaire : anonymisation HMAC-SHA256 hex 64 caractères
- Credentials : jamais exposés, chiffrés AES-256, accès via proxy backend

---

## Nouvelles RM à couvrir

| RM | Objet | Risque couvert |
|---|---|---|
| RM-157 | Paiement NGSER backend-only | Montant falsifié côté client |
| RM-158 | IPN idempotent | Double paiement |
| RM-159 | Réconciliation PENDING > 30 min | Paiements bloqués |
| RM-160 | Contrôle montant IPN | Écart montant initié/reçu |
| RM-161 | CSV sans PII | Fuite données personnelles |
| RM-162 | Secrets jamais exposés | Fuite credentials |
| RM-152 à RM-154 | Credentials livraison chiffrés | Accès direct aux secrets |

---

# Plan 7 jours

## J1 — Baseline v4.8

### Objectif
Prouver que la v4.8 est stable avant toute modification v4.9.

### À exécuter

```bash
cd forges-monorepo/backend
npm run build
npm test
npm run test:integration

npx newman run tests/forges-v4.8-complete.postman_collection.json \
  --environment tests/forges-v4.8-complete.postman_environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export newman-baseline-v48.html

cd ../frontend
npm run build
npx playwright test ucs09-paiement-commissions.spec.js
npx playwright test ucs07-inscription-bifurcation.spec.js
npx playwright test ucs08-traitement-dossier.spec.js

cd ../backend
npx prisma migrate status
````

### Sécurité

```bash
grep -r "WEBHOOK_SECRET\s*=" backend/src/ || echo "OK"
grep -r "JWT_SECRET\s*=" backend/src/ || echo "OK"
grep -r 'password.*=.*["'\'']' backend/src/ || echo "OK"

git log --all --full-history -- "*.env" "*.env.production" | head -20

pg_dump $DATABASE_URL > /tmp/forges-v48-baseline-$(date +%Y%m%d).sql
psql $DATABASE_URL < /tmp/forges-v48-baseline-$(date +%Y%m%d).sql
```

### Gate J1

* Backend build PASS
* Frontend build PASS
* Newman baseline ≥ 90%
* E2E critiques UCS07/UCS08/UCS09 PASS ou bugs documentés
* Backup/restore DB testé
* Aucun secret hardcodé
* Prisma migrate status OK

### Livrable

`docs/implementation-4.9/rapport-baseline-prod-v49.md`

---

## J2 — Migration v4.9 + rollback

### Objectif

Créer la migration Prisma v4.9 et prouver qu’elle est réversible.

### Tests TDD à créer

* `MIG-01` : modèle `Devis` existe
* `MIG-02` : enum `StatutDevis = CREE | PAYE | ANNULE`
* `MIG-03` : champs NGSER ajoutés à `Paiement`
* `MIG-04` : `order_ngser` unique

### Commandes

```bash
cd backend

npx prisma migrate dev --name add_devis_ngser_v49
npx prisma generate
npx prisma migrate status
npx prisma validate

npm run test:integration -- migration-v49.test.js
```

### Gate J2

* Migration créée
* Prisma validate PASS
* Tests MIG-01 à MIG-04 PASS
* Rollback testé sur clone DB
* `.env.example` sans secret réel
* `.env.test` configuré

### Livrables

* `backend/docs/rollback-v49.md`
* `docs/implementation-4.9/migration-v49-prod-check.md`

---

## J3 — Initiation paiement NGSER mock

### Objectif

Implémenter RM-157 : le backend initie le paiement avec montant recalculé côté serveur.

### Tests à écrire avant code

* Montant client ignoré
* Montant réel recalculé backend
* `order_ngser` généré au bon format
* `payment_token_ngser` stocké
* Paiement créé en statut `PENDING`
* Audit sans token ni secret

### Implémentation attendue

* `PaiementNgserService`
* Génération `order_ngser`
* Mock NGSER retournant `payment_url`
* Enregistrement `montant_initie`
* Refus du montant fourni par le client

### Gate J3

* Tests unitaires NGSER PASS
* Tests intégration initiation paiement PASS
* Montant falsifié impossible
* Aucun token dans logs/audit

---

## J4 — IPN NGSER idempotent

### Objectif

Implémenter RM-158 et RM-160 : IPN fiable, idempotent, contrôlé.

### Tests à écrire

* IPN SUCCESS confirme paiement
* IPN FAILED marque échec
* IPN PENDING reste en attente
* IPN dupliqué ne double pas la confirmation
* Montant IPN différent du montant initié → rejet ou blocage
* Signature/secret non exposé
* Réponse HTTP 200 immédiate

### Implémentation attendue

* Endpoint `POST /webhooks/paiement`
* Alias `POST /api/paiements/webhook`
* Traitement async
* Idempotence par `order_ngser` / transaction
* Contrôle strict du montant

### Gate J4

* IPN idempotent validé
* Aucun double paiement
* Aucun double calcul commission
* Écart montant détecté
* Newman/Webhook PASS

---

## J5 — Réconciliation + CSV + credentials

### Objectif

Valider RM-159, RM-161, RM-162.

### Tests à exécuter

```bash
cd backend

npm test -- reconciliation-ngser.scheduler.test.ts
npm test -- export-csv.service.test.ts
npm run test:integration -- rm-162-credentials-audit.test.js

grep -r "NGSER_AUTH_TOKEN\s*=" src/ || echo "OK"
grep -r "securetest.crossroad-africa.net" src/ || echo "OK"
git log --all --full-history -- ".env" | head -20
```

### Gate J5

* Scheduler réconcilie les paiements PENDING > 30 min
* CSV sans email, nom, ID apprenant
* HMAC stable et 64 caractères
* Aucun secret hardcodé
* Aucune URL/token réel dans code
* Logs sans credentials

### Livrable

`docs/implementation-4.9/rapport-j5-reconciliation-csv-credentials.md`

---

## J6 — Release Candidate staging

### Objectif

Déployer sur staging avec API NGSER sandbox réelle.

### Actions

* `NGSER_MOCK_MODE=false`
* Configurer vrais tokens sandbox dans `.env.staging`
* Déployer backend/frontend staging
* Appliquer migrations
* Exécuter smoke tests
* Vérifier logs, IPN, paiements, réconciliation

### Commandes clés

```bash
npm run build
npx prisma migrate deploy
curl -i https://staging.forges-group.com/api/health
```

### Gate J6

* Staging déployé
* API NGSER réelle appelée avec succès
* Paiement sandbox initié
* IPN reçu et traité
* Réconciliation active
* Aucun secret exposé frontend/API/logs
* E2E critique PASS

### Livrable

`docs/implementation-4.9/rapport-release-candidate-staging.md`

---

## J7 — Go/No-Go production

### Objectif

Décider si v4.9 est prête pour production.

### Validation finale

* Baseline v4.8 stable
* Migration + rollback testés
* Paiement NGSER validé
* IPN idempotent validé
* Réconciliation validée
* CSV anonymisé validé
* Secrets protégés
* Staging stable
* Bugs P0/P1 résolus ou documentés

### Décision

* **GO** : tous les P0 maîtrisés, rollback prêt, staging stable
* **NO-GO** : paiement, IPN, rollback, secrets ou migration non fiables

### Livrable

`docs/implementation-4.9/go-no-go-production-v49.md`

---

## J8-J10 — Staging NGSER réel puis production limitée interne

### Décision verrouillée

* `forges-monorepo/infra/.env.staging` est créé localement et non commité
* Les tokens sandbox existants dans `forges-monorepo/backend/.env` alimentent `infra/.env.staging`
* `NGSER_MOCK_MODE=false` en staging
* IPN réel attendu sur `https://staging.forges-group.com/webhooks/paiement`
* Production limitée J9-J10 réservée à l'équipe interne après PASS complet J8

### Gate J8 staging

```bash
cd forges-monorepo
docker compose --env-file infra/.env.staging -f infra/docker-compose.staging.yml up -d --build

curl -i https://staging.forges-group.com/health
curl -i https://staging.forges-group.com/api/formations
```

Critères PASS:

* staging public HTTPS accessible
* initiation NGSER réelle OK avec dossier payable à 200 XOF
* `payment_url` réelle `securetest.crossroad-africa.net`
* redirection checkout frontend OK
* IPN réel reçu et traité sur `/webhooks/paiement`
* `Paiement.CONFIRME`, `Dossier.PAYE`, `transaction_id` et `status_ngser=SUCCESS`
* aucun secret exposé dans code, logs, API ou HTML

État 2026-05-01:

* préflight local PASS
* Docker daemon local indisponible
* DNS `staging.forges-group.com` non résolu
* gate staging réel non validé

### J9-J10 production limitée

Critères d'entrée:

* J8 PASS complet
* IPN réel SUCCESS validé
* rollback documenté
* monitoring logs actif

Portée:

* équipe interne uniquement
* 3 à 5 paiements contrôlés maximum
* observation renforcée 48h

Rollback immédiat si:

* paiement débité sans `CONFIRME`
* dossier non `PAYE` après IPN `SUCCESS`
* double commission
* secret visible en logs
* erreurs NGSER répétées non expliquées

Livrables:

* `docs/implementation-4.9/rapport-staging-ngser-reel-v49.md`
* `docs/implementation-4.9/rapport-production-limitee-v49.md`
* `docs/implementation-4.9/AVANCEMENT.md`
* `docs/implementation-4.9/rapport-final-go-nogo-v49.md`

---

# Commandes quotidiennes

```bash
# Backend
cd backend
npm test
npm run test:integration

# Frontend
cd ../frontend
npm test
npx playwright test

# Newman
cd ../backend
npx newman run tests/forges-v4.8-complete.postman_collection.json \
  --environment tests/forges-v4.8-complete.postman_environment.json

# Migrations
npx prisma migrate status
```

---

# Principe TDD obligatoire

## RED → GREEN → REFACTOR

1. **RED** : écrire le test qui échoue
2. **GREEN** : coder le minimum pour faire passer le test
3. **REFACTOR** : nettoyer sans casser les tests

Ordre recommandé :

1. Tests unitaires services
2. Tests intégration endpoints
3. Tests E2E parcours critique
4. Implémentation service
5. Implémentation controller/routes
6. Frontend si nécessaire

Règle : **pas d’implémentation sans test associé.**

---

# Critères de succès globaux

* 100% des RM-157 à RM-162 couvertes
* Aucun risque P0 non traité
* Aucun secret dans code, logs, API ou HTML
* Paiement NGSER initié côté backend uniquement
* IPN idempotent
* Réconciliation automatique active
* CSV partenaire sans PII
* Rollback documenté et testé
* Staging validé avant production

---

# Point de vigilance stratégique

Le risque principal n’est pas d’“oublier une fonctionnalité”.
Le vrai risque est de livrer une intégration paiement qui semble marcher en happy path, mais qui casse en production sur les cas réels : IPN dupliqué, paiement PENDING, montant incohérent, rollback impossible ou secret exposé.

La priorité doit donc rester : **paiement fiable > frontend complet > confort utilisateur**.
