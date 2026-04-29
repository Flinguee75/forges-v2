# Seed de test FORGES

Ce document explique comment peupler la base de donnees de test avec le seed de validation.

## Fichier de seed

- `forges-monorepo/backend/seed-validation.js`

Ce fichier est le seed officiel pour peupler la base de test FORGES.

## Commandes principales

### Reset + seed complet

Depuis `forges-monorepo/backend` :

```bash
node seed-validation.js --reset
```

Comportement :
- supprime toutes les tables de validation dans l'ordre prevu
- recree ensuite le jeu de donnees complet

Quand l'utiliser :
- avant chaque nouvelle campagne de validation
- quand les tests precedents ont laisse des donnees incoherentes

Ordre de suppression `--reset` :
- `CommissionApporteur`
- `VoucherApporteur`
- `Apporteur`
- `Paiement`
- `Dossier`
- `AccesFormationDemande`
- `VoucherOrganisation`
- `FormationPartenaire`
- `Session`
- `Formation`
- `AbonnementB2B`
- `AbonnementOrganisation`
- `AbonnementRetail`
- `ContratInstitutionnel`
- `Organisation`
- `Partenaire`
- `Apprenant`

### Verification sans modification

Depuis `forges-monorepo/backend` :

```bash
node seed-validation.js --check
```

Comportement :
- verifie les donnees attendues sans modifier la base
- affiche un statut de controle pour chaque entite critique
- retourne un code de sortie `1` si au moins une entite manque

Quand l'utiliser :
- avant de lancer une session de tests
- pour valider que le seed est intact

### Ciblage d'environnement

Depuis `forges-monorepo/backend` :

```bash
node seed-validation.js --env-demo
node seed-validation.js --env-dev
node seed-validation.js --env-test
```

Comportement :
- affiche l'environnement cible dans les logs
- la connexion reelle depend toujours de `DATABASE_URL`
- le flag sert surtout a l'information et au suivi des logs

## Combinaisons recommandees

Depuis `forges-monorepo/backend` :

```bash
node seed-validation.js --reset --env-test
node seed-validation.js --check
node seed-validation.js --reset && node seed-validation.js --check
```

## Comptes de connexion crees par le seed

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

## Remarque

Ce seed est destine aux tests de validation FORGES. Il contient des donnees fixes pour les scenarios metier de reference.
