# `creer-apprenants-et-devis.ts`

Script de test pour lire un CSV d'apprenants, créer ou réutiliser leurs comptes, leur envoyer leur mail d'accès, puis envoyer une facture PDF personnalisée à chaque apprenant.

## But

Ce script sert à rejouer un scénario simple sans passer par le workflow organisation complet:

- création/réutilisation de comptes apprenants,
- envoi du mot de passe temporaire via `EmailService.sendTempPassword(...)`,
- envoi de la facture PDF via `DevisService.envoyerEmailDevis(...)`,
- personnalisation du template facture pour afficher le nom et prénom de l'apprenant dans le bloc destinataire.

## Fichiers d'entrée

Le script lit:

- un CSV apprenants via `--file`
- un JSON contexte via `--context`

Exemple:

```json
{
  "formation_id": "frm-masterclass-gwu-ccdl-2026",
  "session_id": "ses-gwu-ccdl-juin-2026",
  "contact_referent": "Equipe FORGES",
  "identifiant_legal": ""
}
```

Exemple de CSV:

```csv
nom,prenom,email,organisation,secteur_activite,pays_residence,pays_nationalite,tarif_xof
DOGBA,Benjamin Belotte,redfoo923@gmail.com,Ministère de l’Intérieur et de la Sécurité,,Côte d’Ivoire,Côte d’Ivoire,3000000
DJE,HIBA HABIB,tidianecisse9@outlook.fr,Talentys SA,,Côte d’Ivoire,Côte d’Ivoire,3000000
DOE,KOUASSI EZECHIEL,hassancisse@pointfocal.com,BARNOIN INFORMATIQUE,,Côte d’Ivoire,Côte d’Ivoire,3000000
```

Champs requis du CSV:

- `nom`
- `prenom`
- `email`
- `organisation`
- `secteur_activite`
- `pays_residence`
- `pays_nationalite`
- `tarif_xof`

Champs requis du contexte:

- `formation_id`
- `session_id`
- `contact_referent`
- `identifiant_legal` est optionnel et peut rester vide si ce n'est pas une vraie organisation
- `notes_admin` est optionnel

## Commandes

Depuis `backend/`:

```bash
node -r ts-node/register/transpile-only scripts/enrolements/creer-apprenants-et-devis.ts --file groupes/apprenants-individuels-test.csv --context groupes/apprenants-individuels-context.json --dry-run
node -r ts-node/register/transpile-only scripts/enrolements/creer-apprenants-et-devis.ts --file groupes/apprenants-individuels-test.csv --context groupes/apprenants-individuels-context.json
```

Variables utiles:

- `DATABASE_URL` obligatoire
- `EMAIL_TEST_OVERRIDE` pour rediriger tous les emails vers une adresse de test
- `DRY_RUN=true` pour simuler sans écrire en base

## Comportement

- Si l'apprenant existe déjà par email, il est réutilisé.
- Sinon, le compte est créé avec un mot de passe temporaire.
- Le mail d'accès part via `sendTempPassword(...)`, comme dans le script source.
- La facture PDF est générée par le service devis existant, sans créer de ligne persistée.
- Le bloc destinataire de la facture utilise le nom et prénom de l'apprenant.
- La formation et les dates de session sont lues en base à partir du contexte.
- Le tarif unitaire et le total viennent du CSV, colonne `tarif_xof`, sans conversion supplémentaire.

## Vérification

À vérifier après exécution:

- les 2 apprenants ont bien été créés ou réutilisés,
- les emails d'accès ont bien été envoyés,
- la facture PDF a bien été envoyée à chaque apprenant,
- le rendu de la facture garde le template officiel,
- le montant affiché correspond à `tarif_xof` du CSV.
