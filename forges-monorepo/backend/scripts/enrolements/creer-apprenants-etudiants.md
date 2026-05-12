# `creer-apprenants-etudiants.ts`

Script de test pour lire un CSV d'apprenants étudiants, créer ou réutiliser leurs comptes, leur envoyer leur mail d'accès, puis envoyer une facture PDF personnalisée à chaque apprenant.

## Fichiers d'entrée

Le script lit:

- un CSV apprenants étudiants via `--file`
- un JSON contexte via `--context`

Exemple de CSV:

```csv
nom,prenom,email,organisation,secteur_activite,pays_residence,pays_nationalite,type_apprenant,niveau_etude,tarif_xof
N’GUESSAN,SAMIRA GRACE ARIELLE,samira.nguessan@eburtis.ci,Employeur,Technologie & Informatique,Côte d’Ivoire,Côte d’Ivoire,ETUDIANT,Bac+2,2000000
KOUASSI,Bilson Jean,bilsonjean9@gmail.com,Jumos immigration Canada,Technologie & Informatique,Côte d’Ivoire,Côte d’Ivoire,ETUDIANT,Bac+2,2000000
```

Pour les tests rapides, le fichier dédié est:

```text
groupes/apprenants_etudiants_test.csv
```

Champs requis du CSV:

- `nom`
- `prenom`
- `email`
- `organisation`
- `secteur_activite`
- `pays_residence`
- `pays_nationalite`
- `type_apprenant`
- `tarif_xof`

`niveau_etude` est optionnel pour les lignes `PROFESSIONNEL` et reste requis pour les lignes `APPRENANT`.

Champs requis du contexte:

- `formation_id`
- `session_id`
- `contact_referent`
- `identifiant_legal` est optionnel et peut rester vide si ce n'est pas une vraie organisation
- `notes_admin` est optionnel

## Commandes

Depuis `backend/`:

```bash
node -r ts-node/register/transpile-only scripts/enrolements/creer-apprenants-etudiants.ts --file groupes/apprenants_etudiants.csv --context groupes/apprenants-individuels-context.json --dry-run
node -r ts-node/register/transpile-only scripts/enrolements/creer-apprenants-etudiants.ts --file groupes/apprenants_etudiants.csv --context groupes/apprenants-individuels-context.json
node -r ts-node/register/transpile-only scripts/enrolements/creer-apprenants-etudiants.ts --file groupes/apprenants_etudiants_test.csv --context groupes/apprenants-individuels-context.json --dry-run
```

## Comportement

- Si l'apprenant existe déjà par email, il est réutilisé.
- Sinon, le compte est créé avec un mot de passe temporaire.
- Le type `ETUDIANT` du CSV est converti vers le type backend attendu.
- Le niveau d'étude du CSV est écrit sur le compte apprenant.
- Le mail d'accès part via `sendTempPassword(...)`, comme dans le script source.
- La facture PDF est générée par le service devis existant.
- Le bloc destinataire de la facture utilise le nom et prénom de l'apprenant.
- La formation et les dates de session sont lues en base à partir du contexte.
- Le tarif unitaire et le total viennent du CSV, colonne `tarif_xof`, sans conversion supplémentaire.
