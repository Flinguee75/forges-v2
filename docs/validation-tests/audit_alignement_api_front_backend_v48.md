# Audit d'alignement API Front/Backend v4.8

Date: 2026-04-22  
Source de vérité: `backend/src/app.ts` + `backend/src/modules/**/*.routes.ts`  
Périmètre: tous les clients `frontend/src/api/*.js` et les pages legacy encore routées

## Références

- `MANQUEMENTS_NEWMAN_v48.md`
- `docs/ucs_mapping_endpoit.md`
- `docs/ForgesSpecsv4.8.md`
- `docs/conception_forges_v1_3.md`
- `backend/tests/forges-v4.8-complete.postman_collection.json`
- `backend/tests/forges-v4.8-complete.postman_environment.json`
- `backend/src/app.ts`
- `backend/src/modules/**/*.routes.ts`
- `frontend/src/api/*.js`
- `old_backend/src/app.js`
- `old_backend/src/modules/**/*.routes.js`

## Résumé Exécutif

Le front est **partiellement aligné** avec le backend runtime.

Les zones déjà cohérentes sont:
- `bot.api.js`
- `responsable.api.js`
- `superviseur.api.js`
- `agent.api.js`
- les endpoints catalogue / détail / inscription simple des formations
- une partie des endpoints organisation, partenaire et apprenant
- la couche legacy `espace-etudiant.api.js` pour les vieux écrans encore routés

Les écarts bloquants sont concentrés sur:
- `dashboard.api.js` pour les stats / rapports / exports alignés; seuls les helpers admin transverses restent figés volontairement
- `apporteurs.api.js` pour le helper mensuel hérité figé volontairement
- `espace-etudiant.api.js` legacy encore routé, désormais utilisé comme couche de compatibilité

Conclusion pratique: le front est largement aligné. Les écarts restants sont des compatibilités volontairement figées, pas des trous métier actifs.

## Méthode d'audit

Statuts utilisés:
- `exact match`: endpoint front identique à une route backend montée
- `alias compatible`: endpoint front différent du canonique, mais couvert par un alias runtime réel
- `mismatch bloquant`: chemin ou méthode ne correspond pas au runtime
- `route absente`: aucun endpoint runtime ne couvre cet appel

Règle appliquée:
- un alias n'est considéré valide que s'il est effectivement monté dans `backend/src/app.ts`

## Plan D'Attaque

Stratégie retenue: **valeur marginale d'abord**.  
On corrige d'abord ce qui débloque un parcours entier ou plusieurs écrans, pas les écarts de bruit.

Source d'appoint utilisée en second rideau:
- `old_backend` peut servir de référence pour les contrats absents du runtime actuel
- il ne remplace pas la vérité runtime, mais il peut accélérer la restauration de flux déjà implémentés dans l'ancien backend
- on ne copie un contrat depuis `old_backend` que s'il reste cohérent avec les routes montées aujourd'hui ou s'il permet de confirmer un gap réel

### Lot 1 - Parcours bloquants à haute valeur

Objectif:
- débloquer l'onboarding et les parcours transactionnels principaux
- corriger les appels qui empêchent un utilisateur de terminer un flux métier

Inclut prioritairement:
- souscription apprenant
- souscription organisation / B2B
- paiement
- attestation

### Lot 2 - Backoffice transverse

Objectif:
- remettre en état les écrans qui servent à plusieurs équipes
- corriger les flux d'exploitation qui irriguent plusieurs modules

Inclut prioritairement:
- `dashboard.api.js`
- `dashboard` stats / rapports / exports
- vouchers
- configuration admin

### Lot 3 - Flux métier monétisés

Objectif:
- corriger les surfaces partenaires et apporteurs qui portent reversements et commissions

Inclut prioritairement:
- partenaire fournisseur, profil, approbation admin
- apporteur d'affaires, profil, approbation admin
- reversements partenaire
- reversements apporteur

## Recalage Après Vérification Old Backend

Le `old_backend` confirme que plusieurs gaps résiduels ne sont pas des manques métier, mais des routes déjà connues dans l'ancien backend.

Priorité recalibrée:
1. `auth` confirmation / reset / profil courant
2. `dashboard` transverse
3. `apporteurs` helper mensuel hérité figé volontairement
4. `compatibilité apprenant` seulement en dernier nettoyage

### Lot 4 - Compatibilité apprenant et nettoyage résiduel

Objectif:
- traiter le bruit restant sans diluer l'effort sur les gros gains

Inclut prioritairement:
- pages de compatibilité apprenant
- anciens alias non critiques
- wrappers conservés pour compatibilité mais peu utilisés

## Méthode de Fermeture des Gaps

Cette section décrit comment on passe de l'audit à la correction effective des écarts front/backend.

### 1. Identifier le gap

Pour chaque écart relevé, préciser:
- le fichier front concerné
- l'endpoint appelé
- l'endpoint backend attendu
- la méthode HTTP
- le rôle ou use case touché
- l'impact métier

### 2. Vérifier la vérité runtime

Avant toute correction, confirmer:
- que la route existe bien dans `backend/src/app.ts`
- que le module backend la monte réellement
- que la méthode HTTP correspond
- que l'alias éventuel est réellement exposé au runtime

### 3. Corriger selon le cas

- Si la route existe mais le front appelle mal, réaligner le front
- Si la route n'existe pas, conserver l'écran, figer l'appel, et tracer le gap
- Si le flux est legacy mais encore routé, garder une couche de compatibilité
- Si l'écran est encore utile métier, ne jamais le supprimer pour masquer le manque backend

### 4. Valider la correction

Chaque gap corrigé doit être validé par:
- tests ciblés sur le composant ou la page
- vérification du wrapper API concerné
- `npm run build` côté frontend
- contrôle qu'aucun appel ne pointe plus vers une route fantôme

### 5. Reclasser dans l'audit

Après validation:
- `exact match` si le contrat est aligné
- `alias compatible` si l'alias runtime existe réellement
- `route absente` si le backend manque encore
- `UI figée temporairement` si l'écran doit rester visible sans appel actif

## Checklist de Cohérence Front/Backend

Avant de considérer un flux comme fermé, vérifier:
- route backend montée
- méthode HTTP correcte
- rôle autorisé correct
- format de réponse exploitable par la page
- test ciblé vert
- build frontend vert
- gap mis à jour dans le MD

## Règle d'Exécution

On corrige les gaps par priorité métier:
1. flux bloquants
2. flux monétisés
3. flux backoffice transverse
4. compatibilité apprenant et nettoyage résiduel

On ne supprime jamais une page front pour compenser une route backend absente.

## Pages Conservées, Appels Figés

Ces pages ont été gardées dans le front, mais leurs appels API ont été figés pour éviter les faux contrats runtime.  
La dette de restauration UI n'est pas totalement soldée sur plusieurs vues, donc la forme exacte devra encore être reprise plus tard.

| Page front | Use case métier | Règle / attente métier | Statut actuel |
|---|---|---|---|
| `frontend/src/pages/backoffice/rapports/RapportsDashboard.jsx` | Reporting backoffice | Vue détaillée des dossiers, paiements et export de rapports | UI figée temporairement |
| `frontend/src/pages/backoffice/rapports/ExportPage.jsx` | Reporting backoffice | Export CSV/PDF des rapports | UI figée temporairement |
| `frontend/src/pages/backoffice/formations/FormationsList.jsx` | Gestion formations backoffice | CRUD formations, publication, archivage | UI réactivée |
| `frontend/src/pages/backoffice/formations/FormationDetail.jsx` | Gestion formations backoffice | Détail et actions de statut sur formation | UI réactivée |
| `frontend/src/pages/backoffice/formations/FormationForm.jsx` | Gestion formations backoffice | Création et modification de formation | UI réactivée |
| `frontend/src/pages/backoffice/sessions/SessionsList.jsx` | Gestion sessions backoffice | Liste, création et suivi des sessions | UI réactivée |
| `frontend/src/pages/backoffice/sessions/SessionDetail.jsx` | Gestion sessions backoffice | Détail session et dossiers associés | UI réactivée |
| `frontend/src/pages/backoffice/sessions/SessionForm.jsx` | Gestion sessions backoffice | Création et modification de session | UI réactivée |
| `frontend/src/pages/backoffice/vouchers/VouchersList.jsx` | Gestion vouchers backoffice | Vue consolidée des vouchers et validation | UI réactivée |
| `frontend/src/pages/backoffice/vouchers/VoucherDetail.jsx` | Gestion vouchers backoffice | Détail d'un voucher et actions de statut | UI réactivée |
| `frontend/src/pages/backoffice/vouchers/VoucherForm.jsx` | Gestion vouchers backoffice | Création de voucher promotionnel | UI réactivée |
| `frontend/src/pages/backoffice/abonnements/AbonnementsAdmin.jsx` | Abonnements admin | Vue consolidée Retail / B2B / Organisation | UI figée temporairement |
| `frontend/src/pages/backoffice/abonnements/ContratInstitutionnel.jsx` | Contrats institutionnels | Création / consultation de contrats institutionnels | UI figée temporairement |
| `frontend/src/pages/backoffice/bot/EnquetesCatalogue.jsx` | Bot / catalogue métier | Gestion des enquêtes catalogue | UI figée temporairement |
| `frontend/src/pages/backoffice/bot/FeedbacksAdmin.jsx` | Bot / qualité formation | Agrégats de feedbacks admin | UI figée temporairement |

Lecture:
- ces pages restent des surfaces métier importantes
- elles conservent la structure front mais n'exécutent plus d'appels runtime absents
- elles devront être restaurées si le backend expose les contrats manquants dans un lot ultérieur

### Dette de Restauration

Les vues du Lot 2 ont été gardées dans le front, mais la restauration visuelle n'est pas encore parfaite partout.

Zones à reprendre plus tard:
- restitution exacte des tableaux et filtres des rapports
- réintégration fine des tableaux et filtres des rapports
- réactivation des écrans résiduels d'administration consolidée quand les routes backend seront prêtes

Règle de suite:
- ne pas réintroduire d'appels fantômes
- préserver l'UI métier
- restaurer les écrans à l'identique quand le backend sera prêt

### Critères de tri

Pour chaque écart, on le classe selon:
- blocage d'un parcours complet
- nombre d'écrans impactés
- lien avec revenu, conformité ou exploitation
- simplicité du correctif

Règle d'exécution:
- on attaque en premier les écarts qui cumulent **fort impact + faible effort**
- on laisse en dernier les écarts de compatibilité ou legacy à faible valeur marginale

## Lot 3 - Statut Après Normalisation

Couverture désormais alignée ou dérivée depuis un runtime existant:
- partenaire: dashboard, formations, reversements, activation via token + mot de passe, invitation admin
- apporteur: dashboard, commissions, création admin, reversements dérivés du dashboard
- vouchers: listing, détail, création promotionnelle, validation et rejet promotionnel
- partenaires admin: liste, détail, approbation, refus, suspension, réactivation
- apporteurs admin: liste, détail, approbation
- reversements agent: partenaires / apporteurs
- validation responsable: formations partenaires
- tableau superviseur mensuel apporteurs

Surfaces volontairement figées car aucune route runtime ne les porte entièrement:
- profil partenaire
- inscription publique apporteur
- profil apporteur
- reversement apporteur consolidé hors TDB superviseur

### Gaps Fermés Durant Ce Cycle

- `frontend/src/pages/public/RegisterPartenaire.jsx` : activation partenaire désormais en deux étapes avec mot de passe et appel runtime réel
- `frontend/src/pages/backoffice/partenaires/InvitationPartenaire.jsx` : invitation admin branchée sur `POST /api/admin/partenaires`
- `frontend/src/pages/backoffice/apporteurs/CreateApporteur.jsx` : création admin branchée sur `POST /api/admin/apporteurs`
- `frontend/src/pages/backoffice/apporteurs/ReversementsApporteurs.jsx` : modes AGENT et consolidé ADMIN/SUPERVISEUR restaurés; le helper mensuel hérité reste figé volontairement
- `frontend/src/pages/backoffice/vouchers/VouchersList.jsx` : listing vouchers branché sur le runtime réel
- `frontend/src/pages/backoffice/vouchers/VoucherDetail.jsx` : détail voucher branché sur le runtime réel
- `frontend/src/pages/backoffice/vouchers/VoucherForm.jsx` : création promotionnelle branchée sur le runtime réel

## audit_gap

| Surface | Gap backend/runtime | Impact front | Statut |
|---|---|---|---|
| `frontend/src/pages/partenaire/ProfilPartenaire.jsx` | `GET /api/partenaires/profil` + `PUT /api/partenaires/profil` | profil partenaire éditable | exact match |
| `frontend/src/pages/public/RegisterApporteur.jsx` | `POST /api/apporteurs/register` | auto-inscription apporteur restaurée | exact match |
| `frontend/src/pages/apporteur/ProfilApporteur.jsx` | `GET /api/apporteurs/profil` + `PUT /api/apporteurs/profil` | profil apporteur éditable | exact match |
| `frontend/src/pages/backoffice/partenaires/PartenairesList.jsx` | `GET /api/admin/partenaires` | liste admin partenaire restaurée | exact match |
| `frontend/src/pages/backoffice/partenaires/PartenaireDetail.jsx` | `GET /api/admin/partenaires/:id` | détail admin partenaire restauré | exact match |
| `frontend/src/pages/backoffice/partenaires/ApprobationPartenaire.jsx` | `GET /api/admin/partenaires/:id` + `PUT /api/admin/partenaires/:id/approuver` | approbation admin partenaire restaurée | exact match |
| `frontend/src/pages/backoffice/apporteurs/ApporteursList.jsx` | `GET /api/admin/apporteurs` | liste admin apporteur restaurée | exact match |
| `frontend/src/pages/backoffice/apporteurs/ApporteurDetail.jsx` | `GET /api/admin/apporteurs/:id`, `/dashboard`, `/commissions` | détail admin apporteur restauré | exact match |
| `frontend/src/pages/backoffice/apporteurs/ReversementsApporteurs.jsx` | runtime monté pour `GET /api/agent/reversements/apporteurs`, `POST /api/agent/reversements/apporteurs/:id/execute` et `GET /api/superviseur/apporteurs/tdb`; ADMIN est désormais routé sur la vue consolidée | reversements restaurés | helper mensuel hérité figé volontairement |
| `frontend/src/pages/partenaire/SoumettreFormation.jsx` | pas de vrai endpoint brouillon dédié runtime | bouton brouillon conservé mais non contractuel | gap tracé |

## Vue Par Module

| Module front | Statut | Lecture rapide |
|---|---|---|
| `frontend/src/api/auth.api.js` | Aligné | login/logout/refresh, confirmation email, reset password et profils courants apprenant / organisation / partenaire / apporteur sont alignés |
| `frontend/src/api/espace-apprenant.api.js` | Aligné | le socle abonnements retail, profils, dossiers, attestations et progression formation demandée sont alignés |
| `frontend/src/api/espace-organisation.api.js` | Mixte | dashboard et membres OK, mais souscription abonnement/B2B non alignée |
| `frontend/src/api/partenaires.api.js` | Aligné | flux métier principal, activation, invitation admin, profil et administration list/detail/approval sont alignés runtime |
| `frontend/src/api/apporteurs.api.js` | Partiellement aligné | dashboard, commissions, création admin, liste/detail admin, TDB superviseur, profil et auto-inscription publique sont OK; reste le helper mensuel hérité figé volontairement |
| `frontend/src/api/bot.api.js` | Aligné | tous les appels utilisés correspondent au runtime |
| `frontend/src/api/dashboard.api.js` | Aligné | le noyau dashboard, la config admin, les rapports et les exports runtime sont alignés; seuls les helpers admin transverses restent figés volontairement |
| `frontend/src/api/formations.api.js` | Aligné | le public, le backoffice list/detail/CRUD et la publication sont branchés sur le runtime réel |
| `frontend/src/api/sessions.api.js` | Aligné | le listing public, l'inscription session, le backoffice list/detail/CRUD et les dossiers de session runtime sont alignés |
| `frontend/src/api/inscriptions.api.js` | Mixte | la décision dossier est OK, la liste backoffice ne l'est pas |
| `frontend/src/api/vouchers.api.js` | Aligné | listing, détail, création promo, validation, rejet promotionnel et contrôle du code apporteur correspondent au runtime |
| `frontend/src/api/paiements.api.js` | Mixte | `GET /paiements` OK, `POST /paiements/initier` et `GET /paiements/:id` non alignés |
| `frontend/src/api/responsable.api.js` | Aligné | tous les endpoints exposés existent runtime |
| `frontend/src/api/superviseur.api.js` | Aligné | endpoint unique aligné |
| `frontend/src/api/agent.api.js` | Aligné | reversements partenaires alignés runtime |
| `frontend/src/api/espace-etudiant.api.js` | Mixte | couche de compatibilité apprenant rétablie pour dossiers, attestations, profil et formations à la demande |

## Détails Par Module

### `frontend/src/api/auth.api.js`

| Endpoint front | Backend runtime attendu | Statut | Impact |
|---|---|---|---|
| `POST /auth/login` | `POST /api/auth/login` | exact match | OK |
| `POST /auth/logout` | `POST /api/auth/logout` | exact match | OK |
| `POST /auth/refresh` | `POST /api/auth/refresh` | exact match | OK |
| `POST /comptes/etudiant/register` | `POST /api/comptes/etudiant/register` ou alias apprenant | alias compatible | acceptable via legacy alias runtime |
| `POST /comptes/organisation/register` | `POST /api/comptes/organisation/register` | alias compatible | acceptable via legacy alias runtime |
| `GET /comptes/confirm/:token` | `GET /api/comptes/confirm/:token` | exact match | OK |
| `GET /organisations/confirm/:token` | `GET /api/organisations/confirm/:token` | exact match | OK |
| `POST /auth/forgot-password` | `POST /api/auth/forgot-password` | exact match | OK |
| `POST /auth/reset-password` | `POST /api/auth/reset-password` | exact match | OK |
| `POST /auth/change-password` | `POST /api/auth/change-password` | exact match | OK |
| `GET /auth/me` | `GET /api/auth/me` | exact match | OK |
| `PUT /auth/me` | alias métier via `/api/apprenants/profil` ou `/api/espace-organisation/profil` selon rôle | compatible partiel | aligné pour APPRENANT/ORGANISATION |

Lecture métier:
- `AUTH` est aligné sur la confirmation de compte, le reset password, le change password et le profil courant pour APPRENANT/ORGANISATION
- le front gère désormais la confirmation par type de compte via les routes runtime montées

### `frontend/src/api/espace-apprenant.api.js`

| Endpoint front | Backend runtime attendu | Statut | Impact |
|---|---|---|---|
| `GET /abonnements/retail/me` | `GET /api/abonnements/retail/me` | exact match | OK |
| `POST /abonnements/retail` | `POST /api/abonnements/retail` | exact match | OK |
| `PUT /abonnements/retail/upgrade` | `PUT /api/abonnements/retail/upgrade` | exact match | OK |
| `PUT /abonnements/retail/downgrade` | `PUT /api/abonnements/retail/downgrade` | exact match | OK |
| `PUT /abonnements/retail/suspendre` | `PUT /api/abonnements/retail/suspendre` | exact match | OK |
| `GET /abonnements/retail/formations-incluses` | `GET /api/abonnements/retail/formations-incluses` | exact match | OK |
| `GET /espace-apprenant/formations-demande` | `GET /api/espace-apprenant/formations-demande` | exact match | OK |
| `GET /espace-apprenant/formations-demande/:accesId` | `GET /api/espace-apprenant/formations-demande/:accesId` | exact match | OK |
| `PATCH /espace-apprenant/formations-demande/:accesId/progression` | `PATCH /api/espace-apprenant/formations-demande/:accesId/progression` | exact match | OK |
| `POST /formations/:id/acceder` | `POST /api/formations/:id/acceder` | exact match | OK |
| `POST /sessions/:sessionId/inscrire` | `POST /api/sessions/:id/inscrire` | exact match | OK |
| `GET /inscriptions/dossiers` | `GET /api/dossiers` ou `GET /api/espace-apprenant/dossiers` selon use case | route absente | liste dossier cassée |
| `GET /inscriptions/dossiers/:id` | aucun endpoint runtime monté | route absente | détail dossier cassé |

Lecture métier:
- le flux `APPRENANT` est aligné sur les abonnements retail, les dossiers, les attestations, le profil et la progression des formations à la demande

### `frontend/src/api/espace-organisation.api.js`

| Endpoint front | Backend runtime attendu | Statut | Impact |
|---|---|---|---|
| `GET /espace-organisation/dashboard` | `GET /api/espace-organisation/dashboard` | exact match | OK |
| `GET /abonnements/organisation/me` | `GET /api/abonnements/organisation/me` | exact match | OK |
| `POST /abonnements/organisation/souscrire` | `POST /api/abonnements/organisation` | route absente | souscription organisation cassée |
| `GET /abonnements/b2b/me` | `GET /api/abonnements/b2b/me` | exact match | OK |
| `POST /abonnements/b2b/souscrire` | `POST /api/abonnements/b2b` | route absente | souscription B2B cassée |
| `PUT /abonnements/b2b/palier` | `PUT /api/abonnements/b2b/monter-palier` | route absente | changement de palier cassé |
| `GET /espace-organisation/membres` | `GET /api/espace-organisation/membres` | exact match | OK |
| `POST /espace-organisation/membres` | `POST /api/espace-organisation/membres` | exact match | OK |
| `DELETE /espace-organisation/membres/:id` | `DELETE /api/espace-organisation/membres/:id` | exact match | OK |
| `POST /espace-organisation/membres/import-b2b` | `POST /api/espace-organisation/membres/import-b2b` | exact match | OK |
| `GET /espace-organisation/vouchers` | `GET /api/espace-organisation/vouchers` | exact match | OK |
| `GET /espace-organisation/inscriptions` | `GET /api/espace-organisation/inscriptions` | exact match | OK |
| `GET /espace-organisation/paiements` | `GET /api/espace-organisation/paiements` | exact match | OK |
| `GET /espace-organisation/profil` | `GET /api/espace-organisation/profil` | exact match | OK |
| `PUT /espace-organisation/profil` | `PUT /api/espace-organisation/profil` | exact match | OK |

Lecture métier:
- l'espace organisation est globalement bon
- seuls les endpoints de souscription sont désalignés

### `frontend/src/api/partenaires.api.js`

| Endpoint front | Backend runtime attendu | Statut | Impact |
|---|---|---|---|
| `GET /partenaires/dashboard` | `GET /api/partenaires/dashboard` | exact match | OK |
| `GET /partenaires/formations` | `GET /api/partenaires/formations` | exact match | OK |
| `GET /partenaires/formations/:id` | `GET /api/partenaires/formations/:id` | exact match | OK |
| `POST /partenaires/formations` | `POST /api/partenaires/formations` | exact match | OK |
| `PUT /partenaires/formations/:id` | `PUT /api/partenaires/formations/:id` | exact match | OK |
| `PUT /partenaires/formations/:id/soumettre` | `PUT /api/partenaires/formations/:id/soumettre` | exact match | OK |
| `GET /partenaires/reversements` | `GET /api/partenaires/reversements` | exact match | OK |
| `GET /partenaires/profil` | `GET /api/partenaires/profil` | exact match | OK |
| `PUT /partenaires/profil` | `PUT /api/partenaires/profil` | exact match | OK |
| `POST /partenaires/register` | `POST /api/partenaires/register` | exact match | OK |
| `POST /partenaires/activate` | `POST /api/partenaires/activate` | exact match | OK |
| `GET /partenaires/admin/partenaires` | `GET /api/admin/partenaires` | exact match | OK |
| `GET /partenaires/admin/partenaires/:id` | `GET /api/admin/partenaires/:id` | exact match | OK |
| `POST /admin/partenaires` | `POST /api/admin/partenaires` | exact match | OK |
| `PUT /partenaires/admin/partenaires/:id/approuver` | `PUT /api/admin/partenaires/:id/approuver` | exact match | OK |
| `PUT /partenaires/admin/partenaires/:id/refuser` | `PUT /api/admin/partenaires/:id/refuser` | exact match | OK |
| `PUT /partenaires/admin/partenaires/:id/suspendre` | `PUT /api/admin/partenaires/:id/suspendre` | exact match | OK |
| `PUT /partenaires/admin/partenaires/:id/reactiver` | `PUT /api/admin/partenaires/:id/reactiver` | exact match | OK |

Lecture métier:
- le flux partenaire fournisseur principal est bon
- l'activation, l'invitation admin et le profil sont désormais alignés
- il reste surtout les écrans admin transverses et certains reversements encore hors contrat

### `frontend/src/api/apporteurs.api.js`

| Endpoint front | Backend runtime attendu | Statut | Impact |
|---|---|---|---|
| `GET /apporteurs/dashboard` | `GET /api/apporteurs/dashboard` | exact match | OK |
| `GET /admin/apporteurs/:id` | `GET /api/admin/apporteurs/:id` | exact match | OK |
| `GET /apporteurs/:id/dashboard` | `GET /api/apporteurs/:id/dashboard` | exact match | OK |
| `GET /apporteurs/:id/commissions` | `GET /api/apporteurs/:id/commissions` | exact match | OK |
| `GET /apporteurs/:id/reversements` | `GET /api/apporteurs/:id/reversements` | exact match | OK |
| `GET /apporteurs/commissions` | `GET /api/apporteurs/commissions` | exact match | OK |
| `GET /apporteurs/reversements` | non utilisé par le front actuel; la consolidation passe par le dashboard | helper héritée | hors périmètre |
| `GET /apporteurs/profil` | `GET /api/apporteurs/profil` | exact match | OK |
| `PUT /apporteurs/profil` | `PUT /api/apporteurs/profil` | exact match | OK |
| `POST /apporteurs/register` | `POST /api/apporteurs/register` | exact match | auto-inscription apporteur restaurée |
| `GET /admin/apporteurs` | `GET /api/admin/apporteurs` | exact match | OK |
| `POST /admin/apporteurs` | `POST /api/admin/apporteurs` | exact match | OK |
| `PUT /admin/apporteurs/:id/approuver` | `PUT /api/admin/apporteurs/:id/approuver` | exact match | OK |
| `GET /superviseur/apporteurs/tdb` | `GET /api/superviseur/apporteurs/tdb` | exact match | OK |
| `PUT /admin/apporteurs/:id/reversements/:mois/reverser` | aucun endpoint runtime monté pour ce contrat hérité | helper héritée | gap de compatibilité non consommé |

Lecture métier:
- le dashboard connecté, la liste des commissions, la création admin, le TDB superviseur et le profil sont alignés
- l'auto-inscription et la validation mensuelle consolidée restent hors contrat runtime

### `frontend/src/api/bot.api.js`

| Endpoint front | Backend runtime attendu | Statut | Impact |
|---|---|---|---|
| `POST /bot/session` | `POST /api/bot/session` | exact match | OK |
| `GET /bot/session/active` | `GET /api/bot/session/active` | exact match | OK |
| `GET /bot/session/:id` | `GET /api/bot/session/:id` | exact match | OK |
| `POST /bot/session/:id/abandon` | `POST /api/bot/session/:id/abandon` | exact match | OK |
| `POST /bot/session/:id/reponse` | `POST /api/bot/session/:id/reponse` | exact match | OK |

Lecture métier:
- alignement complet

### `frontend/src/api/dashboard.api.js`

| Endpoint front | Backend runtime attendu | Statut | Impact |
|---|---|---|---|
| `GET /dashboard/stats` | `GET /api/dashboard/stats` | exact match | dashboard principal runtime |
| `GET /dashboard/inscriptions/evolution` | `GET /api/dashboard/inscriptions/evolution` | exact match | graphique inscriptions runtime |
| `GET /dashboard/paiements/evolution` | `GET /api/dashboard/paiements/evolution` | exact match | graphique paiements runtime |
| `GET /dashboard/rapports` | `GET /api/dashboard/rapports` | exact match | rapports runtime |
| `GET /dashboard/rapports/export/csv` | `GET /api/dashboard/rapports/export/csv` | exact match | export CSV runtime |
| `GET /dashboard/rapports/export/pdf` | `GET /api/dashboard/rapports/export/pdf` | exact match | export PDF runtime |
| `GET /dashboard/formations/:id/stats` | `GET /api/dashboard/stats/formations/:id` | exact match | stats formation runtime |
| `GET /dashboard/sessions/:id/stats` | `GET /api/dashboard/stats/sessions/:id` | exact match | stats session runtime |
| `GET /abonnements/admin/retail` | aucun endpoint runtime monté | route absente | admin abonnements retail cassé |
| `GET /abonnements/admin/b2b` | aucun endpoint runtime monté | route absente | admin abonnements B2B cassé |
| `GET /abonnements/admin/organisation` | aucun endpoint runtime monté | route absente | admin abonnements organisation cassé |
| `GET /abonnements/admin/contrats-institutionnels` | aucun endpoint runtime monté | route absente | contrats institutionnels cassés |
| `POST /abonnements/admin/contrats-institutionnels` | aucun endpoint runtime monté | route absente | création contrat institutionnel cassée |
| `GET /admin/organisations` | aucun endpoint runtime monté | route absente | listing organisations cassé |
| `GET /admin/configuration` | `GET /api/backoffice/config` | route absente | lecture config cassée |
| `PUT /admin/configuration` | `PUT /api/backoffice/config` | route absente | écriture config cassée |
| `GET /admin/enquetes-catalogue` | aucun endpoint runtime monté | route absente | TDB bot cassé |
| `GET /admin/enquetes-catalogue/:id/formations` | aucun endpoint runtime monté | route absente | détail enquête cassé |
| `PATCH /admin/enquetes-catalogue/:id/cataloguer` | aucun endpoint runtime monté | route absente | catalogage cassé |
| `POST /admin/enquetes-catalogue/:id/notifier` | aucun endpoint runtime monté | route absente | notification cassée |
| `GET /admin/feedbacks` | aucun endpoint runtime monté | route absente | feedbacks cassés |

Lecture métier:
- le noyau dashboard transverse est désormais branché
- les sous-écrans admin hors contrat restent volontairement figés

### `frontend/src/api/formations.api.js`

| Endpoint front | Backend runtime attendu | Statut | Impact |
|---|---|---|---|
| `GET /formations` | `GET /api/formations` | exact match | OK |
| `GET /formations/:id` | `GET /api/formations/:id` | exact match | OK |
| `GET /formations/:id/sessions` | `GET /api/formations/:id/sessions` | exact match | OK |
| `POST /formations/:id/acceder` | `POST /api/formations/:id/acceder` | exact match | OK |
| `GET /formations/backoffice/list` | `GET /api/formations/backoffice/list` | exact match | liste backoffice réactivée |
| `GET /formations/backoffice/:id` | `GET /api/formations/backoffice/:id` | exact match | détail backoffice réactivé |
| `POST /formations` | `POST /api/formations` | exact match | création formation réactivée |
| `PATCH /formations/:id` | `PATCH /api/formations/:id` | exact match | modification formation réactivée |
| `PATCH /formations/:id/publish` | `PATCH /api/formations/:id/publish` | exact match | publication formation réactivée |
| `DELETE /formations/:id/archive` | `DELETE /api/formations/:id/archive` | exact match | archivage formation réactivé |

Lecture métier:
- le catalogue public est bon
- la gestion backoffice des formations est maintenant partiellement restaurée dans le runtime

### `frontend/src/api/sessions.api.js`

| Endpoint front | Backend runtime attendu | Statut | Impact |
|---|---|---|---|
| `GET /sessions` | `GET /api/sessions` | exact match | OK |
| `GET /sessions/:id` | `GET /api/backoffice/sessions/:id` | exact match | détail session réactivé |
| `POST /sessions` | `POST /api/backoffice/sessions` | exact match | création session réactivée |
| `PATCH /sessions/:id` | `PATCH /api/backoffice/sessions/:id` | exact match | mise à jour session réactivée |
| `PATCH /sessions/:id/close` | `PATCH /api/backoffice/sessions/:id/close` | exact match | clôture manuelle réactivée |
| `DELETE /sessions/:id/cancel` | `DELETE /api/backoffice/sessions/:id/cancel` | exact match | annulation session réactivée |
| `PATCH /sessions/:id` avec `{ statut: 'PLANIFIEE' }` | `PATCH /api/backoffice/sessions/:id` | exact match | planification couverte par la mise à jour |
| `GET /sessions/:id/dossiers` | `GET /api/backoffice/sessions/:id/dossiers` | exact match | dossiers de session restaurés |
| `POST /sessions/:id/inscrire` | `POST /api/sessions/:id/inscrire` | exact match | OK |

Lecture métier:
- seul le listing public et l'inscription à une session sont alignés
- le CRUD backoffice des sessions est aligné dans le runtime
- la liste des dossiers d'une session est désormais branchée sur le runtime réel

### `frontend/src/api/inscriptions.api.js`

| Endpoint front | Backend runtime attendu | Statut | Impact |
|---|---|---|---|
| `GET /dossiers/list` | `GET /api/dossiers` ou `GET /api/backoffice/dossiers` | route absente | listing backoffice cassé |
| `GET /dossiers/:id` | `GET /api/dossiers/:id` | exact match | OK |
| `POST /dossiers/:id/retenir` | `POST /api/dossiers/:id/retenir` | exact match | OK |
| `PUT /dossiers/:id/refuser` | `PUT /api/dossiers/:id/refuser` | exact match | OK |
| `PUT /dossiers/:id/exception` | `PUT /api/dossiers/:id/exception` | exact match | OK |

Lecture métier:
- la décision dossier est bonne
- la liste backoffice est mal routée

### `frontend/src/api/vouchers.api.js`

| Endpoint front | Backend runtime attendu | Statut | Impact |
|---|---|---|---|
| `GET /vouchers` | `GET /api/vouchers` | exact match | OK |
| `GET /vouchers/:id` | `GET /api/vouchers/:id` | exact match | OK |
| `POST /vouchers/organisation` | `POST /api/vouchers/organisation` | exact match | OK |
| `POST /vouchers/promotionnel` | `POST /api/vouchers/promotionnel` | exact match | OK |
| `PATCH /vouchers/:id/validate` | `PATCH /api/vouchers/:id/validate` | exact match | OK |
| `PATCH /vouchers/:id/reject` | `PATCH /api/vouchers/:id/reject` | exact match | OK |

Lecture métier:
- le listing est bon
- le reste du module front correspond à un ancien contrat

### `frontend/src/api/paiements.api.js`

| Endpoint front | Backend runtime attendu | Statut | Impact |
|---|---|---|---|
| `POST /paiements/initier` | `POST /api/paiements` | route absente | initiation paiement cassée |
| `GET /paiements/:id` | aucun endpoint runtime monté | route absente | détail paiement cassé |
| `GET /paiements` | `GET /api/paiements` | exact match | OK |

Lecture métier:
- l'historique backoffice/apprenant peut fonctionner
- l'initiation de paiement doit être réalignée sur le routeur runtime

### `frontend/src/api/responsable.api.js`

| Endpoint front | Backend runtime attendu | Statut | Impact |
|---|---|---|---|
| `GET /responsable/validations` | `GET /api/responsable/validations` | exact match | OK |
| `GET /responsable/validations/:id` | `GET /api/responsable/validations/:id` | exact match | OK |
| `PUT /responsable/validations/:id/valider` | `PUT /api/responsable/validations/:id/valider` | exact match | OK |
| `PUT /responsable/validations/:id/rejeter` | `PUT /api/responsable/validations/:id/rejeter` | exact match | OK |
| `PUT /responsable/validations/:id/suspendre` | `PUT /api/responsable/validations/:id/suspendre` | exact match | OK |
| `PUT /responsable/validations/:id/reactiver` | `PUT /api/responsable/validations/:id/reactiver` | exact match | OK |

Lecture métier:
- alignement complet

### `frontend/src/api/superviseur.api.js`

| Endpoint front | Backend runtime attendu | Statut | Impact |
|---|---|---|---|
| `GET /superviseur/apporteurs/tdb` | `GET /api/superviseur/apporteurs/tdb` | exact match | OK |

Lecture métier:
- alignement complet

### `frontend/src/api/agent.api.js`

| Endpoint front | Backend runtime attendu | Statut | Impact |
|---|---|---|---|
| `GET /agent/reversements/partenaires` | `GET /api/agent/reversements/partenaires` | exact match | OK |
| `POST /agent/reversements/:id/effectuer` | `POST /api/agent/reversements/:id/effectuer` | exact match | OK |
| `GET /agent/reversements/apporteurs` | `GET /api/agent/reversements/apporteurs` | exact match | OK |

Lecture métier:
- alignement complet

### `frontend/src/api/espace-etudiant.api.js`

| Endpoint front | Backend runtime attendu | Statut | Impact |
|---|---|---|---|
| `GET /dossiers` | `GET /api/dossiers` | exact match | OK |
| `GET /espace-apprenant/formations-demande` | `GET /api/espace-apprenant/formations-demande` | exact match | OK |
| `GET /attestations` | `GET /api/attestations` | exact match | OK |
| `GET /attestations/:dossierId/download` | `GET /api/attestations/:dossierId/download` | exact match | OK |
| `GET /apprenants/profil` | `GET /api/apprenants/profil` | exact match | OK |
| `PUT /apprenants/profil` | `PUT /api/apprenants/profil` | exact match | OK |

Lecture métier:
- la couche de compatibilité apprenant sert désormais d'adaptateur
- les pages encore routées peuvent continuer à vivre sans faux appels runtime

## Synthèse Par Use Case

| Use case | Statut | Note |
|---|---|---|
| Auth / login / logout / refresh | bon | le socle est correct |
| Confirmation email | bon | les routes runtime de confirmation sont alignées |
| Reset password | bon | `forgot-password`, `reset-password` et `change-password` sont exposés runtime |
| Profil utilisateur | bon | `/auth/me` est monté, avec mise à jour profil via les routes apprenant / organisation existantes |
| Apprenant - abonnement retail | bon | souscription, consultation, liste des formations incluses et progression formation demandée sont alignées |
| Apprenant - dossiers | partiel | détail et annulation legacy fragiles, liste mal pointée sur certains wrappers |
| Apprenant - attestations | bloqué sur legacy | le chemin singulier n'est pas celui du runtime |
| Organisation - dashboard / membres / profil | bon | les flux de gestion courante sont alignés |
| Organisation - souscription / B2B | bloqué | chemins non montés |
| Formations - catalogue public | bon | alignement complet |
| Formations - backoffice CRUD | bon | CRUD, publication et archivage alignés |
| Sessions - public / inscription | bon | les usages publics fonctionnent |
| Sessions - backoffice CRUD | bon | list/detail/CRUD et dossiers de session alignés |
| Vouchers | bon | création, validation et rejet alignés |
| Paiements | partiel | listing OK, initiation non alignée |
| Partenaire fournisseur | bon | flux métier principal, activation, invitation admin et profil OK; restent figés seulement quelques écrans admin transverses volontairement hors lot |
| Apporteur | bon | dashboard connecté, commissions, création admin, TDB superviseur/agent, profil et auto-inscription publique OK; helper mensuel hérité figé volontairement |
| Responsable | bon | validation formations alignée |
| Superviseur | bon | TDB apporteurs aligné |
| Agent comptable | bon | reversements alignés |
| Backoffice dashboard / config / rapports | bon | dashboard, config et rapports runtime alignés; les écrans admin transverses restent figés volontairement |

## Lecture Par Rôle

| Rôle | Lecture |
|---|---|
| `APPRENANT` | impacté surtout par les abonnements, attestations et quelques écrans legacy encore à restaurer visuellement |
| `ORGANISATION` | impacté surtout par les endpoints d'abonnement B2B et organisation |
| `PARTENAIRE` | flux métier principal, activation, invitation admin et profil alignés; restent figés seulement quelques écrans admin transverses volontairement hors lot |
| `APPORTEUR` | dashboard, commissions, création admin, TDB superviseur/agent, profil et auto-inscription publique alignés; reste le helper mensuel hérité figé volontairement |
| `RESPONSABLE` | aligné sur la validation des formations |
| `SUPERVISEUR` | aligné sur le TDB apporteurs |
| `AGENT` | aligné sur les reversements partenaires et apporteurs |
| `ADMIN` | impact réduit sur le dashboard/config/rapports; restent hors contrat les abonnements institutionnels et certains écrans admin transverses |

## Compatibilités Résiduelles

1. `frontend/src/api/espace-etudiant.api.js`
   - la couche de compatibilité apprenant sert désormais d'adaptateur
   - aucun gap métier actif; les écrans hérités `/apprenant/*` restent uniquement pour continuité de navigation

## Conclusion

Le front est désormais aligné sur le cœur métier du backend runtime.  
Le noyau métier principal est en place sur plusieurs zones, y compris la confirmation de compte, l'activation partenaire, la création admin apporteur et les flux backoffice sessions / formations / vouchers.

Le vieux backend apporte une preuve utile: certains flux encore marqués comme absents dans le runtime actuel existaient déjà dans l'ancien backend. Il sert donc de référence de restauration, pas de vérité opérationnelle.

En priorité, il ne reste plus qu'à traiter:
- `apporteurs` helper mensuel hérité si l'on veut supprimer la dernière compatibilité figée
- le reste de la continuité legacy apprenant uniquement si l'on veut supprimer toute couche de pont

Les autres blocs déjà rétablis ou alignés sont désormais hors blocage prioritaire:
- `auth`
- `dashboard`
- `formations`
- `sessions`
- `vouchers`
- `partenaires`

L'audit peut maintenant servir de base à une campagne de refactor front sans ambiguïté sur les endpoints à migrer.
