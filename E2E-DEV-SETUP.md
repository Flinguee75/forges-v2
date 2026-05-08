# E2E Tests — dev.forges-group.com

Tests end-to-end pointes sur l'environnement dev deploye.
Deux niveaux complementaires : Newman (contrats API) + Playwright (parcours UI).

---

## Lancement rapide

```bash
# Newman + Playwright (tout)
./run-e2e-dev.sh

# Newman uniquement (contrats API)
./run-e2e-dev.sh newman

# Playwright uniquement (parcours UI)
./run-e2e-dev.sh playwright
```

---

## Architecture

| Outil | Ce qu'il valide | Cible |
|---|---|---|
| Newman | Contrats API : status codes, DTOs, RBAC, 53 endpoints | `https://dev.forges-group.com/api` |
| Playwright | Parcours UI : login, inscription, paiement, attestation | `https://dev.forges-group.com` |

---

## Fichiers

| Fichier | Role |
|---|---|
| `run-e2e-dev.sh` | Script principal — verifie dev, genere tokens, lance Newman + Playwright |
| `backend/tests/forges-v4.8.dev.postman_environment.json` | Environnement Newman pointe sur dev |
| `backend/tests/generate-tokens-dev.sh` | Login sur dev avec chaque compte, injecte les JWT frais dans l'env Newman |
| `backend/tests/forges-v4.8-complete.postman_collection.json` | Collection Newman — 53 requetes, 159 assertions |
| `frontend/e2e/` | Tests Playwright — 35+ specs couvrant tous les UCS |
| `frontend/playwright.config.js` | Config Playwright — lit `E2E_BASE_URL` et `E2E_API_URL` |

---

## Pourquoi generate-tokens-dev.sh ?

Les tokens JWT expirent en 1h. L'environnement Newman local contient des tokens statiques
qui sont expires. Ce script se connecte sur dev avec chaque compte de test et injecte
les tokens frais dans l'env avant chaque run Newman.

Comptes utilises (doivent exister dans le seed dev) :

| Role | Email |
|---|---|
| ADMIN | admin@forges.ci |
| AGENT | agent-e2e@forges.ci |
| RESPONSABLE | responsable-e2e@forges.ci |
| SUPERVISEUR | superviseur-e2e@forges.ci |
| PARTENAIRE | partenaire-e2e@forges.ci |
| APPORTEUR | apporteur-e2e@forges.ci |
| APPRENANT | apprenant@forges.ci |

Mot de passe commun : `Test@FORGES2026!`

---

## Rapports

Apres chaque run :

| Rapport | Chemin |
|---|---|
| Newman HTML | `forges-monorepo/backend/newman-report-dev.html` |
| Playwright HTML | `forges-monorepo/frontend/playwright-report/index.html` |

Ouvrir dans le navigateur :
```bash
open forges-monorepo/backend/newman-report-dev.html
open forges-monorepo/frontend/playwright-report/index.html
```

---

## Lien avec edu.forges-group.com

Une fois `edu.forges-group.com` pointe sur dev (voir `EDU-VHOST-SETUP.md`),
les tests peuvent aussi etre lances sur edu en changeant une variable :

```bash
E2E_BASE_URL=https://edu.forges-group.com ./run-e2e-dev.sh playwright
```

---

## Prerequis

- Node.js installe en local
- `npx` disponible
- `curl` disponible
- Dev accessible sur `https://dev.forges-group.com`
- Seed dev a jour (`node seed_for_test.js --reset` sur le VPS si les comptes de test manquent)

---

## Baseline attendue (etat de reference)

| Suite | Attendu |
|---|---|
| Newman | 53 requetes, 159 assertions, 0 echec |
| Playwright | Tous les specs critiques PASS |
