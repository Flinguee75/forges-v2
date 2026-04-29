# Connexion VPS et seed de validation

Ce document explique comment une personne externe peut se connecter au VPS de test FORGES et relancer le seed de validation.

## Informations de connexion

VPS de test :

```text
Host: test.forges-group.com
User: forgesadmin
Repo: /home/forgesadmin/forges-v2
Backend: /home/forgesadmin/forges-v2/forges-monorepo/backend
Branche: test
```

La connexion se fait par cle SSH. La personne qui execute la procedure doit avoir la cle privee autorisee pour ce VPS.

## Preparer la cle SSH

Placer la cle privee sur la machine locale, par exemple :

```bash
~/.ssh/id_ed25519_forges_v2
```

Appliquer les permissions SSH correctes :

```bash
chmod 600 ~/.ssh/id_ed25519_forges_v2
```

Verifier que la cle publique correspondante est autorisee sur le VPS dans :

```bash
/home/forgesadmin/.ssh/authorized_keys
```

## Se connecter au VPS

Depuis la machine locale :

```bash
ssh -i ~/.ssh/id_ed25519_forges_v2 forgesadmin@test.forges-group.com
```

Si SSH demande de confirmer l'empreinte du serveur, repondre `yes` uniquement si le domaine est bien `test.forges-group.com`.

## Aller dans le backend

Une fois connecte au VPS :

```bash
cd ~/forges-v2/forges-monorepo/backend
```

Verifier que le dossier est correct :

```bash
pwd
git branch --show-current
git rev-parse --short HEAD
ls -la seed-validation.js run-seed-validation.sh
```

La branche attendue est :

```text
test
```

## Verifier les conteneurs Docker

Le seed s'execute dans le conteneur backend de test, car ce conteneur accede deja au reseau Docker PostgreSQL.

Verifier que les conteneurs test tournent :

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Les conteneurs attendus sont notamment :

```text
forges-backend-test
forges-postgres-test
forges-redis-test
```

## Verifier le seed sans modifier la base

```bash
./run-seed-validation.sh --check --env-test
```

Le resultat attendu est :

```text
Seed coherent
```

Compteurs attendus :

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

## Relancer le seed complet

Attention : cette commande remet la base de test dans l'etat du seed de validation.

```bash
./run-seed-validation.sh --reset --env-test
```

Cette commande :
- copie `seed-validation.js` dans le conteneur `forges-backend-test`
- execute le seed depuis le conteneur backend
- vide les donnees de validation existantes
- recree le jeu de donnees de reference
- lance automatiquement une verification a la fin du seed

## Comptes de test apres reset

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

## Mettre a jour le repo sur le VPS

Si la branche `test` a change, mettre le clone VPS a jour :

```bash
cd ~/forges-v2
git pull --ff-only origin test
```

Si le depot GitHub demande une authentification, utiliser un token GitHub avec acces au depot prive, ou demander a un mainteneur de faire le pull.

## Depannage rapide

Si `Permission denied (publickey)` apparait :

```bash
chmod 600 ~/.ssh/id_ed25519_forges_v2
ssh -i ~/.ssh/id_ed25519_forges_v2 forgesadmin@test.forges-group.com
```

Si `Conteneur introuvable ou arrete: forges-backend-test` apparait :

```bash
docker ps
```

Puis redemarrer l'environnement test avec la procedure de deploiement habituelle.

Si `Can't reach database server at forges-postgres-test:5432` apparait en lancant directement `node seed-validation.js`, utiliser le script :

```bash
./run-seed-validation.sh --check --env-test
```

Ne pas lancer directement `node seed-validation.js` depuis le shell du VPS : le host Docker `forges-postgres-test` n'est pas resolu hors du reseau Docker.
