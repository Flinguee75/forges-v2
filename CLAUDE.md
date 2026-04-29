 # FORGES — CLAUDE.md v2.2 — Orientation tests et validation

Projet : Plateforme web FORGES, agrégateur de formations certifiantes.
Version de référence : Specs FORGES v4.8.
Objectif de ce fichier : guider Claude/Codex dans un mode test-first. Toute intervention doit améliorer ou préserver la preuve que FORGES respecte ses UCS, ses règles métier, ses contrats API, ses parcours UI et ses critères de mise en production.

---

## 1. Positionnement du document

Ce CLAUDE.md n'est plus un simple guide de développement. C'est un guide de validation continue.

Claude doit raisonner dans cet ordre :

1. Quel UCS est touché ?
2. Quelle règle métier RM est touchée ?
3. Quel endpoint, DTO, rôle RBAC ou écran est touché ?
4. Quel test prouve que le comportement est correct ?
5. Quel test de non-régression doit rester vert ?
6. Est-ce suffisant pour dire que le système est prêt, ou seulement que le changement local est correct ?

Point critique : une collection Newman verte ne suffit pas à déclarer FORGES prêt pour la production. Newman valide surtout des contrats API et des fixtures. La décision production exige aussi les tests d'intégration, E2E, schedulers, webhooks, RBAC, sécurité, performance et smoke tests staging.

---

## 2. Sources de vérité à respecter

Ordre de priorité quand il y a contradiction :

1. Spécifications FORGES v4.8.
2. Mapping UCS -> endpoints -> DTOs -> RMs.
3. Plan de validation complet FORGES v4.8.
4. Résultats Newman et manquements identifiés.
5. Code existant.
6. Ce fichier CLAUDE.md.

Si le code contredit les specs, ne pas adapter les tests au bug. Identifier l'écart, puis proposer soit un correctif code, soit une décision explicite de changement de specs.

---

## 3. Règles non négociables pour Claude

- Ne jamais déclarer “production ready” sans indiquer les tests réellement exécutés et les risques résiduels.
- Ne pas modifier une règle métier sans test associé.
- Ne pas ajouter ou modifier un endpoint sans test API ou Newman associé.
- Ne pas modifier un parcours critique sans test E2E ou justification explicite.
- Ne pas corriger un test en affaiblissant l'assertion si le comportement attendu vient des specs.
- Ne pas mélanger fixtures instables et scénarios de validation reproductibles.
- Ne pas exposer de secrets, tokens, clés ou variables sensibles.
- Ne pas utiliser d'emojis dans le code, les tests, les commits, les rapports ou le frontend.
- Ne pas hardcoder les ports, credentials, URLs de paiement, SMTP ou secrets.
- Ne jamais faire passer une erreur métier normale pour un succès silencieux.

---

## 4. Stack de référence

Backend : Node.js 20, Express, Prisma, PostgreSQL 16, Redis 7.
Frontend : React 19, Vite 8, Tailwind 3.
Tests backend : Jest, Supertest, Newman/Postman.
Tests frontend : Vitest, Playwright.
Sécurité : JWT access 1h, refresh 7j, bcrypt rounds=12, AES-256-GCM, HMAC pour webhooks et audit.
Schedulers : node-cron.
PDF : PDFKit ou Puppeteer selon module.
Emails : Nodemailer avec file/queue Redis ou SMTP de test.

---

## 5. Commandes prioritaires de validation

### 5.1 Seed canonique de validation

```bash
cd forges-monorepo/backend
node seed-validation.js --reset
node seed-validation.js --check
```

Commande combinée :

```bash
cd forges-monorepo/backend
node seed-validation.js --reset && node seed-validation.js --check
```

Règle : tout test de validation doit partir d'un état seedé, stable et documenté.

### 5.2 Tests backend

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:integration -- --coverage
```

Si un script n'existe pas encore, ne pas l'inventer silencieusement. Proposer le script à ajouter dans `package.json`.

### 5.3 Newman API contract regression

```bash
cd backend
npm run dev &
npx newman run tests/forges-v4.8-complete.postman_collection.json \
  --environment tests/forges-v4.8-complete.postman_environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export newman-report.html
```

Objectif : 53 requêtes exécutées, 159 assertions, 0 échec sur la baseline de référence.

Limite : Newman ne remplace pas les tests d'intégration métier ni les E2E.

### 5.4 Tests frontend et E2E

```bash
cd frontend
npm test
npm run test
npx playwright test
npx playwright test --reporter=html
```

Pour staging :

```bash
PLAYWRIGHT_BASE_URL=https://recette.forges.ci npx playwright test
```

### 5.5 Smoke tests staging

```bash
curl -i https://recette.forges.ci/health
curl -i https://recette.forges.ci/api/health
```

Login de test :

```bash
curl -X POST https://recette.forges.ci/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@forges-test.ci","password":"Test@FORGES2026!"}'
```

---

## 6. Workflow obligatoire pour toute intervention

### 6.1 Avant de coder

Claude doit identifier :

- UCS impactés.
- RM impactées.
- Endpoints impactés.
- Rôles RBAC impactés.
- DTOs ou schémas Prisma impactés.
- Tests existants à relancer.
- Tests manquants à créer.

Format attendu :

```markdown
Impact détecté :
- UCS : UCS07, UCS09
- RM : RM-140, RM-07, RM-145
- Endpoints : POST /api/dossiers, POST /api/paiements/webhook
- Tests à ajouter : intégration inscription + webhook commission apporteur
- Risque principal : paiement direct mal appliqué sur Premium+Retail
```

### 6.2 Pendant le codage

Ordre recommandé :

1. Ajouter ou corriger le test qui échoue.
2. Implémenter le correctif minimal.
3. Vérifier que le test ciblé passe.
4. Relancer la suite de non-régression la plus proche.
5. Mettre à jour Newman ou Playwright si le contrat a changé.
6. Documenter le résultat.

### 6.3 Après le codage

Réponse attendue de Claude :

```markdown
Changement effectué :
- ...

Tests exécutés :
- npm run test:integration -- inscriptions-paiements
- npx newman run ...

Résultats :
- Pass : ...
- Fail : ...
- Non exécuté : ...

Risque résiduel :
- ...

Prochaine action recommandée :
- ...
```

---

## 7. Critères de validation production

### 7.1 Seuil minimum MVP contrôlé

FORGES peut être considéré comme déployable en production contrôlée seulement si :

- Seed validation reset et check passent.
- Newman baseline complète passe sans échec.
- Tests unitaires critiques passent.
- Tests d'intégration sur Auth, Inscriptions, Dossiers, Paiements, Vouchers passent.
- E2E critiques apprenant, backoffice et organisation passent ou font l'objet d'une dérogation écrite.
- Aucun bug bloquant ouvert sur paiement, inscription, authentification, RBAC ou données financières.
- Smoke tests staging passent.
- Migrations Prisma appliquées sans erreur.
- Logs backend sans erreur fatale au démarrage.

### 7.2 Seuil recommandé production

- 100 % des tests critiques Criticité 5 passent.
- 95 % ou plus des tests Criticité 4 passent.
- 72 scénarios UCS/MT tracés dans la matrice de validation.
- Tests E2E Playwright critiques à 100 %.
- Tests schedulers validés manuellement ou automatisés.
- Webhooks paiement testés avec succès et échec.
- AuditLog vérifié sur toutes les mutations critiques.
- RBAC testé sur au moins un refus par rôle sensible.
- Performance minimale validée : pages < 2s, API paiement < 5s, rapports PDF < 10s.

### 7.3 Seuil excellence post-production

- Tous les tests manuels convertis en tests automatisés lorsque possible.
- Tests de charge légers intégrés.
- Monitoring uptime et alerting configurés.
- Tests de sécurité OWASP de base exécutés.
- Rapport de couverture généré automatiquement en CI.

---

## 8. Hiérarchie des tests

### 8.1 Tests unitaires

But : valider les règles métier isolées dans les services.

À tester en priorité :

- RM-140 : bifurcation inscription.
- RM-127 : type_formation assigné uniquement par FORGES.
- RM-143/RM-144 : code apporteur valide et non cumulable avec voucher.
- RM-145 : calcul commission apporteur.
- RM-102 : inclus_abonnement calculé automatiquement.
- RM-118 : bot uniquement en questions fermées.
- RM-07/RM-08 : délai 72h et max 3 tentatives paiement.

### 8.2 Tests d'intégration API

But : valider endpoint + DTO + RBAC + service + DB.

À couvrir :

- Authentification et refresh token.
- Inscription apprenant et organisation.
- Création dossier.
- Décision dossier Responsable.
- Paiement et webhook.
- Vouchers organisation et promotionnels.
- Abonnements Retail et B2B.
- Soumission et validation formation partenaire.
- Commissions partenaire et apporteur.

### 8.3 Newman

But : détecter rapidement les ruptures de contrat API sur les 53 endpoints de référence.

Utiliser Newman pour :

- Baseline de stabilité.
- Smoke API local.
- Smoke API staging.
- Vérification rapide après gros refactor.

Ne pas utiliser Newman comme preuve unique de conformité RM.

### 8.4 Playwright E2E

But : valider les parcours utilisateur réels.

Parcours critiques :

- Apprenant : inscription, login, catalogue, inscription session, paiement, attestation.
- Organisation : création compte, essai 30 jours, vouchers, B2B.
- Responsable : traitement dossiers Premium+Retail, validation formations partenaires.
- Partenaire : soumission formation sans type_formation.
- Apporteur : code permanent, dashboard commissions.

### 8.5 Tests manuels guidés

Acceptables seulement pour :

- Schedulers temporels difficiles à simuler.
- Webhooks externes non disponibles en sandbox.
- Vérifications PDF visuelles.
- Cas de monitoring et staging.

Chaque test manuel doit produire une ligne dans la matrice : id, statut, observation, preuve.

---

## 9. Matrice prioritaire UCS/RM/tests

| Zone | Règles | Tests minimums attendus |
|---|---:|---|
| UCS00 Inscription apprenant | RM-28 à RM-33, RM-48, RM-98, MT-02 | email unique casse-insensible, mot de passe, RGPD, token 24h, rate limit |
| UCS01 Auth | MT-01, MT-02 | login, refresh, logout, RBAC refusé |
| UCS02 Comptes | RM-126, RM-141 | création backoffice, invitation partenaire, création apporteur UUID |
| UCS03 Organisation | RM-43, RM-80 à RM-85 | essai 30j, unicité abonnement, suspension essai expiré |
| UCS04 Formations | RM-86, RM-102, RM-127 | type_formation absent en création, archivage irréversible, inclus_abonnement calculé |
| UCS05 Sessions | RM-16 à RM-21 | ordre dates, non-chevauchement, transitions scheduler |
| UCS06 Vouchers | RM-37 à RM-45 | voucher lié formation, quota, expiration, paiement auto organisation |
| UCS07 Inscriptions | RM-01, RM-15, RM-18, RM-140, RM-143, RM-144 | unicité, capacité, Premium+Retail vers vérification, Standard vers paiement direct |
| UCS08 Dossiers | RM-03 à RM-07, RM-57 | retenir, rejeter avec motif, délai paiement 72h |
| UCS09 Paiements | RM-06 à RM-10, RM-88, RM-129, RM-145 | paiement unique, 3 tentatives, webhook success/fail, commission apporteur |
| UCS10 Dashboards | RM-46, RM-130, RM-139, RM-148 | KPIs filtrés par rôle, export PDF/Excel, visibilité limitée partenaire |
| UCS11 Espace apprenant | RM-26, RM-27 | attestation seulement PAYE + CLOTUREE, annulation volontaire limitée |
| UCS12 Organisation | RM-44, RM-49, RM-60 à RM-69 | bénéficiaires, import CSV, plafond B2B |
| UCS14 Formation demande | RM-91 à RM-96, RM-103 | accès immédiat, expiration, suspension si abonnement inactif |
| UCS15/UCS16 Bot | RM-115 à RM-125 | flux fermé, choix hors liste refusé, pas de texte libre sauf feedback |
| UCS17 Partenaire | RM-126, RM-136 | soumission 21 champs, type_formation absent |
| UCS18 Validation partenaire | RM-127 à RM-138 | validation par responsable désigné, calcul prix catalogue, rejet motivé |
| UCS19/UCS20 Apporteur | RM-141 à RM-148 | UUID permanent, commission, seuil, reversement mensuel |
| MT-01 Audit | MT-01 | toute mutation critique écrit AuditLog |
| MT-02 Sécurité | MT-02 | bcrypt, AES-256-GCM, tokens, HTTPS en staging/prod |

---

## 10. Contrats de tests pour règles critiques

### 10.1 RM-140 — Bifurcation inscription

Cas obligatoires :

| Formation | Source | Statut attendu | Responsable ? |
|---|---|---|---|
| STANDARD | RETAIL | PAYE_DIRECTEMENT | information seulement |
| STANDARD | B2B | PAYE_DIRECTEMENT | non |
| STANDARD | VOUCHER | PAYE_DIRECTEMENT ou PAYE selon flux voucher | non |
| PREMIUM | RETAIL | EN_ATTENTE_VERIFICATION | oui |
| PREMIUM | B2B | PAYE_DIRECTEMENT | non |
| PREMIUM | ABONNEMENT | PAYE_DIRECTEMENT | non |

Test attendu : refuser tout passage en EN_ATTENTE_VERIFICATION hors Premium+Retail.

### 10.2 RM-127 — Classification FORGES uniquement

Tests obligatoires :

- POST formation interne avec `type_formation` envoyé par client -> 400 TYPE_FORMATION_READONLY.
- POST formation partenaire avec `type_formation` envoyé -> 400 TYPE_FORMATION_READONLY.
- PUT validation responsable avec `type_formation` valide -> 200/201.
- Interface partenaire : aucun champ `type_formation` visible.
- Interface responsable : champ présent à la validation.

### 10.3 RM-143/RM-144 — Code apporteur

Tests obligatoires :

- code UUID valide et actif -> accepté.
- code inexistant -> 422 CODE_APPORTEUR_INVALIDE.
- apporteur suspendu -> 422 CODE_APPORTEUR_INACTIF.
- code apporteur + voucher organisation -> 422 VOUCHER_CUMUL_INTERDIT.
- code apporteur + réduction abonné Retail -15 % -> accepté.

### 10.4 RM-145/RM-147 — Commission apporteur

Tests obligatoires :

- webhook SUCCESS avec code apporteur -> CommissionApporteur créée.
- montant = montant encaissé après réduction éventuelle x taux / 100.
- webhook FAILED -> aucune commission créée.
- cumul mensuel < seuil -> report.
- cumul mensuel >= seuil -> reversement possible.

### 10.5 RM-118 — Bot fermé

Tests obligatoires :

- réponse dans `options[]` -> acceptée.
- réponse hors liste -> 400 REPONSE_HORS_LISTE.
- texte libre dans flux orientation -> refusé.
- commentaire libre seulement dans feedback, max 500 caractères.
- aucun appel LLM ou externe.

---

## 11. Discipline des seeds et fixtures

Seed officiel : `forges-monorepo/backend/seed-validation.js`.

Règles :

- Les IDs de validation doivent rester stables.
- Les tests doivent nettoyer leurs mutations ou utiliser des fixtures dédiées.
- Ne jamais faire dépendre deux tests de l'ordre d'exécution sauf scénario explicitement séquentiel Newman.
- Créer des fixtures séparées pour validate/reject, success/fail, retained/expired.
- Les tests de paiement doivent distinguer dossier PAYE, RETENU, EN_ATTENTE_VERIFICATION et ANNULE.
- Les tests schedulers doivent être idempotents.
- Les emails doivent être non bloquants en environnement test.

Anti-patterns :

- Réutiliser un dossier déjà PAYE pour tester retenir/rejeter.
- Faire échouer un test parce qu'un email SMTP est indisponible.
- Utiliser un token JWT statique expiré.
- Créer une fixture qui modifie le résultat d'un autre test.
- Corriger Newman en changeant seulement les assertions sans vérifier la RM.

---

## 12. Environnements de test

### 12.1 Local

Objectif : développement et feedback rapide.

Checklist minimale :

- Backend démarre.
- Frontend démarre.
- DB accessible.
- Seed validation OK.
- Unit tests ciblés OK.
- Intégration ciblée OK.

### 12.2 Test/Recette/Staging

Objectif : simulation production.

Checklist :

- Docker compose démarre sans erreur.
- Migrations Prisma appliquées.
- Health checks OK.
- Newman baseline OK.
- Playwright critique OK.
- Logs sans erreur fatale.
- SMTP, Redis, DB, storage, paiement sandbox configurés.

### 12.3 Production

Objectif : vérification non destructive.

Règles :

- Utiliser uniquement comptes de test autorisés.
- Ne jamais créer de faux paiement réel.
- Ne jamais modifier les données utilisateur réelles pour tester.
- Limiter les tests prod à health, login test, catalogue, monitoring et logs.

---

## 13. Reporting attendu

### 13.1 Matrice de validation

Chaque scénario doit avoir :

| Champ | Exemple |
|---|---|
| Test ID | T-UCS07-01 |
| UCS | UCS07 |
| RM | RM-140 |
| Type | API, E2E, Newman, Manuel |
| Statut | PASS, FAIL, BLOCKED, NOT_RUN |
| Preuve | log, screenshot, rapport, assertion |
| Observation | détail utile |
| Décision | corrigé, accepté, à traiter |

### 13.2 Rapport de bug

Template obligatoire :

```markdown
# Bug Report

ID : BUG-XXX
Test : T-UCSXX-YY
Criticité : Bloquant | Critique | Majeur | Mineur
Module : ...
RM violée : ...

Description :
...

Étapes de reproduction :
1. ...
2. ...

Résultat attendu :
...

Résultat observé :
...

Preuve :
...

Hypothèse de cause :
...

Proposition de correction :
...
```

### 13.3 Niveaux de criticité

| Niveau | Définition | Exemples |
|---|---|---|
| Bloquant | Empêche la prod | paiement cassé, login impossible, RM-140 incorrecte |
| Critique | Risque métier élevé | mauvaise commission, RBAC contournable, données financières exposées |
| Majeur | Fonction importante dégradée | attestation indisponible, dashboard faux |
| Mineur | Impact limité | libellé, mise en forme, message peu clair |

---

## 14. CI/CD recommandé

### 14.1 Pull request

À chaque PR :

```bash
npm ci
npm run lint
npm run test:unit
npm run test:integration
cd frontend && npm ci && npm run test
```

Pour PR touchant un parcours utilisateur :

```bash
cd frontend
npx playwright test
```

Pour PR touchant un endpoint public ou backoffice :

```bash
cd backend
npx newman run tests/forges-v4.8-complete.postman_collection.json \
  --environment tests/forges-v4.8-complete.postman_environment.json
```

### 14.2 Avant merge develop/main

- Seed validation reset/check.
- Tests unitaires.
- Tests intégration.
- Newman.
- Playwright critique.
- Migration status.

### 14.3 Avant déploiement staging

- Build backend OK.
- Build frontend OK.
- Docker compose OK.
- Migrations Prisma deploy OK.
- Smoke test local OK.

### 14.4 Avant production

- Smoke staging OK.
- Newman staging OK.
- Playwright staging critique OK.
- Aucun bug bloquant/critique non traité.
- Rollback documenté.
- Backup DB vérifié.

---

## 15. Patterns techniques à préserver

### 15.1 Format de réponse API

Correct :

```ts
return res.status(200).json({
  statusCode: 200,
  data: result
});
```

Incorrect :

```ts
return res.status(200).json(result);
```

### 15.2 Gestion d'erreur

Correct :

```ts
throw new AppError('UNAUTHORIZED', 401, 'Invalid credentials');
```

Incorrect :

```ts
throw new Error('UNAUTHORIZED');
```

### 15.3 Architecture backend

Flux autorisé :

```text
Controller -> Service -> Repository -> Prisma
```

Interdit :

```text
Controller -> Prisma
Controller -> Repository direct
Service -> Prisma direct, sauf exception justifiée
```

### 15.4 Tests de service

Chaque règle métier importante doit avoir au moins :

- un test nominal ;
- un test d'erreur ;
- un test edge case ;
- un test de non-régression si le bug a déjà été observé.

---

## 16. Endpoints à surveiller en priorité

| UCS | Endpoint | Rôle | Risque principal |
|---|---|---|---|
| UCS00 | POST /api/apprenants/register | Public | énumération email, RGPD, token |
| UCS01 | POST /api/auth/login | Public | auth, JWT, rôle |
| UCS03 | POST /api/organisations/register | Public | essai 30j, unicité légale |
| UCS04 | POST /api/backoffice/formations | ADMIN/RESPONSABLE | type_formation interdit |
| UCS05 | POST /api/backoffice/sessions | SUPERVISEUR | dates, chevauchement |
| UCS06 | POST /api/vouchers | ORGANISATION/AGENT | quota, formation liée |
| UCS07 | POST /api/dossiers ou /api/sessions/:id/inscrire | APPRENANT | RM-140, unicité, capacité |
| UCS08 | PATCH /api/backoffice/dossiers/:id/retenir | RESPONSABLE | 72h, statut irréversible |
| UCS09 | POST /api/paiements/webhook | Système | HMAC, commission, double paiement |
| UCS11 | GET /api/attestations/:dossierId/download | APPRENANT | condition PAYE + CLOTUREE |
| UCS17 | POST /api/partenaires/:id/formations | PARTENAIRE | 21 champs, type absent |
| UCS18 | PUT /api/responsable/formations/:id/valider | RESPONSABLE | RM-127, prix catalogue |
| UCS20 | GET /api/apporteur/commissions | APPORTEUR | visibilité limitée, solde exact |

---

## 17. Variables d'environnement critiques

Ne jamais hardcoder ces valeurs :

```bash
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
ENCRYPTION_KEY=
HMAC_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
FRONTEND_URL=
PAYMENT_API_KEY=
PAYMENT_WEBHOOK_SECRET=
SEUIL_REVERSEMENT_APPORTEUR_XOF=5000
DEFAULT_COMMISSION_APPORTEUR_PCT=5
DEFAULT_COMMISSION_FORGES_PCT=20
```

En test, utiliser `.env.test` et des secrets de test non réutilisés en production.

---

## 18. Règles frontend liées aux tests

- Les champs interdits par les specs ne doivent pas seulement être ignorés backend : ils doivent aussi être absents de l'UI.
- Les sélecteurs Playwright doivent être stables : préférer `data-testid` pour les actions critiques.
- Aucun test E2E ne doit dépendre d'un texte fragile si un `data-testid` est disponible.
- Les statuts doivent être testables visuellement et fonctionnellement.
- Les erreurs doivent être affichées clairement à l'utilisateur et testées.

Sélecteurs recommandés :

```html
<button data-testid="submit-inscription">S'inscrire</button>
<div data-testid="dossier-status">PAYE</div>
<input data-testid="code-apporteur" />
```

---

## 19. Décisions métier à ne pas casser

- Le Bot Conseiller est 100 % règles métier. Aucun LLM en v4.8.
- Le Partenaire ne fixe jamais `type_formation`.
- FORGES est l'unique interlocuteur financier de l'apprenant.
- Le code apporteur trace une commission, il ne réduit pas le prix apprenant.
- La réduction -15 % vient du statut abonné, pas du code apporteur.
- Le statut RETENU ne concerne que Premium+Retail.
- Une formation archivée ne se réactive pas.
- Les certifications et historiques financiers ne sont jamais supprimés par confort de test.

---

## 20. Réponse attendue quand l'utilisateur demande “est-ce prêt prod ?”

Claude doit répondre avec prudence et preuves :

```markdown
État actuel : prêt / pas prêt / prêt sous réserve.

Preuves disponibles :
- Newman : ...
- Tests intégration : ...
- E2E : ...
- Seed : ...
- Staging smoke : ...

Blocages :
- ...

Risques résiduels :
- ...

Décision recommandée :
- Go / No-Go / Go limité / Go après correction.
```

Ne jamais répondre uniquement : “oui, c'est prêt”.

---

## 21. Résumé opérationnel pour Claude

Quand tu modifies FORGES, pense comme un validateur système :

1. Commence par l'UCS et la RM.
2. Vérifie le contrat endpoint/DTO/RBAC.
3. Ajoute ou corrige le test.
4. Exécute le test ciblé.
5. Exécute la non-régression pertinente.
6. Rapporte ce qui est prouvé et ce qui ne l'est pas.
7. Ne transforme pas une absence de test en confiance.

La question centrale n'est pas “est-ce que le code marche ?”.
La question centrale est “quelle preuve avons-nous que le comportement respecte les specs v4.8 dans les scénarios critiques ?”.
