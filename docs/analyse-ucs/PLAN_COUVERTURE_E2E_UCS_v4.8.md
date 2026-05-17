# Plan couverture E2E UCS - FORGES v4.8

**Date** : 2026-04-29  
**Strategie** : Playwright hybride, avec parcours UI pour les écrans visibles et appels API pour le setup, les webhooks, les schedulers et les assertions métier lourdes.

## Objectif

Couvrir les use cases `UCS00` à `UCS20` décrits dans `docs/specifications/ForgesSpecsv4.8.md` sans dupliquer inutilement les tests d'intégration backend RM déjà complets.

La couverture attendue par UCS est :
- au moins un parcours nominal stable ;
- les alternatives critiques liées aux RM de criticité forte ;
- une assertion visible UI quand l'UCS correspond à un espace utilisateur ;
- une assertion API ou scheduler quand l'effet métier n'est pas observable proprement dans l'UI.

## Matrice active

La matrice active est [matrice-couverture-ucs-e2e-v4.8.csv](./matrice-couverture-ucs-e2e-v4.8.csv).

Elle référence les specs Playwright existantes et les nouvelles specs ajoutées pour combler les UCS absents ou partiels.

## Waves d'execution

### Wave 1 - Socle et inventaire

- Centraliser les helpers E2E : login par rôle, normalisation payload API, emails uniques, scheduler abonnements.
- Ajouter les fixtures déterministes nécessaires au seed E2E.
- Créer la matrice UCS.

### Wave 2 - Backoffice et configuration

- `UCS02` : comptes, invitation partenaire, création apporteur.
- `UCS04` : formations internes, classification, mode à la demande, rejet session invalide.
- `UCS10` : dashboards et exports rapports.
- `UCS13` : configuration globale, seuils et accès backoffice bot.

### Wave 3 - Organisations et abonnements

- `UCS03` : inscription Organisation, essai, abonnement Organisation.
- `UCS03.1` : écran contrat institutionnel et contrat actuellement figé côté UI.
- `UCS03.2`, `UCS12`, `UCS12.1` : abonnement B2B, espace Organisation, membres, vouchers, rapports, quotas.

### Wave 4 - Apprenant et bot

- `UCS11.1` : cycle abonnement Retail.
- `UCS14` : accès à la demande complété par cas Premium et accès existant.
- `UCS15`, `UCS16` : bot apprenant et organisation, questions fermées et backoffice.

### Wave 5 - Renouvellements et apporteurs

- `UCS09.1` : scheduler renouvellements abonnements.
- `UCS19` : création/approbation apporteur, usage code, commissions, reversements.
- `UCS20` : espace apporteur complété par commissions et reversements.

## Execution locale

Depuis `forges-monorepo/frontend` :

```bash
npm run test:e2e -- ucs02-comptes-admin.spec.js
npm run test:e2e
```

Le runner E2E lance PostgreSQL/Redis, pousse le schema Prisma, exécute `prisma:seed:e2e`, démarre backend/frontend, puis lance Playwright.
