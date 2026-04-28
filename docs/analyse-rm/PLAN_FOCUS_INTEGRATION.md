# Plan Focus Integration - RM v4.8

**Date** : 2026-04-28  
**But** : couvrir au moins 70 % des RM les plus importantes via des tests d'integration backend stables, lisibles et re-executables.

## 1. Cible du plan

Le plan ne cherche pas a couvrir toute la matrice de facon uniforme. Il concentre l'effort sur les RM qui protègent :
- le revenu
- la sécurité et l'unicité
- les bifurcations métier
- les transitions automatisées
- les contrats API exposés aux parcours principaux

### RM a traiter en priorite absolue

- `RM-86` type_formation reserve a FORGES
- `RM-143` validation code apporteur
- `RM-144` non-cumulabilité code apporteur
- `RM-01` unicité apprenant/session
- `RM-15` unicité formation cross-sessions
- `RM-16` coherence des 4 dates de session
- `RM-17` non-chevauchement des sessions
- `RM-28` unicite email
- `RM-32` rate limiting inscription
- `RM-37` voucher lie a une formation
- `RM-38` usage unique voucher
- `RM-41` voucher organisation = paiement auto

Ces RM sont le noyau dur du backlog d'integration. Ils touchent directement le contrôle des accès, les flux de paiement et la création de doublons.

## 2. Principe de couverture

On travaille par flux métier, pas par RM isolée.

Chaque suite d'integration doit :
- couvrir un parcours utilisateur complet
- verifier les effets de bord Prisma
- verifier au moins un cas nominal et un cas de rejet
- rester idempotente en seed et en cleanup

## 3. Warnings sur l'existant

Les anciens rapports restent utiles pour le contexte, mais ils mélangent :
- des chiffres déjà périmés
- des suites désormais renommées
- des objectifs de phase terminés

Le plan actif ne doit plus dépendre de ces chiffres pour piloter le travail.

## 4. Waves d'execution

### Wave 1 - Noyau transactionnel

Objectif : fermer les trous qui cassent la cohérence des comptes, inscriptions, sessions, paiements et vouchers.

RM ciblees :
- `RM-01`, `RM-15`, `RM-16`, `RM-17`
- `RM-28`, `RM-31`, `RM-32`, `RM-33`, `RM-34`, `RM-35`, `RM-36`, `RM-48`
- `RM-06`, `RM-07`, `RM-08`, `RM-09`
- `RM-37`, `RM-38`, `RM-39`, `RM-40`, `RM-41`, `RM-42`, `RM-45`

Livrables attendus :
- `rm-01-15-unicite.test.js`
- `rm-16-17-sessions.test.js`
- `rm-28-unicite-email.test.js`
- `rm-32-rate-limit-auth.test.js`
- `rm-vouchers-core.integration.test.js`
- `rm-paiements-core.integration.test.js`

### Wave 2 - Revenue products

Objectif : couvrir les parcours qui generent ou protegent le revenu recurrent.

RM ciblees :
- `RM-60`, `RM-61`, `RM-62`, `RM-63`, `RM-64`, `RM-65`
- `RM-70`, `RM-71`, `RM-72`, `RM-73`, `RM-74`, `RM-75`, `RM-76`, `RM-77`, `RM-78`, `RM-79`
- `RM-80`, `RM-81`, `RM-82`, `RM-83`, `RM-84`, `RM-85`
- `RM-87`, `RM-88`, `RM-91`, `RM-92`, `RM-93`, `RM-94`, `RM-95`, `RM-96`
- `RM-102`, `RM-103`, `RM-104`, `RM-105`, `RM-106`, `RM-109`, `RM-110`, `RM-111`

Livrables attendus :
- `rm-abonnements-retail.integration.test.js`
- `rm-abonnements-b2b-org.integration.test.js`
- `rm-formations-demande.integration.test.js`

### Wave 3 - Partenaires et apporteurs

Objectif : couvrir les règles qui pilotent la validation partenaire et les commissions.

RM ciblees :
- `RM-126`, `RM-127`, `RM-128`, `RM-129`
- `RM-134`, `RM-136`, `RM-137`, `RM-138`
- `RM-145`, `RM-146`, `RM-147`

Livrables attendus :
- `rm-partenaires.validation.integration.test.js`
- `rm-apporteurs.commissions.integration.test.js`

### Wave 4 - Bot et automatisations secondaires

Objectif : garder les automatisations métier stables sans gonfler inutilement le scope.

RM ciblees :
- `RM-115`, `RM-116`, `RM-118`, `RM-119`, `RM-120`, `RM-121`
- `RM-130`, `RM-131`, `RM-132`, `RM-133`, `RM-139`
- `RM-18`, `RM-19`, `RM-20`, `RM-21`, `RM-24`, `RM-25`

Livrables attendus :
- `rm-bot.integration.test.js`
- `rm-schedulers.integration.test.js`
- `rm-dashboard-reversements.integration.test.js`

## 5. Critere de sortie

Le plan est considéré comme suffisant quand :
- toutes les RM P0 du sous-ensemble prioritaire sont couvertes
- les RM P1 de revenu et de sécurité ont au moins un test d'integration stable
- la couverture utile du sous-ensemble prioritaire atteint au moins 70 %
- la matrice est mise a jour avec les nouveaux fichiers de tests

## 6. Règle de maintenance

Quand une RM change de contrat :
- on ajuste le test d'integration en premier
- on ne conserve pas un ancien rapport comme source de vérité
- on documente le nouveau statut dans la matrice
