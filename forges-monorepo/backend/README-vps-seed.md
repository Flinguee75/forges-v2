# Acces restreint VPS pour seed de validation

Ce document explique comment donner a une personne un acces limite au VPS de test FORGES pour verifier ou relancer le seed, sans lui donner acces au repo complet.

## Principe

L'acces recommande utilise l'utilisateur dedie :

```text
Host: test.forges-group.com
User: seedrunner
Script: /opt/forges-seed/run-seed-validation.sh
Commande forcee SSH: /opt/forges-seed/ssh-command.sh
```

La personne ne doit pas recevoir la cle privee existante. Elle genere sa propre cle SSH et transmet uniquement sa cle publique.

## Cote personne externe

Generer une cle SSH personnelle :

```bash
ssh-keygen -t ed25519 -C "forges-vps-seed"
```

Choisir un nom explicite si demande, par exemple :

```bash
~/.ssh/id_ed25519_forges_seed
```

Envoyer uniquement la cle publique au responsable VPS :

```bash
cat ~/.ssh/id_ed25519_forges_seed.pub
```

Ne jamais envoyer la cle privee, c'est-a-dire le fichier sans `.pub`.

Appliquer les permissions correctes sur la cle privee :

```bash
chmod 600 ~/.ssh/id_ed25519_forges_seed
```

## Cote responsable VPS

Se connecter avec un compte administrateur du VPS, puis ajouter la cle publique recue dans `/home/seedrunner/.ssh/authorized_keys`.

Format recommande :

```text
command="/opt/forges-seed/ssh-command.sh",no-agent-forwarding,no-X11-forwarding,no-port-forwarding,no-pty ssh-ed25519 AAAA... forges-vps-seed
```

Verifier les permissions :

```bash
sudo chown -R seedrunner:seedrunner /home/seedrunner/.ssh
sudo chmod 700 /home/seedrunner/.ssh
sudo chmod 600 /home/seedrunner/.ssh/authorized_keys
```

Avec cette configuration, la personne n'a pas de shell complet. SSH execute uniquement la commande forcee.

## Commandes pour la personne externe

Verifier le seed sans modifier la base :

```bash
ssh -i ~/.ssh/id_ed25519_forges_seed seedrunner@test.forges-group.com check
```

Relancer le seed complet :

```bash
ssh -i ~/.ssh/id_ed25519_forges_seed seedrunner@test.forges-group.com reset
```

Si la cle a un autre nom, remplacer `~/.ssh/id_ed25519_forges_seed` par le chemin choisi.

## Resultat attendu du check

La commande `check` doit terminer par :

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

## Details techniques

Le script restreint est stocke ici sur le VPS :

```bash
/opt/forges-seed/run-seed-validation.sh
```

Il copie le seed officiel dans le conteneur backend test, puis l'execute dans ce conteneur :

```text
Seed: /opt/forges-seed/seed-validation.js
Conteneur: forges-backend-test
Cible conteneur: /app/seed-validation.js
```

Cette approche est necessaire car le host PostgreSQL Docker `forges-postgres-test` est resolu depuis le reseau Docker, pas depuis le shell standard du VPS.

## Depannage rapide

Si `Permission denied (publickey)` apparait, verifier que :

- la cle publique a bien ete ajoutee dans `/home/seedrunner/.ssh/authorized_keys`
- la ligne contient bien `command="/opt/forges-seed/ssh-command.sh"`
- la cle privee locale a les bonnes permissions

Commande locale :

```bash
chmod 600 ~/.ssh/id_ed25519_forges_seed
```

Si `Conteneur introuvable ou arrete: forges-backend-test` apparait, un administrateur doit verifier les conteneurs :

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Conteneurs attendus :

```text
forges-backend-test
forges-postgres-test
forges-redis-test
```

Si `Commande autorisee: check ou reset` apparait, utiliser uniquement :

```bash
ssh -i ~/.ssh/id_ed25519_forges_seed seedrunner@test.forges-group.com check
ssh -i ~/.ssh/id_ed25519_forges_seed seedrunner@test.forges-group.com reset
```
