# 📚 Documentation FORGES v4.8

Documentation technique complète de la plateforme FORGES — Agrégateur de formations certifiantes pour le marché africain.

**Dernière mise à jour** : 2026-04-23
**Version** : 4.8

---

## 📂 Structure des Dossiers

```
docs/
├── README.md                           ← Vous êtes ici
├── analyse-rm/                         ← Analyse Règles Métier (NOUVEAU)
│   ├── README_ANALYSE_RM.md           ← Guide de navigation
│   ├── SYNTHESE_RM_AUTOMATISATION_v4.8.md
│   ├── ANALYSE_RM_AUTOMATISATION_v4.8.md
│   ├── matrice-couverture-rm-v4.8.csv
│   └── CHECKLIST_EXECUTION_v4.8.md
├── specifications/                     ← Spécifications métier
│   ├── ForgesSpecsv4.8.md
│   └── conception_forges_v1_3.md
├── validation-tests/                   ← Tests et validation
│   ├── plan_validation_complet.md
│   ├── rapport_newman.md
│   ├── ucs_mapping_endpoit.md
│   ├── audit_alignement_api_front_backend_v48.md
│   ├── ecarts_apprenant_v48.md
│   └── ecarts_organisation_v48.md
└── archives/                           ← Documents historiques
    ├── FORGES - Conception & Développement Complet v1.pdf
    └── ForgesTODO v2.md
```

---

## 🎯 Démarrage Rapide

### Pour Décideurs / Product Owners
1. ✅ **Lire** : [`analyse-rm/SYNTHESE_RM_AUTOMATISATION_v4.8.md`](analyse-rm/SYNTHESE_RM_AUTOMATISATION_v4.8.md) (5 min)
   - Vue d'ensemble des 148 règles métier
   - Gap analysis : 70% criticité 5 non couvertes
   - Plan d'action 8 jours → 80 tests automatisés

### Pour Développeurs / Testeurs
1. ✅ **Lire** : [`analyse-rm/README_ANALYSE_RM.md`](analyse-rm/README_ANALYSE_RM.md) (point d'entrée)
2. ✅ **Consulter** : [`analyse-rm/ANALYSE_RM_AUTOMATISATION_v4.8.md`](analyse-rm/ANALYSE_RM_AUTOMATISATION_v4.8.md) (complet)
3. ✅ **Suivre** : [`analyse-rm/CHECKLIST_EXECUTION_v4.8.md`](analyse-rm/CHECKLIST_EXECUTION_v4.8.md) (jour par jour)

### Pour Architectes / Tech Leads
1. ✅ **Specs métier** : [`specifications/ForgesSpecsv4.8.md`](specifications/ForgesSpecsv4.8.md)
2. ✅ **Conception** : [`specifications/conception_forges_v1_3.md`](specifications/conception_forges_v1_3.md)
3. ✅ **Plan validation** : [`validation-tests/plan_validation_complet.md`](validation-tests/plan_validation_complet.md)

---

## 📋 Documents par Catégorie

### 🔍 Analyse Règles Métier (NOUVEAU - 2026-04-23)

| Document | Description | Audience | Durée lecture |
|----------|-------------|----------|---------------|
| [**SYNTHESE**](analyse-rm/SYNTHESE_RM_AUTOMATISATION_v4.8.md) | Synthèse exécutive | Décideurs | 5 min |
| [**ANALYSE COMPLÈTE**](analyse-rm/ANALYSE_RM_AUTOMATISATION_v4.8.md) | Document technique complet | Développeurs | 30 min |
| [**MATRICE CSV**](analyse-rm/matrice-couverture-rm-v4.8.csv) | Suivi couverture Excel | Tous | - |
| [**CHECKLIST**](analyse-rm/CHECKLIST_EXECUTION_v4.8.md) | Plan d'exécution jour par jour | Développeurs | 15 min |
| [**README**](analyse-rm/README_ANALYSE_RM.md) | Guide de navigation | Tous | 5 min |

**Résultats clés** :
- 📊 **148 règles métier** inventoriées
- 🔴 **27 règles criticité 5** (BLOQUANTES)
- ❌ **70% non couvertes** par tests actuels
- ✅ **Plan 8 jours** → 100% criticité 5

### 📖 Spécifications

| Document | Description | Version |
|----------|-------------|---------|
| [**ForgesSpecsv4.8.md**](specifications/ForgesSpecsv4.8.md) | Spécifications fonctionnelles complètes | v4.8 |
| [**conception_forges_v1_3.md**](specifications/conception_forges_v1_3.md) | Architecture technique et Use Cases | v1.3 |

**Contenu** :
- 🎯 21 Use Cases (UCS00-UCS20)
- 🔧 15 Modules (MOD-01 à MOD-15)
- 📐 9 Rôles utilisateurs
- 🎨 Charte graphique FORGES
- 💾 Modèle de données Prisma

### 🧪 Validation & Tests

| Document | Description | Date |
|----------|-------------|------|
| [**plan_validation_complet.md**](validation-tests/plan_validation_complet.md) | Plan validation 72 tests | 2026-04-19 |
| [**rapport_newman.md**](validation-tests/rapport_newman.md) | Tests API Postman/Newman | 2026-04-20 |
| [**ucs_mapping_endpoit.md**](validation-tests/ucs_mapping_endpoit.md) | Mapping UCS → Endpoints | 2026-04-20 |
| [**audit_alignement_api_front_backend_v48.md**](validation-tests/audit_alignement_api_front_backend_v48.md) | Audit cohérence API/Front | 2026-04-23 |
| [**ecarts_apprenant_v48.md**](validation-tests/ecarts_apprenant_v48.md) | Écarts espace apprenant | 2026-04-23 |
| [**ecarts_organisation_v48.md**](validation-tests/ecarts_organisation_v48.md) | Écarts espace organisation | 2026-04-23 |

**État actuel** :
- ✅ 4 tests E2E implémentés (vague 0)
- ⚠️ Gap critique identifié (70% criticité 5)
- 📋 Roadmap complète disponible

### 📦 Archives

| Document | Description |
|----------|-------------|
| [**FORGES - Conception & Développement Complet v1.pdf**](archives/FORGES%20-%20Conception%20%26%20Développement%20Complet%20v1.pdf) | Document de conception PDF (historique) |
| [**ForgesTODO v2.md**](archives/ForgesTODO%20v2.md) | TODO list historique |

---

## 🎯 Cas d'Usage par Profil

### Je suis Chef de Projet / Product Owner

**Objectif** : Comprendre les risques et prioriser les efforts de test

1. ✅ Lire la [**SYNTHESE**](analyse-rm/SYNTHESE_RM_AUTOMATISATION_v4.8.md) (5 min)
2. 📊 Consulter le [**TOP 10 règles critiques**](analyse-rm/SYNTHESE_RM_AUTOMATISATION_v4.8.md#-top-10-règles-critiques-non-couvertes)
3. 💰 Valider le [**ROI**](analyse-rm/SYNTHESE_RM_AUTOMATISATION_v4.8.md#-bénéfices-et-roi) (8j → 20-30j économisés)
4. ✅ Décider : [**Option 1 / 2 / 3**](analyse-rm/SYNTHESE_RM_AUTOMATISATION_v4.8.md#-décision-attendue)

### Je suis Développeur / Testeur

**Objectif** : Implémenter les tests API et E2E

1. ✅ Lire le [**Guide de navigation**](analyse-rm/README_ANALYSE_RM.md)
2. 📋 Suivre la [**CHECKLIST**](analyse-rm/CHECKLIST_EXECUTION_v4.8.md) jour par jour
3. 🔧 Copier les [**Templates de tests**](analyse-rm/ANALYSE_RM_AUTOMATISATION_v4.8.md#annexe-b--templates-de-tests)
4. 📊 Mettre à jour la [**Matrice CSV**](analyse-rm/matrice-couverture-rm-v4.8.csv)

**Commandes rapides** :
```bash
# Tests API
cd backend
npm run test:integration -- tests/integration/rm-*.test.js

# Tests E2E
cd frontend
npx playwright test e2e/tests/ucs*.spec.js
```

### Je suis Architecte / Tech Lead

**Objectif** : Comprendre l'architecture et valider la conception

1. ✅ [**Spécifications v4.8**](specifications/ForgesSpecsv4.8.md) (architecture complète)
2. ✅ [**Conception v1.3**](specifications/conception_forges_v1_3.md) (Use Cases détaillés)
3. ✅ [**Analyse RM complète**](analyse-rm/ANALYSE_RM_AUTOMATISATION_v4.8.md) (mapping modules)
4. 📊 [**Audit alignement**](validation-tests/audit_alignement_api_front_backend_v48.md) (cohérence API/Front)

### Je suis nouveau sur le projet

**Objectif** : Comprendre rapidement FORGES

**Parcours recommandé (2h)** :
1. ✅ Lire ce README (10 min)
2. ✅ [**Spécifications v4.8**](specifications/ForgesSpecsv4.8.md) — Section "Vue d'ensemble" (30 min)
3. ✅ [**Conception v1.3**](specifications/conception_forges_v1_3.md) — Section "Use Cases" (30 min)
4. ✅ [**SYNTHESE Analyse RM**](analyse-rm/SYNTHESE_RM_AUTOMATISATION_v4.8.md) (20 min)
5. ✅ Explorer la [**Matrice CSV**](analyse-rm/matrice-couverture-rm-v4.8.csv) (10 min)

---

## 📊 Métriques Projet

### Règles Métier

| Métrique | Valeur |
|----------|--------|
| **Total règles métier** | 148 |
| **Criticité 5 (BLOQUANTES)** | 27 (18%) |
| **Criticité 4 (IMPORTANTES)** | 117 (79%) |
| **Criticité 3 (SECONDAIRES)** | 4 (3%) |

### Couverture Tests

| Type | Actuel | Cible Vague 1+2 |
|------|--------|-----------------|
| **Tests E2E** | 4 | 34 (+30) |
| **Tests API** | 0 | 50 (+50) |
| **Couverture criticité 5** | 30% (8/27) | 100% (27/27) |

### Architecture

| Composant | Nombre |
|-----------|--------|
| **Use Cases** | 21 (UCS00-UCS20) |
| **Modules backend** | 15 (MOD-01 à MOD-15) |
| **Rôles utilisateurs** | 9 |
| **Pages frontend** | ~60 |

---

## 🚀 Commandes Utiles

### Validation

```bash
# Lire les specs
cat specifications/ForgesSpecsv4.8.md

# Lire l'analyse RM
cat analyse-rm/SYNTHESE_RM_AUTOMATISATION_v4.8.md

# Ouvrir la matrice Excel
open analyse-rm/matrice-couverture-rm-v4.8.csv
```

### Tests

```bash
# Tests API (backend)
cd backend
npm run test:integration

# Tests E2E (frontend)
cd frontend
npm run test:e2e

# Reset DB validation
cd backend
npm run db:seed:validation -- --reset
```

### Documentation

```bash
# Générer rapport tests
cd backend
npm run test:integration -- --coverage --json > docs/validation-tests/coverage-api.json

# Générer rapport E2E
cd frontend
npx playwright test --reporter=html
npx playwright show-report
```

---

## 🔄 Historique des Versions

| Version | Date | Description |
|---------|------|-------------|
| **v4.8** | 2026-04-23 | Analyse RM complète (148 règles), plan tests 8j |
| **v1.3** | 2026-04-18 | Conception architecture 15 modules |
| **v1.2** | 2026-04-10 | Spécifications initiales 21 Use Cases |

---

## 📞 Contact et Support

**Équipe Technique FORGES**
- 📧 Email : tech@forges.ci
- 📂 Documentation : `/docs/`
- 📊 Matrice suivi : `analyse-rm/matrice-couverture-rm-v4.8.csv`

**Pour contribuer** :
1. Lire les spécifications ([`specifications/`](specifications/))
2. Vérifier l'analyse RM ([`analyse-rm/`](analyse-rm/))
3. Mettre à jour la matrice CSV après tests
4. Documenter les bugs découverts

---

## 🎯 Prochaines Étapes

### Court Terme (Semaine 1-2)

- [ ] ✅ Valider le plan d'analyse RM avec l'équipe
- [ ] ✅ Créer seeds validation dédiés (27 RM criticité 5)
- [ ] 🚀 Lancer Vague 1 — Tests API (3 jours, 50 tests)
- [ ] 🚀 Lancer Vague 2 — Tests E2E (4 jours, 30 tests)
- [ ] 📊 Générer rapport final (1 jour)

### Moyen Terme (Mois 1-2)

- [ ] 🧪 Vague 3 — Abonnements (46 RM) + Partenaires (15 RM)
- [ ] 🧪 Vague 4 — Formations (16 RM) + Sessions (9 RM) + Bot (11 RM)
- [ ] 🧪 Vague 5 — Multi-langue (5 RM) + Criticité 3 (4 RM)
- [ ] 🔄 Intégration CI/CD GitHub Actions

### Long Terme (Mois 3+)

- [ ] 📈 Monitoring production (Uptime Robot, Logtail)
- [ ] 🎯 100% couverture RM (148/148)
- [ ] 📚 Documentation utilisateur finale
- [ ] 🚀 Déploiement production FORGES v4.8

---

**Version** : 1.0 | **Dernière mise à jour** : 2026-04-23 | **Statut** : Documentation complète ✅
