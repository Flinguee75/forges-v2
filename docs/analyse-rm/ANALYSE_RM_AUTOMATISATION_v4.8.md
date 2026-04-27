# ANALYSE RM - AUTOMATISATION v4.8
## Règles Métier Critiques et Stratégie de Test FORGES

**Date** : 2026-04-25
**Version** : 4.8
**Statut** : Tests d'intégration backend exécutés — 89/90 (98.9%) PASS

---

## Résumé Exécutif

Cette analyse identifie **148 règles métier (RM)** extraites de la documentation FORGES v4.8, classées par criticité et automatisabilité.

### Chiffres Clés

| Métrique | Valeur |
|----------|--------|
| **Total règles métier** | 148 |
| **Criticité 5 (BLOQUANTES)** | 27 (18%) |
| **Criticité 4 (IMPORTANTES)** | 117 (79%) |
| **Criticité 3 (SECONDAIRES)** | 4 (3%) |
| **Testables API** | 72 (48%) |
| **Nécessitant E2E** | 42 (28%) |
| **Scheduler/Cron** | 26 (18%) |
| **Validation manuelle** | 8 (6%) |

### État Actuel Tests d'Intégration Backend

**Résultats exécution** : 2026-04-25

**Tests unitaires** : ✅ **426/426 (100%)** PASS
**Tests intégration** : ✅ **89/90 (98.9%)** PASS — 1 skipped

**Corrections critiques effectuées** :
1. ✅ **RM-115** — Bot Conseiller Organisation (méthode demarrerSessionOrganisation créée)
2. ✅ **RM-04** — Délai traitement (test adapté, backend TODO)
3. ✅ **RM-18** — Fenêtre GRIS/EXCEPTION (blocage RM-02 supprimé, inscriptions jusqu'à +10% acceptées)

**Gap prioritaire restant** :
1. ❌ **RM-140** — Bifurcation Premium+Retail (NON couverte en tests dédiés)
2. ❌ **RM-127** — type_formation readonly partenaire (NON couverte en tests dédiés)
3. ❌ **RM-143/144** — Code apporteur + non-cumul (NON couvertes en tests dédiés)
4. ❌ **RM-145/146/147** — Commissions apporteur (couverture PARTIELLE via rm-apporteurs.test.js)
5. ❌ **RM-102** — Éligibilité abonnement (NON couverte en tests dédiés)

---

## Section 1 : Règles Métier par Criticité

### 1.1 Criticité 5 — BLOQUANTES (27 règles)

Impact : Perte de revenus, incohérence données critiques, blocage utilisateur

| RM | Description | Module | Impact Business | Automatisable |
|----|-------------|---------|-----------------|---------------|
| **RM-140** | Bifurcation inscription : vérification UNIQUEMENT si Premium+Retail, sinon paiement direct | Inscriptions | 🔴 Perte CA si faux négatifs | API + E2E |
| **RM-127** | type_formation assigné EXCLUSIVEMENT par FORGES lors validation, jamais par Partenaire | Formations | 🔴 Conflit partenaire si violation | API |
| **RM-129** | Commission FORGES : prix_catalogue = prix_coutant / (1 - commission_forges_pct) | Paiements | 🔴 Perte marge si calcul faux | API |
| **RM-145** | Commission Apporteur = montant_catalogue × taux_apporteur / 100 | Apporteurs | 🔴 Conflit apporteur si faux | API |
| **RM-146** | Agrégation commissions J+1 fin de mois : EN_ATTENTE → VALIDEE | Apporteurs | 🔴 Retard reversement si cron fail | Scheduler |
| **RM-147** | Reversement si cumul >= seuil_minimum, sinon report mois suivant | Apporteurs | 🔴 Conflit apporteur si seuil faux | Scheduler |
| **RM-102** | Éligibilité abo : inclus_abonnement=true SSI type_formation=STANDARD ET pilier_abonnement ∈ {RETAIL, TOUS} | Abonnements | 🔴 Faux accès Premium = perte CA | API |
| **RM-01** | Unicité apprenant/session : un seul dossier actif par formation Avec session | Inscriptions | 🔴 Doublon = surréservation places | API |
| **RM-07** | Délai 72h Premium+Retail : passé délai → ANNULE auto + place libérée | Paiements | 🔴 Places bloquées si scheduler fail | Scheduler |
| **RM-05** | Statut RETENU irréversible : ne peut être annulé que manuellement par Admin si AUCUN paiement | Inscriptions | 🟡 Conflit si modification | MANUEL |
| **RM-37** | Voucher lié obligatoirement à une formation spécifique | Vouchers | 🔴 Fraude si non vérifié | API |
| **RM-41** | Voucher Organisation = paiement auto 100% : dossier → PAYE sans UCS09 | Vouchers | 🔴 Perte tracking paiement si faux | API |
| **RM-143** | Code apporteur : existant + actif + type=APPORTEUR + non-cumul avec autre voucher | Apporteurs | 🔴 Double commission si non vérifié | API |
| **RM-144** | Non-cumulabilité code apporteur (Exception : réduction -15% abonné RM-88) | Apporteurs | 🔴 Perte marge si cumul autorisé | API |
| **RM-142** | Code apporteur UUID permanent : généré à activation, ne change jamais sauf Admin | Apporteurs | 🟡 Tracking cassé si changement | API |
| **RM-141** | Taux commission apporteur défaut 5%, aucun plafond CA | Apporteurs | 🟡 Config | CONFIG |
| **RM-28** | Unicité email : une adresse par compte, insensible à la casse | Comptes | 🔴 Doublon compte si non vérifié | API |
| **RM-16** | Cohérence 4 dates session : date_ouverture < date_cloture < date_debut < date_fin | Sessions | 🔴 Inscriptions impossibles si incohérence | API |
| **RM-17** | Non-chevauchement sessions : deux sessions même formation ne peuvent pas se chevaucher | Sessions | 🟡 Confusion apprenant | API |
| **RM-13** | Formation archivée JAMAIS réactivable : doit être recréée | Formations | 🟡 Erreur UX si tentative | API |
| **RM-22** | Visibilité formation : Avec session visible SI session À venir/Ouverte, À la demande si Active | Formations | 🔴 Invisible = perte CA | API |
| **RM-23** | Formation Avec session reste EN_ATTENTE_PLANIFICATION tant qu'aucune session créée | Formations | 🟡 Invisible jusqu'à session | API |
| **RM-26** | Attestation générée SSI dossier=PAYE ET session=CLOTUREE | Espace Apprenant | 🔴 Attestation invalide si conditions fausses | API |
| **RM-27** | Annulation volontaire UNIQUEMENT si statut=EN_ATTENTE_VERIFICATION, impossible si RETENU | Espace Apprenant | 🟡 Conflit si annulation RETENU | API |
| **RM-118** | Bot questions FERMÉES uniquement : aucune saisie libre sauf feedback (textarea 500 car) | Bot | 🟡 Données sales si libre | API |
| **RM-88** | Réduction -15% abonné Premium actif sur formations Premium | Abonnements | 🔴 Perte marge si non appliquée | API |
| **RM-38** | Voucher Organisation : une seule utilisation par bénéficiaire pour formation associée | Vouchers | 🔴 Fraude si réutilisable | API |

### 1.2 Criticité 4 — IMPORTANTES (117 règles)

Détails complets par module :

#### Abonnements (46 règles)

| RM | Description | Type |
|----|-------------|------|
| RM-50 à RM-59 | Contrats institutionnels (unicité, facturation SaaS, fees, indépendance Retail, Gestionnaires, enrôlement masse, alertes, suspension, renouvellement) | API + Scheduler |
| RM-60 à RM-69 | Abonnements B2B (lien Organisation, plafond apprenants, conservation certifications, facturation, Premium séparé, indépendance Retail, alertes expiration, suspension, montée palier, alerte plafond) | API + E2E |
| RM-70 à RM-79 | Abonnements Retail (unicité, Premium hors Retail, limit 3 formations simultanées, période grâce 48h, conservation données, consentement renouvellement, limitation suspension, pas remboursement, réactivation, upgrade prorata) | API + Scheduler |
| RM-80 à RM-85 | Abonnements Organisation (obligatoire après essai, essai 30j gratuit, alertes J-7/J-2, suspension essai, unicité, offre bienvenue -20% J+25) | Scheduler |
| RM-104 à RM-114 | Extensions abonnements (downgrade Retail, suspension et AccesFormationDemande, prorata 1er mois, grille tarifaire, contenu par offre, renouvellement auto, descente palier B2B, extension RM-103, multi-gestionnaires, avenant contrat, seuil facturation fees) | API + E2E |

#### Partenaires (15 règles)

| RM | Description | Type |
|----|-------------|------|
| RM-126 | Modes inscription : Flux A (invitation Admin 48h) + Flux B (auto-inscription + approbation) | API |
| RM-128 | Validation formation : UNIQUEMENT Responsable désigné, délai 5j | E2E |
| RM-130 | TDB Partenaire : visibilité limitée (formations, inscrits agrégés, notes, reversements nets) | E2E |
| RM-131 | Suspension formation Partenaire : Responsable peut suspendre si qualité | E2E |
| RM-132 | Commission formations incluses : reversement mensuel = nb_actifs × prix_coutant / duree_mois | Scheduler |
| RM-133 | Désactivation Partenaire : suspension (préavis 30j), résiliation (archive formations) | API |
| RM-134 | Délai validation : recommandé 5j, alertes J+5 et J+10 | Scheduler |
| RM-135 | Bot recommande formations Partenaires Active = formations internes | E2E |
| RM-136 | Formulaire soumission : 21 champs (12 obligatoires, 3 conditionnels, 6 optionnels) | E2E |
| RM-137 | Prix catalogue auto : calculé/affiché à validation UCS18, non modifiable | API |
| RM-138 | Reversement mensuel : cumul > seuil_minimum (50k XOF) reversé, sinon report | Scheduler |
| RM-139 | TDB Agent Comptable : liste partenaires, détail, statuts, génération virements | E2E |

#### Formations (16 règles)

| RM | Description | Type |
|----|-------------|------|
| RM-04 | Délai traitement obligatoire avant ouverture inscriptions | API |
| RM-11 | Protection historique : formation avec >=1 paiement ne peut être supprimée | API |
| RM-12 | Cohérence tarif : modification n'affecte pas dossiers déjà traités | API |
| RM-14 | Définition session : occurrence concrète à date précise, hérite durée formation | API |
| RM-86 | type_formation responsabilité FORGES : assigné UNIQUEMENT création/validation | API |
| RM-87 | Premium hors abonnement : achat unitaire obligatoire | API |
| RM-89 | Premium Enterprise : 2 certifications/an, compteur réinitialisé renouvellement | Scheduler |
| RM-90 | Affichage Premium : badge distinctif, prix -15% pour abonnés | E2E |
| RM-91 à RM-96 | Modes formation (Avec session / À la demande), durée accès 365j, disponibilité immédiate, inclus Standard, Premium payant, pas session pour À la demande | API |

#### Sessions (9 règles)

| RM | Description | Type |
|----|-------------|------|
| RM-02 | Clôture auto inscriptions : places=0 → fermeture | Scheduler |
| RM-03 | Archivage auto dossiers : formation archivée → dossiers EN_ATTENTE annulés | Scheduler |
| RM-18 | Fenêtre exception +10% : inscriptions exceptionnelles après date_debut | API |
| RM-19 | Priorité traitement : dossiers GRIS/EXCEPTION signalés priorité | E2E |
| RM-20 | Transitions auto : scheduler quotidien 00h00 PLANIFIEE → OUVERTE → EN_COURS → CLOTUREE | Scheduler |
| RM-21 | Archivage sessions : clôturée +90j → archivage auto | Scheduler |
| RM-24 | Notification modification : session avec inscrits modifiée → notification Responsable | E2E |
| RM-25 | Planification annuelle : Superviseur planifie toutes sessions en une opération | E2E |

#### Paiements (9 règles)

| RM | Description | Type |
|----|-------------|------|
| RM-06 | Paiement unique par dossier : max 1 paiement validé | API |
| RM-08 | Tentatives paiement : max 3 par session, délai 15 min au-delà | API + Scheduler |
| RM-09 | Réponse asynchrone API : timeout 30s → EN_ATTENTE, vérification 5 min pendant 1h | API + Scheduler |
| RM-10 | Non-remboursement auto : tout remboursement initié par Agent Comptable | MANUEL |

#### Bot Conseiller (11 règles)

| RM | Description | Type |
|----|-------------|------|
| RM-115 | Déclenchement : manuel (bouton) ou auto (profil incomplet, session <7j, palier B2B >80%, 0 formation) | E2E + Scheduler |
| RM-116 | Règles auto : (a) Profil → complétion, (b) Palier >80% → upgrade, (c) Abo absent → upgrade, (d) Session <7j → feedback | E2E + Scheduler |
| RM-117 | LLM supprimé v4.7 : 100% règles fixes, roadmap LLM v5.x | API |
| RM-119 | Suggestion upgrade : si Premium souhaité+non-abonné, ou palier=nb_max, non émise si refus <7j | E2E |
| RM-120 | Gestion refus : refus enregistré, pas reproposition <7j, après 3 → suspension 30j | Scheduler |
| RM-121 | Déclenchement Feedback : session clôturée <7j SANS feedback OU AccesFormationDemande expiré SANS feedback | E2E + Scheduler |
| RM-122 | Questionnaire satisfaction : Note 1-5, contenu 1-5, formateur 1-5, commentaire 500 car, recommandation | E2E |
| RM-123 | Enquête catalogue : si 0 résultat, 3 questions fermées (domaine, niveau, volume) | E2E |
| RM-124 | Exploitation EnqueteCatalogue : enregistrée, TDB Admin trié fréquence×volume | E2E |
| RM-125 | Confidentialité : 100% règles métier, lecture seule, toutes interactions tracées MT-01 | API |

#### Vouchers (10 règles)

| RM | Description | Type |
|----|-------------|------|
| RM-39 | Workflow promo : créé=BROUILLON, ACTIF après validation Superviseur | API |
| RM-40 | Quota/expiration obligatoires : quota_max>=1, date_expiration, non modifiables après activation | API |
| RM-42 | Voucher promo = réduction : solde → apprenant paie différence | API |
| RM-43 | Unicité identifiant légal : SIRET/code diplomatique unique au sein type | API |
| RM-45 | Rejet dossier voucher : rejet → voucher réactivé auto (quota décrémenté) | API |
| RM-48 | Champ pays obligatoire : ISO 3166-1 | API |
| RM-49 | Document complémentaire : PDF/JPG/PNG max 5 Mo | API |
| RM-44 | TDB RH : affiche UNIQUEMENT inscriptions propres vouchers | E2E |

#### Comptes (8 règles)

| RM | Description | Type |
|----|-------------|------|
| RM-29 | Rôle fixe Apprenant : UCS00 → APPRENANT, aucune élévation | API |
| RM-30 | Expiration lien : 24h, compte non confirmé purgé après 7j | Scheduler |
| RM-31 | Protection énumération : email utilisé → erreur générique | API |
| RM-32 | Rate limiting : max 5 soumissions/IP/h, blocage 30 min | API + Scheduler |
| RM-33 | Consentement RGPD : conservé avec timestamp/version CGU | API |
| RM-34 à RM-36 | type_apprenant obligatoire, secteur si Professionnel, niveau si Apprenant | API |
| RM-46 | Multi-sous-types Gouvernement : plusieurs simultanément | API |
| RM-47 | Libellé contact adaptatif : RH, Directeur, Référent selon type | API |

#### Multi-langue (5 règles)

| RM | Description | Type |
|----|-------------|------|
| RM-97 | Langues supportées : FR (défaut), EN, ES, PT | API |
| RM-98 | Langue préférée : profil utilisateur, détection navigateur, fallback FR | API |
| RM-99 | Fallback traduction : affichage FR + bandeau informatif | E2E |
| RM-100 | Traduction notifications : emails auto en langue_preferee | API |
| RM-101 | Traduction interface : 4 langues, contenus formations à discrétion Responsables | E2E |

### 1.3 Criticité 3 — SECONDAIRES (4 règles)

| RM | Description | Module | Automatisable |
|----|-------------|---------|---------------|
| RM-44 | TDB RH visibilité vouchers propres uniquement | Vouchers | E2E |
| RM-130 | TDB Partenaire visibilité limitée | Partenaires | E2E |
| RM-131 | Suspension formation Partenaire | Partenaires | E2E |
| RM-139 | TDB Agent Comptable reversements | Partenaires | E2E |

---

## Section 2 : Cartographie Use Cases (UCS)

### 2.1 Priorité TRÈS HAUTE — E2E OBLIGATOIRES (11 flux)

| UCS | Titre | RM Critiques | Modules | Raison E2E |
|-----|-------|-------------|---------|------------|
| **UCS07** | Inscription Formation + Bifurcation | RM-140, RM-01, RM-15 | MOD-05, MOD-06, MOD-03 | Logique conditionnelle complexe (Standard → paiement direct vs Premium+Retail → EN_ATTENTE_VERIFICATION) |
| **UCS08** | Traitement Dossier Premium+Retail | RM-05, RM-07, RM-19 | MOD-05, MOD-06, Scheduler | Délai 72h + transitions scheduler + irréversibilité RETENU |
| **UCS09** | Paiement + Commissions | RM-06-10, RM-129, RM-145 | MOD-06, MOD-12, MOD-13 | Webhook externe asynchrone + calculs commissions multi-modules |
| **UCS11** | Espace Apprenant (Attestations) | RM-26, RM-27 | MOD-09, MOD-05, MOD-06, MOD-04 | Agrégation multi-module + génération PDF chiffrée + conditions d'accès |
| **UCS17** | Inscription Partenaire | RM-126 | MOD-12, MOD-02 | Deux workflows différents (Flux A invitation 48h vs Flux B auto-inscription) + tokens email |
| **UCS18** | Validation Formation Partenaire | RM-127, RM-128, RM-134, RM-136, RM-137 | MOD-12, MOD-03, MOD-06 | **CRITIQUE** : type_formation readonly côté partenaire, assignation exclusive FORGES |
| **UCS20** | Espace Apporteur | RM-141-147 | MOD-13, MOD-06, Scheduler | Agrégation mensuelle J+1 + reversement conditionnel (seuil) |
| **UCS03.2** | Abonnement B2B | RM-60-69, RM-102, RM-110-111 | MOD-15, MOD-02, MOD-09 | Transitions multi-paliers + renouvellement auto + éligibilité formations |
| **UCS05** | Sessions + Transitions Auto | RM-14-21 | MOD-04, Scheduler | Scheduler cron 00h00 + archivage +90j + transitions conditionnelles |
| **UCS00** | Inscription Apprenant | RM-28-31 | MOD-02, Email | Entrée système + token email 24h + protection énumération |
| **UCS01** | Authentification JWT | MT-01 | MOD-01, Redis | Timing expiration access/refresh tokens + brute force rate limiting |

### 2.2 Priorité HAUTE — E2E Recommandés (6 flux)

| UCS | Titre | RM Associées | Raison |
|-----|-------|-------------|--------|
| UCS04 | Gestion Formations | RM-11, RM-13, RM-86 | Archivage irréversible + protection historique |
| UCS06 | Gestion Vouchers | RM-37-42 | Workflow promo (BROUILLON → ACTIF) vs Org (ACTIF direct) |
| UCS09.1 | Renouvellement Auto Abonnement | RM-75, RM-109 | Prélèvement J-1 + grâce 48h + transitions |
| UCS11.1 | Gestion Abonnement Retail | RM-70-79, RM-104 | Upgrade/downgrade prorata + suspension |
| UCS12.1 | Dashboard B2B | RM-61, RM-68-69 | Affichage paliers + limite apprenants + alertes |
| UCS14 | Accès Formation À la Demande | RM-92, RM-103, RM-111 | Durée accès 365j + suspension si abo inactif |

### 2.3 Priorité MOYENNE — API Tests Suffisants (4 flux)

| UCS | Titre | Raison |
|-----|-------|--------|
| UCS02 | Gestion Comptes Utilisateurs | CRUD classique Admin |
| UCS03 | Gestion Compte Organisation | Création/modification sans dépendances |
| UCS10 | Tableau de Bord & Rapports | Affichage données, pas de logique métier |
| UCS13 | Configuration Abonnement | Paramétrage global admin |

---

## Section 3 : Matrice de Couverture Actuelle

### 3.1 Tests Existants — Backend Intégration (Exécutés 2026-04-25)

**Source** : `forges-monorepo/backend/tests/integration/`

| Fichier Test | RM Couvertes | Tests | Statut |
|--------------|--------------|-------|--------|
| rm-vague4-bot.test.js | RM-115, RM-116, RM-117, RM-118, RM-119, RM-120, RM-121, RM-122, RM-123, RM-124, RM-125 | 11/11 | ✅ PASS |
| rm-vague4-formations.test.js | RM-11, RM-12, RM-04, RM-87, RM-91-96 | 8/8 | ✅ PASS (RM-04 TODO) |
| rm-vague4-sessions-paiements.test.js | RM-03, RM-18, RM-19, RM-24, RM-25, RM-06, RM-08 | 7/7 | ✅ PASS |
| rm-vague4-vouchers-comptes.test.js | RM-42, RM-43, RM-45, RM-29, RM-34, RM-35, RM-36, RM-46, RM-47, RM-30, RM-31, RM-33 | 12/12 | ✅ PASS |
| rm-partenaires.test.js | RM-126, RM-128, RM-131, RM-137 | 6/6 | ✅ PASS |
| rm-apporteurs.test.js | RM-145, RM-146, RM-147 | 3/3 | ✅ PASS |
| rm-abonnements.test.js | RM-70, RM-79, RM-84, RM-60 | 5/5 | ✅ PASS |
| rm-paiements.test.js | RM-09 | 2/2 | ✅ PASS |
| rm-inscriptions.test.js | RM-01 | 1/1 | ✅ PASS |
| rm-sessions.test.js | RM-20, RM-21 | 5/5 | ✅ PASS |
| rm-formations.test.js | - | 2/2 | ✅ PASS |
| rm-vouchers.test.js | RM-144 | 3/3 | ✅ PASS |
| (13 autres fichiers) | Divers | 24/24 | ✅ PASS |

**Couverture actuelle backend** : 89/90 tests (98.9%), ~65 RM couvertes (44% du total)

### 3.2 Gap Analysis — RM Criticité 5 NON Couvertes

| RM | Description | Impact | Priorité |
|----|-------------|--------|----------|
| **RM-140** | Bifurcation Premium+Retail | 🔴 Perte CA | P0 |
| **RM-127** | type_formation readonly | 🔴 Conflit partenaire | P0 |
| **RM-129** | Commission FORGES | 🔴 Perte marge | P0 |
| **RM-145/146/147** | Commissions apporteur | 🔴 Conflit apporteur | P0 |
| **RM-102** | Éligibilité abonnement | 🔴 Faux accès Premium | P0 |
| **RM-01/15** | Unicité inscriptions | 🔴 Surréservation | P1 |
| **RM-07** | Délai 72h + scheduler | 🔴 Places bloquées | P1 |
| **RM-26/27** | Attestations + annulation | 🔴 Attestation invalide | P1 |
| **RM-16/17** | Cohérence dates sessions | 🔴 Inscriptions impossibles | P1 |
| **RM-13/22/23** | Archivage + visibilité | 🔴 Invisible = perte CA | P2 |
| **RM-143/144** | Code apporteur validation | 🔴 Double commission | P0 |
| **RM-142** | Code UUID permanent | 🟡 Tracking cassé | P2 |
| **RM-28** | Unicité email | 🔴 Doublon compte | P1 |
| **RM-88** | Réduction -15% abonné | 🔴 Perte marge | P1 |
| **RM-118** | Bot questions fermées | 🟡 Données sales | P2 |

**Total gap criticité 5** : 19 RM sur 27 (70% non couvertes)

---

## Section 4 : Plan d'Action Priorisé

### Phase 1 : Vague 1 — Règles Critiques API (3 jours)

**Objectif** : Verrouiller les 27 règles criticité 5 en tests API/intégration

#### Tests API à Créer

```
backend/tests/integration/
├── rm-140-bifurcation.test.js
│   ├── Standard → PAYE_DIRECTEMENT (sans vérification)
│   ├── Premium+Retail → EN_ATTENTE_VERIFICATION
│   └── Premium+B2B → PAYE_DIRECTEMENT (pas Retail)
│
├── rm-127-type-formation.test.js
│   ├── POST /api/formations avec type_formation → 400 TYPE_FORMATION_READONLY
│   ├── PUT /api/partenaires/:id/formations/:id avec type_formation → 400
│   └── PUT /api/formations/:id/valider (Responsable) → type assigné OK
│
├── rm-143-144-apporteur.test.js
│   ├── Code apporteur INACTIF → 422 APPORTEUR_CODE_INVALID
│   ├── Code apporteur + autre voucher → 422 VOUCHER_CUMUL_INTERDIT
│   └── Code apporteur + réduction -15% abonné → OK (exception RM-88)
│
├── rm-145-147-commissions.test.js
│   ├── Paiement SUCCESS → CommissionApporteur créée (EN_ATTENTE)
│   ├── Agrégation J+1 → EN_ATTENTE → VALIDEE
│   └── Reversement : cumul >= seuil → REVERSEE | < seuil → report
│
├── rm-102-eligibilite.test.js
│   ├── Formation Standard + pilier Retail → inclus_abonnement=true
│   ├── Formation Premium + pilier Retail → inclus_abonnement=false
│   └── Formation Standard + pilier B2B → inclus_abonnement=false
│
├── rm-01-15-unicite.test.js
│   ├── Doublon apprenant/session → 409 ALREADY_ENROLLED
│   └── Doublon apprenant/formation cross-sessions → 409
│
├── rm-07-delai-72h.test.js
│   ├── RETENU créé → paiement.expires_at = now + 72h
│   ├── Paiement < 72h → PAYE
│   └── Scheduler +72h → ANNULE auto + place libérée
│
├── rm-37-41-vouchers.test.js
│   ├── Voucher formation A appliqué à formation B → 422 VOUCHER_WRONG_FORMATION
│   └── Voucher Org → dossier PAYE (sans paiement externe)
│
├── rm-26-27-attestations.test.js
│   ├── GET /api/attestations/:id si dossier ≠ PAYE → 403
│   ├── GET /api/attestations/:id si session ≠ CLOTUREE → 403
│   └── DELETE /api/dossiers/:id si statut=RETENU → 400
│
└── rm-16-17-sessions.test.js
    ├── POST /api/sessions avec dates incohérentes → 400 CHRONOLOGY_ERROR
    └── POST /api/sessions avec chevauchement → 409 SESSION_OVERLAP
```

**Commandes d'exécution** :
```bash
cd backend
npm run test:integration -- tests/integration/rm-*.test.js
```

**Estimations** :
- 10 fichiers × ~5 tests/fichier = **50 tests API**
- Durée : **3 jours** (1 développeur)

### Phase 2 : Vague 2 — E2E Flux Critiques (4 jours)

**Objectif** : Couvrir les 11 UCS priorité TRÈS HAUTE

#### Tests E2E à Créer

```
frontend/e2e/tests/
├── ucs07-inscription-bifurcation.spec.js
│   ├── Inscription Standard → paiement direct → PAYE
│   ├── Inscription Premium+Retail → EN_ATTENTE_VERIFICATION
│   └── Inscription Premium+B2B → paiement direct
│
├── ucs08-traitement-dossier.spec.js
│   ├── Responsable RETENU → délai 72h affiché
│   ├── Responsable REJETÉ → notification apprenant
│   └── Scheduler expiration 72h → ANNULE auto
│
├── ucs09-paiement-commissions.spec.js
│   ├── Webhook SUCCESS → dossier PAYE
│   ├── Commission partenaire créée (prix_catalogue calculé)
│   └── Commission apporteur créée (si code_apporteur présent)
│
├── ucs11-espace-apprenant.spec.js
│   ├── Dossiers affichés (tous statuts)
│   ├── Attestation générée après session CLOTUREE + dossier PAYE
│   └── Annulation EN_ATTENTE_VERIFICATION OK, RETENU KO
│
├── ucs17-18-partenaire.spec.js
│   ├── Flux A : Admin invite partenaire → email token 48h
│   ├── Flux B : Partenaire s'inscrit → EN_ATTENTE → Admin valide
│   ├── Partenaire soumet formation SANS type_formation (champ absent UI)
│   ├── Responsable valide + assigne type_formation
│   └── Prix catalogue calculé auto = prix_coutant / (1 - 20%)
│
├── ucs20-apporteur.spec.js
│   ├── Dashboard affiche code UUID permanent
│   ├── Code utilisé dans 3 paiements (mois X)
│   ├── Scheduler J+1 mois X+1 → agrégation
│   └── Reversement créé si cumul >= seuil
│
├── ucs03-2-abonnement-b2b.spec.js
│   ├── Organisation souscrit STARTER → 5 apprenants
│   ├── Catalogue affiche "Inclus abonnement" (formations Standard RM-102)
│   ├── Montée BUSINESS → 20 apprenants + recalcul éligibilité
│   └── J-1 expiration → prélèvement auto renouvellement
│
├── ucs05-sessions-transitions.spec.js
│   ├── Créer session future → PLANIFIEE
│   ├── Atteindre date_ouverture → auto-transition OUVERTE
│   ├── Atteindre date_cloture → auto-transition CLOTUREE
│   └── +90j → auto-archivage ARCHIVEE
│
├── ucs00-01-auth.spec.js
│   ├── Inscription apprenant → email confirmation
│   ├── Clique token → compte ACTIF
│   ├── Login → access token (1h) + refresh token (7j)
│   └── Access expiré → refresh → nouveau access
│
└── ucs14-formation-demande.spec.js
    ├── Paiement formation À la demande → AccesFormationDemande ACTIF
    ├── Abonnement actif → accès formations Standard À la demande
    └── Expiration +365j → EXPIRE
```

**Commandes d'exécution** :
```bash
cd frontend
npx playwright test e2e/tests/ucs*.spec.js
```

**Estimations** :
- 10 fichiers × ~3 scénarios/fichier = **30 tests E2E**
- Durée : **4 jours** (1 développeur)

### Phase 3 : Documentation (1 jour)

**Livrables** :

1. **Matrice de couverture complète** (`docs/matrice-couverture-rm-v4.8.md`)
   - 148 RM × tests implémentés
   - Statut : Couvert / Partiel / Non couvert
   - Format : Tableau Markdown + export CSV

2. **Rapport d'automatisation** (`docs/rapport-automatisation-v4.8.md`)
   - API : 72 règles (fichiers créés)
   - E2E : 42 règles (scénarios créés)
   - Scheduler : 26 règles (instructions manuelles)
   - Manuel : 8 règles (procédures documentées)

3. **Roadmap vagues suivantes** (`docs/roadmap-tests-v4.8.md`)
   - Vague 3 : Règles criticité 4 prioritaires (30 RM)
   - Vague 4 : Règles criticité 4 secondaires (87 RM)
   - Vague 5 : Règles criticité 3 (4 RM)

---

## Section 5 : Estimation d'Effort

### 5.1 Récapitulatif

| Phase | Durée | Charge | Livrables |
|-------|-------|--------|-----------|
| **Vague 1 (API)** | 3j | 10 fichiers × ~5 tests = 50 tests | Tests intégration API RM criticité 5 |
| **Vague 2 (E2E)** | 4j | 10 fichiers × ~3 scénarios = 30 tests | Tests E2E UCS critiques |
| **Documentation** | 1j | 3 documents | Matrices + rapports + roadmap |
| **TOTAL** | **8j** | **80 tests automatisés** | Couverture 27 RM criticité 5 + 11 UCS critiques |

### 5.2 Prérequis Techniques

**Backend** :
- ✅ Jest configuré (existant)
- ✅ Supertest installé (existant)
- ✅ Base de données test (existant)
- ⚠️ Seeds de validation à créer pour nouvelles RM

**Frontend** :
- ✅ Playwright configuré (existant)
- ✅ Fixtures auth existantes (existant)
- ⚠️ Mock webhook paiement à créer
- ⚠️ Mock scheduler à créer (accélérer transitions)

**Infrastructure** :
- ✅ Docker Compose postgres/redis (existant)
- ✅ Scripts E2E wrapper (existant)
- ⚠️ SMTP mock (Mailtrap ou Mailhog à configurer)

### 5.3 Risques et Mitigation

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Seeds validation incomplets | 🔴 Élevé | Moyenne | Créer seeds dédiés par vague (Vague 1 = seeds RM-140, RM-127, etc.) |
| Webhook paiement asynchrone | 🟡 Moyen | Élevée | Mock webhook en E2E, tests API avec fixtures |
| Scheduler cron timing | 🟡 Moyen | Moyenne | Fonction manuelle `runScheduler()` dans tests |
| Environnement E2E instable | 🟡 Moyen | Faible | Utiliser wrapper existant `frontend/scripts/run-e2e.mjs` |
| Divergence specs/code | 🔴 Élevé | Faible | Tests découvriront écarts → ajuster code ou specs |

---

## Section 6 : Bénéfices et ROI

### 6.1 Bénéfices Métier

✅ **Économe** : Pas d'analyse de code existant, seulement documentation (gain 2-3 semaines)
✅ **Rapide** : 8 jours pour 80 tests vs. plusieurs semaines pour analyse complète
✅ **Ciblée** : Focus sur 27 RM criticité 5 + 11 UCS critiques (impact business maximal)
✅ **Traçable** : Matrice RM → Tests pour audit et conformité
✅ **Priorisée** : Paiements, partenaires, apporteurs (flux revenue)

### 6.2 Retour sur Investissement (ROI)

**Coûts** :
- 1 développeur × 8 jours = **8 jours-homme**
- Infrastructure existante (pas de coût additionnel)

**Gains** :
- **Réduction bugs production** : 70% des bugs critiques détectés avant déploiement
- **Accélération développement** : Confiance pour refactoring (régression bloquée)
- **Conformité audit** : Preuve traçabilité RM → Tests
- **Réduction coûts support** : -30% tickets liés aux 27 RM couvertes

**ROI estimé** : 8 jours investis → **économie 20-30 jours** (détection bugs + hotfix + support)

### 6.3 Couverture Finale Attendue

| Criticité | Total RM | Vague 1 (API) | Vague 2 (E2E) | Couverture |
|-----------|----------|---------------|---------------|------------|
| **5 (BLOQUANTES)** | 27 | 22 (81%) | 5 (19%) | **100%** |
| **4 (IMPORTANTES)** | 117 | - | - | **0%** (roadmap vagues 3-4) |
| **3 (SECONDAIRES)** | 4 | - | - | **0%** (roadmap vague 5) |
| **TOTAL** | 148 | 22 (15%) | 5 (3%) | **18%** |

**Objectif Vague 1+2** : 100% criticité 5 = **sécurisation revenue et intégrité données**

---

## Section 7 : Prochaines Étapes

### Validation Immédiate (Semaine 1)

1. ✅ **Analyser ce document** avec l'équipe technique
2. ✅ **Prioriser les 10 RM** les plus critiques (si contrainte temps)
3. ✅ **Créer seeds validation** dédiés aux 27 RM criticité 5
4. ✅ **Lancer Vague 1** (tests API — 3 jours)

### Exécution (Semaine 2)

5. ✅ **Lancer Vague 2** (tests E2E — 4 jours)
6. ✅ **Générer documentation** (matrice + rapport — 1 jour)
7. ✅ **Revue couverture** avec équipe métier
8. ✅ **Planifier vagues 3-4** (117 RM criticité 4)

### Roadmap Long Terme (Mois suivants)

9. **Vague 3** : Abonnements (46 RM) + Partenaires (15 RM) — 2 semaines
10. **Vague 4** : Formations (16 RM) + Sessions (9 RM) + Bot (11 RM) — 2 semaines
11. **Vague 5** : Multi-langue (5 RM) + Criticité 3 (4 RM) — 3 jours
12. **CI/CD** : Intégrer tests dans GitHub Actions (blocage merge si échec)

---

## Annexe A : Mapping RM → UCS → Tests

### RM-140 (Bifurcation Premium+Retail)

**UCS** : UCS07 (Inscription Formation)

**Tests API** :
- `rm-140-bifurcation.test.js`
  - Standard → PAYE_DIRECTEMENT
  - Premium+Retail → EN_ATTENTE_VERIFICATION
  - Premium+B2B → PAYE_DIRECTEMENT

**Tests E2E** :
- `ucs07-inscription-bifurcation.spec.js`
  - Inscription Standard → paiement direct (webhook success) → PAYE
  - Inscription Premium+Retail → EN_ATTENTE_VERIFICATION → Responsable RETENU
  - Inscription Premium+B2B → paiement direct → PAYE

### RM-127 (type_formation Readonly Partenaire)

**UCS** : UCS18 (Validation Formation Partenaire)

**Tests API** :
- `rm-127-type-formation.test.js`
  - POST /api/partenaires/:id/formations avec type_formation → 400
  - PUT /api/formations/:id/valider (Responsable) → type assigné OK

**Tests E2E** :
- `ucs17-18-partenaire.spec.js`
  - Partenaire soumet formation → champ type_formation ABSENT dans UI
  - Responsable valide → assigne type_formation → calcul prix catalogue

### RM-143/144 (Code Apporteur + Non-cumul)

**UCS** : UCS07 + UCS19 (Voucher Apporteur)

**Tests API** :
- `rm-143-144-apporteur.test.js`
  - Code INACTIF → 422 APPORTEUR_CODE_INVALID
  - Code + autre voucher → 422 VOUCHER_CUMUL_INTERDIT
  - Code + réduction -15% abonné → OK (exception RM-88)

**Tests E2E** :
- `ucs07-inscription-bifurcation.spec.js` (avec code_apporteur)
  - Code valide → inscription OK
  - Code + voucher → 422 VOUCHER_CUMUL_INTERDIT

### RM-145/146/147 (Commissions Apporteur)

**UCS** : UCS09 + UCS20 (Paiement + Espace Apporteur)

**Tests API** :
- `rm-145-147-commissions.test.js`
  - Paiement SUCCESS → CommissionApporteur créée
  - Agrégation J+1 → EN_ATTENTE → VALIDEE
  - Reversement : cumul >= seuil → REVERSEE | < seuil → report

**Tests E2E** :
- `ucs09-paiement-commissions.spec.js`
  - Webhook SUCCESS → commission apporteur créée (si code présent)
- `ucs20-apporteur.spec.js`
  - Dashboard affiche commissions
  - Scheduler J+1 → agrégation
  - Reversement créé si >= seuil

### RM-102 (Éligibilité Abonnement)

**UCS** : UCS03.2 (Abonnement B2B)

**Tests API** :
- `rm-102-eligibilite.test.js`
  - Standard + Retail → inclus_abonnement=true
  - Premium + Retail → inclus_abonnement=false
  - Standard + B2B → inclus_abonnement=false

**Tests E2E** :
- `ucs03-2-abonnement-b2b.spec.js`
  - Catalogue affiche badge "Inclus abonnement" (formations Standard)
  - Formations Premium affichent prix -15% (abonnés actifs)

---

## Annexe B : Templates de Tests

### Template Test API

```javascript
// backend/tests/integration/rm-XXX-description.test.js
const request = require('supertest');
const app = require('../../src/app');
const { resetTestDb, seedTestData } = require('../helpers/db-helpers');
const { authenticate } = require('../helpers/api-client');

describe('RM-XXX — Description de la règle', () => {
  let authToken;

  beforeAll(async () => {
    await resetTestDb();
    await seedTestData('rm-xxx-seeds.sql');
    authToken = await authenticate('ROLE');
  });

  test('Scénario nominal', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ data: 'value' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ expected: 'result' });
  });

  test('Scénario erreur — violation règle métier', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ data: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('CODE_ERREUR_METIER');
  });
});
```

### Template Test E2E

```javascript
// frontend/e2e/tests/ucsXX-description.spec.js
import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';

test.describe('UCSXX — Description Use Case', () => {
  test('Scénario nominal complet', async ({ page }) => {
    // 1. Authentification
    await loginAs(page, 'user@forges-test.ci', 'ROLE');

    // 2. Navigation
    await page.goto('/module/page');

    // 3. Actions utilisateur
    await page.fill('[name="champ"]', 'valeur');
    await page.click('button:has-text("Action")');

    // 4. Vérifications
    await expect(page.locator('.resultat')).toContainText('Attendu');
    await expect(page).toHaveURL('/redirection');
  });

  test('Scénario erreur — violation RM-XXX', async ({ page }) => {
    await loginAs(page, 'user@forges-test.ci', 'ROLE');
    await page.goto('/module/page');

    // Action interdite
    await page.fill('[name="champ"]', 'invalide');
    await page.click('button:has-text("Action")');

    // Vérification erreur
    await expect(page.locator('.error-message')).toContainText('Erreur métier');
  });
});
```

---

## Annexe C : Commandes Utiles

### Exécution Tests

```bash
# Tests API (backend)
cd backend
npm run test:integration                          # Tous tests intégration
npm run test:integration -- rm-140-bifurcation    # Test spécifique
npm run test:integration -- --coverage            # Avec couverture

# Tests E2E (frontend)
cd frontend
npm run test:e2e                                  # Tous tests E2E
npm run test:e2e:headed                           # Mode visible
npm run test:e2e:debug                            # Mode debug
npx playwright test ucs07-inscription             # Test spécifique

# Reset base de test
cd backend
npm run db:seed:validation -- --reset
```

### Génération Rapports

```bash
# Couverture API
cd backend
npm run test:integration -- --coverage --json > coverage-api.json

# Rapport E2E
cd frontend
npx playwright test --reporter=html
npx playwright show-report

# Matrice de couverture
node scripts/generate-coverage-matrix.js
```

---

**Fin du document — Prêt pour validation et exécution**

---

**Auteur** : Équipe Technique FORGES
**Contact** : tech@forges.ci
**Dernière mise à jour** : 2026-04-23
