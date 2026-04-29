# Rapport Baseline Production v4.9

Date: 2026-04-29
Branche: `codex/jour-1-baseline-production-v49`

## Etat initial v4.8

### Build

- Backend build: PASS (`npm run build`)
- Frontend build: PASS (`npm run build`)

### Tests

- Backend unitaires: PASS, 55 suites, 411 tests
- Backend integration: PASS, 51 suites, 239 tests passes, 2 skipped
- Frontend E2E critiques: PASS, 9/9 via `npm run test:e2e -- e2e/ucs09-paiement-commissions.spec.js e2e/ucs07-inscription-bifurcation.spec.js e2e/ucs08-traitement-dossier.spec.js`
- Newman baseline v4.8: FAIL, 53 requetes executees, 159 assertions, 96 echecs

### Newman

Rapport HTML: `forges-monorepo/backend/newman-baseline-v49-j1.html`

Constat:
- Plusieurs assertions echouent apres `Public - Login`, qui retourne `401` au lieu de `200`.
- Les appels authentifies suivants restent donc en `401`.
- Plusieurs donnees de collection semblent legacy (`D-DEV-*`, `F-DEV-*`, webhook `/api/paiements/webhook`) et ne correspondent pas aux fixtures E2E actuelles.

Decision: Newman est sous le gate du plan (`>=90%`, soit 47+/53 endpoints). Ce point doit etre corrige ou rebaseline avant de considerer J1 totalement vert.

### Base de donnees

- `npx prisma migrate status`: PASS
- Migration baseline creee: `forges-monorepo/backend/prisma/migrations/0_init_v48_baseline/migration.sql`
- Baseline marquee appliquee avec `npx prisma migrate resolve --applied 0_init_v48_baseline`
- Statut actuel: `Database schema is up to date!`
- Backup DB: PASS
- Fichier backup: `/tmp/forges-v48-baseline-20260429-000852.sql`
- Taille backup: 674K
- Restore DB sur base temporaire: BLOCKED
- Raison: le role PostgreSQL `forges` n'a pas le droit `CREATEDB`.

### Securite

- Scan secrets dans `backend/src`, `backend/tests`, `backend/prisma`: pas de secret applicatif hardcode hors valeurs de test.
- Occurrences detectees: valeurs de test `JWT_SECRET`, `WEBHOOK_SECRET` dans fichiers de test uniquement.
- Historique `.env`: un commit initial contient des fichiers `.env` dans l'historique (`885de8c9`, 2026-04-26).

## Decision Gate J1

- [x] CONTINUER: base stable pour demarrer J2, en traitant Newman comme legacy non bloquant
- [ ] BLOQUER

Exceptions acceptees:
- Newman baseline v4.8 sous seuil: legacy non bloquant, a ne pas corriger dans ce cycle.
- Restore DB temporaire non verifie: droit `CREATEDB` absent pour le role local `forges`.

## Bugs / risques connus a surveiller

- La collection Postman v4.8 n'est pas alignee avec les fixtures et routes actuelles.
- Prisma Migrate est maintenant initialise par baseline v4.8; les changements v4.9 doivent etre une migration separee.
- Les droits DB locaux ne permettent pas de tester un restore complet dans une base temporaire.
