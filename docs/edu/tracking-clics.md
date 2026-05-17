# Tracking des clics utilisateurs — FORGES EDU

Les clics sont trackes via `trackClick()` cote frontend, loggues en JSON par le backend, et visibles dans Grafana sous la section **Clics utilisateurs**.

---

## Comment ajouter un tracking

Importer la fonction dans le composant :

```js
import { trackClick } from '../../utils/analytics';
```

Appeler sur l'action a tracker :

```jsx
<Button onClick={() => { trackClick('btn-inscription', { formationId: formation.id }); handleSubmit(); }}>
  S'inscrire
</Button>
```

Le second argument `metadata` est optionnel — ajouter uniquement ce qui est utile pour l'analyse.

---

## Signature

```js
trackClick(element, metadata = {})
```

| Parametre | Type | Description |
|---|---|---|
| `element` | `string` | Identifiant de l'element clique (ex: `"btn-inscription"`) |
| `metadata` | `object` | Donnees supplementaires optionnelles |

La page courante (`window.location.pathname`) est ajoutee automatiquement.

---

## Conventions de nommage pour `element`

| Prefixe | Usage | Exemple |
|---|---|---|
| `btn-` | Bouton d'action | `btn-inscription`, `btn-paiement`, `btn-annuler` |
| `nav-` | Lien de navigation | `nav-catalogue`, `nav-dashboard`, `nav-profil` |
| `link-` | Lien externe ou interne | `link-attestation-pdf`, `link-devis` |
| `tab-` | Onglet | `tab-sessions`, `tab-apprenants` |
| `card-` | Clic sur une carte | `card-formation` |
| `filter-` | Filtre ou recherche | `filter-niveau`, `filter-search` |

---

## Exemples par contexte

### Catalogue formations

```jsx
import { trackClick } from '../../utils/analytics';

// Clic sur une carte formation
<FormationCard onClick={() => trackClick('card-formation', { formationId: f.id, intitule: f.intitule })} />

// Bouton S'inscrire
<Button onClick={() => { trackClick('btn-inscription', { formationId }); handleInscription(); }}>
  S'inscrire
</Button>

// Filtre niveau
<select onChange={(e) => { trackClick('filter-niveau', { valeur: e.target.value }); setNiveau(e.target.value); }}>
```

### Espace apprenant

```jsx
// Telechargement attestation
<a onClick={() => trackClick('link-attestation-pdf', { dossierId })}>
  Attestation PDF
</a>

// Annulation inscription
<Button onClick={() => { trackClick('btn-annuler-inscription', { dossierId }); handleAnnulation(); }}>
  Annuler
</Button>
```

### Navigation

```jsx
// Liens navbar
<NavLink to="/apprenant/catalogue" onClick={() => trackClick('nav-catalogue')}>
  Catalogue
</NavLink>
```

---

## Ce qui apparait dans Grafana

Dans le dashboard **FORGES EDU Monitoring**, section **Clics utilisateurs** :

| Panel | Contenu |
|---|---|
| Flux de clics — temps reel | Chaque clic avec `user_id`, `element`, `page`, `timestamp` |
| Clics par element (5m) | Courbe par bouton/lien — voit ce qui est le plus clique |
| Clics par page (5m) | Courbe par URL — voit quelles pages sont les plus actives |

Requete Loki manuelle dans Explore :

```
{service_name=~"unknown_service|backend"} | json | __error__="" | action="USER_CLICK"
```

---

## Comportement technique

- **Fire-and-forget** : le tracking ne bloque jamais le UI, les erreurs reseau sont silencieuses
- **Auth optionnelle** : si l'utilisateur est connecte, son `user_id` est extrait du JWT; sinon `null`
- **`keepalive: true`** : le tracking survit meme si l'utilisateur navigue immediatement apres le clic
- **Rate limit** : soumis au rate limiter global (`/api/`) — 1000 req / 15 min par IP

---

## Pages prioritaires a instrumenter

| Page | Elements a tracker |
|---|---|
| `CatalogueEtudiantPage` | `card-formation`, `btn-inscription`, `filter-search`, `filter-niveau` |
| `MesDossiersPage` | `link-attestation-pdf`, `btn-annuler-inscription` |
| `LoginPage` | `btn-login`, `link-mot-de-passe-oublie` |
| `DashboardPage` | `nav-*`, `tab-*` |
| `FormationDetailPage` | `btn-inscription`, `tab-sessions`, `btn-retour` |
