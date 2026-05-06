# Changements Backoffice Dashboard - FORGES v4.9

## Résumé
Ajout des pages de gestion des apprenants et organisations dans le backoffice, avec amélioration de l'UX pour l'export de rapports.

## Fichiers Créés

### API Clients
1. **frontend/src/api/apprenants.api.js**
   - Méthodes CRUD pour les apprenants
   - Gestion de la suspension/activation
   - Récupération des dossiers et abonnements

2. **frontend/src/api/organisations.api.js**
   - Méthodes CRUD pour les organisations
   - Gestion de la suspension/activation
   - Récupération des membres, abonnements et vouchers

### Pages Frontend
3. **frontend/src/pages/backoffice/apprenants/ApprenantsList.jsx**
   - Liste paginée des apprenants (20 par page)
   - Filtres : recherche, statut (actif/suspendu/non confirmé)
   - Actions : voir détails, suspendre/activer
   - Accessible à : ADMIN, SUPERVISEUR

4. **frontend/src/pages/backoffice/organisations/OrganisationsList.jsx**
   - Liste paginée des organisations (20 par page)
   - Filtres : recherche, type (Entreprise/Institution/ONG/Association)
   - Actions : voir détails, suspendre/activer
   - Accessible à : ADMIN, SUPERVISEUR

## Fichiers Modifiés

### Router
5. **frontend/src/router/index.jsx**
   - Ajout des lazy imports pour ApprenantsList et OrganisationsList
   - Ajout des routes :
     - `/backoffice/apprenants` (ADMIN, SUPERVISEUR)
     - `/backoffice/organisations` (ADMIN, SUPERVISEUR)

### Dashboard
6. **frontend/src/pages/backoffice/BackofficeDashboard.jsx**
   - Ajout de l'import Button
   - Ajout de la fonction `triggerDownload()`
   - Ajout de la fonction `handleExport()` pour CSV et PDF
   - Ajout de 2 boutons "Export CSV" et "Export PDF" dans le header
   - Amélioration de `getQuickLinks()` :
     - Ajout du lien "Apprenants"
     - Ajout du lien "Organisations"
   - Les exports sont maintenant accessibles directement depuis le dashboard

## Fonctionnalités Implémentées

### Gestion des Apprenants
- ✅ Liste avec pagination
- ✅ Recherche par nom, prénom, email
- ✅ Filtrage par statut
- ✅ Suspension/Activation de compte
- ✅ Navigation vers détails
- ✅ Badges de statut (Actif/Suspendu/Email non confirmé)

### Gestion des Organisations
- ✅ Liste avec pagination
- ✅ Recherche par nom, email, responsable
- ✅ Filtrage par type
- ✅ Suspension/Activation de compte
- ✅ Navigation vers détails
- ✅ Badges de statut et de type

### Export de Rapports
- ✅ Bouton "Export CSV" directement dans le dashboard
- ✅ Bouton "Export PDF" directement dans le dashboard
- ✅ Nom de fichier avec date automatique
- ✅ Indicateur de chargement pendant l'export

## Navigation Ajoutée

### Accès Rapides (Dashboard)
Pour ADMIN et SUPERVISEUR :
- Apprenants → `/backoffice/apprenants`
- Organisations → `/backoffice/organisations`
- Formations → `/backoffice/formations`
- Sessions → `/backoffice/sessions`
- Rapports → `/backoffice/rapports`

Pour ADMIN uniquement :
- Configuration → `/backoffice/config`
- Abonnements → `/backoffice/abonnements`

Pour ADMIN, SUPERVISEUR, AGENT :
- Vouchers → `/backoffice/vouchers`
- Apporteurs → `/backoffice/apporteurs`

## Points d'Attention Backend

Les endpoints suivants doivent être implémentés côté backend :

### Apprenants
- `GET /api/backoffice/apprenants` - Liste avec pagination et filtres
- `GET /api/backoffice/apprenants/:id` - Détail d'un apprenant
- `POST /api/backoffice/apprenants` - Créer un apprenant
- `PUT /api/backoffice/apprenants/:id` - Modifier un apprenant
- `PATCH /api/backoffice/apprenants/:id/suspension` - Suspendre/Activer
- `GET /api/backoffice/apprenants/:id/dossiers` - Dossiers de l'apprenant
- `GET /api/backoffice/apprenants/:id/abonnement` - Abonnement actif

### Organisations
- `GET /api/backoffice/organisations` - Liste avec pagination et filtres
- `GET /api/backoffice/organisations/:id` - Détail d'une organisation
- `POST /api/backoffice/organisations` - Créer une organisation
- `PUT /api/backoffice/organisations/:id` - Modifier une organisation
- `PATCH /api/backoffice/organisations/:id/suspension` - Suspendre/Activer
- `GET /api/backoffice/organisations/:id/membres` - Membres de l'organisation
- `GET /api/backoffice/organisations/:id/abonnement` - Abonnement actif
- `GET /api/backoffice/organisations/:id/vouchers` - Vouchers de l'organisation

## Conformité CLAUDE.md

✅ Pas d'emojis dans le code
✅ Utilisation des composants UI existants (Card, Badge, Button, Table, etc.)
✅ Pattern API client conforme (cleanQueryParams, apiClient.get/post/patch/put)
✅ Protection RBAC via RoleGuard
✅ Gestion d'erreur avec useApi hook
✅ Pagination standardisée
✅ Messages de succès/erreur
✅ États de chargement (Spinner, Button loading)

## Prochaines Étapes Recommandées

1. Implémenter les endpoints backend manquants
2. Créer les pages de détail :
   - `ApprenantDetail.jsx`
   - `OrganisationDetail.jsx`
3. Créer les formulaires de création/édition :
   - `ApprenantForm.jsx`
   - `OrganisationForm.jsx`
4. Ajouter des tests unitaires pour les nouveaux composants
5. Ajouter des tests E2E Playwright pour les parcours backoffice

## Tests à Effectuer

- [ ] Vérifier que les routes sont accessibles uniquement aux rôles autorisés
- [ ] Tester la pagination sur les deux listes
- [ ] Tester les filtres de recherche
- [ ] Tester les actions de suspension/activation
- [ ] Tester l'export CSV depuis le dashboard
- [ ] Tester l'export PDF depuis le dashboard
- [ ] Vérifier que les boutons d'export affichent bien l'état de chargement
- [ ] Vérifier que les liens rapides s'affichent selon le rôle

