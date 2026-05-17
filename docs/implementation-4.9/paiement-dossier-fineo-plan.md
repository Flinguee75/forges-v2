# Plan de correction paiement, dossier et FineoPay

## Objectif

Corriger les failles detectees dans le trajet FORGES `dossier -> paiement -> callback gateway -> commissions -> recu`, en gardant FineoPay comme provider prioritaire et NGSER comme provider secondaire.

Ce plan est prepare pour une implementation sur la branche:

`codex/fix-paiement-dossier-fineo`

## Sources

- Spec projet: `AGENTS.md`
- Documentation FineoPay: `docs/fineo/FineoPay API Documentation.pdf`
- Backend paiement: `forges-monorepo/backend/src/modules/paiements/`
- Backend inscription: `forges-monorepo/backend/src/modules/inscriptions/`
- Backend organisation: `forges-monorepo/backend/src/modules/espace-organisation/`
- Frontend paiement apprenant: `forges-monorepo/frontend/src/pages/apprenant/`
- Frontend organisation: `forges-monorepo/frontend/src/pages/organisation/`

## Constat

FineoPay attend:

- `POST /checkout-link`
- headers `businessCode` et `apiKey`
- `amount` en XOF, minimum `100`
- `callbackUrl`
- `syncRef`
- callback `POST` avec `syncRef`, `reference`, `amount`, `status`, `clientAccountNumber`, `timestamp`

Le code actuel respecte globalement l'appel FineoPay, mais les invariants FORGES sont disperses entre plusieurs Modules:

- `PaiementFineoService`
- `IpnFineoService`
- `IpnNgserService`
- `PaiementService`
- `InscriptionService`
- `EspaceOrganisationService`
- pages frontend de retour paiement

Cette dispersion cree des divergences sur les statuts, les commissions, les inscriptions organisation et la source de verite frontend.

## Decisions validees

1. FineoPay et NGSER doivent utiliser un meme Module de reglement.
2. Le webhook legacy reste un adapter temporaire vers ce Module.
3. Le reglement utilise les montants figes dans `Paiement`, pas un recalcul catalogue au callback.
4. La commission apporteur est corrigee sans migration, via `Dossier.code_apporteur`.
5. Le reversement partenaire utilise le prix coutant valide quand disponible.
6. B2B et Voucher Organisation restent confirmes immediatement, mais passent par les memes invariants metier.
7. Montant final `0 XOF` signifie reglement automatique confirme.
8. Montant final entre `1` et `99 XOF` est une erreur metier avant appel FineoPay.
9. Le frontend ne declare jamais un paiement confirme depuis les seuls parametres de retour gateway.
10. Tests cibles de regression, avec E2E local/mock renforce.
11. Fineo sandbox reel reste hors CI.
12. Une seule PR ciblee, structuree par sections logiques.

## Corrections prioritaires

### 1. Module de reglement commun

Creer un Module backend responsable de la transition atomique:

`Paiement -> Dossier -> Commissions -> Audit -> Recu`

Nom possible:

- `paiement-reglement.service.ts`
- `reglement-paiement.service.ts`

Interface attendue, a ajuster pendant implementation:

- confirmer un paiement initie par provider
- echouer un paiement initie par provider
- confirmer un paiement couvert hors gateway, par exemple B2B ou Voucher Organisation
- traiter le montant `0 XOF`
- refuser le montant `1-99 XOF` avant FineoPay

Le Module doit concentrer la Locality des regles:

- paiement deja confirme: idempotent
- dossier deja `PAYE`: idempotent
- paiement `SUCCESS`: dossier `PAYE`
- paiement `FAIL`: appliquer la regle de tentatives ou expiration selon le chemin retenu
- commissions creees une seule fois
- recu PDF/envoye en effet secondaire isole

### 2. Commission apporteur

Probleme actuel:

- `Dossier` stocke `code_apporteur`
- `CommissionService` cherche `dossier.code_apporteur_id`

Correction:

- resoudre `Apporteur` par `Dossier.code_apporteur`
- utiliser le taux actuel de l'apporteur pour cette correction minimale
- creer `CommissionApporteur` une seule fois par `paiement_id`

Test attendu:

- callback Fineo `SUCCESS` avec dossier ayant `code_apporteur` cree une commission apporteur
- meme test pour NGSER si le chemin NGSER utilise le Module commun

### 3. Commission partenaire

Probleme actuel:

- `CommissionService` lit `formation.commission_forges_pct`
- `Formation` n'a pas ce champ dans Prisma
- le prix coutant valide est la source metier la plus stable pour le reversement partenaire

Correction:

- si `formation.prix_coutant` existe, l'utiliser comme montant reverse
- sinon si `formation.formation_partenaire.prix_coutant_valide` existe, l'utiliser
- sinon fallback a la formule avec commission partenaire actuelle
- ne jamais exposer `commission_forges_pct` dans l'espace partenaire

Test attendu:

- formation partenaire avec prix coutant valide: commission partenaire reverse ce prix coutant
- fallback commission conserve si prix coutant absent

### 4. FineoPay contract guard

Ajouter une validation avant `FineoClient.createCheckoutLink`:

- `amountXof === 0`: ne pas appeler FineoPay, confirmer automatiquement
- `amountXof > 0 && amountXof < 100`: lever une erreur metier
- ne pas envoyer de champs non documentes dans `inputs` si FineoPay les refuse

Erreur possible:

- `MONTANT_FINEO_MINIMUM`
- `PAIEMENT_AUTO_CONFIRME`

Test attendu:

- `0 XOF`: aucun appel Fineo, paiement confirme, dossier `PAYE`
- `1-99 XOF`: aucun appel Fineo, erreur metier

### 5. Inscription organisation

Probleme actuel:

- `EspaceOrganisationService.inscrireBeneficiaire` cree directement dossier `PAYE` et paiement `CONFIRME`
- ce chemin contourne une partie des invariants de `InscriptionService`

Correction:

- conserver le comportement metier: B2B/Voucher Organisation = reglement immediat
- mais centraliser les validations:
  - beneficiaire appartient a l'organisation
  - unicite session et formation
  - session valide et ouverte selon les regles existantes
  - voucher organisation actif, formation compatible, quota disponible, expiration
  - paiement confirme cree via Module de reglement

Test attendu:

- inscription B2B cree dossier `PAYE` et paiement `CONFIRME`
- inscription avec voucher org incremente quota
- duplicate session/formation refuse
- voucher org invalide ou hors formation refuse

### 6. Frontend retour paiement

Probleme actuel:

- `PaiementCallback.jsx` peut afficher confirme depuis les parametres de retour NGSER
- FineoPay n'a pas forcement de retour frontend fiable; la source de verite est le backend apres callback verifie

Correction:

- afficher "confirmation en cours" tant que backend ne renvoie pas `Paiement.CONFIRME` ou `Dossier.PAYE`
- polling court du dossier ou paiement
- afficher echec seulement si backend indique echec, expiration ou annulation

Test attendu:

- retour avec parametre success mais backend encore pending: UI affiche confirmation en cours
- backend confirme ensuite: UI affiche confirme

## Tests a renforcer

### Backend unit/integration

Commandes ciblees:

```bash
cd forges-monorepo/backend
npm test -- --runTestsByPath src/modules/paiements/__tests__/paiement.service.test.ts
npm test -- --runTestsByPath src/modules/paiements/__tests__/paiement-fineo.service.test.ts src/modules/paiements/__tests__/ipn-fineo.service.test.ts
npm test -- --runTestsByPath src/modules/paiements/__tests__/ipn-ngser.service.test.ts
npm test -- --runTestsByPath src/modules/espace-organisation/__tests__/espace-organisation.service.test.ts
```

Ajouter ou adapter les tests pour:

- commission apporteur sur `Dossier.code_apporteur`
- prix coutant partenaire
- auto-confirmation `0 XOF`
- blocage `1-99 XOF`
- idempotence double callback
- recu/email non bloquant et sans fuite Jest

### Frontend unit

Commandes ciblees:

```bash
cd forges-monorepo/frontend
npm test -- PaiementCallback
npm test -- PaiementInitiation
npm test -- MesDossiersPage
```

Ajouter ou adapter les tests pour:

- retour provider success sans confirmation backend
- polling et confirmation backend
- erreur montant minimum si exposee a l'utilisateur

### E2E local/mock

Le scenario E2E automatique doit rester local et deterministe:

- inscription apprenant retail standard
- paiement mock initie
- retour paiement ne confirme pas seul
- callback/mock backend confirme
- dossier devient `PAYE`
- paiement devient `CONFIRME`

Fineo sandbox reel ne doit pas bloquer la CI.

## Risques

- Statuts paiement actuels melangent `EN_ATTENTE`, `PENDING`, `ECHOUE`, `ECHEC`, `ANNULE`.
- Les tests Fineo existants passent fonctionnellement, mais la commande Jest peut sortir en echec parce que le recu PDF continue a logger apres la fin du test.
- Une correction trop large de l'inscription organisation peut toucher des tests E2E deja fragiles.
- Changer les statuts visibles frontend peut necessiter mise a jour des badges et libelles.

## Non-objectifs pour cette PR

- Pas de migration Prisma pour snapshot apporteur.
- Pas d'integration CI avec Fineo sandbox reel.
- Pas de refonte complete du module paiement.
- Pas de modification du business model B2B ou Voucher Organisation.

## Definition de done

- Les callbacks Fineo et NGSER passent par le Module de reglement commun.
- Le webhook legacy `/api/paiements/webhook` reste compatible et passe par le meme Module de reglement.
- Les commissions apporteur et partenaire sont correctes sur paiement confirme.
- Le montant `0 XOF` est traite sans gateway.
- Le montant `1-99 XOF` ne part pas chez FineoPay.
- Les inscriptions organisation respectent les invariants critiques.
- Le frontend attend l'etat backend avant d'afficher une confirmation.
- Tests unitaires/integration cibles passent.
- E2E local/mock critique ajoute ou renforce.
- `npm run build` passe backend et frontend.

## Etat implementation sur `codex/fix-paiement-dossier-fineo`

### Fait

- Ajout de `PaiementReglementService` pour centraliser la confirmation/echec provider:
  - `IpnFineoService` et `IpnNgserService` utilisent ce service pour `SUCCESS` et `FAIL`.
  - le webhook legacy `/api/paiements/webhook` est aligne comme adapter vers ce service.
  - idempotence par `updateMany` conditionnel sur paiement non confirme.
  - creation commissions et passage dossier `PAYE` centralises.
- Correction `CommissionService`:
  - commission apporteur resolue via `Dossier.code_apporteur`;
  - commission partenaire basee sur `prix_coutant` ou `FormationPartenaire.prix_coutant_valide` quand disponible;
  - fallback commission partenaire conserve si aucun prix coutant n'est disponible.
- Correction FineoPay:
  - `0 XOF` auto-confirme sans appel FineoPay;
  - `1-99 XOF` leve `MONTANT_FINEO_MINIMUM` avant appel FineoPay;
  - le fallback NGSER ne masque pas cette erreur metier.
- Correction inscription organisation:
  - verification session existante et non complete;
  - unicite beneficiaire/session;
  - unicite beneficiaire/formation cross-sessions;
  - voucher organisation compatible avec la formation;
  - paiement B2B/Voucher Org cree en `PENDING` puis confirme via `PaiementReglementService`.
- Correction frontend:
  - `PaiementInitiation` gere `AUTO_CONFIRME_ZERO` en allant vers le callback avec `paiement_id`;
  - `PaiementCallback` ne declare plus un succes depuis `status=success`;
  - le callback lit le paiement FORGES par `paiement_id`, `order_ngser`, `order_id` ou `transaction_id`;
  - `paiementsApi.getByReference()` ajoute la recherche par reference provider.

### Tests ajoutes ou modifies

- Backend:
  - `src/modules/paiements/__tests__/commission.service.test.ts`
  - `src/modules/paiements/__tests__/paiement-reglement.service.test.ts`
  - `src/modules/paiements/__tests__/paiement-fineo.service.test.ts`
  - `src/modules/espace-organisation/__tests__/espace-organisation.service.test.ts`
  - `tests/integration/ucs09-fineo-backend.integration.test.js`
  - `tests/integration/ucs09-legacy-webhook-backend.integration.test.js`
- Frontend:
  - `src/pages/apprenant/__tests__/PaiementCallback.test.jsx`
  - `src/api/__tests__/paiements.api.test.js`
- E2E:
  - `e2e/ucs09-paiement-callback.spec.js`

### Commandes validees

```bash
cd forges-monorepo/backend
npm test -- --runTestsByPath src/modules/paiements/__tests__/commission.service.test.ts src/modules/paiements/__tests__/paiement-reglement.service.test.ts src/modules/paiements/__tests__/paiement-fineo.service.test.ts src/modules/paiements/__tests__/ipn-fineo.service.test.ts src/modules/paiements/__tests__/ipn-ngser.service.test.ts src/modules/espace-organisation/__tests__/espace-organisation.service.test.ts
npm test -- --runTestsByPath src/modules/paiements/__tests__/paiement.service.test.ts
npm run test:integration -- tests/integration/ucs09-fineo-backend.integration.test.js
npm run test:integration -- tests/integration/ucs09-legacy-webhook-backend.integration.test.js
npm run build
```

Resultat: 7 suites, 116 tests, tous passants.
Integration backend FineoPay: 1 test passant, couvrant `inscription -> /api/paiements -> /webhooks/fineo -> dossier PAYE -> paiement CONFIRME` avec verification FineoPay mockee a la frontiere externe.
Integration backend legacy webhook: 2 tests passants, couvrant `SUCCESS` et `FAILED` via `/api/paiements/webhook` avec le reglement commun.
Build TypeScript passant.

```bash
cd forges-monorepo/frontend
npm test -- --run src/api/__tests__/paiements.api.test.js src/pages/apprenant/__tests__/PaiementCallback.test.jsx
npm run test:e2e -- e2e/ucs09-paiement-callback.spec.js
npm run build
```

Resultat: 2 fichiers, 8 tests, tous passants.
E2E callback/integration: 3 tests Playwright passants, dont un vrai flux `inscription -> initiation paiement -> webhook signé -> dossier PAYE -> callback frontend backend réel`.
Build Vite passant.

### Reste a faire avant PR

- Optionnel: etendre le scenario E2E API pour verifier l'inscription organisation cross-session avec un seed dedie.
