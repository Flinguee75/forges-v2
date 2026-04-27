# ✅ Checklist de Validation F-4 — Layouts (4 espaces)

> **Objectif** : Valider que les 4 layouts (PublicLayout, EtudiantLayout, OrgLayout, BackofficeLayout) fonctionnent correctement et respectent la charte graphique FORGES.

---

## 🔧 Prérequis

1. **Backend démarré** sur `http://localhost:3000`
2. **Frontend démarré** sur `http://localhost:5173`
3. **Comptes de test disponibles** :
   - ADMIN : `admin@forges.ci` / `Admin123!`
   - SUPERVISEUR : `superviseur@forges.ci` / `Superviseur@2026!`
   - RESPONSABLE : `responsable.test@forges.ci` / `Responsable@2026!`
   - AGENT : `agent.test@forges.ci` / `Agent@2026!`
   - ETUDIANT : `etudiant.test@forges.ci` / `Etudiant@2026!`
   - ORGANISATION : `organisation.test@forges.ci` / `Organisation@2026!`
   - Astuce : la page `/login` propose aussi une connexion rapide en un clic en mode développement

---

## ✅ Test 1 : PublicLayout

**Routes à tester** : `/`, `/login`, `/components-demo`

### Vérifications Visuelles
- ☐ Header affiché avec logo "FORGES" en haut à gauche
- ☐ Navigation publique visible : "Accueil" et "Catalogue"
- ☐ Boutons "Connexion" et "Inscription" en haut à droite
- ☐ Footer affiché avec copyright "© 2026 FORGES"
- ☐ Fond de page gris clair (`bg-bg` = `#F4F6F7`)
- ☐ Pas de sidebar visible

### Navigation
- ☐ Cliquer "Accueil" → redirige vers `/`
- ☐ Cliquer "Catalogue" → redirige vers `/catalogue`
- ☐ Cliquer "Connexion" → redirige vers `/login`
- ☐ Cliquer "Inscription" → redirige vers `/register`

### Design
- ☐ Logo "FORGES" en bleu primaire `#1B4F72`
- ☐ Bouton "Inscription" en fond bleu primaire
- ☐ Hover sur "Inscription" → couleur secondaire `#2E86C1`
- ☐ Layout responsive (tester mobile)

---

## ✅ Test 2 : EtudiantLayout

**Route** : `/etudiant/dashboard`

### Prérequis
Se connecter avec un compte **ETUDIANT** (ou créer un compte étudiant)

### Vérifications Sidebar
- ☐ Sidebar affichée à gauche avec 6 éléments :
  1. 📊 Tableau de bord
  2. 📚 Catalogue
  3. 📁 Mes Dossiers
  4. 💳 Paiements
  5. 📜 Attestations
  6. 👤 Mon Profil
- ☐ Route active `/etudiant/dashboard` en surbrillance (fond bleu clair + bordure bleue droite)
- ☐ Les informations utilisateur ne sont pas répétées dans la sidebar
- ☐ Le header affiche le rôle, le nom/identité et le bouton Déconnexion

### Fonctionnalités
- ☐ Cliquer bouton toggle sidebar (◀) → sidebar se réduit (icons seulement)
- ☐ Cliquer à nouveau (▶) → sidebar se ré-ouvre
- ☐ En mode réduit : icons visibles, texte caché
- ☐ En mode réduit : hover sur icon logout (🚪) → tooltip "Déconnexion"
- ☐ Cliquer "Déconnexion" → logout + redirection `/login`

### Navigation
- ☐ Cliquer "Mes Dossiers" → route change vers `/etudiant/dossiers`
- ☐ Vérifier que la route active change visuellement
- ☐ Navigation fluide sans rechargement de page

### Header
- ☐ Header affiché avec "Espace Étudiant"
- ☐ Date du jour affichée à droite (format français)

### Design
- ☐ Sidebar fond blanc
- ☐ Bordure droite sidebar gris clair
- ☐ Route active : fond bleu primaire 10% opacité
- ☐ Transitions fluides (300ms)

---

## ✅ Test 3 : OrgLayout

**Route** : `/organisation/dashboard`

### Prérequis
Se connecter avec un compte **ORGANISATION**

### Vérifications Sidebar
- ☐ Sidebar affichée avec 6 éléments :
  1. 📊 Tableau de bord
  2. 👥 Employés
  3. 🎫 Vouchers
  4. 📋 Inscriptions
  5. 💰 Paiements
  6. 🏢 Profil Organisation
- ☐ Route active `/organisation/dashboard` en surbrillance
- ☐ Les informations utilisateur ne sont pas répétées dans la sidebar
- ☐ Le header affiche le rôle, l'identité et le bouton Déconnexion

### Fonctionnalités
- ☐ Sidebar collapsible fonctionne (même comportement que EtudiantLayout)
- ☐ Déconnexion fonctionne

### Header
- ☐ Header affiche "Espace Organisation"
- ☐ Date du jour affichée

### Design
- ☐ Même design que EtudiantLayout (cohérence visuelle)

---

## ✅ Test 4 : BackofficeLayout

**Route** : `/backoffice/dashboard`

### Prérequis
Se connecter avec un compte **ADMIN**

### Vérifications Sidebar
- ☐ Sidebar affichée avec sections hiérarchiques :
  - **Vue d'ensemble**
    - 📊 Dashboard
    - 📈 Rapports
  - **Catalogue**
    - 📚 Formations
    - 📅 Sessions
  - **Inscriptions**
    - 📁 Dossiers
    - 💳 Paiements
    - 🎫 Vouchers
  - **Administration**
    - 👥 Comptes

- ☐ Titres de section en UPPERCASE gris clair
- ☐ Route active `/backoffice/dashboard` en surbrillance
- ☐ Le header affiche l'identité utilisateur
- ☐ Le badge rôle est affiché dans le header avec la bonne couleur

### Fonctionnalités
- ☐ Sidebar collapsible fonctionne
- ☐ En mode réduit : sections masquées, icons visibles
- ☐ Scroll sidebar si navigation trop longue
- ☐ Déconnexion fonctionne

### Navigation
- ☐ Cliquer "Formations" → route change vers `/backoffice/formations`
- ☐ Cliquer "Sessions" → route change vers `/backoffice/sessions`
- ☐ Navigation fluide

### Header
- ☐ Header affiche "Backoffice FORGES"
- ☐ Date du jour affichée

### Filtrage par Rôle
**Test avec ADMIN** :
- ☐ Toutes les sections visibles

**Test avec SUPERVISEUR** (si compte disponible) :
- ☐ "Rapports" visible
- ☐ "Formations" visible
- ☐ "Sessions" visible
- ☐ "Dossiers" visible
- ☐ "Paiements" NON visible
- ☐ "Vouchers" NON visible
- ☐ "Comptes" NON visible

**Test avec RESPONSABLE** (si compte disponible) :
- ☐ Seulement "Formations" visible dans la sidebar

**Test avec AGENT** (si compte disponible) :
- ☐ "Paiements" et "Vouchers" visibles
- ☐ Pas "Comptes"

### Design
- ☐ Badge rôle coloré selon rôle :
  - ADMIN → Rouge
  - SUPERVISEUR → Orange
  - RESPONSABLE → Bleu secondaire
  - AGENT → Vert

---

## ✅ Test 5 : Responsiveness

### Mobile (< 768px)
- ☐ PublicLayout : navigation mobile adaptée
- ☐ Sidebar layouts : affichage correct sur mobile
- ☐ Bouton toggle sidebar accessible
- ☐ Pas de scroll horizontal

### Tablet (768px - 1024px)
- ☐ Layouts s'adaptent correctement
- ☐ Sidebar reste fonctionnelle

### Desktop (> 1024px)
- ☐ Layouts optimaux
- ☐ Sidebar ouverte par défaut

---

## ✅ Test 6 : Intégration React Router

### Outlets
- ☐ `<Outlet />` fonctionne dans tous les layouts
- ☐ Pages enfants s'affichent dans `<main>`
- ☐ Navigation sans rechargement

### Guards
- ☐ Tenter d'accéder `/etudiant` sans login → redirection `/login`
- ☐ Tenter d'accéder `/backoffice` avec ETUDIANT → redirection `/unauthorized`
- ☐ RoleGuard + Layout fonctionnent ensemble

---

## ✅ Test 7 : Accessibilité

- ☐ Bouton toggle sidebar a `aria-label`
- ☐ Navigation clavier fonctionne (Tab)
- ☐ Focus visible sur éléments interactifs
- ☐ Contraste texte/fond suffisant (WCAG AA)

---

## 📊 Résultat Final

| Test | Statut | Notes |
|------|--------|-------|
| 1. PublicLayout | ☐ | |
| 2. EtudiantLayout | ☐ | |
| 3. OrgLayout | ☐ | |
| 4. BackofficeLayout | ☐ | |
| 5. Responsiveness | ☐ | |
| 6. React Router | ☐ | |
| 7. Accessibilité | ☐ | |

---

## ✅ Critères de Validation F-4

**F-4 est considéré comme validé si** :
- ✅ Les 4 layouts s'affichent correctement
- ✅ Sidebar collapsible fonctionne
- ✅ Navigation et routes actives fonctionnent
- ✅ Filtrage par rôle fonctionne (BackofficeLayout)
- ✅ Déconnexion fonctionne dans tous les layouts
- ✅ Design conforme à la charte FORGES (CLAUDE.md 17.2)
- ✅ Responsive sur mobile/tablet/desktop

---

## 🐛 Problèmes Identifiés

_(À compléter pendant les tests)_

---

## 📝 Notes de Test

_(À compléter pendant les tests)_
