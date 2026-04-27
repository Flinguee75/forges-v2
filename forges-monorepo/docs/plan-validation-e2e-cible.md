# FORGES - Plan de validation complet et autonome

## 1. Contexte

FORGES est une plateforme web d'agrégation de formations certifiantes pour le marché africain.

Stack de référence:
- backend: Node.js 20 + Express + Prisma
- frontend: React 19 + Vite 8 + Tailwind 3
- base de données: PostgreSQL 16
- cache et files: Redis 7
- auth: JWT access 1h / refresh 7j, bcrypt rounds 12
- emails: Nodemailer + SMTP Brevo
- scheduler: node-cron
- PDF: PDFKit / Puppeteer

Ce document est une note de handoff autonome. Un agent extérieur doit pouvoir l'utiliser sans avoir lu l'historique du chat.

## 2. But du plan

Le but n'est pas de rejouer toute la logique métier dans le navigateur.

Le but est de définir:
- quelles règles doivent être testées en `unit`
- quelles règles doivent être testées en `API / integration`
- quels parcours doivent être validés en `E2E`
- quels contrats runtime doivent être considérés comme sources de vérité

## 3. Philosophie de validation

La bonne séparation est la suivante:
- `unit` pour la logique pure et les calculs
- `API / integration` pour les règles métier, la persistance et les erreurs contractuelles
- `E2E` pour quelques parcours transverses où front, back et transitions d'état se rencontrent

Un use case ne doit pas devenir E2E par défaut.

Il doit être retenu seulement si:
- il traverse plusieurs couches
- sa régression a un coût métier élevé
- le navigateur apporte une preuve supplémentaire par rapport à l'API seule

## 4. Hiérarchie des vérités

Pour éviter les contrats fantômes, la hiérarchie doit être:

1. Specs fonctionnelles et use cases métier
2. Routes réellement exposées par le runtime
3. Tests d'intégration API / Newman
4. Tests E2E Playwright

Si les specs, les routes runtime et les collections divergent, il faut d'abord aligner le contrat runtime avant d'étendre l'E2E.

## 5. Contrat runtime actuel à connaître

Les parcours les plus sensibles traversent les routes suivantes:

### Comptes et auth
- `POST /api/apprenants/register`
- `GET /api/apprenants/confirm/:token`
- `POST /api/apprenants/resend-confirmation`
- `POST /api/organisations/register`
- `GET /api/organisations/confirm/:token`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Admin
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/:id/status`

### Inscriptions / dossiers
- les routes réelles du runtime doivent être vérifiées avant de figer les E2E
- les specs parlent de plusieurs variantes de dossiers et de décisions métier; il faut suivre le runtime, pas seulement le mapping théorique

### Partenaires / apporteurs / vouchers / paiements / attestation
- ces zones doivent être couvertes avec la même logique: priorité au runtime réel
- toute divergence entre le mapping de specs et les routes effectives doit être résolue avant d'écrire les tests finaux

## 6. Règles métier à très haut risque

Les règles suivantes sont sensibles et doivent être verrouillées en priorité:

- `RM-140`: bifurcation inscription Premium + Retail uniquement
- `RM-127`: `type_formation` assigné exclusivement par FORGES à la validation
- `RM-143 / RM-144`: code apporteur actif, type APPORTEUR, non-cumul avec voucher
- `RM-145`: création de commission apporteur après webhook SUCCESS
- `RM-146 / RM-147`: agrégation mensuelle et reversement selon seuil
- `RM-102`: éligibilité abonnement
- `RM-118`: bot à questions fermées seulement
- `RM-13`: une formation archivée ne se réactive pas
- `RM-22 / RM-23`: visibilité catalogue et état de planification
- `RM-26 / RM-27`: attestation et annulation volontaire

Ces règles doivent d'abord être validées en API/integration. L'E2E ne doit servir qu'à vérifier le parcours utilisateur complet.

## 7. Priorités E2E

La suite E2E doit rester courte et ciblée.

### 7.1 Parcours critique principal

#### UCS07 → UCS08 → UCS09

Flux prioritaire absolu car il couvre le coeur économique du produit.

Branches à couvrir:
- Standard ou Premium hors Retail: inscription directe, paiement, dossier payé
- Premium + Retail: dossier en attente, décision responsable, délai 72h, paiement, webhook, dossier payé

Ce que l'E2E doit vérifier:
- les transitions d'état
- le parcours front/back complet
- la cohérence du paiement et des notifications
- l'absence de route fantôme

### 7.2 Partenaires

#### UCS17 → UCS18

Flux partenaire critique.

Ce que l'E2E doit vérifier:
- le partenaire ne choisit pas `type_formation`
- FORGES assigne `type_formation` lors de la validation
- le prix catalogue est calculé au moment de la validation
- le backoffice peut valider et rejeter

### 7.3 Vouchers

#### UCS06

À couvrir si le voucher impacte un vrai parcours utilisateur.

Ce que l'E2E doit vérifier:
- activation
- consommation
- expiration
- quota

### 7.4 Apporteurs

#### UCS19 / UCS20

Flux de forte valeur car il traverse code partagé, paiement et commission.

Ce que l'E2E doit vérifier:
- code permanent
- non-cumul avec voucher
- commission après paiement confirmé

### 7.5 Entrée système

#### UCS00 + UCS01

Smoke tests d'entrée:
- création de compte
- confirmation email
- connexion
- redirection par rôle

À garder en E2E, mais sans en faire le coeur de la suite.

### 7.6 Fin de chaîne

#### UCS11

Attestation.

Ce que l'E2E doit vérifier:
- l'attestation n'est disponible que dans les bonnes conditions
- le parcours dossier + paiement + session clôturée est cohérent

## 8. Ce qui doit rester principalement en API / integration

Ces sujets doivent rester d'abord dans les tests backend:
- les validations Zod/class-validator
- les erreurs métier codées
- les transitions de scheduler
- les webhooks
- les calculs de commission
- les règles de non-cumul
- les erreurs de traduction / templates

Pourquoi:
- c'est plus rapide
- c'est plus stable
- c'est plus diagnosticable
- un E2E ne doit pas remplacer une règle métier précise

## 9. Cartographie recommandée des tests

### Unit

À mettre ici:
- calculs
- validations pures
- transformations de données
- helpers métier
- logique de mapping

### API / integration

À mettre ici:
- `RM-140`
- `RM-127`
- `RM-143 / RM-144`
- `RM-145`
- `RM-146 / RM-147`
- `RM-102`
- `RM-13`
- `RM-22 / RM-23`
- `RM-26 / RM-27`
- schedulers
- webhooks
- notifications email
- RBAC
- erreurs contractuelles

### E2E

À mettre ici:
- inscription / confirmation / login
- inscription Standard / Premium Retail
- validation partenaire
- voucher
- apporteur
- attestation

### 9.1 Checklist RM priorisée

Légende:
- `[x]` couvert
- `[~]` partiellement couvert
- `[ ]` reste à couvrir

Backlog prioritaire de validation métier:

- `[~]` `RM-140` | cible: `API / integration` + `E2E`
  - état actuel: la branche hors `Premium + Retail` est partiellement vérifiée par l'E2E voucher avec statut final `PAYE_DIRECTEMENT`
  - reste à couvrir: la branche `Premium + Retail` complète avec `EN_ATTENTE_VERIFICATION`, décision `RESPONSABLE`, délai `72h`, paiement et webhook
- `[ ]` `RM-127` | cible: `API / integration` puis `E2E`
  - à vérifier: `type_formation` non modifiable par le partenaire
  - à vérifier: attribution exclusive par FORGES lors de la validation
- `[~]` `RM-143 / RM-144` | cible: `API / integration` puis `E2E`
  - état actuel: le code apporteur actif et le non-cumul voucher + code apporteur sont couverts côté backend/API
  - reste à couvrir: un verrou E2E court si le comportement utilisateur doit être visible dans le formulaire
- `[x]` `RM-145` | cible: `API / integration` + `E2E`
  - couvert: création de `CommissionApporteur` après webhook paiement `SUCCESS`
  - couvert: affichage de la commission générée dans l'espace apporteur
- `[ ]` `RM-146 / RM-147` | cible: `API / integration`
  - à vérifier: agrégation mensuelle
  - à vérifier: reversement selon seuil minimum
- `[ ]` `RM-102` | cible: `API / integration`
  - à vérifier: calcul automatique de l'éligibilité abonnement
- `[ ]` `RM-118` | cible: `API / integration` puis `E2E`
  - à vérifier: bot limité aux questions fermées
  - à vérifier: rejet des réponses hors liste
- `[ ]` `RM-13` | cible: `API / integration`
  - à vérifier: une formation archivée ne peut pas être réactivée
- `[ ]` `RM-22 / RM-23` | cible: `API / integration` puis `E2E` léger
  - à vérifier: visibilité catalogue selon statut réel
  - à vérifier: invisibilité des formations `EN_ATTENTE_PLANIFICATION`
- `[ ]` `RM-26 / RM-27` | cible: `API / integration` puis `E2E`
  - à vérifier: attestation seulement si dossier éligible et session clôturée
  - à vérifier: annulation volontaire uniquement en `EN_ATTENTE_VERIFICATION`

Backlog métier adjacent encore non verrouillé:

- `[ ]` `RM-07 / RM-08 / RM-09` | cible: `API / integration`
  - à vérifier: délai `72h`, max `3` tentatives, webhook asynchrone
- `[ ]` `RM-37 / RM-38 / RM-39 / RM-40 / RM-41 / RM-42 / RM-45` | cible: `API / integration` puis `E2E` ciblé
  - à vérifier: lien voucher/formation, usage unique, quota, expiration, refus, libération, paiement auto organisation
- `[ ]` `RM-03 / RM-20 / RM-21` | cible: `API / integration`
  - à vérifier: scheduler, transitions automatiques, archivage
- `[ ]` `RM-28` | cible: `API / integration` + `E2E`
  - à vérifier: unicité email sur les flux d'entrée système

Ordre d'attaque recommandé:

1. `RM-146 / RM-147`
2. `RM-140`
3. `RM-127`
4. `RM-143 / RM-144`
5. `RM-26 / RM-27`

### 9.2 Vouchers par vagues

Objectif:
- maximiser d'abord la couverture des `RM` qui protègent le chiffre d'affaires, l'intégrité des inscriptions et la cohérence du stock voucher
- garder l'E2E seulement sur les parcours où le navigateur apporte une preuve utile

#### Vague 0 — déjà couverte

- `E2E` apprenant avec voucher sur session standard ouverte
- preuve actuelle:
  - soumission `source_financement=VOUCHER`
  - absence d'appel paiement
  - dossier final `PAYE_DIRECTEMENT`

Cette vague ne couvre pas encore le cycle de vie voucher lui-même.

#### Vague 1 — bloc métier critique minimum

RM visées:
- `RM-37` lien voucher / formation
- `RM-38` usage unique / employé
- `RM-40` quota
- `RM-41` organisation = paiement auto

Cible:
- `API / integration` d'abord
- `E2E` léger ensuite sur un seul parcours organisation ou apprenant si le runtime l'expose clairement

Ce qu'il faut verrouiller:
- un voucher ne s'applique qu'à la bonne formation
- un voucher consommé ne peut pas être réutilisé
- le quota diminue correctement et bloque à épuisement
- l'usage voucher organisation mène au bon statut final sans passer par un paiement externe

Pourquoi cette vague passe en premier:
- elle couvre le coeur du risque opérationnel immédiat
- elle évite les doubles usages et les inscriptions indûment acceptées
- elle réduit le risque de faux stock disponible

#### Vague 2 — invalidation et hygiène du stock

RM visées:
- `RM-39` promo `BROUILLON -> ACTIF / REFUSE`
- `RM-40` expiration
- `RM-45` refus -> libération voucher

Cible:
- `API / integration`
- `E2E` ciblé uniquement pour un cas visible de refus si le front porte réellement ce flux

Ce qu'il faut verrouiller:
- un voucher non actif n'est jamais consommable
- un voucher expiré est rejeté proprement
- un refus dossier libère bien le voucher ou le quota attendu
- un voucher refusé ou brouillon ne fuit pas dans le parcours d'inscription

Pourquoi cette vague arrive après:
- elle est critique pour la cohérence du stock
- mais elle dépend souvent de transitions métier plus fines que la vague 1

#### Vague 3 — valeur financière étendue

RM visées:
- `RM-42` promotion = réduction
- articulation avec `RM-143 / RM-144` non-cumul apporteur / voucher

Cible:
- `API / integration`
- `E2E` uniquement si le front expose clairement la sélection et le calcul affiché

Ce qu'il faut verrouiller:
- le montant réduit est correct
- le type de voucher applique la bonne mécanique métier
- le cumul interdit avec code apporteur renvoie l'erreur attendue

Pourquoi cette vague n'est pas en premier:
- la priorité immédiate est d'abord d'empêcher une consommation invalide
- les calculs de réduction viennent après la sécurisation du stock et des transitions

#### Vague 4 — E2E voucher complet

Objectif:
- transformer les preuves API déjà stables en un petit lot navigateur à forte valeur

Shortlist E2E recommandée:
- voucher valide consommé avec succès
- voucher expiré rejeté
- quota épuisé rejeté
- refus dossier suivi d'une nouvelle tentative autorisée si la libération est la règle runtime retenue

Précondition:
- les règles d'API des vagues 1 à 3 doivent déjà être stables
- le seed canonique doit fournir `voucher actif`, `voucher épuisé`, `voucher expiré`, et un cas de `voucher libérable`

Ordre recommandé pour maximiser les RM critiques vouchers:

1. `RM-37 / RM-38 / RM-40 / RM-41`
2. `RM-39 / RM-45`
3. `RM-42`
4. articulation avec `RM-143 / RM-144`
5. seulement ensuite, `E2E` voucher élargi

## 10. Contrat front/back à verrouiller

Dans les E2E critiques, il ne faut pas seulement vérifier que l'écran change.

Il faut aussi vérifier:
- la route réellement appelée
- la méthode HTTP
- les champs structurants du payload
- le shape minimal de la réponse exploitée par le front

Cela évite les faux positifs où l'UI semble fonctionner mais parle en réalité au mauvais endpoint.

## 11. Seed canonique

Une suite E2E utile doit s'appuyer sur un seed canonique:
- reproductible
- versionné
- idempotent
- aligné avec les parcours retenus

Le seed doit fournir au moins:
- un apprenant de référence
- une organisation de référence
- un partenaire de référence
- un apporteur de référence
- une formation standard
- une formation premium
- une formation partenaire
- une session ouverte
- une session premium
- un dossier retenu
- un dossier en attente
- un dossier rejeté
- un voucher actif
- un voucher épuisé
- un code apporteur

Sans seed stable, les E2E produisent des faux négatifs et des diagnostics peu exploitables.

## 12. Collections et contrats

La collection Newman / l'intégration API doit être traitée comme une baseline runtime.

Mais si elle diverge des specs, il faut décider explicitement:
- soit la spec est corrigée
- soit le runtime est corrigé

Ne pas laisser les deux versions coexister.

## 13. Shortlist E2E minimale recommandée

La première version raisonnable de la suite E2E doit contenir seulement:

- inscription et confirmation email
- login et redirection par rôle
- inscription Standard + paiement direct
- inscription Premium + Retail + décision responsable + paiement
- validation partenaire
- voucher
- apporteur
- attestation

## 14. Critères de sélection d'un nouveau E2E

Ajouter un nouveau E2E seulement si:
- le flux traverse au moins deux couches de l'application
- il a un impact financier, de conformité ou d'exploitation
- le runtime est stable
- le seed est disponible
- le test apporte une valeur supplémentaire par rapport à l'API

## 15. Risques à éviter

- tester tous les use cases en E2E
- multiplier les scénarios sans seed canonique stable
- mettre les webhooks et schedulers dans le navigateur au lieu de l'API
- utiliser E2E pour compenser un contrat flou
- faire dépendre un E2E d'un message visuel non stable

## 16. Cadence d'exécution recommandée

- à chaque PR: smoke E2E courte + API de base
- sur staging: suite E2E élargie
- la nuit ou avant release: suite complète

## 16.1 Première vague locale actuellement retenue

La première vague effectivement implémentée dans le repo est volontairement plus courte:

- exécution locale uniquement
- Playwright hébergé dans `frontend/`
- attestations, confirmation email et décisions Responsable Premium+Retail hors scope
- couverture initiale limitée à:
  - smoke auth / rôle
  - inscription avec voucher sur session standard ouverte
  - contrôle de consommation du voucher côté organisation après inscription
  - création et refus d'un voucher promotionnel côté backoffice
  - affichage d'un voucher promotionnel expiré dans la liste backoffice
  - création d'une commission apporteur après paiement confirmé par webhook `SUCCESS`

### État courant

- `frontend/package.json` expose maintenant:
  - `npm run test:e2e`
  - `npm run test:e2e:headed`
  - `npm run test:e2e:debug`
- `backend/package.json` expose maintenant:
  - `npm run start:e2e`
  - `npm run prisma:seed:e2e`
- le wrapper local est `frontend/scripts/run-e2e.mjs`
- la configuration Playwright est `frontend/playwright.config.js`
- le seed dédié est `backend/prisma/seed.e2e.ts`

### Ce que fait réellement `npm run test:e2e`

Le point d'entrée local orchestre désormais les étapes suivantes:

1. tente de démarrer `postgres` et `redis` via `docker compose -f ../infra/docker-compose.yml up -d postgres redis`
2. tolère le cas où `5432` ou `6379` sont déjà occupés tant que les services répondent localement
3. exécute `prisma db push --skip-generate`
4. exécute `npm run prisma:seed:e2e`
5. libère les ports `3000` et `4173` pour éviter de réutiliser un runtime applicatif incohérent
6. démarre un backend E2E avec `FRONTEND_URL=http://127.0.0.1:4173` et `CORS_ORIGINS=http://127.0.0.1:4173`
7. démarre le frontend Vite sur `http://127.0.0.1:4173`
8. lance Playwright avec `trace`, `screenshot` et `video` conservés seulement en cas d'échec

### Données seedées pour cette vague

Le seed E2E est minimal et idempotent. Il fournit:

- un apprenant actif `apprenant@forges.ci`
- un apprenant dédié RM-145 `apprenant-rm145@forges.ci`
- un administrateur actif `admin@forges.ci`
- une organisation active `org@forges.ci`
- un apporteur actif `apporteur-e2e@forges.ci`
- un code apporteur stable `APT-E2E-RM145-001`
- une formation standard active `F-E2E-STD-01`
- une session ouverte `S-E2E-STD-OPEN-01`
- un voucher actif `ORG-E2E-VOUCHER-01`
- un voucher expiré `ORG-E2E-VOUCHER-EXPIRE`
- aucun scénario partenaire ou attestation

Avant chaque run, le seed supprime les dossiers, paiements et commissions liés aux scénarios apprenants E2E afin de garder une exécution répétable.

### Scénarios effectivement validés

#### 1. Auth / rôle smoke

Le test valide:

- un invité redirigé de `/apprenant/dashboard` vers `/login`
- le login apprenant avec le seed E2E
- la présence de `access_token`, `refresh_token` et `user` dans `sessionStorage`
- la redirection d'un apprenant vers `/unauthorized` s'il tente `/partenaire/dashboard`

#### 2. Inscription voucher sans paiements

Le test valide:

- l'ouverture du parcours `/apprenant/inscrire/:formationId`
- la présence de la session seedée ouverte
- la soumission de `POST /api/sessions/:id/inscrire`
- le payload minimal:
  - `source_financement=VOUCHER`
  - `voucher_code=<code>`
- le message de succès UI sur `/apprenant/mes-dossiers`
- la présence du dossier créé
- le statut runtime final `PAYE_DIRECTEMENT`
- la consommation visible du voucher côté organisation sur `/organisation/vouchers`
- le lien voucher / formation via l'affichage du voucher seedé
- l'absence d'appel à:
  - `/api/paiements`
  - `/mock-checkout`
  - `/webhook`

#### 3. Voucher promotionnel backoffice

Le test valide:

- la connexion admin avec le seed E2E
- la création d'un voucher promotionnel en brouillon
- le refus du voucher depuis le détail backoffice
- le statut final `REFUSE` dans l'UI
- l'audit métier `VOUCHER_PROMOTIONNEL_CREE` puis `VOUCHER_PROMOTIONNEL_REFUSE`

#### 4. Voucher expiré dans le backoffice

Le test valide:

- la connexion admin avec le seed E2E
- le filtre `EXPIRE` sur la liste backoffice
- la visibilité du voucher seedé expiré
- le statut métier `EXPIRE` dans le tableau

#### 5. RM-145 — commission apporteur après webhook paiement

Le test valide:

- la connexion de l'apprenant dédié `apprenant-rm145@forges.ci`
- l'inscription depuis `/apprenant/inscrire/:formationId`
- la soumission de `POST /api/sessions/:id/inscrire`
- le payload minimal:
  - `source_financement=RETAIL`
  - `code_apporteur=APT-E2E-RM145-001`
- la création d'un dossier final `PAYE_DIRECTEMENT`
- l'initiation du paiement via `POST /api/paiements`
- le déclenchement d'un webhook signé `POST /api/paiements/webhook` avec statut `SUCCESS`
- le passage du paiement à `CONFIRME`
- la création de `CommissionApporteur` avec le montant attendu
- la connexion de l'apporteur `apporteur-e2e@forges.ci`
- la visibilité de la transaction, du montant base, de la commission et du statut `En attente` dans `/apporteur/commissions`

### Ajustements runtime découverts et corrigés pendant l'implémentation

La mise en place de cette vague a mis en évidence plusieurs écarts concrets:

- les comptes de connexion rapide du frontend utilisaient `*@forges-dev.ci` alors que les seeds utilisaient `*@forges.ci`
- `InscriptionSessionPage` interprétait mal la réponse sessions et affichait à tort "Aucune session disponible"
- les guards `PrivateRoute` et `RoleGuard` étaient trop sensibles au timing post-login et pouvaient renvoyer vers `/login` malgré une session déjà stockée
- `MesDossiersPage` côté apprenant lisait mal la forme réelle de la réponse backend

Ces écarts sont désormais absorbés par le runtime actuel et ne doivent plus être considérés comme inconnus de la première vague.

### Limites encore ouvertes

- cette vague ne couvre toujours pas `register` / `confirm-email`
- cette vague ne couvre pas les décisions Responsable Premium+Retail
- cette vague ne couvre pas encore `RM-146 / RM-147` sur l'agrégation mensuelle et le reversement apporteur
- le wrapper E2E ne résout pas encore l'obsolescence de `version:` dans `infra/docker-compose.yml`; le warning Docker reste attendu

Le contrat d'intégration Jest backend est désormais restauré:

- `backend/package.json` expose `test:integration`
- `backend/jest.integration.config.js` cible les `*.routes.test.ts`
- la commande `cd backend && npm run test:integration` passe sur 12 suites / 13 tests

Dernière revalidation locale effectuée le `2026-04-23`:

- `cd backend && npm test -- --runInBand src/modules/vouchers/__tests__/voucher.service.test.ts src/modules/vouchers/__tests__/voucher-validation.service.test.ts src/modules/vouchers/__tests__/voucher.repository.test.ts` passe sur `3` suites / `16` tests
- `cd backend && npm test -- --runInBand src/modules/apporteurs/__tests__/apporteur.service.test.ts src/modules/apporteurs/__tests__/apporteur.repository.test.ts src/modules/paiements/__tests__/paiement.service.test.ts src/modules/paiements/__tests__/paiement.routes.test.ts` passe sur `4` suites / `43` tests
- `cd frontend && npm run test:e2e` passe sur `5` scénarios / `5` tests
- le wrapper E2E absorbe toujours un échec `docker compose up` si `5432` ou `6379` sont déjà occupés mais joignables

### Plan de suite immédiat

La prochaine priorité est `RM-146 / RM-147`, car elle complète la chaîne apporteur ouverte par `RM-145`.

Ordre recommandé:

1. `RM-146 / RM-147` — reversements apporteur
   - couvrir l'agrégation mensuelle `EN_ATTENTE -> VALIDEE`
   - couvrir le seuil minimum de reversement
   - couvrir l'exécution Agent `VALIDEE -> REVERSEE`
   - cible: `API / integration` d'abord, `E2E` seulement si l'UI backoffice Agent expose clairement la file des reversements
2. `RM-140` — Premium + Retail complet
   - seed dédié: formation premium, session ouverte, apprenant dédié, responsable/admin
   - parcours: inscription `RETAIL` -> `EN_ATTENTE_VERIFICATION` -> décision responsable `RETENU` -> paiement -> webhook `SUCCESS`
   - cible: `E2E` complet car le flux traverse apprenant, backoffice, paiement et dossier
3. `RM-127` — validation formation partenaire
   - vérifier que le partenaire ne peut pas écrire `type_formation`
   - vérifier que FORGES assigne le type lors de la validation
   - cible: `API / integration`, puis `E2E` léger si le parcours partenaire/backoffice est stable
4. `RM-143 / RM-144` — non-cumul voucher + code apporteur
   - ajouter un test navigateur court si le comportement doit être visible utilisateur
   - sinon garder le verrou backend/API avec erreur contractuelle `422 VOUCHER_CUMUL_INTERDIT`

## 17. Résultat attendu

Le plan est bon si:
- un nouvel agent peut le lire sans contexte additionnel
- il distingue clairement API, E2E et unit
- il priorise les parcours à fort enjeu métier
- il explicite les divergences de contrat
- il fournit une shortlist immédiatement exploitable

## 18. Conclusion

Le bon équilibre pour FORGES est:
- API / integration comme base de confiance
- E2E comme verrou sur quelques parcours à fort enjeu
- unit tests pour la logique pure

Le but n'est pas de tout rejouer en navigateur.
Le but est de couvrir les points de rupture métier là où le navigateur ajoute une vraie valeur de validation.
