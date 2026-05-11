# `creer-apprenants-et-devis.ts`

Script de test pour créer ou réutiliser un petit lot d'apprenants, leur envoyer leur mail d'accès, puis envoyer un devis PDF personnalisé à chaque apprenant.

## But

Ce script sert à rejouer un scénario simple sans passer par le workflow organisation complet:

- création/réutilisation de comptes apprenants,
- envoi du mot de passe temporaire via `EmailService.sendTempPassword(...)`,
- envoi du devis PDF via `DevisService.envoyerEmailDevis(...)`,
- personnalisation du template devis pour afficher le nom et prénom de l'apprenant dans le bloc destinataire.

## Fichier d'entrée

Le script lit un JSON via `--file`.

Exemple:

```json
{
  "devis": {
    "formation_id": "frm-masterclass-gwu-ccdl-2026",
    "session_id": "ses-gwu-ccdl-juin-2026",
    "organisation_label": "Groupe test apprenants",
    "contact_referent": "Equipe FORGES",
    "formation_label": "Masterclass GWU/CCDL — Cybersécurité & IA",
    "identifiant_legal": "",
    "tarif_unitaire_xof": 15000,
    "notes_admin": "Lot initial de test avec 2 apprenants",
    "session": {
      "date_debut": "2026-06-01T00:00:00.000Z",
      "date_fin": "2026-06-05T00:00:00.000Z"
    }
  },
  "apprenants": [
    {
      "email": "redfoo923@gmail.com",
      "nom": "Test",
      "prenoms": "Redfoo",
      "pays_residence": "CI",
      "pays_nationalite": "CI"
    },
    {
      "email": "Tidianecisse9@outlook.fr",
      "nom": "Cisse",
      "prenoms": "Tidiane",
      "pays_residence": "CI",
      "pays_nationalite": "CI"
    }
  ]
}
```

Champs requis:

- `devis.organisation_label`
- `devis.contact_referent`
- `devis.formation_label`
- `devis.formation_id` et `devis.session_id` sont recommandés pour rattacher le devis à la formation GWU/CCDL du reset `edu`
- `devis.tarif_unitaire_xof`
- `devis.identifiant_legal` est optionnel et peut rester vide si ce n'est pas une vraie organisation
- `apprenants[]`
- `apprenants[].email`
- `apprenants[].nom`
- `apprenants[].prenoms`
- `apprenants[].pays_residence`
- `apprenants[].pays_nationalite`

## Commandes

Depuis `backend/`:

```bash
node -r ts-node/register/transpile-only scripts/enrolements/creer-apprenants-et-devis.ts --file groupes/apprenants-devis-test.json --dry-run
node -r ts-node/register/transpile-only scripts/enrolements/creer-apprenants-et-devis.ts --file groupes/apprenants-devis-test.json
```

Variables utiles:

- `DATABASE_URL` obligatoire
- `EMAIL_TEST_OVERRIDE` pour rediriger tous les emails vers une adresse de test
- `DRY_RUN=true` pour simuler sans écrire en base

## Comportement

- Si l'apprenant existe déjà par email, il est réutilisé.
- Sinon, le compte est créé avec un mot de passe temporaire.
- Le mail d'accès part via `sendTempPassword(...)`, comme dans le script source.
- Le devis PDF est généré par le service devis existant, sans créer de ligne `Devis` persistée.
- Le bloc destinataire du devis utilise le nom et prénom de l'apprenant.
- La formation et la session sont résolues depuis les IDs du reset `edu` si disponibles.

## Vérification

À vérifier après exécution:

- les 2 apprenants ont bien été créés ou réutilisés,
- les emails d'accès ont bien été envoyés,
- le devis PDF a bien été envoyé à chaque apprenant,
- le rendu du devis garde le template officiel.
