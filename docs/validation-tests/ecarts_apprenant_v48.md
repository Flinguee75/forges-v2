# FORGES v4.8 - Écarts Apprenant

Date de constat: 2026-04-23

Ce document répertorie les écarts apprenant encore visibles dans le runtime local, avec la cause la plus probable et les fichiers impliqués.

## 1. Dossier détail: nom de formation affiché en `N/A`

### Symptôme
- Dans la page détail dossier, le nom et le code formation remontent parfois `N/A`.
- Même symptôme visible sur les listes dossiers / dashboard apprenant / paiements quand la formation est lue au mauvais niveau.

### Fichiers concernés
- [frontend/src/pages/etudiant/DossierDetail.jsx](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/frontend/src/pages/etudiant/DossierDetail.jsx)
- [frontend/src/pages/etudiant/MesDossiersPage.jsx](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/frontend/src/pages/etudiant/MesDossiersPage.jsx)
- [frontend/src/pages/etudiant/EtudiantDashboard.jsx](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/frontend/src/pages/etudiant/EtudiantDashboard.jsx)
- [frontend/src/pages/etudiant/MesPaiementsPage.jsx](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/frontend/src/pages/etudiant/MesPaiementsPage.jsx)
- [frontend/src/pages/etudiant/PaiementDetail.jsx](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/frontend/src/pages/etudiant/PaiementDetail.jsx)
- [backend/src/modules/espace-apprenant/espace-apprenant.repository.ts](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/backend/src/modules/espace-apprenant/espace-apprenant.repository.ts)

### Cause probable
- Le backend renvoie `formation` au niveau racine du dossier dans `findDossierById()` et `findDossiersByApprenant()`.
- Les pages legacy lisent encore `dossier.session?.formation?.titre` et `dossier.session?.formation?.code`.

### Statut
- Écart confirmé.
- Ce n’est pas un manque de données seedé, c’est un désalignement de shape entre le backend et le front legacy.

---

## 2. Attestations: download 404 avec `undefined`

### Symptôme
- Erreur observée: `3000/api/attestations/undefined/download:1 Failed to load resource: the server responded with a status of 404 (Not Found)`

### Fichiers concernés
- [frontend/src/pages/etudiant/MesAttestationsPage.jsx](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/frontend/src/pages/etudiant/MesAttestationsPage.jsx)
- [backend/src/modules/espace-apprenant/espace-apprenant.service.ts](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/backend/src/modules/espace-apprenant/espace-apprenant.service.ts)

### Cause probable
- Le service backend renvoie `dossier_id` dans la liste des attestations.
- La page legacy appelle encore `handleDownloadAttestation(dossier.id, ...)`.
- Résultat: `dossier.id` est `undefined` côté front, donc l’URL finale contient `undefined`.

### Statut
- Écart confirmé.
- Le contrat backend existe, mais le front legacy attend encore un champ `id` au lieu de `dossier_id`.

---

## 3. Profil apprenant: `setUser is not a function`

### Symptôme
- Erreur observée pendant l’édition du profil:
  - `setUser is not a function`
  - ensuite, les informations du formulaire disparaissent.

### Fichiers concernés
- [frontend/src/pages/etudiant/MonProfilPage.jsx](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/frontend/src/pages/etudiant/MonProfilPage.jsx)
- [frontend/src/contexts/AuthContext.jsx](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/frontend/src/contexts/AuthContext.jsx)
- [frontend/src/hooks/useAuth.js](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/frontend/src/hooks/useAuth.js)

### Cause probable
- `AuthContext` expose `user`, `login`, `logout`, `updateUser`.
- La page legacy destructure `const { user, setUser } = useAuth();`
- `setUser` n’existe pas dans le contexte.

### Statut
- Écart confirmé.
- C’est un faux contrat côté front legacy, pas un manque backend.

---

## 4. Formation à la demande: route `undefined`

### Symptôme
- Erreur observée:
  - `http://localhost:5173/apprenant/formations-a-la-demande/undefined Failed to load resource: the server responded with a status of 404 (Not Found)`

### Fichiers concernés
- [frontend/src/pages/apprenant/AccesFormation.jsx](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/frontend/src/pages/apprenant/AccesFormation.jsx)
- [frontend/src/pages/apprenant/FormationsALaDemande.jsx](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/frontend/src/pages/apprenant/FormationsALaDemande.jsx)
- [frontend/src/api/espace-apprenant.api.js](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/frontend/src/api/espace-apprenant.api.js)
- [backend/src/modules/espace-apprenant/espace-apprenant.controller.ts](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/backend/src/modules/espace-apprenant/espace-apprenant.controller.ts)

### Cause probable
- Le backend répond via le contrôleur avec un objet enveloppé `{ statusCode, data }`.
- La page `AccesFormation` stocke encore `setAcces(result)` au lieu de `setAcces(result.data)` ou d’un unwrap équivalent.
- `acces.id` devient donc `undefined`, ce qui fabrique la mauvaise route.

### Statut
- Écart confirmé.
- Le contrat backend est présent, mais le front ne déplie pas encore correctement la réponse du contrôleur.

---

## 5. Texte d’abonnement Retail

### Symptomatique observé
- Phrase affichée:
  - `Gérez votre offre actuelle et vos accès Retail.`

### Verdict
- Ce n’est pas un écart.
- C’est un texte normal de la page [frontend/src/pages/apprenant/MonAbonnement.jsx](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/frontend/src/pages/apprenant/MonAbonnement.jsx).

---

## 6. Résumé des écarts à traiter ensuite

Priorité proposée:
1. Corriger les pages apprenant qui lisent `dossier.session.formation` au lieu de `dossier.formation`.
2. Corriger `MesAttestationsPage` pour utiliser `dossier_id`.
3. Corriger `MonProfilPage` pour utiliser `updateUser` et non `setUser`.
4. Corriger `AccesFormation` pour déplier `{ statusCode, data }` correctement.

## 7. Contrats backend déjà validés

- [backend/src/modules/espace-apprenant/espace-apprenant.routes.ts](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/backend/src/modules/espace-apprenant/espace-apprenant.routes.ts)
- [backend/src/modules/espace-apprenant/espace-apprenant.service.ts](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/backend/src/modules/espace-apprenant/espace-apprenant.service.ts)
- [backend/src/modules/espace-apprenant/espace-apprenant.repository.ts](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/backend/src/modules/espace-apprenant/espace-apprenant.repository.ts)

