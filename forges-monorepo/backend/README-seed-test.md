# Seed de test FORGES

Ce document explique comment peupler la base de données de test avec le seed de validation.

## Fichier de seed

- `forges-monorepo/backend/seed_for_test.js`

Ce fichier est le seed officiel pour peupler la base de test FORGES.

## Commandes principales

### Reset + seed complet

Depuis `forges-monorepo/backend` :

```bash
node seed_for_test.js --reset
```

Comportement :
- supprime toutes les tables de validation dans l'ordre prévu
- recrée ensuite le jeu de données complet

Quand l'utiliser :
- avant chaque nouvelle campagne de validation
- quand les tests précédents ont laissé des données incohérentes

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

### Vérification sans modification

Depuis `forges-monorepo/backend` :

```bash
node seed_for_test.js --check
```

Comportement :
- vérifie les données attendues sans modifier la base
- affiche un statut de contrôle pour chaque entité critique
- retourne un code de sortie `1` si au moins une entité manque

Quand l'utiliser :
- avant de lancer une session de tests
- pour valider que le seed est intact

### Ciblage d'environnement

Depuis `forges-monorepo/backend` :

```bash
node seed_for_test.js --env-demo
node seed_for_test.js --env-dev
node seed_for_test.js --env-test
```

Comportement :
- affiche l’environnement cible dans les logs
- la connexion réelle dépend toujours de `DATABASE_URL`
- le flag sert surtout à l’information et au suivi des logs

## Combinaisons recommandées

Depuis `forges-monorepo/backend` :

```bash
node seed_for_test.js --reset --env-test
node seed_for_test.js --check
node seed_for_test.js --reset && node seed_for_test.js --check
```

## Comptes de connexion créés par le seed

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

Ce seed est destiné aux tests de validation FORGES. Il contient des données fixes pour les scénarios métier de référence.
