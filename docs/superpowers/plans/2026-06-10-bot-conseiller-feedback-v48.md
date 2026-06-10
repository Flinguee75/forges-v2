# Bot Conseiller Feedback v4.8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le Bot Conseiller capable de détecter une formation éligible, conduire le questionnaire RM-122 et enregistrer exactement un feedback fiable pour un Apprenant ou une Organisation.

**Architecture:** Le backend reste la source de vérité de la conversation. Un contrat HTTP canonique expose toujours une session normalisée avec la question courante, tandis que `FeedbackEligibilityService` sélectionne la cible et que `FeedbackService` valide puis persiste le questionnaire. Le frontend affiche ce contrat sans reconstruire les règles métier.

**Tech Stack:** Node.js 20, Express, TypeScript, Prisma/PostgreSQL, Jest/Supertest, React 19, Vitest/Testing Library, Playwright.

---

## Diagnostic vérifié

Référence fonctionnelle : `docs/specifications/ForgesSpecsv4.8.md`, RM-115 à RM-125, UCS15 et UCS16.

### Écarts bloquants

1. **Le widget n'est monté dans aucun layout.**
   `BotWidget.jsx` n'est importé que par son test. Aucun Apprenant ou Organisation ne peut ouvrir le Bot.

2. **Le contrat de réponse initiale backend/frontend est incompatible.**
   Le backend renvoie `{ statusCode, data: { session_id, flux, question } }`.
   `normalizeBotSession()` attend directement `{ id, flux_actif, statut, current_question }`.
   Reproduction : une vraie réponse backend normalisée donne `current_question: null`.

3. **Le contrat de soumission est incompatible.**
   Le frontend envoie `{ value, commentaire }`.
   Le contrôleur exige `question_id` et lit `valeur|answer|response|option`, mais pas `value`.
   Reproduction : le contrôleur répond `400 CHAMPS_MANQUANTS` sans appeler le service.

4. **La cible du feedback n'est pas conservée dans `ConversationBot`.**
   `getPremiereQuestion()` reçoit un dossier éligible, mais seul l'intitulé est renvoyé.
   `handleFeedback()` lit `session.contexte?.formation_id`, alors que `contexte` n'existe pas dans Prisma.
   Résultat reproduit : `formation_id: ""`.

5. **Un feedback Organisation est enregistré comme feedback Apprenant.**
   `handleFeedback()` renseigne toujours `apprenant_id: session.utilisateur_id`.
   Résultat reproduit : `{ apprenant_id: "org-1" }`.

6. **Le déclenchement Organisation utilise une requête Apprenant.**
   `findSessionsSansFeedback()` filtre `Dossier.apprenant_id`.
   `demarrerSessionOrganisation()` lui passe pourtant un `organisation_id`.

7. **Les formations à la demande expirées ne déclenchent jamais le feedback.**
   Aucun accès à `AccesFormationDemande` n'existe dans MOD-14 malgré RM-121.

8. **L'unicité RM-121 n'est pas garantie.**
   `feedbackExiste()` n'est pas appelé avant création et aucune contrainte unique Prisma ne protège les courses concurrentes.

9. **Les questions facultatives ne peuvent pas être passées.**
   Les questions 2 et 3 n'acceptent que `1..5`; la question 4 exige une chaîne.
   Il n'existe aucune valeur fermée `PASSER`.

10. **Le commentaire n'emprunte pas le contrat frontend.**
    Le frontend l'envoie dans `commentaire`, séparément de `value`; le contrôleur l'ignore.
    Le backend attend actuellement le commentaire comme `valeur` de la question 4.

11. **Le modèle contient deux champs concurrents.**
    `FeedbackFormation.commentaire` et `commentaire_libre` coexistent. Le service écrit dans le premier, alors que seul le second impose 500 caractères.

12. **`session_id` et `canal` ne sont pas explicitement écrits.**
    Le feedback ne permet pas de relier de manière fiable le retour à la session de formation.

13. **La langue préférée n'est pas appliquée par le backend.**
    `getQuestionsFeedback()` ignore son paramètre `langue` et renvoie du français.

14. **Les statuts de conversation divergent.**
    Le backend stocke `EN_COURS`; le frontend n'affiche une question que pour `ACTIVE`.

15. **Les statistiques backoffice portent uniquement sur la page courante.**
    Moyenne et taux de recommandation sont calculés sur les 20 lignes paginées, pas sur l'ensemble filtré.

16. **Les tests verts ne traversent pas le parcours réel.**
    Les tests backend mockent les collaborateurs internes. Les tests frontend injectent un contrat fabriqué. Les E2E UCS15/UCS16 ne remplissent jamais les cinq réponses.

## Contrat public cible

### Démarrer ou lire une conversation

```json
{
  "statusCode": 201,
  "data": {
    "id": "uuid",
    "flux_actif": "FEEDBACK",
    "statut": "ACTIVE",
    "langue": "FR",
    "current_question": {
      "id": "feedback_note_globale",
      "question": "Quelle note globale donnez-vous à cette formation ?",
      "options": [
        { "value": "1", "label": "1" },
        { "value": "2", "label": "2" },
        { "value": "3", "label": "3" },
        { "value": "4", "label": "4" },
        { "value": "5", "label": "5" }
      ],
      "required": true,
      "allow_commentaire": false,
      "commentaire_max_length": null
    },
    "historique": {
      "steps": [],
      "metadata": {
        "feedback": {
          "formation_id": "uuid",
          "session_id": "uuid-or-null",
          "mode_formation": "AVEC_SESSION"
        }
      }
    }
  }
}
```

### Répondre

```json
{
  "question_id": "feedback_note_globale",
  "valeur": "5",
  "commentaire": null
}
```

`question_id` doit correspondre à la question courante. `valeur` doit appartenir à `options`. Seule `feedback_commentaire` accepte `commentaire`, limité à 500 caractères.

### Questions RM-122

| ID stable | Champ | Obligatoire | Valeurs |
|---|---|---:|---|
| `feedback_note_globale` | `note_globale` | oui | `1..5` |
| `feedback_note_contenu` | `note_contenu` | non | `1..5`, `PASSER` |
| `feedback_note_formateur` | `note_formateur` | non | `1..5`, `PASSER`; seulement `AVEC_SESSION` |
| `feedback_commentaire` | `commentaire_libre` | non | `ENVOYER`, `PASSER`; commentaire libre autorisé |
| `feedback_recommande` | `recommande` | oui | `OUI`, `NON` |

Pour une formation `A_LA_DEMANDE`, la question formateur n'est pas présentée.

---

### Task 1: Verrouiller le contrat HTTP avec un tracer bullet

**Files:**
- Create: `forges-monorepo/backend/src/modules/bot-conseiller/__tests__/bot-feedback.routes.test.ts`
- Create: `forges-monorepo/backend/src/modules/bot-conseiller/bot.types.ts`
- Create: `forges-monorepo/backend/src/modules/bot-conseiller/bot.presenter.ts`
- Modify: `forges-monorepo/backend/src/modules/bot-conseiller/bot.controller.ts`
- Modify: `forges-monorepo/frontend/src/api/bot.api.js`
- Modify: `forges-monorepo/frontend/src/hooks/useBot.js`
- Modify: `forges-monorepo/frontend/src/components/bot/botHelpers.js`
- Test: `forges-monorepo/frontend/src/hooks/__tests__/useBot.test.jsx`

- [ ] **Step 1: Écrire le test backend RED du contrat de démarrage**

Tester via `BotController.demarrerSession()` que la réponse publique contient `data.id`, `data.flux_actif`, `data.statut = ACTIVE` et `data.current_question.options` normalisées.

```ts
expect(res.json).toHaveBeenCalledWith({
  statusCode: 201,
  data: expect.objectContaining({
    id: 'bot-01',
    flux_actif: 'FEEDBACK',
    statut: 'ACTIVE',
    current_question: expect.objectContaining({
      id: 'feedback_note_globale',
      options: expect.arrayContaining([{ value: '5', label: '5' }]),
    }),
  }),
});
```

- [ ] **Step 2: Exécuter le test et constater RED**

Run:

```bash
cd forges-monorepo/backend
npx jest --runInBand src/modules/bot-conseiller/__tests__/bot-feedback.routes.test.ts
```

Expected: FAIL, la réponse contient encore `session_id`, `flux` et `question`.

- [ ] **Step 3: Ajouter les types et le presenter minimal**

Définir `BotSessionView`, `BotQuestionView`, `BotAnswerCommand` dans `bot.types.ts`.
Dans `bot.presenter.ts`, mapper les statuts internes :

```ts
const PUBLIC_STATUS = {
  EN_COURS: 'ACTIVE',
  TERMINEE: 'TERMINEE',
  ABANDONNEE: 'ABANDONNEE',
} as const;
```

Le contrôleur ne doit jamais exposer directement une ligne Prisma.

- [ ] **Step 4: Faire passer le test backend**

Run: même commande.

Expected: PASS.

- [ ] **Step 5: Écrire le test frontend RED avec une vraie enveloppe backend**

Le test du hook doit fournir `{ statusCode: 201, data: canonicalSession }`, puis vérifier que le widget possède une question et envoie :

```js
expect(botApi.submitResponse).toHaveBeenCalledWith('bot-01', {
  question_id: 'feedback_note_globale',
  valeur: '5',
  commentaire: null,
});
```

- [ ] **Step 6: Corriger le client frontend**

`bot.api.js` accepte le payload canonique. `useBot` extrait `response.data`, conserve la session précédente entre deux réponses et prend `question_id` depuis `session.current_question.id`.

- [ ] **Step 7: Faire passer les tests frontend**

Run:

```bash
cd forges-monorepo/frontend
npm test -- --run src/hooks/__tests__/useBot.test.jsx src/components/bot/__tests__/botHelpers.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add forges-monorepo/backend/src/modules/bot-conseiller forges-monorepo/frontend/src/api/bot.api.js forges-monorepo/frontend/src/hooks/useBot.js forges-monorepo/frontend/src/components/bot/botHelpers.js forges-monorepo/frontend/src/hooks/__tests__/useBot.test.jsx
git commit -m "fix(bot): align conversation API contract"
```

### Task 2: Sélectionner et conserver la cible Feedback Apprenant

**Files:**
- Create: `forges-monorepo/backend/src/modules/bot-conseiller/feedback-eligibility.service.ts`
- Create: `forges-monorepo/backend/src/modules/bot-conseiller/__tests__/feedback-eligibility.service.test.ts`
- Modify: `forges-monorepo/backend/src/modules/bot-conseiller/bot.repository.ts`
- Modify: `forges-monorepo/backend/src/modules/bot-conseiller/bot.service.ts`
- Modify: `forges-monorepo/backend/prisma/schema.prisma`
- Create: `forges-monorepo/backend/prisma/migrations/<timestamp>_bot_feedback_context/migration.sql`

- [ ] **Step 1: Écrire le test RED du dossier éligible**

Le service doit retourner une cible uniquement pour un dossier `PAYE`, une session `CLOTUREE`, `date_fin` comprise entre maintenant et J-7, et aucun feedback existant.

```ts
expect(await eligibility.findForApprenant('app-01', now)).toEqual({
  actorType: 'APPRENANT',
  actorId: 'app-01',
  formationId: 'formation-01',
  sessionId: 'session-01',
  formationIntitule: 'Gestion de projet',
  modeFormation: 'AVEC_SESSION',
});
```

- [ ] **Step 2: Exécuter RED**

```bash
npx jest --runInBand src/modules/bot-conseiller/__tests__/feedback-eligibility.service.test.ts
```

Expected: FAIL, service absent.

- [ ] **Step 3: Ajouter `ConversationBot.contexte Json?`**

La migration ajoute une colonne JSONB. Le contexte contient uniquement les identifiants métier nécessaires; aucune donnée personnelle.

- [ ] **Step 4: Implémenter la requête de sélection**

Utiliser `Dossier.apprenant_id`, `Dossier.statut = PAYE`, `Session.statut = CLOTUREE`, la fenêtre de sept jours et un `NOT` sur les feedbacks de l'acteur et de la formation. Injecter `now` pour rendre le test déterministe.

- [ ] **Step 5: Persister la cible au démarrage**

Étendre `creerSession()` avec :

```ts
{
  utilisateur_id: actorId,
  apprenant_id: actorId,
  organisation_id: null,
  type_utilisateur: 'APPRENANT',
  flux_actif: 'FEEDBACK',
  contexte: {
    formation_id: target.formationId,
    session_id: target.sessionId,
    mode_formation: target.modeFormation,
  },
}
```

- [ ] **Step 6: Faire passer le test**

Expected: PASS et aucune dépendance à `Date.now()` non injectée.

- [ ] **Step 7: Commit**

```bash
git add forges-monorepo/backend/src/modules/bot-conseiller forges-monorepo/backend/prisma
git commit -m "feat(bot): select learner feedback target"
```

### Task 3: Implémenter le questionnaire RM-122 en tranches verticales

**Files:**
- Create: `forges-monorepo/backend/src/modules/bot-conseiller/feedback.service.ts`
- Create: `forges-monorepo/backend/src/modules/bot-conseiller/feedback.questions.ts`
- Create: `forges-monorepo/backend/src/modules/bot-conseiller/__tests__/feedback.service.test.ts`
- Modify: `forges-monorepo/backend/src/modules/bot-conseiller/bot.service.ts`
- Modify: `forges-monorepo/backend/src/modules/bot-conseiller/bot.controller.ts`

- [ ] **Step 1: RED note globale obligatoire**

Tester via `BotService.repondre()` qu'une valeur absente, `0`, `6` ou hors options retourne `400 REPONSE_HORS_LISTE`, et que `5` avance vers `feedback_note_contenu`.

- [ ] **Step 2: GREEN note globale**

Définir les questions avec IDs stables et comparer `question_id` à la question courante, pas seulement au flux.

- [ ] **Step 3: RED puis GREEN notes facultatives**

Ajouter successivement les tests `1..5` et `PASSER` pour contenu puis formateur. `PASSER` produit `null`.

- [ ] **Step 4: RED puis GREEN formation à la demande**

Avec `mode_formation = A_LA_DEMANDE`, après le contenu la prochaine question doit être `feedback_commentaire`, jamais `feedback_note_formateur`.

- [ ] **Step 5: RED commentaire**

Vérifier :

```ts
await expect(answer({
  question_id: 'feedback_commentaire',
  valeur: 'ENVOYER',
  commentaire: 'x'.repeat(501),
})).rejects.toMatchObject({ code: 'BAD_REQUEST' });
```

Tester aussi `PASSER` sans commentaire et `ENVOYER` avec 500 caractères.

- [ ] **Step 6: GREEN commentaire**

Le commentaire ne doit être accepté que sur `feedback_commentaire`; le stocker dans l'historique avec sa réponse.

- [ ] **Step 7: RED puis GREEN recommandation obligatoire**

Accepter uniquement `OUI` ou `NON`. À cette étape, appeler `FeedbackService.collecter()` puis terminer la conversation.

- [ ] **Step 8: Vérifier tout le questionnaire**

```bash
npx jest --runInBand src/modules/bot-conseiller/__tests__/feedback.service.test.ts src/modules/bot-conseiller/__tests__/bot-feedback.routes.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add forges-monorepo/backend/src/modules/bot-conseiller
git commit -m "feat(bot): implement RM-122 feedback questionnaire"
```

### Task 4: Garantir la persistance, l'acteur et l'unicité RM-121

**Files:**
- Modify: `forges-monorepo/backend/prisma/schema.prisma`
- Create: `forges-monorepo/backend/prisma/migrations/<timestamp>_feedback_integrity/migration.sql`
- Modify: `forges-monorepo/backend/src/modules/bot-conseiller/feedback.service.ts`
- Modify: `forges-monorepo/backend/src/modules/bot-conseiller/bot.repository.ts`
- Test: `forges-monorepo/backend/src/modules/bot-conseiller/__tests__/feedback.service.test.ts`

- [ ] **Step 1: RED persistance Apprenant complète**

Vérifier que la commande finale contient :

```ts
{
  apprenant_id: 'app-01',
  organisation_id: null,
  formation_id: 'formation-01',
  session_id: 'session-01',
  canal: 'BOT',
  note_globale: 5,
  note_contenu: null,
  note_formateur: 4,
  commentaire_libre: 'Très utile',
  recommande: true,
  session_bot_id: 'bot-01',
}
```

- [ ] **Step 2: RED persistance Organisation**

Vérifier que `organisation_id` est renseigné et `apprenant_id` reste `null`.

- [ ] **Step 3: Nettoyer le modèle**

Conserver uniquement `commentaire_libre @db.VarChar(500)`. Copier les anciennes valeurs de `commentaire` avant suppression.
Ajouter les relations optionnelles vers `Session` et `ConversationBot`.

- [ ] **Step 4: Ajouter les contraintes d'unicité**

```prisma
@@unique([apprenant_id, formation_id])
@@unique([organisation_id, formation_id])
```

La migration doit détecter les doublons existants avant création des index et échouer avec un message explicite plutôt que supprimer silencieusement des données.

- [ ] **Step 5: Mapper la course concurrente**

Intercepter Prisma `P2002` et retourner `409 FEEDBACK_DEJA_COLLECTE`.

- [ ] **Step 6: Faire passer les tests**

Run:

```bash
npx jest --runInBand src/modules/bot-conseiller/__tests__/feedback.service.test.ts
npx prisma validate
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add forges-monorepo/backend/prisma forges-monorepo/backend/src/modules/bot-conseiller
git commit -m "fix(bot): enforce feedback ownership and uniqueness"
```

### Task 5: Couvrir les accès à la demande expirés

**Files:**
- Modify: `forges-monorepo/backend/src/modules/bot-conseiller/feedback-eligibility.service.ts`
- Modify: `forges-monorepo/backend/src/modules/bot-conseiller/bot.repository.ts`
- Test: `forges-monorepo/backend/src/modules/bot-conseiller/__tests__/feedback-eligibility.service.test.ts`

- [ ] **Step 1: RED accès expiré**

Créer un cas avec `AccesFormationDemande.date_expiration < now`, statut `EXPIRE`, aucun feedback. Attendre une cible avec `sessionId: null` et `modeFormation: A_LA_DEMANDE`.

- [ ] **Step 2: GREEN requête accès**

La priorité est :

1. session clôturée la plus récente dans la fenêtre de sept jours;
2. accès à la demande expiré le plus récent;
3. aucun feedback : flux suivant.

- [ ] **Step 3: RED accès actif ou déjà évalué**

Vérifier qu'un accès `ACTIF`, non expiré, ou déjà évalué ne déclenche pas FEEDBACK.

- [ ] **Step 4: GREEN et vérification**

Run: test ciblé.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add forges-monorepo/backend/src/modules/bot-conseiller
git commit -m "feat(bot): request feedback for expired on-demand access"
```

### Task 6: Couvrir UCS16 Organisation

**Files:**
- Modify: `forges-monorepo/backend/src/modules/bot-conseiller/feedback-eligibility.service.ts`
- Modify: `forges-monorepo/backend/src/modules/bot-conseiller/bot.service.ts`
- Modify: `forges-monorepo/backend/src/modules/bot-conseiller/bot.repository.ts`
- Create: `forges-monorepo/backend/src/modules/bot-conseiller/__tests__/bot-feedback-organisation.routes.test.ts`

- [ ] **Step 1: RED sélection Organisation**

Créer un dossier payé avec `organisation_inscriptrice_id = org-01`, session clôturée depuis trois jours et aucun feedback Organisation.

- [ ] **Step 2: GREEN sélection Organisation**

La requête Organisation doit filtrer `Dossier.organisation_inscriptrice_id`, pas `Dossier.apprenant_id`.

- [ ] **Step 3: RED parcours HTTP complet**

Par le contrôleur, démarrer le bot Organisation, répondre à toutes les questions et vérifier la réponse finale `TERMINEE`.

- [ ] **Step 4: GREEN persistance Organisation**

Créer la conversation avec `organisation_id`, conserver le contexte, puis enregistrer le feedback avec le bon acteur.

- [ ] **Step 5: RED feedback déjà collecté**

Une deuxième ouverture doit ignorer cette formation et ne jamais proposer une seconde collecte.

- [ ] **Step 6: Vérification**

```bash
npx jest --runInBand src/modules/bot-conseiller/__tests__/bot-feedback-organisation.routes.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add forges-monorepo/backend/src/modules/bot-conseiller
git commit -m "feat(bot): collect organisation training feedback"
```

### Task 7: Afficher le questionnaire dans le widget et dans les quatre langues

**Files:**
- Modify: `forges-monorepo/frontend/src/components/bot/botHelpers.js`
- Modify: `forges-monorepo/frontend/src/components/bot/BotQuestionOptions.jsx`
- Modify: `forges-monorepo/frontend/src/components/bot/BotWidget.jsx`
- Modify: `forges-monorepo/frontend/src/components/layout/EtudiantLayout.jsx`
- Modify: `forges-monorepo/frontend/src/components/layout/OrgLayout.jsx`
- Test: `forges-monorepo/frontend/src/components/bot/__tests__/BotQuestionOptions.test.jsx`
- Test: `forges-monorepo/frontend/src/components/bot/__tests__/BotWidget.test.jsx`

- [ ] **Step 1: RED montage du widget**

Tester que les layouts Apprenant et Organisation rendent `BotWidget`, mais jamais les layouts publics, Partenaire, Apporteur ou Backoffice.

- [ ] **Step 2: GREEN montage**

Ajouter `<BotWidget />` une seule fois dans chaque layout autorisé.

- [ ] **Step 3: RED questions facultatives**

Tester les boutons `Passer`, les notes, l'absence de note formateur pour `A_LA_DEMANDE`, et le commentaire limité à 500 caractères.

- [ ] **Step 4: GREEN composants**

Le frontend rend exclusivement les options fournies par l'API. Il n'invente ni ordre ni saut de question.

- [ ] **Step 5: RED traductions**

Pour FR, EN, ES et PT, vérifier les libellés des cinq IDs stables et `PASSER/OUI/NON`.

- [ ] **Step 6: GREEN traductions**

Compléter `QUESTION_LIBRARY`. Le backend fournit IDs et valeurs stables; le frontend localise libellés et questions selon `langue_preferee`, avec fallback FR.

- [ ] **Step 7: Vérifier**

```bash
npm test -- --run src/components/bot src/hooks/__tests__/useBot.test.jsx
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add forges-monorepo/frontend/src/components forges-monorepo/frontend/src/hooks forges-monorepo/frontend/src/api
git commit -m "feat(bot): expose localized feedback widget"
```

### Task 8: Fiabiliser la consultation backoffice

**Files:**
- Modify: `forges-monorepo/backend/src/modules/bot-conseiller/bot.controller.ts`
- Modify: `forges-monorepo/backend/src/modules/bot-conseiller/bot.repository.ts`
- Modify: `forges-monorepo/frontend/src/pages/backoffice/bot/FeedbacksAdmin.jsx`
- Test: `forges-monorepo/backend/src/modules/bot-conseiller/__tests__/bot-backoffice.routes.test.ts`
- Test: `forges-monorepo/frontend/src/pages/backoffice/bot/__tests__/FeedbacksAdmin.test.jsx`

- [ ] **Step 1: RED statistiques globales**

Avec 25 feedbacks et une page de 20, vérifier que moyenne et recommandation portent sur les 25.

- [ ] **Step 2: GREEN agrégats Prisma**

Utiliser `aggregate()` et `count()` sur le même filtre que la liste paginée.

- [ ] **Step 3: RED auteurs Organisation**

Vérifier que la réponse inclut soit l'Apprenant, soit l'Organisation, et que l'UI affiche le type et le nom corrects.

- [ ] **Step 4: GREEN affichage**

Afficher notes globale/contenu/formateur, commentaire, recommandation, formation, session et canal. Ne pas afficher une cellule Apprenant vide pour une Organisation.

- [ ] **Step 5: Vérifier les rôles**

Conserver l'accès conforme à la matrice fonctionnelle retenue : `ADMIN` et `RESPONSABLE`. Retirer `AGENT` si aucune décision métier ne l'autorise explicitement.

- [ ] **Step 6: Vérifier**

Run tests backend/frontend ciblés.

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add forges-monorepo/backend/src/modules/bot-conseiller forges-monorepo/frontend/src/pages/backoffice/bot
git commit -m "fix(bot): report complete feedback aggregates"
```

### Task 9: Ajouter les parcours de non-régression E2E

**Files:**
- Modify: `forges-monorepo/frontend/e2e/ucs15-bot-apprenant.spec.js`
- Modify: `forges-monorepo/frontend/e2e/ucs16-bot-organisation.spec.js`
- Modify: `forges-monorepo/backend/prisma/seed.e2e.ts`

- [ ] **Step 1: Préparer des fixtures déterministes**

Créer :

- un Apprenant avec dossier payé et session clôturée depuis trois jours;
- un Apprenant avec accès à la demande expiré;
- une Organisation avec dossier payé via `organisation_inscriptrice_id`;
- aucune ligne `FeedbackFormation` pour ces cibles.

- [ ] **Step 2: E2E UCS15 session**

Ouvrir le widget, vérifier FEEDBACK, répondre `5`, `PASSER`, `4`, commentaire, `OUI`, puis vérifier la fin de conversation et la ligne backoffice.

- [ ] **Step 3: E2E UCS15 à la demande**

Vérifier l'absence de question formateur et `session_id = null`.

- [ ] **Step 4: E2E UCS16**

Parcourir le questionnaire Organisation et vérifier que le backoffice affiche l'Organisation comme auteur.

- [ ] **Step 5: E2E unicité**

Rouvrir le bot après collecte et vérifier qu'il ne redemande pas le feedback de la même formation.

- [ ] **Step 6: Vérification finale**

```bash
cd forges-monorepo/backend
npm test -- --runInBand
npm run build
npx prisma validate

cd ../frontend
npm test -- --run
npm run build
npm run test:e2e -- ucs15-bot-apprenant.spec.js ucs16-bot-organisation.spec.js
```

Expected: toutes les suites passent.

- [ ] **Step 7: Vérifier l'absence d'instrumentation temporaire**

```bash
rg -n '\[DEBUG-' forges-monorepo/backend forges-monorepo/frontend
```

Expected: aucune occurrence.

- [ ] **Step 8: Commit**

```bash
git add forges-monorepo/backend/prisma/seed.e2e.ts forges-monorepo/frontend/e2e
git commit -m "test(bot): cover feedback journeys end to end"
```

## Matrice de couverture

| Exigence | Couverture |
|---|---|
| RM-115 déclenchement manuel/automatique | Tasks 2, 5, 6, 7 |
| RM-116 feedback prioritaire | Tasks 2, 5, 6 |
| RM-117 aucun LLM | architecture inchangée, suite existante conservée |
| RM-118 questions fermées | Tasks 1, 3, 7 |
| RM-121 fenêtre 7j, accès expiré, unicité | Tasks 2, 4, 5, 6 |
| RM-122 questionnaire et commentaire 500 | Tasks 3, 4, 7 |
| RM-98 langue préférée/fallback FR | Task 7 |
| RM-125 données confinées/lecture profil | services locaux uniquement; tests existants conservés |
| MT-01 audit mutation | `FEEDBACK_COLLECTE` testé dans Tasks 3/4 |
| UCS15 Apprenant | Tasks 2, 3, 5, 7, 9 |
| UCS16 Organisation | Tasks 6, 7, 9 |

## Décisions à conserver pendant l'implémentation

- Le backend décide du flux, de la cible et de la prochaine question.
- Le frontend ne contient aucune règle d'éligibilité.
- Les identifiants et valeurs de questions restent stables et non traduits.
- Les libellés sont traduits en FR/EN/ES/PT avec fallback FR.
- Une seule des colonnes `apprenant_id` et `organisation_id` est renseignée.
- Le commentaire libre est autorisé uniquement à l'étape dédiée et limité à 500 caractères côté frontend, service et base.
- Une contrainte de base protège l'unicité; un contrôle service seul est insuffisant.
- Les tests de parcours passent par l'interface HTTP ou le composant public, sans vérifier les appels entre classes internes.
