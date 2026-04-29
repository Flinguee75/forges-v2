# Documentation RM - FORGES v4.8

**Dernière mise à jour** : 2026-04-29

Ce dossier regroupe la matrice RM, l'état de couverture intégration, le plan focus exécuté et les rapports historiques.

## Documents actifs

### [ETAT_COUVERTURE_BACKEND_INTEGRATION_v4.8.md](./ETAT_COUVERTURE_BACKEND_INTEGRATION_v4.8.md)
Snapshot actuel de la couverture RM a partir des tests backend integration et des e2e frontend. C'est le document a lire pour l'etat reel, car il corrige les ecarts du CSV quand il est en retard.

### [PLAN_FOCUS_INTEGRATION.md](./PLAN_FOCUS_INTEGRATION.md)
Plan de travail exécuté. Il documente les waves qui ont fermé les gaps P1/P2/P3 et reste utile comme historique de maintenance.

### [matrice-couverture-rm-v4.8.csv](./matrice-couverture-rm-v4.8.csv)
Source de vérité pour suivre la couverture RM par fichier de test, criticité, priorité et statut.

## Archive

Les documents obsolètes ou historiques sont regroupés dans [ARCHIVE.md](./ARCHIVE.md).  
Ils restent consultables, mais ne doivent plus servir de base de décision.

## Périmètre de maintenance

La maintenance cible en priorité :
- les RM P0 qui deviendraient manquantes ou fragiles
- les RM P1 qui bloquent revenus, sécurité, inscription, paiement, abonnement, partenaire ou apporteur
- les suites d'intégration réutilisables par flux métier, plutôt qu'une multiplication de tests unitaires redondants

## Ordre d'execution recommande

1. Lire la matrice.
2. Consulter l'état de couverture courant.
3. Consulter l'archive seulement si un ancien rapport est nécessaire.
4. Mettre a jour la matrice au fil des nouveaux tests.
