# ✅ Checklist de Validation F-3 — Auth Context + Hooks + Client API + RoleGuard

> **Objectif** : Valider que l'infrastructure d'authentification fonctionne correctement de bout en bout.

---

## 🔧 Prérequis

1. **Backend démarré** sur `http://localhost:3000`
   ```bash
   cd /Users/tidianecisse/PROJET_INFO/plateforme_formation/forges-backend
   npm run dev
   ```

2. **Frontend démarré** sur `http://localhost:5173`
   ```bash
   cd /Users/tidianecisse/PROJET_INFO/plateforme_formation/forges-backend/frontend
   npm run dev
   ```

3. **Compte ADMIN de test créé** dans la base de données
   - Email : `admin@forges.ci`
   - Password : `Admin123!`
   - Role : `ADMIN`

4. **Compte ETUDIANT de test créé** dans la base de données
   - Email : `etudiant@forges.ci`
   - Password : `Etudiant123!`
   - Role : `ETUDIANT`

---

## ✅ Tests à Effectuer

### Test 1 : Login avec un compte ADMIN réel fonctionne et stocke le token

**Étapes** :
1. Ouvrir `http://localhost:5173/login`
2. Entrer les credentials ADMIN :
   - Email : `admin@forges.ci`
   - Password : `Admin123!`
3. Cliquer sur "Se connecter"

**Vérifications** :
- ☐ Pas d'erreur dans la console
- ☐ Redirection automatique vers `/backoffice/dashboard`
- ☐ Ouvrir DevTools → Application → Session Storage
- ☐ Vérifier présence de `access_token` (JWT valide)
- ☐ Vérifier présence de `refresh_token`
- ☐ Vérifier présence de `user` avec `{ id, email, role: "ADMIN", ... }`

**Commande de vérification rapide** (dans la console du navigateur) :
```javascript
sessionStorage.getItem('access_token') // Doit retourner un JWT
sessionStorage.getItem('refresh_token') // Doit retourner un token
JSON.parse(sessionStorage.getItem('user')) // Doit retourner { role: "ADMIN", ... }
```

---

### Test 2 : Logout vide le token et redirige vers /login

**Étapes** :
1. Être connecté (suite du Test 1)
2. Cliquer sur le bouton "Déconnexion" (dans le header/navbar)

**Vérifications** :
- ☐ Pas d'erreur dans la console
- ☐ Redirection automatique vers `/login`
- ☐ Ouvrir DevTools → Application → Session Storage
- ☐ Vérifier que `access_token` est supprimé
- ☐ Vérifier que `refresh_token` est supprimé
- ☐ Vérifier que `user` est supprimé

**Commande de vérification rapide** :
```javascript
sessionStorage.getItem('access_token') // Doit retourner null
sessionStorage.getItem('refresh_token') // Doit retourner null
sessionStorage.getItem('user') // Doit retourner null
```

---

### Test 3 : RoleGuard redirige vers /login si non authentifié

**Étapes** :
1. S'assurer d'être déconnecté (Session Storage vide)
2. Tenter d'accéder directement à une route protégée :
   - `http://localhost:5173/etudiant/dashboard`
   - `http://localhost:5173/backoffice/dashboard`
   - `http://localhost:5173/organisation/dashboard`

**Vérifications** :
- ☐ Redirection automatique vers `/login` pour chaque route
- ☐ Pas d'erreur dans la console
- ☐ Pas d'affichage du contenu protégé (même 1 frame)

---

### Test 4 : RoleGuard redirige vers /unauthorized si rôle insuffisant

**Étapes** :
1. Se connecter avec le compte ETUDIANT :
   - Email : `etudiant@forges.ci`
   - Password : `Etudiant123!`
2. Une fois connecté, tenter d'accéder à des routes réservées à d'autres rôles :
   - `http://localhost:5173/backoffice/dashboard` (réservé ADMIN/SUPERVISEUR/RESPONSABLE/AGENT)
   - `http://localhost:5173/organisation/dashboard` (réservé ORGANISATION)

**Vérifications** :
- ☐ Redirection automatique vers `/unauthorized`
- ☐ Affichage de la page "Accès non autorisé"
- ☐ Pas d'erreur dans la console
- ☐ Pas d'affichage du contenu protégé

**Test inverse** : Se connecter avec ADMIN et vérifier l'accès à `/backoffice/dashboard` :
- ☐ Accès autorisé, affichage du dashboard backoffice

---

### Test 5 : useAuth() retourne { user, login, logout, isAuthenticated }

**Étapes** :
1. Se connecter avec n'importe quel compte
2. Ouvrir DevTools → Console
3. Inspecter le hook `useAuth` dans React DevTools

**Vérifications** :
- ☐ `user` contient les données utilisateur `{ id, email, role, ... }`
- ☐ `isAuthenticated` est `true`
- ☐ `isLoading` est `false` (après le chargement initial)
- ☐ `login` est une fonction
- ☐ `logout` est une fonction
- ☐ `updateUser` est une fonction

**Commande de test dans le composant** (ajouter temporairement dans un composant) :
```jsx
import { useAuth } from '../hooks/useAuth';

function TestComponent() {
  const auth = useAuth();
  console.log('useAuth values:', auth);
  return <div>Check console</div>;
}
```

**Vérifications console** :
```javascript
{
  user: { id: 1, email: "admin@forges.ci", role: "ADMIN", ... },
  isAuthenticated: true,
  isLoading: false,
  login: ƒ login(),
  logout: ƒ logout(),
  updateUser: ƒ updateUser()
}
```

---

### Test 6 : Le token est automatiquement ajouté aux headers par le client Axios

**Étapes** :
1. Se connecter avec n'importe quel compte
2. Ouvrir DevTools → Network
3. Effectuer une action qui déclenche un appel API protégé, par exemple :
   - Rafraîchir la page dashboard
   - Naviguer vers une page qui charge des données

**Vérifications** :
- ☐ Inspecter un appel API dans l'onglet Network (ex: `GET /api/auth/me`)
- ☐ Dans l'onglet "Headers", vérifier la présence de :
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
- ☐ Le token doit correspondre à celui stocké dans Session Storage

**Commande de vérification dans la console** :
```javascript
// Simuler un appel API
import { apiClient } from './api/client';

// Observer dans Network → Headers
await apiClient.get('/auth/me');
```

---

### Test 7 : Refresh Token automatique en cas de 401

**Étapes** :
1. Se connecter avec n'importe quel compte
2. **Simuler l'expiration du access token** :
   - Ouvrir DevTools → Application → Session Storage
   - Copier le `refresh_token`
   - Modifier le `access_token` pour le rendre invalide (exemple: `invalid-token`)
3. Effectuer une action qui déclenche un appel API (rafraîchir la page, naviguer)

**Vérifications** :
- ☐ Dans Network, observer :
   1. Premier appel échoue avec 401
   2. Appel automatique à `POST /api/auth/refresh`
   3. Nouveau `access_token` reçu
   4. Requête originale relancée avec le nouveau token
- ☐ Pas de redirection vers `/login`
- ☐ L'application continue de fonctionner normalement
- ☐ Le nouveau `access_token` est stocké dans Session Storage

---

### Test 8 : Redirection vers /login si refresh token invalide

**Étapes** :
1. Se connecter avec n'importe quel compte
2. **Invalider les deux tokens** :
   - Modifier `access_token` → `invalid-access`
   - Modifier `refresh_token` → `invalid-refresh`
3. Rafraîchir la page ou effectuer une action

**Vérifications** :
- ☐ Appel à `POST /api/auth/refresh` échoue
- ☐ Session Storage est vidé
- ☐ Redirection automatique vers `/login`
- ☐ Pas d'erreur bloquante dans la console

---

## 🧪 Script de Test Automatisé

Vous pouvez exécuter le script de test automatisé avec Cypress ou Playwright :

```bash
cd /Users/tidianecisse/PROJET_INFO/plateforme_formation/forges-backend/frontend
npm run test:e2e
```

---

## 📊 Résultat Final

| Test | Statut | Notes |
|------|--------|-------|
| 1. Login ADMIN stocke token | ☐ | |
| 2. Logout vide token et redirige | ☐ | |
| 3. RoleGuard → /login si non auth | ☐ | |
| 4. RoleGuard → /unauthorized si rôle insuffisant | ☐ | |
| 5. useAuth retourne les bonnes valeurs | ☐ | |
| 6. Token auto-ajouté aux headers | ☐ | |
| 7. Refresh token automatique (401) | ☐ | |
| 8. Redirection /login si refresh échoue | ☐ | |

---

## ✅ Critères de Validation F-3

**F-3 est considéré comme validé si** :
- ✅ Les 6 tests principaux (1 à 6) passent avec succès
- ✅ Les tests bonus (7 et 8) passent avec succès
- ✅ Aucune erreur critique dans la console
- ✅ Le code respecte CLAUDE.md section 17.2 et 17.4

---

## 🐛 Dépannage

### Erreur : "Network Error" lors du login
- Vérifier que le backend est démarré sur `http://localhost:3000`
- Vérifier le CORS dans `.env` backend : `CORS_ORIGINS=http://localhost:5173`

### Erreur : "useAuth must be used within an AuthProvider"
- Vérifier que `<AuthProvider>` enveloppe bien `<RouterProvider>` dans `App.jsx`

### Session Storage vide après login
- Vérifier la réponse API dans Network → doit contenir `accessToken`, `refreshToken`, `user`
- Vérifier que `authStorage.setStoredSession()` est bien appelé dans `login()`

### Redirection vers /login en boucle
- Vérifier que le token est bien stocké dans Session Storage
- Vérifier que `isAuthenticated` passe bien à `true` après login
- Vérifier qu'il n'y a pas d'erreur dans `AuthProvider.restoreSession()`
