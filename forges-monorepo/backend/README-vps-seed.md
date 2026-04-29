# Connexion VPS et seed de validation

Ce document explique comment se connecter au VPS de test et relancer le seed de validation FORGES.

## Connexion SSH

Depuis la machine locale :

```bash
ssh -i ~/.ssh/id_ed25519_forges_v2 forgesadmin@test.forges-group.com
```

Une fois connecte, aller dans le backend du clone `test` :

```bash
cd ~/forges-v2/forges-monorepo/backend
```

## Verifier la branche et le seed

```bash
git branch --show-current
git rev-parse --short HEAD
ls -la seed-validation.js run-seed-validation.sh
```

La branche attendue est `test`.

## Relancer le seed complet

```bash
./run-seed-validation.sh --reset --env-test
```

Cette commande :
- copie `seed-validation.js` dans le conteneur `forges-backend-test`
- execute le seed depuis le conteneur backend
- vide les donnees de validation existantes
- recree le jeu de donnees de reference
- lance automatiquement une verification a la fin du seed

## Verifier sans modifier la base

```bash
./run-seed-validation.sh --check --env-test
```

Le resultat attendu est :

```text
Seed coherent
```

Les compteurs attendus sont :

```text
Apprenants: 2/2
Organisations: 1/1
Partenaires: 1/1
Formations: 5/5
Sessions: 4/4
Dossiers: 6/6
VoucherOrganisations: 3/3
AbonnementsRetail: 1/1
AbonnementsB2B: 1/1
Apporteurs: 1/1
ContratInstitutionnel: 1/1
```

## Comptes de test

Mot de passe commun :

```bash
Test@FORGES2026!
```

Comptes :

- `apprenant1@forges-test.ci`
- `apprenant2@forges-test.ci`
- `org@forges-test.ci`
- `partenaire@forges-test.ci`
- `apporteur@forges-test.ci`

## Pourquoi utiliser `run-seed-validation.sh`

Depuis le shell du VPS, le host PostgreSQL Docker `forges-postgres-test` n'est pas resolu directement. Le script execute donc le seed dans `forges-backend-test`, qui est deja sur le reseau Docker de la base.

Le conteneur utilise par defaut est :

```bash
forges-backend-test
```

Pour cibler un autre conteneur :

```bash
SEED_CONTAINER=forges-backend-demo ./run-seed-validation.sh --check --env-demo
```
