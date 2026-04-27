# FORGES v4.8 - Écarts Organisation Observés

Date de constat: 2026-04-23

## Contexte

Comptes utilisés:
- `org@forges.ci`
- mot de passe seedé: `Test@FORGES2026!`

Écran / parcours vérifiés:
- `/organisation/dashboard`
- `/organisation/abonnement`
- `/organisation/b2b`
- `/organisation/vouchers`
- `/organisation/inscriptions`
- `/organisation/paiements`
- `/organisation/profil`

## Écarts observés

### 1. Dashboard organisation
- Le nom de l'organisation n'est pas affiché.
- Le budget engagé est à `0`.
- Les vouchers actifs sont à `0`.
- Le total employés est à `0`.
- Les employés inscrits sont à `0`.

### 2. Abonnement organisation
- L'abonnement `PRO` apparaît bien comme sélectionné.
- Le renouvellement est vide.
- Le bouton de souscription reste visible alors que l'abonnement est déjà actif.
- Le système indique cependant que l'abonnement est déjà actif quand on tente de confirmer.

### 3. Abonnement B2B
- Le palier `BUSINESS` est visible.
- Le montant affiché semble être `5750` pour le palier choisi.
- Le bloc est incomplet visuellement ou fonctionnellement selon le parcours observé.

### 4. Apprenants B2B
- Aucun apprenant B2B n'est affiché.
- À confirmer si c'est un vrai état vide ou un problème de seed / contrat.

### 5. Vouchers
- Aucun voucher n'est affiché côté organisation.

### 6. Inscriptions
- Aucune inscription n'est affichée.

### 7. Paiements
- Aucun paiement n'est affiché.

### 8. Profil organisation
- Le profil organisation n'est pas complet.
- Plusieurs champs semblent vidés.
- La complétion / sauvegarde du profil ne conserve pas correctement les informations.

## Points à vérifier en priorité

1. Contrat du dashboard organisation
- vérifier les vraies sources des stats:
  - nom organisation
  - budget engagé
  - vouchers actifs
  - total employés
  - employés inscrits

2. Contrat abonnement organisation
- vérifier la date de renouvellement / fin d'essai
- vérifier le rendu du statut actif
- vérifier pourquoi le bouton de souscription reste visible

3. Contrat B2B
- vérifier l'affichage du montant annuel
- vérifier le palier affiché
- vérifier la source des apprenants B2B

4. Contrat vouchers / inscriptions / paiements
- vérifier si les zéros observés sont un vrai état vide de seed ou un manque de contrat front/backend

5. Profil organisation
- vérifier le mapping des champs de profil
- vérifier la conservation des données après sauvegarde

## Fichiers à traiter

### Frontend - API
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/api/espace-organisation.api.js`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/api/dashboard.api.js`

### Frontend - Pages organisation
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/OrgDashboard.jsx`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/MonAbonnementOrg.jsx`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/AbonnementB2B.jsx`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/GestionApprenantsB2B.jsx`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/GestionEmployesPage.jsx`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/VouchersPage.jsx`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/InscriptionsPage.jsx`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/PaiementsOrganisationPage.jsx`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/ProfilOrganisationPage.jsx`

### Frontend - Tests liés
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/__tests__/OrgDashboard.test.jsx`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/__tests__/MonAbonnementOrg.test.jsx`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/__tests__/AbonnementB2B.test.jsx`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/__tests__/GestionApprenantsB2B.test.jsx`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/__tests__/GestionEmployesPage.test.jsx`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/__tests__/VouchersPage.test.jsx`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/__tests__/InscriptionsPage.test.jsx`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/__tests__/PaiementsOrganisationPage.test.jsx`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/frontend/src/pages/organisation/__tests__/ProfilOrganisationPage.test.jsx`

### Backend - Modules organisation et abonnements
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/espace-organisation/espace-organisation.routes.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/espace-organisation/espace-organisation.controller.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/espace-organisation/espace-organisation.service.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/espace-organisation/espace-organisation.repository.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/espace-organisation/rapport.service.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/abonnements/abonnement.controller.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/abonnements/abonnement.routes.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/abonnements/organisation/abonnement-organisation.service.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/abonnements/b2b/abonnement-b2b.service.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/inscriptions/inscription.routes.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/inscriptions/inscription.controller.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/inscriptions/inscription.service.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/inscriptions/dossier.repository.ts`

### Backend - Tests liés
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/espace-organisation/__tests__/espace-organisation.repository.test.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/espace-organisation/__tests__/espace-organisation.service.test.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/espace-organisation/__tests__/espace-organisation.controller.test.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/espace-organisation/__tests__/rapport.service.test.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/abonnements/__tests__/abonnement-organisation.service.test.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/abonnements/__tests__/abonnement-b2b.service.test.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/abonnements/__tests__/abonnement.controller.test.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/abonnements/__tests__/abonnement.routes.test.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/inscriptions/__tests__/inscription.service.test.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/inscriptions/__tests__/inscription.routes.test.ts`
- `/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend/src/modules/inscriptions/__tests__/dossier.repository.test.ts`

## Hypothèses de départ

- Le seed organisation existe bien.
- Les écrans affichés peuvent consommer des champs backend incomplets ou mal mappés.
- Une partie des zéros peut venir d'un état vide réel, mais cela doit être confirmé contrat par contrat.

## Statut

- Document de constat uniquement
- Aucun correctif appliqué dans ce fichier
