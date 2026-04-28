# Etat de couverture backend integration - v4.8

**Date** : 2026-04-28  
**Périmètre** : tests backend `tests/integration/*.test.js` + e2e frontend `frontend/e2e/*.spec.js`  
**But** : donner l'état réel de la couverture RM à partir du code de tests présent dans le repo, sans dépendre uniquement du CSV.

## Lecture rapide

La matrice CSV n'est plus parfaitement synchronisée avec le code de tests actuel.  
Ce document prend donc deux vues :
- **backend integration seul**
- **backend integration + e2e frontend**

### Backend integration seul

- **36** fichiers d'integration backend
- **34** fichiers portent des références RM explicites
- **123** RM sont mentionnés dans ces suites
- **P0** : **11/11** couverts
- **P1** : **35/43** couverts
- **P2** : **55/68** couverts
- **P3** : **22/25** couverts

### Backend integration + e2e frontend

- **126/147 RM** sont couverts dans le corpus de tests actuel
- **P0** : **11/11** couverts
- **P1** : **37/43** couverts
- **P2** : **55/68** couverts
- **P3** : **23/25** couverts

## Ce qui est bien couvert

Les gros flux métier sont présents dans les suites actuelles :
- inscriptions et bifurcation `RM-01`, `RM-05`, `RM-07`, `RM-09`, `RM-15`, `RM-18`
- sessions `RM-14`, `RM-16`, `RM-17`, `RM-20`, `RM-21`, `RM-24`, `RM-25`
- comptes et sécurité `RM-28`, `RM-29`, `RM-30`, `RM-31`, `RM-32`, `RM-33`, `RM-34`, `RM-35`, `RM-36`, `RM-43`, `RM-46`, `RM-47`, `RM-48`, `RM-49`
- vouchers `RM-37`, `RM-38`, `RM-39`, `RM-40`, `RM-41`, `RM-42`, `RM-45`, `RM-144`
- formations `RM-11`, `RM-12`, `RM-13`, `RM-22`, `RM-23`, `RM-87`, `RM-90`, `RM-91`, `RM-92`, `RM-94`, `RM-96`, `RM-103`
- abonnements `RM-60`, `RM-61`, `RM-64`, `RM-65`, `RM-68`, `RM-70`, `RM-72`, `RM-73`, `RM-75`, `RM-76`, `RM-77`, `RM-79`, `RM-84`, `RM-102`, `RM-104`, `RM-105`, `RM-106`, `RM-108`, `RM-112`
- partenaire et apporteur `RM-126`, `RM-127`, `RM-128`, `RM-129`, `RM-137`, `RM-141`, `RM-142`, `RM-143`, `RM-145`, `RM-146`, `RM-147`
- bot `RM-115`, `RM-116`, `RM-117`, `RM-118`, `RM-119`, `RM-120`, `RM-121`, `RM-122`, `RM-123`, `RM-124`, `RM-125`
- multilangue `RM-97`, `RM-98`, `RM-99`, `RM-100`, `RM-101`

## Gaps encore ouverts dans le corpus actuel

Les RM ci-dessous restent absents du corpus backend integration + e2e frontend :

### P1

- `RM-71` Premium hors Retail
- `RM-80` abonnement obligatoire Organisation +30j
- `RM-81` essai 30j gratuit
- `RM-83` suspension essai J+30
- `RM-109` renouvellement Organisation auto
- `RM-111` extension RM-103 B2B

### P2

- `RM-50` unicité contrat institutionnel
- `RM-51` facturation SaaS totalité
- `RM-52` facturation fee mensuelle
- `RM-53` indépendance Retail / Institutionnel
- `RM-54` restrictions Gestionnaire
- `RM-55` traçabilité certifications institutionnelles
- `RM-56` alertes expiration J-60/J-30
- `RM-57` suspension expiration contrat
- `RM-59` enrôlement masse CSV
- `RM-69` alerte plafond palier
- `RM-82` alertes fin essai J-7/J-2
- `RM-89` Premium Enterprise 2/an
- `RM-114` seuil facturation fees

### P3

- `RM-58` renouvellement contrat
- `RM-74` conservation données Retail

### Notes

- `RM-26`, `RM-27` et `RM-44` ne sont pas couverts par le backend integration, mais `RM-26` et `RM-27` sont bien couverts par les e2e frontend.
- `RM-04`, `RM-08`, `RM-119`, `RM-120` sont présents dans les suites mais restent partiels dans la matrice.

## Matrice à rafraîchir

Le CSV de matrice doit être remis à jour, car il sous-déclare plusieurs tests présents dans le repo.

Exemples de RM déjà présentes dans les tests mais encore marquées non couvertes ou partielles dans la matrice :
- `RM-86`
- `RM-88`
- `RM-97`, `RM-98`, `RM-99`, `RM-100`
- `RM-118`
- `RM-121`, `RM-122`, `RM-123`, `RM-124`, `RM-125`
- `RM-130`, `RM-131`, `RM-132`, `RM-133`, `RM-134`, `RM-135`, `RM-136`, `RM-138`, `RM-139`

## Conclusion opérationnelle

Le projet a maintenant une **bonne couverture des flux critiques** et une **couverture intégration large**.  
Le travail restant est concentré sur :
- les abonnements institutionnels et une partie du cycle Retail/B2B
- quelques règles de visibilité et de communication
- le bot au-delà du déclenchement de base
- la remise en cohérence de la matrice avec les suites réelles
