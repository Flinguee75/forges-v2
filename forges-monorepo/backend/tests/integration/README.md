# Tests API — Règles Métier FORGES v4.8

**Vague 1** — 50 tests API couvrant les 27 règles métier criticité 5

## 📂 Structure

```
tests/integration/
├── rm-inscriptions.test.js     ← RM-01, RM-15, RM-18, RM-02 (5 tests)
├── rm-dossiers.test.js          ← RM-05, RM-140, RM-19 (8 tests)
├── rm-paiements.test.js         ← RM-06, RM-07, RM-08, RM-09, RM-10 (8 tests)
├── rm-vouchers.test.js          ← RM-37, RM-38, RM-39, RM-40, RM-143, RM-144 (8 tests)
├── rm-apporteurs.test.js        ← RM-141, RM-142, RM-145, RM-146, RM-147 (6 tests)
├── rm-partenaires.test.js       ← RM-126, RM-127, RM-129, RM-130, RM-131 (7 tests)
├── rm-abonnements.test.js       ← RM-102, RM-103, RM-73, RM-92, RM-94 (6 tests)
├── rm-sessions.test.js          ← RM-14, RM-16, RM-17, RM-20, RM-21 (7 tests)
└── rm-formations.test.js        ← RM-13, RM-22, RM-23, RM-90, RM-96 (5 tests)
```

**Total** : 60 tests couvrant 40+ règles métier

## 🚀 Lancement

### Prérequis

1. **Base de données** : PostgreSQL running
2. **Seeds validation** : Données de test chargées
3. **API backend** : Serveur démarré sur http://localhost:3000

```bash
# Terminal 1 — Lancer backend
cd forges-monorepo/backend
npm run dev

# Terminal 2 — Charger seeds validation
cd ../../seeds
cd ../forges-monorepo/backend
node seed_for_test.js --reset

# Terminal 3 — Lancer tests
cd forges-monorepo/backend
npm run test:integration
```

### Lancer tests spécifiques

```bash
# Un seul fichier
npm run test:integration -- tests/integration/rm-inscriptions.test.js

# Un seul test
npm run test:integration -- tests/integration/rm-paiements.test.js -t "Rejeter second paiement"

# Tous les tests avec coverage
npm run test:integration -- --coverage
```

### Générer rapport HTML

```bash
npm run test:integration -- --coverage --coverageReporters=html
open coverage/index.html
```

## 📊 Règles Métier Couvertes

### Criticité 5 (BLOQUANTES) — 27 RM

| RM | Description | Fichier test | Statut |
|----|-------------|--------------|--------|
| **RM-01** | Unicité apprenant/session | rm-inscriptions.test.js | ✅ |
| **RM-05** | Statut RETENU irréversible | rm-dossiers.test.js | ✅ |
| **RM-06** | Un seul paiement validé/dossier | rm-paiements.test.js | ✅ |
| **RM-07** | Délai 72h paiement Premium+Retail | rm-paiements.test.js | ✅ |
| **RM-08** | Max 3 tentatives paiement | rm-paiements.test.js | ✅ |
| **RM-14** | 4 dates obligatoires session | rm-sessions.test.js | ✅ |
| **RM-15** | Unicité formation cross-sessions | rm-inscriptions.test.js | ✅ |
| **RM-16** | Chronologie dates session | rm-sessions.test.js | ✅ |
| **RM-17** | Non-chevauchement sessions | rm-sessions.test.js | ✅ |
| **RM-18** | Capacité GRIS/EXCEPTION | rm-inscriptions.test.js | ✅ |
| **RM-37** | Voucher lié à formation | rm-vouchers.test.js | ✅ |
| **RM-38** | Usage unique voucher | rm-vouchers.test.js | ✅ |
| **RM-73** | Suspension abo si échec 48h | rm-abonnements.test.js | ✅ |
| **RM-92** | Expiration accès 365j | rm-abonnements.test.js | ✅ |
| **RM-96** | A_LA_DEMANDE sans session | rm-formations.test.js | ✅ |
| **RM-102** | Éligibilité abonnement | rm-abonnements.test.js | ✅ |
| **RM-103** | Suspension accès si abo inactif | rm-abonnements.test.js | ✅ |
| **RM-126** | Inscription partenaire Flux A/B | rm-partenaires.test.js | ✅ |
| **RM-127** | type_formation readonly | rm-partenaires.test.js | ✅ |
| **RM-129** | Calcul prix catalogue | rm-partenaires.test.js | ✅ |
| **RM-140** | Bifurcation Premium+Retail | rm-dossiers.test.js | ✅ |
| **RM-141** | Code apporteur UUID permanent | rm-apporteurs.test.js | ✅ |
| **RM-143** | Validation code apporteur | rm-vouchers.test.js | ✅ |
| **RM-144** | Cumul interdit apporteur+voucher | rm-vouchers.test.js | ✅ |
| **RM-145** | Calcul commission apporteur | rm-apporteurs.test.js | ✅ |
| **RM-146** | Agrégation mensuelle J+1 | rm-apporteurs.test.js | ✅ |
| **RM-147** | Reversement seuil minimum | rm-apporteurs.test.js | ✅ |

### Criticité 4 (IMPORTANTES) — Couvertes partiellement

| RM | Description | Fichier test | Statut |
|----|-------------|--------------|--------|
| **RM-02** | Fermeture si places=0 | rm-inscriptions.test.js | ⚠️ Placeholder |
| **RM-09** | Webhook asynchrone | rm-paiements.test.js | ✅ |
| **RM-10** | Pas remboursement auto | rm-paiements.test.js | ✅ |
| **RM-13** | Archive non réactivable | rm-formations.test.js | ✅ |
| **RM-19** | Priorité GRIS/EXCEPTION | rm-dossiers.test.js | ✅ |
| **RM-20** | Transitions auto sessions | rm-sessions.test.js | ✅ |
| **RM-21** | Archivage +90j | rm-sessions.test.js | ✅ |
| **RM-22** | Visibilité catalogue | rm-formations.test.js | ✅ |
| **RM-23** | EN_ATTENTE_PLANIFICATION | rm-formations.test.js | ✅ |
| **RM-39** | Workflow voucher promo | rm-vouchers.test.js | ✅ |
| **RM-40** | Quota et expiration voucher | rm-vouchers.test.js | ✅ |
| **RM-90** | Badge Premium + prix -15% | rm-formations.test.js | ✅ |
| **RM-94** | Standard à la demande inclus | rm-abonnements.test.js | ✅ |
| **RM-130** | Commission jamais affichée | rm-partenaires.test.js | ✅ |
| **RM-131** | Suspension formation | rm-partenaires.test.js | ✅ |
| **RM-142** | Taux défaut 5% | rm-apporteurs.test.js | ✅ |

## ⚠️ Notes Importantes

### Tests nécessitant le scheduler

Certains tests simulent les jobs cron via endpoints admin :
- `POST /api/admin/scheduler/check-paiements` (RM-07)
- `POST /api/admin/scheduler/check-sessions` (RM-20)
- `POST /api/admin/scheduler/archive-sessions` (RM-21)
- `POST /api/admin/scheduler/aggregate-commissions-apporteurs` (RM-146)
- `POST /api/admin/scheduler/process-reversements-apporteurs` (RM-147)
- `POST /api/admin/scheduler/check-abonnements` (RM-73)
- `POST /api/admin/scheduler/check-expirations-acces` (RM-92)

**Alternative** : Ces tests peuvent être implémentés comme tests unitaires des services de scheduling.

### Tests webhook

Les tests RM-09 utilisent une signature HMAC simulée. Pour tester avec un vrai gateway :
1. Configurer `PAYMENT_WEBHOOK_SECRET` dans `.env.test`
2. Calculer signature réelle avec crypto HMAC-SHA256

### Données de test

Les tests utilisent les comptes seeds :
- `apprenant.test@forges.ci`
- `admin.test@forges.ci`
- `responsable.test@forges.ci`
- `agent.test@forges.ci`

**Mot de passe** : `Test@FORGES2026!`

## 🎯 Prochaines Étapes

### Vague 2 — Tests E2E (30 tests)

Parcours utilisateurs complets :
- UCS00 : Inscription apprenant
- UCS01 : Inscription formation
- UCS02 : Paiement formation
- UCS05 : Téléchargement attestation
- UCS08 : Vérification dossier Responsable
- UCS09 : Création session
- UCS14 : Création voucher organisation
- UCS15 : Utilisation voucher
- UCS18 : Validation formation partenaire
- UCS19 : Code parrainage apporteur

### Améliorations

- [ ] Ajouter tests de charge (100 inscriptions simultanées)
- [ ] Ajouter tests de sécurité (injection SQL, XSS)
- [ ] Mock EmailService pour vérifier envois
- [ ] Mock RedisQueue pour tester asynchrone
- [ ] Tests de régression (bugs critiques passés)

## 📚 Références

- **Analyse RM** : `/docs/analyse-rm/ANALYSE_RM_AUTOMATISATION_v4.8.md`
- **Specs v4.8** : `/docs/specifications/ForgesSpecsv4.8.md`
- **Plan validation** : `/docs/validation-tests/plan_validation_complet.md`
- **CLAUDE.md** : Règles métier complètes

---

**Version** : 1.0 | **Date** : 2026-04-23 | **Vague** : 1 (API) | **Statut** : ✅ Terminé
