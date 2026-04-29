# Plan Focus Integration - RM v4.8

**Date** : 2026-04-28  
**Statut** : clôturé le 2026-04-29 — suites livrées et matrice synchronisée

**But initial** : couvrir les RM encore absentes du corpus `tests/integration/*.test.js` + `frontend/e2e/*.spec.js`, avec un objectif d'au moins 70 % sur le sous-ensemble prioritaire restant.

## 1. Cible du plan

Au lancement du plan, le corpus couvrait déjà les P0 et la majorité des flux critiques. Le plan ne devait donc pas re-traiter les RM déjà présentes dans les suites.

Il se concentrait uniquement sur les gaps alors ouverts dans l'etat de couverture, en priorité :
- les abonnements institutionnels et les trous du cycle Retail / B2B
- les contrats et alertes institutionnels
- les scénarios de renouvellement et de rétention de données
- les règles encore absentes du corpus, pas les RM déjà couvertes

### RM à traiter en priorité absolue

P1 alors absentes du corpus :
- `RM-71` Premium hors Retail
- `RM-80` abonnement Organisation obligatoire +30j
- `RM-81` essai 30j gratuit
- `RM-83` suspension essai J+30
- `RM-109` renouvellement Organisation auto
- `RM-111` extension RM-103 B2B

P2 et P3 alors à couvrir par flux :
- `RM-50`, `RM-51`, `RM-52`, `RM-53`, `RM-54`, `RM-55`, `RM-56`, `RM-57`
- `RM-59`
- `RM-69`
- `RM-82`
- `RM-89`
- `RM-114`
- `RM-58`
- `RM-74`

Point de vigilance :
- `RM-44` doit rester vérifié explicitement dans le corpus réel si le flux voucher le rend encore nécessaire

## 2. Principe de couverture

On travaille par flux métier, pas par RM isolée.

Chaque suite d'integration doit :
- couvrir un parcours utilisateur complet
- verifier les effets de bord Prisma
- verifier au moins un cas nominal et un cas de rejet
- rester idempotente en seed et en cleanup
- éviter de recréer des scénarios déjà couverts par une suite existante

## 3. Ce qui est hors plan

Le plan ne devait pas reprendre les RM déjà couvertes dans le corpus, même si la matrice CSV les marquait encore de travers.

Ne pas replanifier :
- les blocs inscription / paiement / vouchers déjà présents
- les blocs abonnements déjà présents
- les blocs partenaire / apporteur déjà présents
- les blocs bot et multilangue déjà présents

La matrice CSV reste utile comme inventaire, mais l'etat réel de couverture est dans [ETAT_COUVERTURE_BACKEND_INTEGRATION_v4.8.md](./ETAT_COUVERTURE_BACKEND_INTEGRATION_v4.8.md).

## 4. Waves d'execution

Statut d'exécution au 2026-04-29 : les trois waves ci-dessous sont terminées dans le corpus courant. Les livrables attendus sont présents dans `forges-monorepo/backend/tests/integration/` et la matrice `matrice-couverture-rm-v4.8.csv` a été mise à jour pour refléter cette couverture.

### Wave 1 - Abonnements manquants

Objectif : fermer les trous encore absents du corpus sur le cycle Retail / Organisation / B2B.

RM ciblées :
- `RM-71`
- `RM-80`, `RM-81`, `RM-83`
- `RM-109`, `RM-111`

Livrables attendus :
- `rm-abonnements-retail-manquants.integration.test.js`
- `rm-abonnements-organisation-manquants.integration.test.js`
- `rm-abonnements-b2b-manquants.integration.test.js`

### Wave 2 - Contrats et règles institutionnelles

Objectif : couvrir les règles qui manquent encore sur les contrats institutionnels et les contraintes administratives.

RM ciblées :
- `RM-50`, `RM-51`, `RM-52`, `RM-53`, `RM-54`, `RM-55`, `RM-56`, `RM-57`
- `RM-59`

Livrables attendus :
- `rm-contrats-institutionnels.integration.test.js`
- `rm-enrôlement-masse.integration.test.js`

### Wave 3 - Rétention et renouvellement

Objectif : couvrir les règles encore absentes sur la continuité de service, les renouvellements et la conservation des données.

RM ciblées :
- `RM-69`
- `RM-82`
- `RM-89`
- `RM-114`
- `RM-58`
- `RM-74`

Livrables attendus :
- `rm-alertes-abonnement.integration.test.js`
- `rm-renouvellement-contrats.integration.test.js`
- `rm-conservation-donnees.integration.test.js`

## 5. Critere de sortie

Le plan est considéré comme suffisant quand :
- toutes les RM P1 encore absentes du corpus ont au moins un test stable
- les RM P2/P3 encore absentes les plus utiles sont couvertes par flux
- la couverture utile du sous-ensemble prioritaire atteint au moins 70 %
- la matrice est mise à jour pour refléter le corpus réel

## 6. Règle de maintenance

Quand une RM change de contrat :
- on ajuste le test d'integration en premier
- on ne conserve pas un ancien rapport comme source de vérité
- on documente le nouveau statut dans la matrice et dans l'etat de couverture

## 7. Exécution locale

Depuis `forges-monorepo/backend` :

- `npm test` pour les tests unitaires backend
- `npm run test:integration` pour le corpus d'integration backend
- `npm run build` pour verifier le build backend
- `npm run lint` pour verifier le lint backend

Depuis `forges-monorepo/frontend` :

- `npm test` pour les tests unitaires frontend
- `npm run test:e2e` pour les parcours Playwright
- `npm run build` pour verifier le build frontend
- `npm run lint` pour verifier le lint frontend

Rappel :
- `test:integration` doit couvrir tous les tests d'integration backend disponibles
- les documents actifs sont ceux du dossier `docs/analyse-rm/`
- le CSV reste un inventaire, pas la source de vérité principale
