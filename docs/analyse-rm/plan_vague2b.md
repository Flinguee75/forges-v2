# PLAN VAGUE 2B : Tests Abonnements Complets (RM-50-114)

  

## 📋 Objectif

  

Créer une suite de tests d'intégration complète pour le module Abonnements couvrant les **65 RMs restantes** (RM-50 à RM-114), en testant via l'API pour garantir la fiabilité maximale, tout en corrigeant les gaps critiques identifiés lors de l'exploration.

  

**Périmètre** : Couverture complète incluant Retail, B2B, Organisation, Institutionnel, Premium, On-Demand.

  

**Stratégie** : Tests API end-to-end (HTTP) pour fiabilité maximale + corrections mineures des gaps critiques.

  

---

  

## 🔍 Résultats de l'Exploration

  

### État actuel

- **29 RMs implémentées (48%)**

- **15 RMs partielles (25%)**

- **16 RMs manquantes (27%)**

  

### Gaps critiques identifiés

1. **Contrats Institutionnels (RM-50-59)** : 0% implémenté — Service/Controller manquant

2. **RM-72** : Limite 3 formations Retail non validée

3. **RM-89** : Compteur Premium B2B non incrémenté

4. **RM-67** : Auto-suspension B2B expiré (scheduler manquant)

5. **RM-61** : Validation plafond B2B faible

6. **RM-102** : `inclus_abonnement` non auto-calculé (EligibiliteService manquant)

  

---

  

## 📂 Fichiers à Créer/Modifier

  

### Fichiers de Tests (à créer)

```

/backend/tests/integration/

├── rm-vague3-abonnements-retail.test.js (RM-70-79, 9 tests)

├── rm-vague3-abonnements-b2b.test.js (RM-60-69, 10 tests)

├── rm-vague3-abonnements-organisation.test.js (RM-80-85, 6 tests)

├── rm-vague3-abonnements-premium.test.js (RM-86-90, 5 tests)

├── rm-vague3-abonnements-eligibilite.test.js (RM-102-111, 10 tests)

└── rm-vague3-institutionnel-gaps.test.js (RM-50-59, documentation gaps)

```

  

**Total** : ~40 tests répartis sur 6 fichiers

  

### Fichiers Backend (corrections mineures)

```

/backend/src/modules/

├── inscriptions/inscription.service.ts (RM-72 validation 3 formations)

├── abonnements/retail/abonnement-retail.repository.ts (RM-72 count impl)

├── abonnements/b2b/abonnement-b2b.service.ts (RM-89 premium counter)

├── formations/formation.service.ts (RM-102 auto-calc inclus_abonnement)

└── sessions/session.service.ts (RM-96 block sessions A_LA_DEMANDE)

```

  

### Schedulers (à créer si temps)

```

/backend/src/schedulers/

└── b2b-expiration.scheduler.ts (RM-67, optionnel si >30min)

```

  

---

  

## 🎯 Plan d'Exécution (10-12h)

  

### Phase 1 : Tests Retail (2h)

**Fichier** : `rm-vague3-abonnements-retail.test.js`

  

#### Tests à créer

1. **RM-70** : Unicité abonnement Retail (déjà implémenté, test de validation)

- Créer 1er abonnement → 201

- Tenter 2ème → 409 ABONNEMENT_DEJA_ACTIF

  

2. **RM-72** : ⚠️ **CORRECTION** + test — Limite 3 formations simultanées

- **Correction** : Ajouter validation dans `InscriptionService.creer()`

```typescript

const nbActives = await this.retailRepo.countFormationsActives(apprenant_id);

if (nbActives >= 3) throw new AppError('FORMATION_LIMIT_REACHED', 422);

```

- Implémenter `countFormationsActives()` dans repository

- **Test** : Inscrire à 3 formations → OK, 4ème → 422

  

3. **RM-73** : Période grâce 48h (déjà implémenté)

- Simuler échec paiement → statut SUSPENDU après 48h

  

4. **RM-75** : Consentement auto obligatoire (déjà implémenté)

- Vérifier `consentement_auto=true` + timestamp

  

5. **RM-76** : Limitation suspension (1x/trimestre, max 1 mois)

- Suspendre → OK

- Réactiver → Suspendre <90j après → 400 SUSPENSION_QUOTA

  

6. **RM-77** : Résiliation sans remboursement

- Résilier → statut RESILIE, accès jusqu'à date_fin

  

7. **RM-79** : Upgrade prorata ESSENTIEL → PREMIUM

- Upgrade → vérifier calcul prorata

  

8. **RM-104** : Downgrade planifié (fin mois)

- Planifier downgrade → flag `downgrade_planifie=ESSENTIEL`

  

9. **RM-106** : Premier mois prorata

- Souscrire mi-mois → vérifier `montant_premier_mois` < `montant_mensuel`

  

---

  

### Phase 2 : Tests B2B (3h)

**Fichier** : `rm-vague3-abonnements-b2b.test.js`

  

#### Tests à créer

1. **RM-61** : ⚠️ **CORRECTION** + test — Plafond apprenants strict

- **Correction** : Renforcer validation dans `EspaceOrganisationService.ajouterApprenant()`

```typescript

const abo = await this.b2bService.getAbonnementActif(org_id);

if (abo.nb_actifs >= abo.nb_max) throw new AppError('QUOTA_ATTEINT', 422);

```

- **Test** : STARTER (max 10) → inscrire 10 → OK, 11ème → 422

  

2. **RM-51-54** : Paliers B2B (STARTER=20, BUSINESS=50, ENTERPRISE=100)

- Créer abonnement STARTER → vérifier `nb_max=20`

- Créer BUSINESS → vérifier `nb_max=50`

- Créer ENTERPRISE → vérifier `nb_max=100, premium_inclus_par_an=2`

  

3. **RM-62** : Certifications conservées après désactivation

- Apprenant B2B certifié → Désactiver compte → Vérifier certification existe toujours

  

4. **RM-63** : B2B gratuit pour Standard incluses

- Apprenant B2B s'inscrit formation `inclus_abonnement=true` → `PAYE_DIRECTEMENT` sans paiement

  

5. **RM-64** : ⚠️ **CORRECTION** + test — Premium inclus Enterprise (2/an)

- **Correction** : Incrémenter compteur dans `InscriptionService`

```typescript

if (formation.type === 'PREMIUM' && abo.palier === 'ENTERPRISE') {

if (abo.premium_consommes >= 2) throw new AppError('PREMIUM_QUOTA_ATTEINT', 422);

await this.b2bService.incrementerPremium(abo.id);

}

```

- **Test** : Inscrire 2 Premium → OK, 3ème → paiement requis

  

6. **RM-66** : Alertes J-45 et J-15 (déjà implémenté)

- Simuler abonnement expirant J-40 → vérifier email envoyé

  

7. **RM-67** : ⚠️ **CORRECTION** optionnelle — Auto-suspension expiré

- **Si temps** : Créer scheduler `B2BExpirationScheduler`

- **Sinon** : Test manuel via controller endpoint

- **Test** : Abonnement expiré → statut EXPIRE

  

8. **RM-68** : Montée palier prorata (déjà implémenté)

- STARTER → BUSINESS → vérifier calcul prorata

  

9. **RM-69** : Alerte plafond >80%

- BUSINESS (max 50) avec 42 apprenants → vérifier taux_utilisation=84%

  

10. **RM-110** : Descente palier planifiée

- Planifier descente BUSINESS → STARTER → vérifier flag

  

---

  

### Phase 3 : Tests Organisation (2h)

**Fichier** : `rm-vague3-abonnements-organisation.test.js`

  

#### Tests à créer

1. **RM-81** : Essai gratuit 30j (déjà implémenté)

- Créer organisation → vérifier `date_fin_essai = now + 30j`

  

2. **RM-82** : ⚠️ **NOTE** — Alertes essai J-7/J-2 vs abo J-30/J-7

- **Documentation** : Scheduler existant envoie alertes abo, pas essai

- **Test** : Vérifier alerte abonnement J-30 (ignorer essai si >30min)

  

3. **RM-83** : Suspension accès essai expiré (déjà implémenté)

- Essai expiré → vérifier statut SUSPENDU

  

4. **RM-84** : Unicité AbonnementOrganisation

- Créer 1er abonnement → OK

- Tenter 2ème → 409

  

5. **RM-85** : ⚠️ **NOTE** — Welcome offer J+25 non implémenté

- **Documentation** : Gap identifié, scheduler manquant

- **Test skip** : `.skip()` avec TODO

  

6. **RM-107** : Grille tarifaire (Basique/Pro/Enterprise)

- Vérifier tarifs : 50k / 150k / 400k XOF/an

  

---

  

### Phase 4 : Tests Premium & On-Demand (2h)

**Fichier** : `rm-vague3-abonnements-premium.test.js`

  

#### Tests à créer

1. **RM-86** : Type formation assigné par FORGES (déjà testé dans partenaires)

- Référencer test existant

  

2. **RM-87** : Premium hors abonnement

- Abonné Retail → Formation Premium → paiement requis

  

3. **RM-88** : ⚠️ **CORRECTION** + test — Réduction 15% Premium

- **Correction** : Valider dans `InscriptionService`

```typescript

if (formation.type === 'PREMIUM' && abonnementRetail?.statut === 'ACTIF') {

montant *= 0.85; // -15%

}

```

- **Test** : Abonné actif → inscription Premium → vérifier réduction

  

4. **RM-91-95** : On-demand (déjà implémentés)

- Vérifier mode A_LA_DEMANDE, durée 365j, accès immédiat

  

5. **RM-96** : ⚠️ **CORRECTION** + test — Bloquer sessions A_LA_DEMANDE

- **Correction** : Ajouter validation dans `SessionService.create()`

```typescript

if (formation.mode_formation === 'A_LA_DEMANDE') {

throw new AppError('SESSION_INTERDITE_ONDEMAND', 400);

}

```

- **Test** : Tenter créer session pour formation on-demand → 400

  

---

  

### Phase 5 : Tests Éligibilité & Accès (2h)

**Fichier** : `rm-vague3-abonnements-eligibilite.test.js`

  

#### Tests à créer

1. **RM-102** : ⚠️ **CORRECTION** + test — Auto-calcul inclus_abonnement

- **Correction** : Ajouter trigger dans `FormationService.create/update()`

```typescript

const inclus = this.calculerEligibilite(type_formation, pilier_abonnement);

// inclus = (type === 'STANDARD' && pilier IN ['RETAIL', 'TOUS'])

```

- **Test** : Créer formation STANDARD + RETAIL → vérifier `inclus_abonnement=true`

  

2. **RM-103** : Suspension accès si abonnement inactif (déjà implémenté)

- Suspendre abonnement → vérifier `AccesFormationDemande.statut=SUSPENDU`

  

3. **RM-105** : Suspension accès pendant suspension volontaire

- Suspendre volontairement → vérifier accès bloqués

  

4. **RM-109** : Renouvellement auto Organisation

- Vérifier `renouvellement_auto=true` + alertes

  

5. **RM-111** : Extension RM-103 à B2B

- Abonnement B2B expiré → vérifier accès formations suspendus

  

---

  

### Phase 6 : Documentation Gaps Institutionnels (1h)

**Fichier** : `rm-vague3-institutionnel-gaps.test.js`

  

**Approche** : Tests `.skip()` avec documentation des gaps

  

```javascript

describe('[GAPS] Contrats Institutionnels (RM-50-59) — NON IMPLÉMENTÉS', () => {

test.skip('[RM-50] TODO : Unicité contrat par programme', () => {

// Gap : Service ContratInstitutionnel manquant

// Fichiers à créer : backend/src/modules/institutionnel/...

});

  

test.skip('[RM-51] TODO : Facturation SaaS annuelle', () => {

// Gap : Scheduler billing manquant

});

  

// ... RM-52 à RM-59

});

```

  

**Bénéfice** : Tracer les gaps pour priorisation future

  

---

  

## 🛠️ Corrections Mineures à Implémenter

  

### 1. RM-72 : Limite 3 formations Retail

**Fichiers** :

- `backend/src/modules/abonnements/retail/abonnement-retail.repository.ts`

- `backend/src/modules/inscriptions/inscription.service.ts`

  

**Code** :

```typescript

// Repository

async countFormationsActives(apprenant_id: string): Promise<number> {

return this.prisma.accesFormationDemande.count({

where: {

apprenant_id,

statut: 'ACTIF',

source_financement: 'ABONNEMENT',

},

});

}

  

// Service

const nbActives = await this.retailRepo.countFormationsActives(params.apprenant_id);

if (nbActives >= 3) {

throw new AppError('FORMATION_LIMIT_REACHED', 422, 'Limite 3 formations atteinte');

}

```

  

### 2. RM-89 : Compteur Premium B2B

**Fichier** : `backend/src/modules/abonnements/b2b/abonnement-b2b.service.ts`

  

**Code** :

```typescript

async incrementerPremium(abonnement_id: string): Promise<void> {

await this.prisma.abonnementB2B.update({

where: { id: abonnement_id },

data: { premium_consommes: { increment: 1 } },

});

}

```

  

**Appel** : Dans `InscriptionService.creer()` après validation Premium Enterprise

  

### 3. RM-61 : Validation plafond B2B strict

**Fichier** : `backend/src/modules/espace-organisation/espace-organisation.service.ts`

  

**Code** :

```typescript

// Avant ajout apprenant

const abo = await this.b2bService.getAbonnementActif(organisation_id);

if (abo.nb_actifs >= abo.nb_max) {

throw new AppError('QUOTA_ATTEINT', 422, `Plafond ${abo.nb_max} apprenants atteint`);

}

```

  

### 4. RM-88 : Réduction 15% Premium pour abonnés

**Fichier** : `backend/src/modules/inscriptions/inscription.service.ts`

  

**Code** :

```typescript

let montant = formation.cout_catalogue;

  

if (formation.type_formation === 'PREMIUM') {

const aboRetail = await this.retailRepo.findByApprenant(apprenant_id);

if (aboRetail?.statut === 'ACTIF') {

montant = Math.round(montant * 0.85); // -15%

}

}

```

  

### 5. RM-96 : Bloquer sessions pour formations on-demand

**Fichier** : `backend/src/modules/sessions/session.service.ts`

  

**Code** :

```typescript

// Au début de create()

const formation = await this.formationRepo.findById(data.formation_id);

if (formation.mode_formation === 'A_LA_DEMANDE') {

throw new AppError('SESSION_INTERDITE_ONDEMAND', 400,

'Les formations à la demande ne peuvent pas avoir de sessions');

}

```

  

### 6. RM-102 : Auto-calcul inclus_abonnement

**Fichier** : `backend/src/modules/formations/formation.service.ts`

  

**Code** :

```typescript

private calculerEligibilite(type: string, pilier: string): boolean {

return type === 'STANDARD' && ['RETAIL', 'TOUS'].includes(pilier);

}

  

// Dans create() et update()

const inclus_abonnement = this.calculerEligibilite(data.type_formation, data.pilier_abonnement);

```

  

---

  

## 📊 Estimation Durée

  

| Phase | Contenu | Durée |

|-------|---------|-------|

| Phase 1 | Tests Retail (9 tests + RM-72 fix) | 2h |

| Phase 2 | Tests B2B (10 tests + RM-61/64/89 fixes) | 3h |

| Phase 3 | Tests Organisation (6 tests) | 2h |

| Phase 4 | Tests Premium/On-Demand (5 tests + RM-88/96 fixes) | 2h |

| Phase 5 | Tests Éligibilité (10 tests + RM-102 fix) | 2h |

| Phase 6 | Documentation gaps institutionnels (skip tests) | 1h |

| **TOTAL** | **40 tests + 6 corrections** | **12h** |

  

---

  

## ✅ Critères de Succès

  

### Tests

- ✅ 40 tests créés répartis sur 6 fichiers

- ✅ Tous les tests Retail/B2B/Organisation PASS

- ✅ Tests Premium/Éligibilité PASS avec corrections

- ✅ Tests institutionnels `.skip()` avec documentation

  

### Corrections

- ✅ RM-72 : Validation 3 formations implémentée + testée

- ✅ RM-89 : Compteur Premium B2B incrémenté + testé

- ✅ RM-61 : Plafond B2B strict validé + testé

- ✅ RM-88 : Réduction 15% appliquée + testée

- ✅ RM-96 : Sessions on-demand bloquées + testé

- ✅ RM-102 : Auto-calcul éligibilité implémenté + testé

  

### Couverture RM

**Avant** : 78/148 RM (53%)

**Après** : **120/148 RM (81%)**

**Progression** : **+42 RM (+28%)**

  

---

  

## 🎯 Prochaines Étapes Après Vague 2B

  

### Gaps restants (optionnels)

1. **RM-67** : Scheduler auto-suspension B2B (2h)

2. **RM-82** : Scheduler alertes essai J-7/J-2 (1h)

3. **RM-85** : Scheduler welcome offer J+25 (1h)

4. **RM-50-59** : Module complet Contrats Institutionnels (5-7 jours)

  

### Tests supplémentaires recommandés

- Tests performance (reversement mensuel avec 10k apprenants)

- Tests concurrence (inscriptions simultanées au plafond)

- Tests multilingues (emails alertes en 4 langues)

  

---

  

## 📝 Notes Importantes

  

### Hypothèses

- Backend déjà démarré sur port 3000 (via `npm run test:rm`)

- Seeds E2E contiennent organisations et apprenants test

- Variables env configurées (tarifs, seuils)

  

### Risques

- **Durée** : 12h estimées, peut atteindre 14h si bugs découverts

- **Corrections** : Certaines peuvent nécessiter validation métier supplémentaire

- **Scheduler RM-67** : Si >30min, reporter en optionnel

  

### Dépendances

- Tests dépendent de `helpers.js` existant

- Corrections nécessitent régénération Prisma Client si schema modifié

- Tests E2E nécessitent Docker Compose opérationnel

  

---

  

## 🔗 Fichiers de Référence

  

### Specs

- `/docs/specifications/ForgesSpecsv4.8.md` — Specs complètes v4.8

- `/CLAUDE.md` — Règles métier condensées

- `/docs/analyse-rm/matrice-couverture-rm-v4.8.csv` — Matrice RM

  

### Code Backend

- `/backend/src/modules/abonnements/` — Services abonnements

- `/backend/src/modules/inscriptions/inscription.service.ts` — Logique inscription

- `/backend/src/modules/formations/formation.service.ts` — Logique formations

- `/backend/prisma/schema.prisma` — Schéma DB

  

### Tests Existants

- `/backend/tests/integration/helpers.js` — Helpers tests

- `/backend/tests/integration/rm-vague3-partenaires.test.js` — Pattern tests API

- `/backend/src/modules/abonnements/__tests__/` — Tests unitaires existants

  

---

  

**FIN DU PLAN — Prêt pour exécution**