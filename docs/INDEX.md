# 📚 FORGES v4.9 — Documentation centrale

**Branch:** implementation-4.9  
**Date:** 5 mai 2026  
**Status:** 🟢 Production ready

---

## 🗂️ Structure documentaire

### 📋 [Spécifications](specifications/)
Documents de spécifications métier v4.8 et v4.9

- **`ForgesSpecsv4.8.md`** — Spécifications complètes v4.8 (UCS00-UCS20, RM-01-148)
- **`Forges_4.9_addendum_spec.md`** — Addendum v4.9 (modifications, nouvelles règles)

### 🎯 [Use Cases](use-cases/)
Documentation complète des cas d'utilisation

- **`USE_CASES_v4.9.md`** ⭐ — 19 use cases détaillés (UCS00-UCS21)
  - UCS09: Paiements NGSER + IPN + Réconciliation
  - UCS13: Configuration Admin (30% par défaut)
  - UCS14: Formations à la demande (AES chiffrement)
  - UCS17: Export CSV Partenaire (anonymisé HMAC)
  - UCS18: Validation Formation Partenaire
  - UCS21: Gestion Devis (NOUVEAU)

- **`KPI_SUMMARY.md`** — KPIs et métriques v4.8 (tous les RM-01 à RM-148)

### 🚀 [Implémentation](implementation/)
Status et progrès d'implémentation

- **`IMPLEMENTATION_SUMMARY.md`** — Résumé général implémentation
- **`INTEGRATION_FORMATIONS_COMPLETE.md`** — Intégration formations complète
- **`BACKOFFICE_CHANGES.md`** — Changements backoffice
- **`PHASE3_COMPLETION.md`** — Status phase 3 complet
- **`PHASE_3_STATUS.md`** — Status phase 3 actuel
- **`NEWMAN_BASELINE_REPORT_v4.9.md`** — Rapport tests API baseline

### 📊 [Guides & Ressources](guides/)
Documentation opérationnelle

- **`README.md`** — Guide principal documentation

### 🔍 [Analyses](analyse-rm/)
Analyses détaillées par domaine

- **`ANALYSE_RM_AUTOMATISATION_v4.8.md`** — Analyse règles métier
- **`ETAT_COUVERTURE_BACKEND_INTEGRATION_v4.8.md`** — Couverture backend
- **`matrice-couverture-rm-v4.8.csv`** — Matrice RM
- **Autres fichiers d'analyse...**

### 🔐 [SEO & Sécurité](seo/)
Documentation SEO et sécurité

- **`GUIDE_SEO.md`** — Guide SEO complet
- **`GUIDE_SOUMETTRE_MOTEURS_RECHERCHE.md`** — Soumettre aux moteurs
- **`SEO_CHECKLIST.md`** — Checklist SEO
- **`SEO_IMPLEMENTATION_SUMMARY.md`** — Résumé implémentation SEO

### 🧪 [Tests & Validation](validation-tests/)
Plans de test et validation

- **`plan_validation_complet.md`** — Plan validation complet
- **`rapport_newman.md`** — Rapport Newman
- **Autres fichiers de validation...**

### 📁 [Dossiers supplémentaires](archives/)
- **`archives/`** — Documents archivés v4.8
- **`phase-3/`** — Documents phase 3 (tests, diagnostics)
- **`implementation-4.9/`** — Spécifications technique v4.9

---

## 🚀 Démarrage rapide

### Pour comprendre FORGES v4.9:
1. Lire: **[USE_CASES_v4.9.md](use-cases/USE_CASES_v4.9.md)** (19 UCS détaillés)
2. Consulter: **[KPI_SUMMARY.md](use-cases/KPI_SUMMARY.md)** (métriques clés)
3. Référence: **[ForgesSpecsv4.8.md](specifications/ForgesSpecsv4.8.md)** (détails complets)

### Pour implémenter v4.9:
1. Lire: **[Forges_4.9_addendum_spec.md](specifications/Forges_4.9_addendum_spec.md)** (nouvelles règles)
2. Consulter: **[IMPLEMENTATION_SUMMARY.md](implementation/IMPLEMENTATION_SUMMARY.md)** (plan)
3. Tester: **[NEWMAN_BASELINE_REPORT_v4.9.md](implementation/NEWMAN_BASELINE_REPORT_v4.9.md)** (validation API)

### Pour valider:
1. **[plan_validation_complet.md](validation-tests/plan_validation_complet.md)** — Plan complet
2. **[PHASE3_COMPLETION.md](implementation/PHASE3_COMPLETION.md)** — Status actuel

---

## 📊 Vue d'ensemble v4.9

### ✅ Use Cases modifiés (5)
| UCS | Modification | Doc |
|-----|-------------|-----|
| UCS09 | Paiements NGSER + IPN + Réconciliation | [USE_CASES_v4.9.md](use-cases/USE_CASES_v4.9.md) |
| UCS13 | Configuration Admin (30% défaut) | [USE_CASES_v4.9.md](use-cases/USE_CASES_v4.9.md) |
| UCS14 | Formations à la demande (AES) | [USE_CASES_v4.9.md](use-cases/USE_CASES_v4.9.md) |
| UCS17 | Export CSV anonymisé (HMAC) | [USE_CASES_v4.9.md](use-cases/USE_CASES_v4.9.md) |
| UCS18 | Validation formation partenaire | [USE_CASES_v4.9.md](use-cases/USE_CASES_v4.9.md) |

### 🟢 Use Cases nouveaux (1)
| UCS | Nouveau | Doc |
|-----|--------|-----|
| UCS21 | Gestion Devis | [USE_CASES_v4.9.md](use-cases/USE_CASES_v4.9.md) |

### ✨ Domaines critiques v4.9

#### 🔴 Paiements NGSER (RM-157 à RM-162)
- **Initiation:** Backend calcule montant, génère order_ngser
- **IPN:** HTTP 200 immédiat, traitement async
- **Anti-fraude:** Montant vérifié vs initialisé
- **Idempotence:** Même IPN max 1 fois
- **Réconciliation:** Scheduler chaque 30min

#### 🔐 Sécurité (MT-01, MT-02)
- **Chiffrement AES-256:** URLs formations partenaires
- **HMAC:** Anonymisation CSV
- **Masquage secrets:** NGSER tokens, AES key, etc.

#### 💰 Configuration (RM-156)
- **Défaut:** Commission FORGES = 30% (était 20% v4.8)
- **Surcharge:** Par organisation en base
- **Résolution:** org_config.value ?? env_default

#### 📝 Devis (RM-149 à RM-151)
- **Numérotation:** FORGES-DEVIS-2026-NNN
- **Flux:** Création → Paiement hors plateforme → Marquage payé
- **Post-paiement:** Création manuelle AbonnementB2B + Vouchers

---

## 🔍 Accès rapide par thème

### 💼 Métier
- **Processus complets:** [USE_CASES_v4.9.md](use-cases/USE_CASES_v4.9.md)
- **KPIs & Métriques:** [KPI_SUMMARY.md](use-cases/KPI_SUMMARY.md)
- **Spécifications détaillées:** [ForgesSpecsv4.8.md](specifications/ForgesSpecsv4.8.md)

### 🛠️ Technique
- **Implémentation:** [IMPLEMENTATION_SUMMARY.md](implementation/IMPLEMENTATION_SUMMARY.md)
- **Addendum v4.9:** [implementation-4.9/Forges_4.9_addendum_spec.md](implementation-4.9/Forges_4.9_addendum_spec.md)
- **Tests API:** [NEWMAN_BASELINE_REPORT_v4.9.md](implementation/NEWMAN_BASELINE_REPORT_v4.9.md)

### 🧪 Validation
- **Plan complet:** [validation-tests/plan_validation_complet.md](validation-tests/plan_validation_complet.md)
- **Status implémentation:** [PHASE3_COMPLETION.md](implementation/PHASE3_COMPLETION.md)

### 🎨 Frontend
- **Changements backoffice:** [BACKOFFICE_CHANGES.md](implementation/BACKOFFICE_CHANGES.md)
- **Formations intégrées:** [INTEGRATION_FORMATIONS_COMPLETE.md](implementation/INTEGRATION_FORMATIONS_COMPLETE.md)

---

## 📈 Checklist production v4.9

### Avant Go Live
- [ ] Tous les tests P0 passent
- [ ] Secrets absents des logs
- [ ] URLs réelles jamais exposées
- [ ] Montant falsifié impossible
- [ ] IPN doublon géré
- [ ] Scheduler réconciliation actif
- [ ] Commission défaut = 30%
- [ ] .env.example complet
- [ ] Migration rollback testé
- [ ] Runbook incident paiement

**Status:** Voir [PHASE3_COMPLETION.md](implementation/PHASE3_COMPLETION.md)

---

## 📂 Arborescence complète

```
docs/
├── INDEX.md ← VOUS ÊTES ICI
│
├── specifications/
│   ├── ForgesSpecsv4.8.md
│   └── Forges_4.9_addendum_spec.md
│
├── use-cases/
│   ├── USE_CASES_v4.9.md ⭐ PRINCIPAL
│   └── KPI_SUMMARY.md
│
├── implementation/
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── INTEGRATION_FORMATIONS_COMPLETE.md
│   ├── BACKOFFICE_CHANGES.md
│   ├── PHASE3_COMPLETION.md
│   ├── PHASE_3_STATUS.md
│   └── NEWMAN_BASELINE_REPORT_v4.9.md
│
├── seo/
│   ├── GUIDE_SEO.md
│   ├── GUIDE_SOUMETTRE_MOTEURS_RECHERCHE.md
│   ├── SEO_CHECKLIST.md
│   └── SEO_IMPLEMENTATION_SUMMARY.md
│
├── guides/
│   └── README.md
│
├── analyse-rm/
│   ├── ANALYSE_RM_AUTOMATISATION_v4.8.md
│   ├── ETAT_COUVERTURE_BACKEND_INTEGRATION_v4.8.md
│   ├── matrice-couverture-rm-v4.8.csv
│   └── [autres fichiers...]
│
├── validation-tests/
│   ├── plan_validation_complet.md
│   ├── rapport_newman.md
│   └── [autres fichiers...]
│
├── archives/
│   ├── FORGES - Conception & Développement Complet v1.pdf
│   ├── ForgesTODO v2.md
│   └── [documents archivés v4.8]
│
├── phase-3/
│   ├── analyze-failures.js
│   ├── diagnose-newman.js
│   └── [autres fichiers phase 3]
│
├── implementation-4.9/
│   ├── plan_implementation_phase3.md
│   ├── plan_tdd_4.9_product_driven.md
│   ├── RECAP_PHASE_1_2.md
│   ├── PHASE2_VALIDATION.md
│   ├── AVANCEMENT.md
│   └── plan_prod_4.9.md
│
├── analyse-ucs/
│   ├── PLAN_COUVERTURE_E2E_UCS_v4.8.md
│   └── matrice-couverture-ucs-e2e-v4.8.csv
│
└── README.md (guide principal)
```

---

## 🤝 Notes

- ✅ **Tous les MD ont été centralisés dans `/docs`**
- ✅ **Racine propre:** Seulement `CLAUDE.md`, `AGENTS.md`, `README.md`
- ✅ **Structure organisée par domaine**
- ✅ **Index centralisé pour navigation rapide**

---

**Dernière mise à jour:** 5 mai 2026  
**Branche:** implementation-4.9  
**Version documentation:** 1.0  
**Statut:** ✅ PROPRE
