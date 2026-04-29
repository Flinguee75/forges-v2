# Etat de couverture backend integration - v4.8

**Date** : 2026-04-29  
**Périmètre** : tests backend `tests/integration/*.test.js` + e2e frontend `frontend/e2e/*.spec.js`  
**But** : donner l'état réel de la couverture RM à partir du code de tests présent dans le repo, sans dépendre uniquement du CSV.

## Lecture rapide

La matrice CSV n'est plus parfaitement synchronisée avec le code de tests actuel.  
Ce document prend donc deux vues :
- **backend integration seul**
- **backend integration + e2e frontend**

### Backend integration seul

- **46** fichiers d'integration backend
- **42** fichiers portent des références RM explicites
- **144** RM sont mentionnés dans ces suites
- **P0** : **11/11** couverts
- **P1** : **41/43** couverts
- **P2** : **68/68** couverts
- **P3** : **24/25** couverts

### Backend integration + e2e frontend

- **147/147 RM** sont couverts dans le corpus de tests actuel
- **P0** : **11/11** couverts
- **P1** : **43/43** couverts
- **P2** : **68/68** couverts
- **P3** : **25/25** couverts

## Ce qui est bien couvert

Les gros flux métier sont présents dans les suites actuelles :
- inscriptions et bifurcation `RM-01`, `RM-05`, `RM-07`, `RM-09`, `RM-15`, `RM-18`
- sessions `RM-14`, `RM-16`, `RM-17`, `RM-20`, `RM-21`, `RM-24`, `RM-25`
- comptes et sécurité `RM-28`, `RM-29`, `RM-30`, `RM-31`, `RM-32`, `RM-33`, `RM-34`, `RM-35`, `RM-36`, `RM-43`, `RM-46`, `RM-47`, `RM-48`, `RM-49`
- vouchers `RM-37`, `RM-38`, `RM-39`, `RM-40`, `RM-41`, `RM-42`, `RM-45`, `RM-144`
- formations `RM-11`, `RM-12`, `RM-13`, `RM-22`, `RM-23`, `RM-87`, `RM-90`, `RM-91`, `RM-92`, `RM-94`, `RM-96`, `RM-103`
- abonnements `RM-50`, `RM-51`, `RM-52`, `RM-53`, `RM-54`, `RM-55`, `RM-56`, `RM-57`, `RM-58`, `RM-59`, `RM-60`, `RM-61`, `RM-64`, `RM-65`, `RM-68`, `RM-69`, `RM-70`, `RM-71`, `RM-72`, `RM-73`, `RM-74`, `RM-75`, `RM-76`, `RM-77`, `RM-79`, `RM-80`, `RM-81`, `RM-82`, `RM-83`, `RM-84`, `RM-89`, `RM-102`, `RM-104`, `RM-105`, `RM-106`, `RM-108`, `RM-109`, `RM-111`, `RM-112`, `RM-114`
- partenaire et apporteur `RM-126`, `RM-127`, `RM-128`, `RM-129`, `RM-137`, `RM-141`, `RM-142`, `RM-143`, `RM-145`, `RM-146`, `RM-147`
- bot `RM-115`, `RM-116`, `RM-117`, `RM-118`, `RM-119`, `RM-120`, `RM-121`, `RM-122`, `RM-123`, `RM-124`, `RM-125`
- multilangue `RM-97`, `RM-98`, `RM-99`, `RM-100`, `RM-101`

## Gaps encore ouverts dans le corpus actuel

Les gaps du plan focus ont été fermés par les suites suivantes :
- `rm-abonnements-retail-manquants.integration.test.js`
- `rm-abonnements-organisation-manquants.integration.test.js`
- `rm-abonnements-b2b-manquants.integration.test.js`
- `rm-contrats-institutionnels.integration.test.js`
- `rm-enrolement-masse.integration.test.js`
- `rm-alertes-abonnement.integration.test.js`
- `rm-renouvellement-contrats.integration.test.js`
- `rm-conservation-donnees.integration.test.js`

### P1

- Aucun gap P1 restant dans le corpus backend integration + e2e frontend.

### P2

- Aucun gap P2 restant dans le corpus backend integration + e2e frontend.

### P3

- Aucun gap P3 restant dans le corpus backend integration + e2e frontend.

### Notes

- `RM-26`, `RM-27` et `RM-44` ne sont pas couverts par le backend integration seul, mais ils sont couverts par les e2e frontend.
- `RM-04`, `RM-08`, `RM-119`, `RM-120` étaient déjà présents dans les suites ; leur statut est désormais synchronisé dans la matrice.

## Matrice synchronisée

Le CSV de matrice a été remis à jour le 2026-04-29 pour refléter les tests réellement présents dans le repo.

Les lignes qui étaient encore marquées `NON COUVERT` ou `PARTIEL` ont été synchronisées avec les fichiers `tests/integration/*.test.js` et `frontend/e2e/*.spec.js` qui mentionnent explicitement les RM concernées. La matrice ne contient plus de statut `NON COUVERT` ou `PARTIEL`.

## Conclusion opérationnelle

Le projet a maintenant une **couverture intégration complète sur le corpus backend + e2e frontend**.  
Le plan focus a fermé les gaps P1/P2/P3 identifiés au 2026-04-28 et la matrice est alignée avec les suites réelles. La maintenance restante consiste à garder ces documents synchronisés quand les règles évoluent.
