# Design — Corrections pages détail backoffice (Dossier + Paiement)

Date : 2026-05-14
Scope : `/backoffice/dossiers/:id` (DossierDecision) et `/backoffice/paiements/:id` (PaiementDetail)
Approche retenue : corrections chirurgicales (A) — aucune restructuration complète

---

## Problèmes à corriger

### DossierDecision (`DossierDecision.jsx`)

**Problème A — Doublons de données**
La card "Informations du dossier" affiche le nom et l'email de l'apprenant, qui sont ensuite répétés dans la card "Apprenant". Supprimer nom/email de la card "Informations du dossier" et garder uniquement la card "Apprenant" dédiée pour toutes les données de la personne.

**Problème B — Motif de refus au mauvais endroit**
`dossier.motif_refus` est affiché dans la card "Voucher / apporteur", ce qui n'a aucun sens sémantique. Le déplacer dans une card dédiée "Motif de refus", visible uniquement si `dossier.motif_refus` est renseigné (statuts REFUSE ou REJETE).

**Problème E — Canal paiement affiché en texte brut**
Dans la card "Paiement", le canal (`FINEO`, `NGSER`, etc.) est affiché comme texte brut via `paiement.provider || paiement.methode`. Remplacer par la fonction `getCanalBadge()` qui existe déjà dans `PaiementDetail.jsx` — l'extraire en utilitaire partagé ou la dupliquer localement.

**Problème F — Commission apporteur absente**
Ajouter une card "Commission apporteur" visible uniquement si un `code_apporteur` est associé au dossier. Afficher : nom de l'apporteur, code, montant de commission (`commission_apporteur.montant`), statut du reversement.

---

### PaiementDetail (`PaiementDetail.jsx` dans `/backoffice/paiements/`)

**Problème C — Label bouton incorrect**
Le bouton de suppression affiche "Supprimer dossier" alors qu'il supprime le paiement via `paiementsApi.deleteAdmin()`. Renommer en "Supprimer le paiement".

**Problème D — `window.confirm()` bloquant**
La confirmation de suppression utilise `window.confirm()`, une dialog native qui bloque l'extension navigateur. Remplacer par une Modal React avec un état `isDeleteModalOpen`, sur le même modèle que `DossierDecision.jsx` qui utilise déjà `isConfirmModalOpen`.

**Problème F — Commission apporteur absente**
Ajouter une card "Commission apporteur" visible si `paiement.code_apporteur` est présent. Afficher : nom apporteur, code, montant commission, statut reversement.

---

## Données attendues de l'API

Pour la card commission, les champs attendus sur la réponse backoffice :
- `paiement.commission_apporteur` (objet ou null) avec :
  - `montant` (centimes)
  - `statut` (`EN_ATTENTE`, `VALIDE`, `REVERSE`)
  - `apporteur.nom`
- Sur le dossier : `dossier.commission_apporteur` ou via `dossier.paiement.commission_apporteur`

Si ces champs ne sont pas encore renvoyés par l'API, la card doit gérer le cas `null` silencieusement (ne pas afficher la card si pas de données).

---

## Fichiers impactés

| Fichier | Changements |
|---|---|
| `frontend/src/pages/backoffice/dossiers/DossierDecision.jsx` | Fix A, B, E, F |
| `frontend/src/pages/backoffice/paiements/PaiementDetail.jsx` | Fix C, D, F |

---

## Contraintes

- Aucune modification de l'API backend dans ce scope.
- Aucune création de nouveau composant UI réutilisable (la fonction `getCanalBadge` peut être dupliquée localement si elle n'est pas partageable facilement).
- La Modal de suppression dans `PaiementDetail` doit importer le composant `Modal` déjà utilisé dans `DossierDecision`.
- Les données de commission doivent être affichées en FCFA (divisées par 100, arrondies).
- Aucun emoji dans le code ou l'UI.
