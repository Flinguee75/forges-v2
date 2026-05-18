# Organisation bugs architecture implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `improve-codebase-architecture` for the first design pass, then use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement by stream. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger en simultané les bugs côté Organisation relevés dans `docs/validation-tests/ecarts_organisation_v48.md` en stabilisant les Modules métier qui portent les contrats Organisation: dashboard, abonnements, vouchers, profil, inscriptions, paiements et quota B2B.

**Architecture:** Travailler par streams parallèles avec des ownerships de fichiers distincts. Chaque stream doit transformer un Module shallow ou ambigu en Module plus deep, avec une interface testable et stable. Les corrections doivent privilégier la locality des règles Organisation plutôt qu'ajouter des normalisations frontend supplémentaires.

**Tech Stack:** Node.js 20, Express, Prisma, Jest côté backend; React 19, Vite 8, Vitest côté frontend.

---

## Branch

Branche active:

```bash
codex/organisation-bugs-architecture
```

Base:

```bash
forges-v2/develop
```

---

## Workstreams parallèles

### Stream A — Contrat dashboard Organisation

**Status:** Done — backend/frontend tests ciblés verts.

**Owner:** backend dashboard Organisation + tests frontend dashboard.

**Files:**
- Modify: `forges-monorepo/backend/src/modules/espace-organisation/organisation-dashboard.service.ts`
- Modify: `forges-monorepo/backend/src/modules/espace-organisation/espace-organisation.repository.ts`
- Modify: `forges-monorepo/backend/src/modules/espace-organisation/__tests__/organisation-dashboard.service.test.ts`
- Modify: `forges-monorepo/backend/src/modules/espace-organisation/__tests__/espace-organisation.repository.test.ts`
- Modify: `forges-monorepo/frontend/src/api/espace-organisation.api.js`
- Modify: `forges-monorepo/frontend/src/pages/organisation/__tests__/OrgDashboard.test.jsx`

**Problem:** le dashboard Organisation affiche des zéros ou des blocs vides parce que le contrat backend retourne seulement `organisation` + `stats`, tandis que le frontend attend aussi des listes récentes et une synthèse abonnement. Les stats mélangent dossiers rattachés par `apprenant.organisation_id` et dossiers initiés par `organisation_inscriptrice_id`.

**Target interface:**
- `getDashboard(organisationId)` retourne toujours:
  - `organisation`
  - `stats`
  - `recent_inscriptions`
  - `recent_paiements`
  - `subscription_summary`
- Les stats incluent explicitement les dossiers financés ou initiés par l'organisation.

**Steps:**
- [x] Ajouter un test backend qui reproduit les zéros observés quand les dossiers sont reliés par `organisation_inscriptrice_id` mais pas uniquement via `apprenant.organisation_id`.
- [x] Corriger `getStatsOrganisation()` pour compter les dossiers Organisation via un prédicat partagé: apprenant rattaché OU organisation inscriptrice.
- [x] Ajouter `recent_inscriptions` et `recent_paiements` au retour backend, avec forme déjà consommable par le normaliseur frontend.
- [x] Réduire `normalizeDashboard()` côté frontend: il doit normaliser, pas inventer des champs absents.
- [x] Vérifier `OrgDashboard.test.jsx` avec un contrat backend réaliste.

**Commands:**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
npx jest --no-coverage --testPathPattern="organisation-dashboard|espace-organisation.repository" --runInBand
```

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend" && \
npx vitest run src/pages/organisation/__tests__/OrgDashboard.test.jsx
```

---

### Stream B — Voucher Organisation comme Module profond

**Status:** Done — backend/frontend tests ciblés verts.

**Owner:** backend vouchers Organisation + page vouchers.

**Files:**
- Modify: `forges-monorepo/backend/src/modules/espace-organisation/organisation-dashboard.service.ts`
- Modify: `forges-monorepo/backend/src/modules/espace-organisation/espace-organisation.repository.ts`
- Modify: `forges-monorepo/backend/src/modules/vouchers/voucher.repository.ts`
- Modify: `forges-monorepo/backend/src/modules/vouchers/voucher.service.ts`
- Modify: `forges-monorepo/backend/src/modules/espace-organisation/__tests__/organisation-dashboard.service.test.ts`
- Modify: `forges-monorepo/frontend/src/api/espace-organisation.api.js`
- Modify: `forges-monorepo/frontend/src/pages/organisation/__tests__/VouchersPage.test.jsx`

**Problem:** l'interface "voucher Organisation" est ambiguë: `commanderVouchers()` crée des `VoucherApporteur` de type `PROMOTIONNEL`, alors que l'inscription par voucher Organisation valide `VoucherOrganisation`. La lecture fusionne les deux modèles et la pagination/filtre statut du frontend n'est pas appliquée.

**Target interface:**
- Les vouchers achetés par Organisation sont des `VoucherOrganisation`.
- La lecture Organisation retourne `{ vouchers, total, page, limit }`.
- La commande Organisation crée des vouchers avec `quota_max`, `quota_utilise`, `statut`, `formation`, `source`.

**Steps:**
- [x] Ajouter un test qui échoue si `commanderVouchers()` crée un `VoucherApporteur`.
- [x] Modifier `commanderVouchers()` pour créer des `VoucherOrganisation`.
- [x] Ajouter pagination et filtres `statut`, `formation_id`, `page`, `limit` à `findVouchers()`.
- [x] Mettre `normalizeVouchers()` en cohérence avec le contrat paginé.
- [x] Vérifier que les badges et la barre de quota utilisent la charte statut vouchers: `ACTIF=success`, `EPUISE=warning`, `EXPIRE/REFUSE=danger`, `BROUILLON=gray`.

**Commands:**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
npx jest --no-coverage --testPathPattern="organisation-dashboard|voucher" --runInBand
```

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend" && \
npx vitest run src/pages/organisation/__tests__/VouchersPage.test.jsx src/api/__tests__/espace-organisation.api.test.js
```

---

### Stream C — Profil Organisation non destructif

**Status:** Done — backend/frontend tests ciblés verts.

**Owner:** profil backend + page profil.

**Files:**
- Modify: `forges-monorepo/backend/src/modules/espace-organisation/organisation-dashboard.service.ts`
- Modify: `forges-monorepo/backend/src/modules/espace-organisation/espace-organisation.dto.ts`
- Modify: `forges-monorepo/backend/src/modules/espace-organisation/__tests__/organisation-dashboard.service.test.ts`
- Modify: `forges-monorepo/frontend/src/api/espace-organisation.api.js`
- Modify: `forges-monorepo/frontend/src/pages/organisation/ProfilOrganisationPage.jsx`
- Modify: `forges-monorepo/frontend/src/pages/organisation/__tests__/ProfilOrganisationPage.test.jsx`

**Problem:** le frontend manipule `nom_legal`, `email_contact`, `telephone_contact`, `nom_referent`, `prenom_referent`, mais le backend ne lit/écrit qu'une partie du modèle Prisma. La sauvegarde peut vider des champs non supportés par le contrat.

**Target interface:**
- Le Module profil Organisation expose une interface patch non destructive.
- Les champs non présents dans Prisma ne sont pas envoyés comme s'ils étaient persistables.
- `contact_referent` reste stable, sans split fragile qui perd les prénoms composés.

**Steps:**
- [x] Écrire un test frontend qui charge un profil complet, sauvegarde une modification minimale, puis vérifie que les champs non modifiés restent affichés.
- [x] Écrire un test backend `updateMonProfil()` qui ignore les champs `undefined` au lieu de les écrire.
- [x] Aligner `normalizeOrganisationProfile()` et `serializeOrganisationProfile()` sur les vrais champs Prisma.
- [x] Remplacer le split naïf de `contact_referent` par une représentation UI qui ne prétend pas persister deux champs séparés si le backend n'en a qu'un.
- [x] Ajouter les erreurs contrôlées pour email dupliqué si Prisma remonte une contrainte unique.

**Commands:**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
npx jest --no-coverage --testPathPattern="organisation-dashboard" --runInBand
```

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend" && \
npx vitest run src/pages/organisation/__tests__/ProfilOrganisationPage.test.jsx
```

---

### Stream D — Prix Organisation/B2B et unité XOF/centimes

**Status:** Done — backend/frontend tests ciblés verts.

**Owner:** abonnements Organisation/B2B + utilitaires prix frontend.

**Files:**
- Modify: `forges-monorepo/backend/src/modules/abonnements/organisation/abonnement-organisation.service.ts`
- Modify: `forges-monorepo/backend/src/modules/abonnements/b2b/abonnement-b2b.service.ts`
- Modify: `forges-monorepo/backend/src/modules/abonnements/__tests__/abonnement-organisation.service.test.ts`
- Modify: `forges-monorepo/backend/src/modules/abonnements/__tests__/abonnement-b2b.service.test.ts`
- Modify: `forges-monorepo/frontend/src/utils/organisationBilling.js`
- Modify: `forges-monorepo/frontend/src/api/espace-organisation.api.js`
- Modify: `forges-monorepo/frontend/src/pages/organisation/__tests__/MonAbonnementOrg.test.jsx`
- Modify: `forges-monorepo/frontend/src/pages/organisation/__tests__/AbonnementB2B.test.jsx`

**Problem:** les tarifs backend sont en XOF, certaines variables frontend sont en centimes, et `formatFcfa()` divise toujours par 100. Les normaliseurs multiplient parfois les montants par 100 pour compenser. Cette interface est shallow: chaque caller doit connaître l'unité réelle.

**Target interface:**
- Backend: champs monétaires nommés explicitement `*_xof` dans les DTO de lecture Organisation/B2B, ou documentation stricte dans une factory de response.
- Frontend: `formatFcfaFromXof()` pour les montants API Organisation/B2B, `formatFcfaFromCentimes()` seulement pour paiements/dossiers stockés en centimes.
- Les defaults frontend reflètent les env vars AGENTS.md en centimes seulement si le nom indique `_XOF` ou `_CENTIMES`.

**Steps:**
- [x] Ajouter des tests frontend qui verrouillent l'affichage attendu: PRO `150 000 FCFA`, BUSINESS `500 000 FCFA`, pas `1 500 000` ou `5 000`.
- [x] Ajouter des tests backend qui verrouillent les valeurs `TARIFS_ORG` et `PALIERS_B2B` en XOF.
- [x] Introduire deux helpers de formatage explicites dans `organisationBilling.js`.
- [x] Supprimer les conversions implicites `toCentimes()` pour les abonnements Organisation/B2B, ou les isoler derrière un nom explicite.
- [x] Vérifier callback abonnement et affichage abonnement actif.

**Commands:**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
npx jest --no-coverage --testPathPattern="abonnement-organisation|abonnement-b2b" --runInBand
```

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend" && \
npx vitest run src/pages/organisation/__tests__/MonAbonnementOrg.test.jsx src/pages/organisation/__tests__/AbonnementB2B.test.jsx
```

---

### Stream E — Quota B2B et inscription bénéficiaire

**Status:** Done — backend/frontend tests ciblés verts.

**Owner:** quota B2B + inscription Organisation.

**Files:**
- Modify: `forges-monorepo/backend/src/modules/espace-organisation/beneficiaire.service.ts`
- Modify: `forges-monorepo/backend/src/modules/espace-organisation/import-csv.service.ts`
- Modify: `forges-monorepo/backend/src/modules/espace-organisation/__tests__/beneficiaire.service.test.ts`
- Modify: `forges-monorepo/backend/src/modules/espace-organisation/__tests__/import-csv.service.test.ts`
- Modify: `forges-monorepo/frontend/src/pages/organisation/__tests__/GestionApprenantsB2B.test.jsx`
- Modify: `forges-monorepo/frontend/src/pages/organisation/__tests__/InscriptionsPage.test.jsx`

**Problem:** `nb_actifs` est stocké sur `AbonnementB2B`, recalculé par `countActifsB2B()`, incrémenté/décrémenté dans `createMembre()`/`desactiverBeneficiaire()`, et contrôlé différemment dans l'import CSV. L'inscription par Organisation vérifie aussi le quota B2B avec un sens discutable: inscrire un bénéficiaire existant ne devrait pas forcément consommer une place supplémentaire.

**Target interface:**
- Un seul Module quota B2B décide:
  - capacité max
  - nombre actif source of truth
  - `canAddMember`
  - `canImportMembers`
  - `canEnrollBeneficiary`
- `createMembre()` et `importerBeneficiairesCSV()` utilisent la même interface de quota.
- `inscrireBeneficiaire()` ne bloque pas sur quota d'apprenants actifs si le bénéficiaire est déjà rattaché et actif, sauf règle métier explicite contraire.

**Steps:**
- [x] Écrire les tests qui figent la décision métier: création/import consomment le quota, inscription d'un membre existant ne l'incrémente pas.
- [x] Ajouter une transaction ou un check ligne par ligne robuste dans `ImportCSVService` pour éviter de dépasser `nb_max`.
- [x] Retirer les mises à jour `nb_actifs` si le champ stocké n'est pas source of truth, ou l'encapsuler derrière le Module quota.
- [x] Corriger le retour import pour matcher ce que le frontend affiche (`imported`, `linked`, `skipped`) ou corriger le frontend pour lire `succes`, `doublons`, `erreurs`.
- [x] Vérifier les états empty/loading/error côté pages apprenants B2B et inscriptions.

**Commands:**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
npx jest --no-coverage --testPathPattern="beneficiaire|import-csv" --runInBand
```

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend" && \
npx vitest run src/pages/organisation/__tests__/GestionApprenantsB2B.test.jsx src/pages/organisation/__tests__/InscriptionsPage.test.jsx
```

---

## Ordre d'intégration recommandé

- [x] Lancer les cinq streams en parallèle sur des worktrees ou agents distincts, avec les ownerships ci-dessus.
- [x] Intégrer d'abord Stream D, car l'unité des montants influence dashboard, abonnements et paiements.
- [x] Intégrer ensuite Stream A et Stream B, car ils stabilisent les contrats de lecture Organisation.
- [x] Intégrer Stream C après A, pour éviter de mélanger normalisation dashboard et profil.
- [x] Intégrer Stream E en dernier, car il touche le flux d'écriture le plus risqué.

---

## Validation transversale

Après intégration des streams:

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
npm test -- --runInBand --testPathPattern="espace-organisation|abonnement|voucher|inscription"
```

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend" && \
npx vitest run src/api/__tests__/espace-organisation.api.test.js src/pages/organisation/__tests__
```

Puis lancer les E2E ciblés:

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend" && \
npx playwright test e2e/ucs03-organisation-abonnement.spec.js e2e/ucs03-2-abonnement-b2b.spec.js e2e/ucs12-espace-organisation.spec.js e2e/ucs12-1-dashboard-b2b.spec.js e2e/ucs12-2-inscrire-beneficiaire.spec.js
```

---

## Definition of done

- [ ] Le dashboard Organisation affiche nom, budget engagé, vouchers actifs, employés et inscriptions depuis un contrat backend stable.
- [ ] L'abonnement Organisation actif ne propose plus une souscription active incohérente.
- [ ] Les montants Organisation/B2B s'affichent en FCFA avec la bonne unité.
- [ ] Les vouchers Organisation lus, commandés et consommés utilisent un contrat cohérent.
- [ ] Les inscriptions et paiements Organisation incluent les dossiers initiés par l'organisation.
- [ ] Le profil Organisation ne vide pas les champs non modifiés.
- [ ] Les imports et créations d'apprenants B2B respectent le quota sans divergence entre count dynamique et champ stocké.
- [ ] Les tests backend, frontend et E2E ciblés passent.
