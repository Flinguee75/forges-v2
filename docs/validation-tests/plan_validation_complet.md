# Plan de Validation Complet FORGES v4.8 - 72 Tests

Document canonique de validation. Le point d'entree seed officiel est `forges-monorepo/backend/seed-validation.js`.

**Objectif**: Valider les 72 scénarios (UCS00→UCS20 + MT-01/MT-02) avec l'approche la plus complète (features + UI)
**Contrainte**: < 1 semaine
**Stratégie**: Approche hybride automatisée + manuelle pour maximiser la couverture

---

## Vue d'ensemble

### Analyse de la situation actuelle

**Forces**:
- ✅ Tests unitaires backend: 24 modules, 471 cas (Jest)
- ✅ Tests unitaires frontend: 61 fichiers (Vitest)
- ✅ Seed de validation prêt (`forges-monorepo/backend/seed-validation.js`)
- ✅ Plan de validation détaillé (72 tests documentés)
- ✅ Infrastructure de test mature (Jest + Vitest)

### Commandes seed canoniques

```bash
cd forges-monorepo/backend
node seed-validation.js --reset
node seed-validation.js --check
```

Commande combinee:

```bash
cd forges-monorepo/backend
node seed-validation.js --reset && node seed-validation.js --check
```

**Lacunes critiques**:
- ❌ Pas de tests d'intégration API complets
- ❌ Pas de tests E2E (Playwright/Cypress)
- ❌ Pas de tests des règles métier complexes (RM-140, RM-127, RM-143, etc.)
- ❌ Pas de tests des schedulers (node-cron)
- ❌ Pas de tests des webhooks paiements

### Stratégie en 5 phases (6 jours)

```
Jour 1: Setup & Infrastructure
Jour 2-3: Tests API d'intégration (40 tests critiques)
Jour 3-4: Tests E2E Playwright (20 tests UI critiques)
Jour 5: Tests manuels guidés (12 tests restants + edge cases)
Jour 6: Reporting & Documentation
```

---

## Phase 1: Setup & Infrastructure (Jour 1)

### 1.1 Installation des dépendances de test

**Backend**:
```bash
npm install --save-dev supertest @types/supertest
npm install --save-dev @faker-js/faker
npm install --save-dev jest-extended
```

**Frontend E2E**:
```bash
cd frontend
npm install --save-dev @playwright/test
npx playwright install chromium
```

### 1.2 Création des test utilities

**Fichiers à créer**:

1. **`tests/helpers/test-factory.js`** - Factory pour créer des données de test
```javascript
// Génération rapide de données valides
// Exemples: createApprenant(), createFormation(), createSession()
```

2. **`tests/helpers/api-client.js`** - Client API avec authentification
```javascript
// Wrapper autour de supertest avec login automatique par rôle
// authenticate(role) => token JWT
```

3. **`tests/helpers/db-helpers.js`** - Utilitaires base de données
```javascript
// cleanDatabase(), seedTestData(), getTestConnection()
```

4. **`tests/helpers/assertions.js`** - Assertions métier personnalisées
```javascript
// expectRuleViolation(RM-140), expectAuditLog(), expectEmailSent()
```

### 1.3 Configuration de la base de test

**Créer `.env.test`**:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/forges_test
REDIS_URL=redis://localhost:6379/1
NODE_ENV=test
SMTP_HOST=localhost
SMTP_PORT=1025  # Mailhog ou Mailtrap
```

**Script de reset DB**:
```bash
# tests/scripts/reset-test-db.sh
npx prisma migrate reset --force --skip-seed
node seed-validation.js --reset
```

### 1.4 Configuration Playwright

**Créer `frontend/playwright.config.js`**:
```javascript
export default {
  testDir: './e2e',
  baseURL: 'http://localhost:5173',
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
}
```

**Structure E2E**:
```
frontend/e2e/
├── fixtures/
│   ├── auth.js          # Login helpers par rôle
│   └── data.js          # Données de test
├── tests/
│   ├── ucs00-inscription.spec.js
│   ├── ucs01-auth.spec.js
│   ├── ucs07-inscriptions.spec.js
│   └── [...20 tests critiques]
└── utils/
    ├── selectors.js     # Sélecteurs réutilisables
    └── helpers.js       # Actions communes
```

---

## Phase 2: Tests API d'intégration (Jours 2-3)

### 2.1 Tests critiques UCS00-UCS06 (Authentification & Comptes)

**Fichier**: `tests/integration/auth-comptes.integration.test.js`

**Tests à implémenter** (8+5+6 = 19 tests):

```javascript
describe('UCS00 - Inscription Apprenant', () => {
  test('T-UCS00-01: Inscription nominale complète', async () => {
    // POST /api/apprenants/register
    // Vérifier: compte créé, email envoyé, statut ACTIF
  });

  test('T-UCS00-02: Email déjà utilisé - protection énumération', async () => {
    // POST /api/apprenants/register avec email existant
    // Vérifier: 409 DUPLICATE_EMAIL, message générique
  });

  test('T-UCS00-07: Protection anti-bot - 5 tentatives/heure', async () => {
    // 6 POST successifs depuis même IP
    // Vérifier: 6ème retourne 429 TOO_MANY_ATTEMPTS
  });

  // ... T-UCS00-03 à T-UCS00-08
});

describe('UCS01 - Authentification', () => {
  test('T-UCS01-01: Connexion nominale - redirection par rôle', async () => {
    // POST /api/auth/login pour chaque rôle
    // Vérifier: JWT token, redirection correcte
  });

  test('T-UCS01-05: RBAC - accès refusé rôle insuffisant', async () => {
    // GET /api/admin/partenaires avec token APPRENANT
    // Vérifier: 403 FORBIDDEN
  });

  // ... T-UCS01-02 à T-UCS01-05
});

describe('UCS02 - Gestion Comptes Utilisateurs', () => {
  test('T-UCS02-01: Création compte Responsable', async () => {
    // POST /api/admin/utilisateurs (connecté ADMIN)
    // Vérifier: compte créé, email bienvenue, AuditLog
  });

  test('T-UCS02-04: Invitation Partenaire - Flux A (RM-126)', async () => {
    // POST /api/admin/partenaires/invite
    // Vérifier: email avec token 48h, statut INVITE
  });

  // ... T-UCS02-02 à T-UCS02-05
});
```

### 2.2 Tests UCS03-UCS06 (Organisations & Abonnements)

**Fichier**: `tests/integration/organisations.integration.test.js`

**Tests** (6+5+3+6 = 20 tests):

```javascript
deokscribe('UCS03 - Comptes Organisation & Abonnements', () => {
  test('T-UCS03-01: Création Organisation - essai 30j (RM-81)', async () => {
    // POST /api/organisations/register
    // Vérifier: AbonnementOrganisation statut=ESSAI créé
  });

  test('T-UCS03-05: AbonnementB2B - plafond palier (RM-61)', async () => {
    // POST /api/organisations/b2b/membres (21ème apprenant)
    // Vérifier: blocage + proposition upgrade
  });

  test('T-UCS03-06: Certifications B2B conservées (RM-62)', async () => {
    // DELETE /api/organisations/b2b/membres/:id
    // Vérifier: dossiers PAYÉ toujours en base
  });

  // ... T-UCS03-02 à T-UCS03-06
});

describe('UCS04 - Gestion Formations', () => {
  test('T-UCS04-01: type_formation assigné par FORGES (RM-127)', async () => {
    // POST /api/formations avec type_formation=STANDARD
    // Vérifier: 400 TYPE_FORMATION_READONLY
  });

  test('T-UCS04-02: Formation archivée irréversible (RM-13)', async () => {
    // PUT /api/formations/F-ARCH-01-TEST/statut {statut:"ACTIVE"}
    // Vérifier: 400 BAD_REQUEST
  });

  // ... T-UCS04-03 à T-UCS04-05
});
```

### 2.3 Tests UCS07-UCS09 (Inscriptions & Paiements)

**Fichier**: `tests/integration/inscriptions-paiements.integration.test.js`

**Tests critiques** (règles métier v4.8):

```javascript
describe('UCS07 - Inscription Formation', () => {
  test('T-UCS07-01: Inscription Standard - paiement direct (RM-140)', async () => {
    // POST /api/inscriptions {formation: F-STD-01, session: S-OPEN-01}
    // Vérifier: dossier PAYE_DIRECTEMENT (pas EN_ATTENTE_VERIFICATION)
  });

  test('T-UCS07-02: Inscription Premium+Retail - vérification Responsable (RM-140)', async () => {
    // POST /api/inscriptions {formation: F-PREM-01, source: RETAIL}
    // Vérifier: dossier EN_ATTENTE_VERIFICATION
  });

  test('T-UCS07-04: Doublon apprenant/session (RM-01)', async () => {
    // POST /api/inscriptions (2ème tentative même session)
    // Vérifier: 409 ALREADY_ENROLLED
  });

  // ... T-UCS07-03 à T-UCS07-05
});

describe('UCS08 - Décision Dossier', () => {
  test('T-UCS08-01: Retenir dossier Premium+Retail - délai 72h (RM-07)', async () => {
    // PUT /api/dossiers/D-ATTENTE-01-TEST/retenir
    // Vérifier: statut=RETENU, paiement.expires_at = now + 72h
  });

  test('T-UCS08-03: Annulation auto dossier expiré (scheduler)', async () => {
    // Exécuter scheduler manually: POST /api/admin/scheduler/run
    // Vérifier: D-RETENU-EXP passe à ANNULE
  });

  // ... T-UCS08-02 à T-UCS08-03
});

describe('UCS09 - Paiements', () => {
  test('T-UCS09-01: Paiement sandbox - webhook SUCCESS', async () => {
    // POST /api/paiements/webhook {dossier_id, status: SUCCESS}
    // Vérifier: dossier=PAYE, paiement.statut=CONFIRME, commission apporteur créée
  });

  test('T-UCS09-04: Réduction -15% abonné actif (RM-88)', async () => {
    // GET /api/formations/F-PREM-01 (connecté apprenant1 avec ABO-RET-01 actif)
    // Vérifier: prix affiché = 2 000 000 XOF - 15% = 1 700 000 XOF
  });

  // ... T-UCS09-02 à T-UCS09-08
});
```

---

## Phase 3: Tests E2E Playwright (Jours 3-4)

### 3.1 Tests E2E critiques (20 tests prioritaires)

**Approche**: Couvrir les parcours utilisateur complets les plus critiques

#### Groupe 1: Parcours Apprenant (6 tests)

**`frontend/e2e/tests/apprenant-parcours.spec.js`**:

```javascript
test('UCS00-01 + UCS01-01: Inscription + Connexion Apprenant', async ({ page }) => {
  // 1. Register page
  await page.goto('/register');
  await page.fill('[name="email"]', 'nouveau.apprenant@test.ci');
  await page.fill('[name="nom"]', 'Diop');
  // ... remplir formulaire
  await page.click('button[type="submit"]');

  // 2. Confirmation email (mock)
  await page.goto('/confirm-email/mock-token');

  // 3. Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'nouveau.apprenant@test.ci');
  await page.fill('[name="password"]', 'Test@2026!');
  await page.click('button[type="submit"]');

  // 4. Vérifier redirection dashboard
  await expect(page).toHaveURL('/apprenant/dashboard');
  await expect(page.locator('h1')).toContainText('Tableau de bord');
});

test('UCS07-01 + UCS09-01: Inscription Standard + Paiement direct', async ({ page }) => {
  // 1. Login apprenant
  await loginAs(page, 'apprenant1@forges-test.ci');

  // 2. Catalogue
  await page.goto('/apprenant/catalogue');
  await page.click('text=F-STD-01');

  // 3. S'inscrire session
  await page.click('text=S-OPEN-01');
  await page.click('button:has-text("S\'inscrire")');

  // 4. Paiement (mock gateway)
  await page.click('button:has-text("Payer maintenant")');
  await mockPaymentSuccess(page);

  // 5. Vérifier dossier PAYÉ
  await page.goto('/apprenant/dossiers');
  await expect(page.locator('.dossier-status')).toContainText('PAYÉ');
});

test('UCS11-01: Téléchargement attestation', async ({ page }) => {
  await loginAs(page, 'apprenant1@forges-test.ci');
  await page.goto('/apprenant/attestations');

  // D-PAYE-01 existe (session terminée)
  const downloadPromise = page.waitForEvent('download');
  await page.click('button:has-text("Télécharger")');
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/attestation.*\.pdf/);
});
```

#### Groupe 2: Parcours Organisation (5 tests)

**`frontend/e2e/tests/organisation-parcours.spec.js`**:

```javascript
test('UCS03-01: Création Organisation + Essai 30j', async ({ page }) => {
  await page.goto('/register-organisation');
  await page.fill('[name="raison_sociale"]', 'SABER CI Test E2E');
  await page.selectOption('[name="type_organisation"]', 'ENTREPRISE');
  // ... remplir formulaire
  await page.click('button[type="submit"]');

  // Vérifier email confirmation (mock)
  await page.goto('/confirm-email/mock-token');

  // Login
  await loginAs(page, 'saber.ci.test@mail.ci');

  // Vérifier bandeau essai
  await expect(page.locator('.essai-banner')).toContainText('30 jours restants');
});

test('UCS06-01: Création voucher Organisation', async ({ page }) => {
  await loginAs(page, 'org@forges-test.ci');
  await page.goto('/organisation/vouchers');

  await page.click('button:has-text("Créer un voucher")');
  await page.selectOption('[name="formation_id"]', 'F-STD-01');
  await page.fill('[name="quota_max"]', '10');
  await page.click('button:has-text("Créer")');

  // Vérifier voucher créé
  await expect(page.locator('.voucher-list')).toContainText('F-STD-01');
});
```

#### Groupe 3: Parcours Backoffice (5 tests)

**`frontend/e2e/tests/backoffice-parcours.spec.js`**:

```javascript
test('UCS04-01: Création formation (type_formation caché)', async ({ page }) => {
  await loginAs(page, 'responsable@forges-test.ci');
  await page.goto('/backoffice/formations');

  await page.click('button:has-text("Créer une formation")');

  // Vérifier absence du champ type_formation (RM-86)
  await expect(page.locator('[name="type_formation"]')).toHaveCount(0);

  await page.fill('[name="intitule"]', 'Bureautique Avancée CI E2E');
  await page.selectOption('[name="mode_formation"]', 'AVEC_SESSION');
  // ... remplir
  await page.click('button:has-text("Créer")');

  await expect(page.locator('.success-message')).toBeVisible();
});

test('UCS08-01: Retenir dossier Premium+Retail', async ({ page }) => {
  await loginAs(page, 'responsable@forges-test.ci');
  await page.goto('/backoffice/dossiers');

  // Filtrer EN_ATTENTE_VERIFICATION
  await page.selectOption('[name="statut"]', 'EN_ATTENTE_VERIFICATION');

  // Retenir D-ATTENTE-01
  await page.click('[data-dossier-id="D-ATTENTE-01-TEST"] button:has-text("Retenir")');

  // Vérifier statut RETENU + délai 72h affiché
  await expect(page.locator('.dossier-status')).toContainText('RETENU');
  await expect(page.locator('.expiration')).toContainText('72 heures');
});

test('UCS18-01: Validation formation partenaire (RM-127)', async ({ page }) => {
  await loginAs(page, 'responsable@forges-test.ci');
  await page.goto('/backoffice/partenaires/formations');

  // F-PART-01 EN_ATTENTE_VALIDATION
  await page.click('[data-formation-id="F-PART-01-TEST"]');

  // Valider avec type_formation=STANDARD
  await page.selectOption('[name="type_formation"]', 'STANDARD');
  await page.fill('[name="prix_coutant_valide"]', '80000');
  await page.click('button:has-text("Valider")');

  // Vérifier prix catalogue calculé = 80000 / (1-0.20) = 100000
  await expect(page.locator('.prix-catalogue')).toContainText('100 000');
});
```

#### Groupe 4: Parcours Partenaire/Apporteur (4 tests)

**`frontend/e2e/tests/partenaire-apporteur.spec.js`**:

```javascript
test('UCS17-01: Soumission formation partenaire', async ({ page }) => {
  await loginAs(page, 'partenaire@forges-test.ci');
  await page.goto('/partenaire/formations');

  await page.click('button:has-text("Soumettre une formation")');
  await page.fill('[name="intitule"]', 'DevOps Cloud E2E');
  await page.fill('[name="prix_coutant_soumis"]', '120000');

  // Vérifier absence type_formation (RM-127)
  await expect(page.locator('[name="type_formation"]')).toHaveCount(0);

  await page.click('button:has-text("Soumettre")');

  await expect(page.locator('.success-message')).toContainText('soumise avec succès');
});

test('UCS19-01: Dashboard apporteur - code permanent (RM-142)', async ({ page }) => {
  await loginAs(page, 'apporteur@forges-test.ci');
  await page.goto('/apporteur/dashboard');

  // Récupérer code UUID
  const code = await page.locator('.code-apporteur').textContent();

  // Vérifier format UUID v4
  expect(code).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

  // Modifier profil
  await page.goto('/apporteur/profil');
  await page.fill('[name="nom"]', 'TRAORE Mamadou Modifié');
  await page.click('button:has-text("Enregistrer")');

  // Retour dashboard - vérifier code identique (RM-142)
  await page.goto('/apporteur/dashboard');
  const codeApres = await page.locator('.code-apporteur').textContent();
  expect(codeApres).toBe(code);
});
```

### 3.2 Structure des fixtures E2E

**`frontend/e2e/fixtures/auth.js`**:
```javascript
export async function loginAs(page, email, password = 'Test@FORGES2026!') {
  await page.goto('/login');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(apprenant|organisation|backoffice|partenaire|apporteur)\/.*/);
}

export async function mockPaymentSuccess(page) {
  // Intercepter webhook paiement
  await page.route('**/api/paiements/webhook', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({ success: true }),
    });
  });
}
```

---

## Phase 4: Tests manuels guidés (Jour 5)

### 4.1 Script interactif de validation manuelle

**Créer `tests/manual/validation-interactive.js`**:

```javascript
#!/usr/bin/env node
const readline = require('readline');
const chalk = require('chalk');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const testsRestants = [
  {
    id: 'T-UCS00-06',
    titre: 'Token confirmation expiré',
    setup: 'UPDATE apprenants SET token_expiry = NOW() - INTERVAL \'2 days\'',
    etapes: [
      '1. Créer compte token.test@mail.com',
      '2. Exécuter SQL ci-dessus',
      '3. Cliquer lien dans Mailtrap',
      '4. Vérifier message "Lien expiré"',
    ],
    validation: 'Nouveau token généré avec expiration +24h',
  },
  // ... 11 autres tests manuels
];

async function runManualTests() {
  console.log(chalk.blue.bold('\n=== Validation Manuelle FORGES v4.8 ===\n'));

  const results = [];

  for (const test of testsRestants) {
    console.log(chalk.yellow(`\n[${test.id}] ${test.titre}`));

    if (test.setup) {
      console.log(chalk.gray(`Setup SQL:\n${test.setup}`));
    }

    console.log(chalk.white('\nÉtapes:'));
    test.etapes.forEach(etape => console.log(`  ${etape}`));

    console.log(chalk.green(`\nValidation attendue: ${test.validation}\n`));

    const resultat = await ask('Résultat (1=Réussi, 2=Échoué, 3=Bloqué): ');
    const observation = await ask('Observation (optionnel): ');

    results.push({
      id: test.id,
      statut: resultat === '1' ? 'RÉUSSI' : resultat === '2' ? 'ÉCHOUÉ' : 'BLOQUÉ',
      observation,
    });
  }

  // Générer rapport
  generateReport(results);
}

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function generateReport(results) {
  const markdown = `# Rapport Tests Manuels - ${new Date().toISOString()}

## Synthèse
- Réussis: ${results.filter(r => r.statut === 'RÉUSSI').length}
- Échoués: ${results.filter(r => r.statut === 'ÉCHOUÉ').length}
- Bloqués: ${results.filter(r => r.statut === 'BLOQUÉ').length}

## Détails
${results.map(r => `### ${r.id} - ${r.statut}\n${r.observation ? `**Observation**: ${r.observation}` : ''}`).join('\n\n')}
`;

  require('fs').writeFileSync('rapport-tests-manuels.md', markdown);
  console.log(chalk.green('\n✅ Rapport généré: rapport-tests-manuels.md'));
}

runManualTests();
```

### 4.2 Tests manuels restants (12 tests)

**Liste des tests à exécuter manuellement**:

1. **T-UCS00-06**: Token confirmation expiré (scheduler)
2. **T-UCS00-08**: Purge compte non confirmé > 7j (scheduler)
3. **T-UCS03-03**: Suspension Organisation essai expiré (scheduler)
4. **T-UCS05-04**: Transitions sessions automatiques (scheduler)
5. **T-UCS09-07**: Échec prélèvement abonnement (simulation gateway)
6. **T-UCS11-03**: Suspension abonnement → suspension accès formation
7. **T-UCS14-04**: Expiration AccèsFormationDemande (scheduler)
8. **T-UCS15-04**: Bot - cooldown upgrade refusé (RM-120)
9. **T-UCS18-04**: Alerte délai validation formation J+5/J+10
10. **T-UCS19-04**: Agrégation commissions apporteur < seuil (scheduler)
11. **MT-01**: Audit complet - vérifier AuditLog sur toutes mutations
12. **MT-02**: Chiffrement - vérifier password bcrypt + HTTPS

---

## Phase 5: Reporting & Documentation (Jour 6)

### 5.1 Matrice de synthèse

**Créer `tests/reports/matrice-validation.md`**:

| Test ID | UCS | Titre | Méthode | Statut | RM testées | Observations |
|---------|-----|-------|---------|--------|------------|--------------|
| T-UCS00-01 | UCS00 | Inscription nominale | E2E | ✅ | RM-28, RM-29 | - |
| T-UCS00-02 | UCS00 | Email déjà utilisé | API | ✅ | RM-28, RM-31 | - |
| ... | ... | ... | ... | ... | ... | ... |

### 5.2 Rapport de couverture

**Script de génération automatique**:

```bash
# tests/scripts/generate-coverage-report.sh

echo "# Rapport de Couverture FORGES v4.8" > coverage-report.md
echo "" >> coverage-report.md

# Tests API
echo "## Tests API d'intégration" >> coverage-report.md
npm run test:integration -- --coverage --json > coverage-api.json
node tests/scripts/parse-coverage.js coverage-api.json >> coverage-report.md

# Tests E2E
echo "## Tests E2E Playwright" >> coverage-report.md
npx playwright test --reporter=json > coverage-e2e.json
node tests/scripts/parse-e2e-results.js coverage-e2e.json >> coverage-report.md

# Tests manuels
echo "## Tests Manuels" >> coverage-report.md
cat rapport-tests-manuels.md >> coverage-report.md

# Synthèse
echo "## Synthèse Globale" >> coverage-report.md
echo "- **Total tests**: 72" >> coverage-report.md
echo "- **Tests automatisés**: 60 (83%)" >> coverage-report.md
echo "- **Tests manuels**: 12 (17%)" >> coverage-report.md
```

### 5.3 Documentation des bugs trouvés

**Template `tests/reports/bug-report-template.md`**:

```markdown
# Bug Report - FORGES v4.8

## [BUG-001] Titre court du bug

**Test**: T-UCS07-02
**Criticité**: 🔴 Bloquant
**Module**: inscriptions
**RM violée**: RM-140

### Description
[Description détaillée]

### Steps to Reproduce
1. ...
2. ...

### Résultat attendu
[...]

### Résultat observé
[...]

### Logs/Screenshots
```
[logs ou screenshot]
```

### Proposition de fix
[Fichier à modifier + changement proposé]
```

---

## Résumé des livrables

### Jour 1
- ✅ Test utilities (4 fichiers helpers)
- ✅ Configuration Playwright
- ✅ Script reset DB de test
- ✅ `.env.test` configuré

### Jours 2-3
- ✅ 40 tests API d'intégration (supertest)
- ✅ Couverture UCS00-UCS09 + UCS17-UCS20
- ✅ Tests règles métier critiques (RM-140, RM-127, RM-143, etc.)

### Jours 3-4
- ✅ 20 tests E2E Playwright
- ✅ Parcours utilisateur complets
- ✅ Tests UI critiques

### Jour 5
- ✅ 12 tests manuels guidés
- ✅ Script interactif de validation
- ✅ Rapport tests manuels

### Jour 6
- ✅ Matrice de synthèse (72 tests)
- ✅ Rapport de couverture automatique
- ✅ Documentation des bugs
- ✅ Recommandations pour la production

---

## Fichiers critiques à créer/modifier

### Backend

1. **`tests/helpers/test-factory.js`** (NOUVEAU)
2. **`tests/helpers/api-client.js`** (NOUVEAU)
3. **`tests/helpers/db-helpers.js`** (NOUVEAU)
4. **`tests/helpers/assertions.js`** (NOUVEAU)
5. **`tests/integration/auth-comptes.integration.test.js`** (NOUVEAU)
6. **`tests/integration/organisations.integration.test.js`** (NOUVEAU)
7. **`tests/integration/inscriptions-paiements.integration.test.js`** (NOUVEAU)
8. **`tests/manual/validation-interactive.js`** (NOUVEAU)
9. **`tests/scripts/reset-test-db.sh`** (NOUVEAU)
10. **`.env.test`** (NOUVEAU)

### Frontend

1. **`frontend/playwright.config.js`** (NOUVEAU)
2. **`frontend/e2e/fixtures/auth.js`** (NOUVEAU)
3. **`frontend/e2e/tests/apprenant-parcours.spec.js`** (NOUVEAU)
4. **`frontend/e2e/tests/organisation-parcours.spec.js`** (NOUVEAU)
5. **`frontend/e2e/tests/backoffice-parcours.spec.js`** (NOUVEAU)
6. **`frontend/e2e/tests/partenaire-apporteur.spec.js`** (NOUVEAU)

### Reporting

1. **`tests/reports/matrice-validation.md`** (NOUVEAU)
2. **`tests/scripts/generate-coverage-report.sh`** (NOUVEAU)
3. **`rapport-tests-manuels.md`** (généré automatiquement)
4. **`coverage-report.md`** (généré automatiquement)

---

## Commandes à exécuter

### Setup initial (Jour 1)
```bash
# Backend
cd /Users/tidianecisse/PROJET_INFO/plateforme_formation/forges-backend
npm install --save-dev supertest @faker-js/faker jest-extended

# Frontend
cd frontend
npm install --save-dev @playwright/test
npx playwright install chromium

# Créer .env.test
cp .env .env.test
# Modifier DATABASE_URL pour pointer vers forges_test
```

### Exécution des tests (Jours 2-5)
```bash
# Reset DB de test
./tests/scripts/reset-test-db.sh

# Tests API
npm run test:integration

# Tests E2E
cd frontend
npx playwright test

# Tests manuels
node tests/manual/validation-interactive.js
```

### Génération rapport final (Jour 6)
```bash
./tests/scripts/generate-coverage-report.sh
cat coverage-report.md
```

---

## Indicateurs de succès

- ✅ **60 tests automatisés** (API + E2E) passent avec succès
- ✅ **12 tests manuels** documentés avec résultats
- ✅ **Couverture RM**: Toutes les règles métier v4.8 testées (RM-140, RM-127, RM-143, etc.)
- ✅ **Rapport complet** généré avec matrice de synthèse
- ✅ **Bugs documentés** avec criticité et proposition de fix
- ✅ **Prêt pour déploiement** si taux de réussite ≥ 95%

---

## Prochaines étapes après validation

1. **Corriger les bugs critiques** (🔴 Bloquants)
2. **Automatiser les 12 tests manuels restants** (Phase 2)
3. **Intégrer dans CI/CD** (GitHub Actions)
4. **Load testing** (performance sous charge)
5. **Tests de sécurité** avancés (OWASP)

---

# ANNEXE: Stratégie de Test en Local et Déploiement

**Pour débutants en test logiciel** - Guide complet du développement à la production

---

## 1. Les 4 Environnements de Test

### 1.1 Environnement LOCAL (votre machine)

**But**: Développement et tests rapides pendant le codage

**Configuration**:
```bash
# .env.local
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/forges_dev
FRONTEND_URL=http://localhost:5173
PORT=3000
```

**Tests à exécuter**:
```bash
# 1. Tests unitaires (rapides, 10-30 secondes)
npm run test:unit

# 2. Tests d'intégration (moyens, 1-2 minutes)
npm run test:integration

# 3. Lancer l'app en local
npm run dev

# 4. Tests manuels dans le navigateur
# Ouvrir http://localhost:5173
```

**Checklist locale quotidienne**:
- [ ] `npm test` passe sans erreur
- [ ] Backend démarre sans erreur (`npm run dev`)
- [ ] Frontend se compile sans warning (`cd frontend && npm run dev`)
- [ ] Connexion BDD fonctionne
- [ ] Page d'accueil s'affiche correctement

---

### 1.2 Environnement RECETTE/STAGING (serveur de test)

**But**: Valider avant la production dans un environnement identique à la prod

**Configuration**:
```bash
# .env.staging
NODE_ENV=staging
DATABASE_URL=postgresql://staging-db.example.com:5432/forges_staging
FRONTEND_URL=https://recette.forges.ci
```

**Tests à exécuter**:

1. **Tests de déploiement** (vérifier que l'app démarre):
```bash
# Sur le serveur staging
docker-compose up -d
docker-compose logs -f backend  # Vérifier aucune erreur
```

2. **Smoke tests** (tests rapides critiques):
```bash
# Script tests/staging-smoke.sh
curl https://recette.forges.ci/health  # Doit retourner 200
curl https://recette.forges.ci/api/health  # Doit retourner {"status":"ok"}

# Tester login
curl -X POST https://recette.forges.ci/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@forges-test.ci","password":"Test@FORGES2026!"}'
# Doit retourner un JWT token
```

3. **Tests E2E complets** (Playwright contre staging):
```bash
# frontend/playwright.config.js - mode staging
export default {
  baseURL: 'https://recette.forges.ci',
  // ...
}

npx playwright test
```

4. **Tests de migration BDD**:
```bash
# Vérifier migrations Prisma
npx prisma migrate status
npx prisma migrate deploy  # Applique migrations en attente
```

**Checklist recette avant déploiement prod**:
- [ ] Smoke tests passent (health checks)
- [ ] Tests E2E passent à 100%
- [ ] Migrations BDD appliquées sans erreur
- [ ] Performance acceptable (temps de réponse < 2s)
- [ ] Aucune erreur dans les logs serveur (24h d'observation)
- [ ] Tests de charge légers (50 utilisateurs simultanés)

---

### 1.3 Environnement PRODUCTION

**But**: Application réelle utilisée par les vrais utilisateurs

**Configuration**:
```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://prod-db.example.com:5432/forges_production
FRONTEND_URL=https://forges.ci
```

**Tests en production** (⚠️ NE JAMAIS tester avec vraies données utilisateurs):

1. **Monitoring continu** (24/7):
```bash
# Utiliser un service comme:
# - Uptime Robot (gratuit) : ping toutes les 5 min
# - Pingdom
# - Datadog
# - New Relic

# Vérifier:
- GET /health toutes les 5 minutes
- Temps de réponse API < 500ms
- Taux d'erreur < 1%
```

2. **Logs en temps réel**:
```bash
# Sur le serveur prod
docker-compose logs -f --tail=100 backend

# Chercher les erreurs
docker-compose logs backend | grep ERROR
docker-compose logs backend | grep FATAL
```

3. **Tests de régression post-déploiement** (après chaque mise à jour):
```bash
# Script tests/prod-smoke.sh
# ⚠️ Utilise un compte de test, pas un vrai utilisateur

# 1. Health check
curl https://forges.ci/health

# 2. Login test account
curl -X POST https://forges.ci/api/auth/login \
  -d '{"email":"test-prod@forges.ci","password":"..."}'

# 3. Catalogue accessible
curl https://forges.ci/api/formations | jq '.length'
# Doit retourner un nombre > 0
```

4. **Alertes automatiques**:
- Email si /health retourne erreur
- Slack notification si erreur 500
- SMS si base de données inaccessible

---

## 2. Workflow Complet (Développement → Production)

### 2.1 Sur VOTRE MACHINE (développement)

```bash
# 1. Créer une branche
git checkout -b feature/nouvelle-fonctionnalite

# 2. Coder la fonctionnalité
# ... éditer les fichiers ...

# 3. Tests unitaires
npm run test:unit

# 4. Tests d'intégration
npm run test:integration

# 5. Tester manuellement en local
npm run dev
# Ouvrir navigateur, tester la fonctionnalité

# 6. Commit
git add .
git commit -m "feat: ajouter nouvelle fonctionnalité"

# 7. Push
git push origin feature/nouvelle-fonctionnalite
```

### 2.2 Sur GITHUB (code review + CI/CD)

**Créer un workflow GitHub Actions** (`.github/workflows/test.yml`):

```yaml
name: Tests Automatiques

on:
  push:
    branches: [main, develop, backend-frontend-v48]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: forges_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run Prisma migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/forges_test

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/forges_test

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  test-frontend:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Run tests
        run: cd frontend && npm test

      - name: Build frontend
        run: cd frontend && npm run build

  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Install Playwright
        run: |
          cd frontend
          npm ci
          npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: cd frontend && npx playwright test

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

**Ce que GitHub Actions fait automatiquement**:
1. Lance une BDD PostgreSQL de test
2. Installe les dépendances
3. Exécute les migrations Prisma
4. Lance tous les tests (unitaires + intégration + E2E)
5. ❌ Bloque le merge si un test échoue
6. ✅ Autorise le merge si tous les tests passent

### 2.3 Sur SERVEUR STAGING (validation pré-production)

**Déploiement automatique après merge**:

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to staging
        run: |
          # Se connecter au serveur staging
          ssh user@staging.forges.ci << 'EOF'
            cd /var/www/forges
            git pull origin develop
            docker-compose down
            docker-compose up -d --build
          EOF

      - name: Wait for app to start
        run: sleep 30

      - name: Run smoke tests
        run: |
          curl --fail https://recette.forges.ci/health || exit 1
          curl --fail https://recette.forges.ci/api/health || exit 1

      - name: Run E2E tests against staging
        run: |
          cd frontend
          PLAYWRIGHT_BASE_URL=https://recette.forges.ci npx playwright test

      - name: Notify on Slack
        if: success()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d '{"text":"✅ Déploiement staging réussi!"}'

      - name: Notify on failure
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d '{"text":"❌ Déploiement staging échoué - rollback automatique"}'
```

**Tests manuels en staging** (validation équipe):
- Chef de projet teste les nouvelles fonctionnalités
- QA exécute les tests manuels du plan de validation
- Observation pendant 24-48h

### 2.4 Sur SERVEUR PRODUCTION (mise en ligne)

**Déploiement manuel après validation staging**:

```bash
# Sur votre machine
git checkout main
git merge develop
git tag v1.0.0  # Versionner chaque déploiement
git push origin main --tags
```

**GitHub Actions déploie automatiquement**:

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'  # Déclenché uniquement sur tag version

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Create backup
        run: |
          ssh user@forges.ci << 'EOF'
            # Backup BDD avant déploiement
            pg_dump forges_production > /backups/forges_$(date +%Y%m%d_%H%M%S).sql
          EOF

      - name: Deploy to production
        run: |
          ssh user@forges.ci << 'EOF'
            cd /var/www/forges
            git fetch --tags
            git checkout ${{ github.ref_name }}
            docker-compose down
            docker-compose up -d --build
          EOF

      - name: Run migrations
        run: |
          ssh user@forges.ci << 'EOF'
            cd /var/www/forges
            docker-compose exec backend npx prisma migrate deploy
          EOF

      - name: Smoke tests production
        run: |
          curl --fail https://forges.ci/health || exit 1
          curl --fail https://forges.ci/api/health || exit 1

      - name: Rollback on failure
        if: failure()
        run: |
          ssh user@forges.ci << 'EOF'
            cd /var/www/forges
            git checkout main  # Revenir à la version précédente
            docker-compose down
            docker-compose up -d
          EOF

      - name: Notify team
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d '{"text":"🚀 FORGES ${{ github.ref_name }} déployé en production!"}'
```

---

## 3. Outils de Monitoring en Production

### 3.1 Monitoring de disponibilité (gratuit)

**Uptime Robot** (https://uptimerobot.com):
```
1. Créer un compte gratuit
2. Ajouter un monitor:
   - Type: HTTP(s)
   - URL: https://forges.ci/health
   - Interval: 5 minutes
   - Email alert: votre@email.com

3. Ajouter un second monitor:
   - URL: https://forges.ci/api/health
```

**Healthcheck endpoint à créer**:

```javascript
// backend/src/routes/health.js
router.get('/health', async (req, res) => {
  try {
    // Vérifier BDD
    await prisma.$queryRaw`SELECT 1`;

    // Vérifier Redis
    await redis.ping();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});
```

### 3.2 Monitoring des logs (gratuit jusqu'à un certain volume)

**Logtail** ou **Better Stack** (https://betterstack.com):

```javascript
// backend/src/config/logger.js
const { Logtail } = require('@logtail/node');

const logtail = new Logtail(process.env.LOGTAIL_TOKEN);

function logError(error, context) {
  logtail.error(error.message, {
    stack: error.stack,
    ...context,
  });
}

module.exports = { logError };
```

**Dashboard Logtail**:
- Voir tous les logs en temps réel
- Alertes sur erreurs critiques
- Recherche dans les logs

### 3.3 Monitoring des performances (APM)

**New Relic** ou **Datadog** (version gratuite limitée):

```javascript
// backend/src/server.js
require('newrelic');  // En premier !

const express = require('express');
// ... reste du code
```

**Métriques surveillées**:
- Temps de réponse moyen
- Requêtes les plus lentes
- Taux d'erreur
- Charge CPU/RAM
- Utilisation BDD

---

## 4. Checklist Complète de Déploiement

### Avant CHAQUE déploiement production

- [ ] **Tests locaux**: Tous les tests passent sur ma machine
- [ ] **Code review**: Au moins 1 personne a relu le code
- [ ] **CI/CD**: GitHub Actions vert (tous tests passent)
- [ ] **Staging validé**: Tests manuels + E2E passent en staging
- [ ] **Migrations BDD**: Testées en staging, pas de perte de données
- [ ] **Backup BDD**: Backup automatique avant déploiement
- [ ] **Rollback plan**: Savoir comment revenir en arrière rapidement
- [ ] **Documentation**: README à jour, CHANGELOG.md rempli
- [ ] **Variables d'env**: .env.production à jour sur le serveur
- [ ] **Monitoring**: Uptime Robot + Logtail configurés

### Après déploiement production

- [ ] **Smoke tests**: /health et /api/health retournent 200
- [ ] **Test login**: Se connecter avec un compte test
- [ ] **Test fonctionnalités critiques**:
  - Inscription apprenant
  - Catalogue formations
  - Inscription formation
  - Paiement (mode test)
- [ ] **Vérifier logs**: Aucune erreur dans les 15 premières minutes
- [ ] **Performance**: Temps de réponse < 2s
- [ ] **Monitoring**: Uptime Robot montre "Up"
- [ ] **Notifier l'équipe**: Message sur Slack/Discord

---

## 5. Gestion des Bugs en Production

### Priorités

**🔴 P0 - CRITIQUE** (corriger immédiatement, <1h):
- Site inaccessible
- Paiements bloqués
- Perte de données
- Faille de sécurité

**Action**: Rollback immédiat → Corriger → Redéployer

**🟠 P1 - URGENT** (corriger dans la journée):
- Fonctionnalité principale cassée
- Erreurs fréquentes
- Performance très dégradée

**Action**: Hotfix branch → Tests → Deploy

**🟡 P2 - NORMAL** (corriger dans la semaine):
- Bug mineur
- Feature non critique cassée
- Performance légèrement dégradée

**Action**: Fix dans la prochaine release

**🟢 P3 - FAIBLE** (corriger quand possible):
- Problème cosmétique
- Amélioration UX
- Documentation manquante

**Action**: Backlog

### Exemple de hotfix

```bash
# 1. Créer branche hotfix depuis production
git checkout main
git pull
git checkout -b hotfix/paiement-casse

# 2. Corriger le bug
# ... éditer les fichiers ...

# 3. Tests
npm test

# 4. Commit
git commit -m "fix: corriger bug paiement webhook"

# 5. Merge dans main ET develop
git checkout main
git merge hotfix/paiement-casse
git push

git checkout develop
git merge hotfix/paiement-casse
git push

# 6. Tag version patch
git tag v1.0.1
git push --tags

# 7. GitHub Actions déploie automatiquement
```

---

## 6. Outils Recommandés (Stack Complète)

### Développement Local
- **IDE**: VS Code + extensions (ESLint, Prettier, Prisma)
- **BDD**: PostgreSQL via Docker ou local
- **API Testing**: Postman ou Thunder Client (VS Code)
- **Git GUI**: GitKraken ou SourceTree (optionnel)

### Tests
- **Backend**: Jest + Supertest
- **Frontend**: Vitest + React Testing Library
- **E2E**: Playwright
- **Coverage**: Istanbul (intégré dans Jest)

### CI/CD
- **Platform**: GitHub Actions (gratuit pour projets publics)
- **Alternative**: GitLab CI, CircleCI

### Monitoring Production
- **Uptime**: Uptime Robot (gratuit)
- **Logs**: Logtail / Better Stack (gratuit jusqu'à 1GB/mois)
- **APM**: New Relic (gratuit 100GB/mois) ou Datadog
- **Errors**: Sentry (gratuit 5K erreurs/mois)

### Hébergement
- **Backend**: VPS (OVH, DigitalOcean) ou PaaS (Heroku, Render)
- **Frontend**: Vercel, Netlify, ou Cloudflare Pages (gratuit)
- **BDD**: Managed PostgreSQL (Supabase, Neon, Railway)

---

## 7. Script de Test Complet (Copier-Coller)

**Créer `test-all.sh`** à la racine du projet:

```bash
#!/bin/bash

set -e  # Arrêter si erreur

echo "🧪 FORGES - Tests Complets"
echo "=========================="

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Tests Backend
echo -e "\n${YELLOW}[1/5] Tests Backend${NC}"
npm run test:backend || { echo -e "${RED}❌ Tests backend échoués${NC}"; exit 1; }
echo -e "${GREEN}✅ Tests backend réussis${NC}"

# 2. Tests Frontend
echo -e "\n${YELLOW}[2/5] Tests Frontend${NC}"
cd frontend
npm test || { echo -e "${RED}❌ Tests frontend échoués${NC}"; exit 1; }
cd ..
echo -e "${GREEN}✅ Tests frontend réussis${NC}"

# 3. Build Frontend
echo -e "\n${YELLOW}[3/5] Build Frontend${NC}"
cd frontend
npm run build || { echo -e "${RED}❌ Build frontend échoué${NC}"; exit 1; }
cd ..
echo -e "${GREEN}✅ Build frontend réussi${NC}"

# 4. Linter
echo -e "\n${YELLOW}[4/5] ESLint${NC}"
npm run lint || { echo -e "${RED}❌ Linter a trouvé des erreurs${NC}"; exit 1; }
echo -e "${GREEN}✅ Code propre${NC}"

# 5. Tests E2E (optionnel, commenté par défaut)
# echo -e "\n${YELLOW}[5/5] Tests E2E${NC}"
# cd frontend
# npx playwright test || { echo -e "${RED}❌ Tests E2E échoués${NC}"; exit 1; }
# cd ..
# echo -e "${GREEN}✅ Tests E2E réussis${NC}"

echo -e "\n${GREEN}🎉 TOUS LES TESTS SONT PASSÉS !${NC}"
echo -e "✅ Prêt pour commit/push/deploy"
```

**Utilisation**:
```bash
chmod +x test-all.sh
./test-all.sh
```

---

## 8. Formation Continue (Ressources pour débutants)

### Apprendre les tests
1. **Jest Documentation**: https://jestjs.io/docs/getting-started
2. **Playwright Tutorial**: https://playwright.dev/docs/intro
3. **Testing Best Practices**: https://github.com/goldbergyoni/javascript-testing-best-practices

### Apprendre CI/CD
1. **GitHub Actions Tutorial**: https://docs.github.com/en/actions/quickstart
2. **CI/CD Explained**: https://www.youtube.com/watch?v=scEDHsr3APg

### Apprendre le Monitoring
1. **New Relic University**: https://learn.newrelic.com (gratuit)
2. **Uptime Monitoring Guide**: https://www.atlassian.com/incident-management/kpis/uptime

---

## Résumé: Workflow Complet en Images

```
┌─────────────────┐
│  LOCAL (DEV)    │  npm test → npm run dev
│  Votre machine  │  Tests manuels navigateur
└────────┬────────┘
         │ git push
         ▼
┌─────────────────┐
│  GITHUB         │  GitHub Actions:
│  CI/CD          │  - Tests auto
│                 │  - Bloque si échec
└────────┬────────┘
         │ merge → develop
         ▼
┌─────────────────┐
│  STAGING        │  Deploy auto sur recette.forges.ci
│  (Recette)      │  Tests E2E + Validation équipe
└────────┬────────┘
         │ merge → main + tag
         ▼
┌─────────────────┐
│  PRODUCTION     │  Deploy auto sur forges.ci
│  (Prod)         │  Smoke tests + Monitoring 24/7
└─────────────────┘
```

**Temps moyen par environnement**:
- Local → Staging: **10 minutes** (automatique)
- Staging → Production: **24-48h** (validation manuelle)
- Hotfix urgente: **1-2h** (skip staging si P0)

---

Cette stratégie vous permet de :
✅ Tester en confiance avant chaque déploiement
✅ Détecter les bugs avant qu'ils atteignent les utilisateurs
✅ Revenir en arrière rapidement en cas de problème
✅ Monitorer la santé de l'application 24/7
