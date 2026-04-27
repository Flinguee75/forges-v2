# 🚀 GUIDE DÉMARRAGE RAPIDE — FORGES v4.8

**Bienvenue sur le projet FORGES !** Ce guide vous permet de démarrer en **5 minutes**.

---

## 📚 Documents Créés (Analyse Règles Métier)

### 5 fichiers essentiels dans `docs/analyse-rm/`

| # | Document | Description | Pour qui | Temps |
|---|----------|-------------|----------|-------|
| 1 | [**SYNTHESE**](docs/analyse-rm/SYNTHESE_RM_AUTOMATISATION_v4.8.md) ⭐ | Synthèse exécutive + TOP 10 règles critiques | Décideurs | 5 min |
| 2 | [**ANALYSE COMPLÈTE**](docs/analyse-rm/ANALYSE_RM_AUTOMATISATION_v4.8.md) | Document technique 30 pages | Développeurs | 30 min |
| 3 | [**MATRICE CSV**](docs/analyse-rm/matrice-couverture-rm-v4.8.csv) | 148 RM × 11 colonnes (Excel) | Tous | - |
| 4 | [**README**](docs/analyse-rm/README_ANALYSE_RM.md) | Guide navigation + FAQ | Tous | 5 min |
| 5 | [**CHECKLIST**](docs/analyse-rm/CHECKLIST_EXECUTION_v4.8.md) | Plan jour par jour (J0-J8) | Développeurs | 15 min |

---

## 📊 Résultats de l'Analyse

| Métrique | Valeur |
|----------|--------|
| **Règles métier totales** | 148 |
| **Criticité 5 (BLOQUANTES)** | 27 (18%) |
| **Gap criticité 5** | 19/27 (70%) NON COUVERTES ⚠️ |
| **Tests à créer** | 80 (50 API + 30 E2E) |
| **Durée plan** | 8 jours |
| **ROI estimé** | 8j → 20-30j économisés |

---

## 🔴 TOP 10 Règles Critiques à Tester en Priorité

| # | RM | Description | Impact Business |
|---|----|-----------  |----------------|
| 1 | **RM-140** | Bifurcation Premium+Retail | 🔴 Perte CA si faux |
| 2 | **RM-127** | type_formation readonly partenaire | 🔴 Conflit partenaire |
| 3 | **RM-143/144** | Code apporteur + non-cumul | 🔴 Double commission |
| 4 | **RM-145/146/147** | Commissions apporteur | 🔴 Conflit apporteur |
| 5 | **RM-129** | Commission FORGES 20% | 🔴 Perte marge |
| 6 | **RM-102** | Éligibilité abonnement | 🔴 Faux accès Premium |
| 7 | **RM-07** | Délai 72h scheduler | 🔴 Places bloquées |
| 8 | **RM-26/27** | Attestations + annulation | 🔴 Attestation invalide |
| 9 | **RM-01/15** | Unicité inscriptions | 🔴 Surréservation |
| 10 | **RM-88** | Réduction -15% abonné | 🔴 Perte marge |

---

## 🚀 Prochaines Étapes (Commandes Rapides)

### Étape 1 : Lire la Synthèse (5 min)

```bash
cat docs/analyse-rm/SYNTHESE_RM_AUTOMATISATION_v4.8.md
```

**Contenu** :
- 🎯 Résumé exécutif en 1 minute
- 📊 Chiffres clés
- 🔴 TOP 10 règles critiques NON couvertes
- 📋 Plan d'action 8 jours
- 💰 ROI quantifié

---

### Étape 2 : Ouvrir la Matrice Excel

```bash
open docs/analyse-rm/matrice-couverture-rm-v4.8.csv
```

**Contenu** :
- 148 lignes (1 par règle métier)
- 11 colonnes : RM, Description, Module, Criticité, Impact, Automatisable, Tests, Statut, Priorité, UCS
- Filtrable par criticité/statut/priorité

**Utilisation** :
```excel
# Filtrer criticité 5
=FILTER(A:K, C:C=5)

# Compter NON COUVERT
=COUNTIF(I:I, "NON COUVERT")

# Compter par priorité P0
=COUNTIF(J:J, "P0")
```

---

### Étape 3 : Lire le Plan Détaillé (30 min)

```bash
cat docs/analyse-rm/ANALYSE_RM_AUTOMATISATION_v4.8.md
```

**Contenu** :
- 📋 Section 1 : Inventaire exhaustif 148 RM (criticité 5, 4, 3)
- 🗺️ Section 2 : Cartographie 21 Use Cases (UCS00-UCS20)
- 📊 Section 3 : Matrice de couverture actuelle (gap analysis)
- 🚀 Section 4 : Plan d'action détaillé (Vague 1 API + Vague 2 E2E)
- 💰 Section 5 : Estimation d'effort et ROI
- 🔗 Annexes : Templates de tests, commandes utiles

---

### Étape 4 : Suivre la Checklist d'Exécution

```bash
cat docs/analyse-rm/CHECKLIST_EXECUTION_v4.8.md
```

**Contenu** :
- ✅ Jour 0 : Préparation (seeds, env)
- ✅ Jours 1-3 : Vague 1 — Tests API (50 tests)
- ✅ Jours 4-7 : Vague 2 — Tests E2E (30 tests)
- ✅ Jour 8 : Documentation (matrice, rapport)

---

## 🎯 Démarrage par Profil

### Je suis Décideur / Product Owner

**Objectif** : Comprendre les risques et décider du plan d'action

```bash
# 1. Lire la synthèse (5 min)
cat docs/analyse-rm/SYNTHESE_RM_AUTOMATISATION_v4.8.md

# 2. Consulter le TOP 10 règles critiques
# (dans la synthèse)

# 3. Valider le ROI
# 8j investis → 20-30j économisés
```

**Décision attendue** :
- ✅ Option 1 : Plan complet 8 jours (recommandé)
- ⚠️ Option 2 : Plan partiel 5 jours (TOP 10 uniquement)
- ❌ Option 3 : Report (risque accru)

---

### Je suis Développeur / Testeur

**Objectif** : Implémenter les 80 tests automatisés

```bash
# 1. Lire le guide
cat docs/analyse-rm/README_ANALYSE_RM.md

# 2. Ouvrir la checklist
cat docs/analyse-rm/CHECKLIST_EXECUTION_v4.8.md

# 3. Setup environnement
cd backend
npm install --save-dev supertest @faker-js/faker jest-extended

cd ../frontend
npm install --save-dev @playwright/test
npx playwright install chromium

# 4. Créer seeds validation
cd ../backend
npm run db:seed:validation -- --reset

# 5. Lancer Vague 1 (Tests API - 3 jours)
npm run test:integration -- tests/integration/rm-*.test.js

# 6. Lancer Vague 2 (Tests E2E - 4 jours)
cd ../frontend
npx playwright test e2e/tests/ucs*.spec.js
```

**Templates disponibles** : voir [Annexe B](docs/analyse-rm/ANALYSE_RM_AUTOMATISATION_v4.8.md#annexe-b--templates-de-tests)

---

### Je suis Architecte / Tech Lead

**Objectif** : Comprendre l'architecture et valider la conception

```bash
# 1. Lire les spécifications
cat docs/specifications/ForgesSpecsv4.8.md

# 2. Lire la conception
cat docs/specifications/conception_forges_v1_3.md

# 3. Analyser les règles métier
cat docs/analyse-rm/ANALYSE_RM_AUTOMATISATION_v4.8.md

# 4. Consulter le mapping UCS → RM
# (dans l'analyse complète, Annexe A)

# 5. Vérifier la matrice de couverture
open docs/analyse-rm/matrice-couverture-rm-v4.8.csv
```

---

### Je suis Nouveau sur le Projet

**Objectif** : Comprendre rapidement FORGES

**Parcours recommandé (2h)** :

```bash
# 1. Lire ce guide (10 min)
cat GUIDE_DEMARRAGE_RAPIDE.md

# 2. Lire le README docs (10 min)
cat docs/README.md

# 3. Spécifications — Vue d'ensemble (30 min)
cat docs/specifications/ForgesSpecsv4.8.md
# → Lire sections : Vue d'ensemble, 9 Rôles, Stack

# 4. Conception — Use Cases (30 min)
cat docs/specifications/conception_forges_v1_3.md
# → Lire sections : Use Cases, Architecture

# 5. Synthèse Analyse RM (20 min)
cat docs/analyse-rm/SYNTHESE_RM_AUTOMATISATION_v4.8.md

# 6. Explorer la matrice (10 min)
open docs/analyse-rm/matrice-couverture-rm-v4.8.csv
```

---

## 📂 Structure Documentation Complète

```
PROJET FORGES/
├── GUIDE_DEMARRAGE_RAPIDE.md         ← Vous êtes ici 🎯
├── CLAUDE.md                          ← Règles codage v4.8
│
├── docs/
│   ├── README.md                      ← Navigation docs
│   ├── STRUCTURE.txt                  ← Vue visuelle
│   │
│   ├── analyse-rm/                    ← ⭐ ANALYSE RM (5 fichiers)
│   │   ├── README_ANALYSE_RM.md
│   │   ├── SYNTHESE_RM_AUTOMATISATION_v4.8.md
│   │   ├── ANALYSE_RM_AUTOMATISATION_v4.8.md
│   │   ├── matrice-couverture-rm-v4.8.csv
│   │   └── CHECKLIST_EXECUTION_v4.8.md
│   │
│   ├── specifications/                ← Specs métier (2 fichiers)
│   │   ├── ForgesSpecsv4.8.md
│   │   └── conception_forges_v1_3.md
│   │
│   ├── validation-tests/              ← Tests existants (6 fichiers)
│   │   ├── plan_validation_complet.md
│   │   ├── rapport_newman.md
│   │   └── ...
│   │
│   └── archives/                      ← Archives (2 fichiers)
│       └── ...
│
├── backend/                           ← Backend Node.js
│   ├── src/modules/                   ← 15 modules
│   ├── prisma/                        ← Schéma + migrations
│   └── tests/                         ← Tests unitaires + intégration
│
└── frontend/                          ← Frontend React
    ├── src/pages/                     ← ~60 pages
    ├── e2e/                           ← Tests E2E Playwright
    └── ...
```

---

## 🎯 Commandes Essentielles

### Setup Projet

```bash
# Backend
cd backend
npm install
npm run db:seed:validation -- --reset

# Frontend
cd frontend
npm install
```

### Développement

```bash
# Backend (port 3000)
cd backend
npm run dev

# Frontend (port 5173)
cd frontend
npm run dev
```

### Tests

```bash
# Tests API backend
cd backend
npm run test:integration

# Tests E2E frontend
cd frontend
npm run test:e2e
npm run test:e2e:headed   # Mode visible
npm run test:e2e:debug    # Mode debug
```

### Documentation

```bash
# Voir la structure docs
cat docs/STRUCTURE.txt

# Lire le README principal
cat docs/README.md

# Ouvrir la matrice Excel
open docs/analyse-rm/matrice-couverture-rm-v4.8.csv
```

---

## 📊 Métriques Clés du Projet

| Métrique | Valeur |
|----------|--------|
| **Règles métier totales** | 148 |
| **Use Cases** | 21 (UCS00-UCS20) |
| **Modules backend** | 15 (MOD-01 à MOD-15) |
| **Rôles utilisateurs** | 9 |
| **Tests E2E actuels** | 4 (vague 0) |
| **Tests E2E cible** | 34 (+30) |
| **Tests API cible** | 50 (+50) |
| **Couverture criticité 5** | 30% → 100% |

---

## 🔗 Liens Utiles

### Documentation Interne

- 📚 [**README Docs**](docs/README.md) — Point d'entrée documentation
- 📊 [**Structure Docs**](docs/STRUCTURE.txt) — Vue visuelle arborescence
- ⭐ [**Synthèse RM**](docs/analyse-rm/SYNTHESE_RM_AUTOMATISATION_v4.8.md) — 5 min lecture
- 📋 [**Checklist Exécution**](docs/analyse-rm/CHECKLIST_EXECUTION_v4.8.md) — Plan jour par jour
- 📊 [**Matrice CSV**](docs/analyse-rm/matrice-couverture-rm-v4.8.csv) — Suivi Excel

### Spécifications

- 📖 [**Specs v4.8**](docs/specifications/ForgesSpecsv4.8.md) — Spécifications fonctionnelles
- 🏗️ [**Conception v1.3**](docs/specifications/conception_forges_v1_3.md) — Architecture technique

### Validation

- 🧪 [**Plan Validation**](docs/validation-tests/plan_validation_complet.md) — 72 tests
- 📊 [**Rapport Newman**](docs/validation-tests/rapport_newman.md) — Tests API
- 🔍 [**Audit Alignement**](docs/validation-tests/audit_alignement_api_front_backend_v48.md) — API/Front

---

## 💡 Questions Fréquentes

### Q1 : Par où commencer ?

**Réponse** : Cela dépend de votre profil :
- **Décideur** → Lire [SYNTHESE](docs/analyse-rm/SYNTHESE_RM_AUTOMATISATION_v4.8.md) (5 min)
- **Développeur** → Lire [README_ANALYSE_RM](docs/analyse-rm/README_ANALYSE_RM.md) + [CHECKLIST](docs/analyse-rm/CHECKLIST_EXECUTION_v4.8.md)
- **Architecte** → Lire [ForgesSpecsv4.8](docs/specifications/ForgesSpecsv4.8.md)
- **Nouveau** → Lire ce guide complet

### Q2 : Pourquoi 70% de gap sur criticité 5 ?

**Réponse** : Les tests E2E actuels (vague 0) couvrent seulement :
- Vouchers Standard (RM-37, RM-38, RM-39, RM-40)
- Auth smoke tests (UCS01 partiel)

Les 19 règles criticité 5 NON couvertes incluent :
- RM-140 (bifurcation Premium+Retail)
- RM-127 (type_formation readonly)
- RM-143/144 (code apporteur)
- RM-145/146/147 (commissions apporteur)
- RM-102 (éligibilité abonnement)
- + 14 autres règles critiques

### Q3 : Combien de temps pour tout tester ?

**Réponse** :
- **Vague 1+2 (criticité 5)** : 8 jours → 100% criticité 5
- **Vague 3+4+5 (criticité 4+3)** : 5 semaines → 100% total (148 RM)

**Approche recommandée** : Commencer par criticité 5 (impact business maximal)

### Q4 : Comment suivre la progression ?

**Réponse** : Utiliser la [matrice CSV](docs/analyse-rm/matrice-couverture-rm-v4.8.csv) :
1. Ouvrir dans Excel/Google Sheets
2. Filtrer colonne "Statut Couverture"
3. Mettre à jour en temps réel pendant développement
4. Calculer `=COUNTIF(I:I, "COUVERT") / 148` pour le taux global

---

## 📞 Contact et Support

**Équipe Technique FORGES**
- 📧 Email : tech@forges.ci
- 📂 Documentation : `/docs/`
- 📊 Matrice suivi : `docs/analyse-rm/matrice-couverture-rm-v4.8.csv`

**Pour toute question** :
1. Lire d'abord ce guide (5 min)
2. Consulter la [FAQ](docs/analyse-rm/README_ANALYSE_RM.md#-questions-fréquentes)
3. Vérifier la matrice CSV pour statut couverture
4. Contacter l'équipe technique si besoin

---

## 🎯 Prochaines Étapes Immédiates

### Action Immédiate (Aujourd'hui)

```bash
# 1. Lire la synthèse
cat docs/analyse-rm/SYNTHESE_RM_AUTOMATISATION_v4.8.md

# 2. Ouvrir la matrice
open docs/analyse-rm/matrice-couverture-rm-v4.8.csv

# 3. Décider du plan (Option 1/2/3)
# Voir section "Décision Attendue" dans la synthèse
```

### Semaine 1 (Si validation plan)

```bash
# Jour 0 : Setup
# - Installer dépendances test (supertest, playwright)
# - Créer seeds validation

# Jours 1-3 : Vague 1 — Tests API
# - 50 tests API (10 fichiers)
# - Couverture 22/27 RM criticité 5 (81%)

# Jour 4-7 : Vague 2 — Tests E2E
# - 30 tests E2E (10 fichiers)
# - Couverture 5/27 RM criticité 5 (19%)

# Jour 8 : Documentation
# - Matrice CSV mise à jour
# - Rapport final généré
```

### Mois suivants (Roadmap complète)

- **Vague 3** : Abonnements + Partenaires (2 semaines)
- **Vague 4** : Formations + Sessions + Bot (2 semaines)
- **Vague 5** : Multi-langue + Criticité 3 (3 jours)
- **CI/CD** : Intégration GitHub Actions

---

**Version** : 1.0 | **Dernière mise à jour** : 2026-04-23 | **Statut** : Prêt pour utilisation ✅

---

## 🎉 Bienvenue sur FORGES !

Vous avez maintenant toutes les informations pour démarrer. **Bonne chance !** 🚀
