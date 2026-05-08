# Workflow d'enrôlement — Organisation (template ANSSI)

Processus complet pour enrôler une organisation qui paye pour un groupe d'apprenants.  
Template utilisé pour ANSSI CI — réutilisable pour CIPREL, ministères, entreprises privées.

---

## Vue d'ensemble

```
Admin         → reset-dev.ts          (1x par environnement)
Admin         → import-groupe.ts      (1x par organisation)
Organisation  → reçoit email devis    (automatique)
Admin         → payer-devis.ts        (à réception du virement)
Apprenants    → reçoivent confirmations (automatique)
Admin         → rappel-j7.ts          (J-7 avant la session)
```

---

## Prérequis

- Node.js 20 installé sur le VPS
- `DATABASE_URL` pointant vers la DB cible
- Variables SMTP configurées (Brevo ou autre)
- `EMAIL_TEST_OVERRIDE` défini pour les tests (redirige tous les emails)

---

## Étape 0 — Initialiser l'environnement (une seule fois)

```bash
DATABASE_URL="..." \
ADMIN_EMAIL="admin@forges-group.com" \
ADMIN_PASSWORD="Admin@FORGES2026!" \
node -r ts-node/register/transpile-only scripts/admin/reset-dev.ts
```

**Ce que ça fait :**
- Vide toutes les tables métier
- Crée le compte Admin FORGES
- Crée la formation `Masterclass GWU/CCDL` et la session `1–11 juin 2026`

**IDs fixes créés :**
- Formation : `frm-masterclass-gwu-ccdl-2026`
- Session : `ses-anssi-juin-2026`

---

## Étape 1 — Créer le fichier organisation

Dupliquer `groupes/anssi.json` et adapter les champs :

```json
{
  "organisation": {
    "raison_sociale": "Nom complet de l'organisation",
    "type": "GOUVERNEMENT | ENTREPRISE | ONG",
    "email": "contact@organisation.ci",
    "contact_referent": "Nom du référent",
    "pays": "CI",
    "identifiant_legal": "CODE-LEGAL-001"
  },
  "masterclass": {
    "formation_id": "frm-masterclass-gwu-ccdl-2026",
    "session_id": "ses-anssi-juin-2026",
    "tarif_unitaire_xof": 2000000,
    "notes_admin": "Notes internes admin"
  },
  "apprenants": [
    {
      "nom": "NOM",
      "prenoms": "Prénoms",
      "email": "email@organisation.ci",
      "fonction": "Directeur Général",
      "pays_residence": "CI",
      "pays_nationalite": "CI"
    }
  ]
}
```

**Variables qui changent d'une organisation à l'autre :**
- `raison_sociale`, `type`, `email`, `contact_referent`
- `tarif_unitaire_xof` (public : 2 000 000 / privé : selon contrat)
- La liste `apprenants` (noms, emails, fonctions)

---

## Étape 2 — Importer l'organisation (dry-run d'abord)

```bash
# Simuler sans écrire
DATABASE_URL="..." \
EMAIL_TEST_OVERRIDE="test@example.com" \
DRY_RUN=true \
node -r ts-node/register/transpile-only scripts/enrolements/import-groupe.ts \
  --groupe groupes/anssi.json

# Exécuter pour de vrai
DATABASE_URL="..." \
EMAIL_TEST_OVERRIDE="TidianeCisse9@outlook.fr" \
node -r ts-node/register/transpile-only scripts/enrolements/import-groupe.ts \
  --groupe groupes/anssi.json
```

**Ce que ça fait :**
- Crée le compte Organisation (ou retrouve l'existant)
- Crée les comptes Apprenant liés à l'organisation (mot de passe temp : `Forges@2026!`)
- Crée le Devis au statut `CREE`
- Crée N vouchers nominatifs au statut `EN_ATTENTE`, liés au devis
- Envoie l'email devis au contact référent de l'organisation

**Email reçu :** devis PDF avec récapitulatif des places et instructions de paiement NSIA.

---

## Étape 3 — Confirmer le paiement (à réception du virement)

```bash
DATABASE_URL="..." \
EMAIL_TEST_OVERRIDE="TidianeCisse9@outlook.fr" \
node -r ts-node/register/transpile-only scripts/enrolements/payer-devis.ts \
  --devis FORGES-DEVIS-2026-001
```

Remplacer `FORGES-DEVIS-2026-001` par le numéro affiché à l'étape 2.

**Ce que ça fait (RM-41) :**
- Passe le devis en `PAYE`
- Active les N vouchers : `EN_ATTENTE` → `ACTIF`
- Crée un dossier `PAYE` par apprenant (source : `VOUCHER_ORGANISATION`, montant remise = tarif intégral)
- Crée le paiement `CONFIRME` associé à chaque dossier
- Envoie 2 emails à chaque apprenant :
  - Confirmation d'inscription (place confirmée)
  - Confirmation paiement (avec accès plateforme)

---

## Étape 4 — Rappel J-7

À lancer manuellement 7 jours avant la date de la session :

```bash
DATABASE_URL="..." \
EMAIL_TEST_OVERRIDE="TidianeCisse9@outlook.fr" \
MASTERCLASS_LIEU="Hôtel Ivoire — Salle Conférence A — Abidjan" \
MASTERCLASS_HORAIRES="08h30 – 17h30 (accueil dès 08h00)" \
node -r ts-node/register/transpile-only scripts/enrolements/rappel-j7.ts \
  --devis FORGES-DEVIS-2026-001
```

**Email reçu par chaque apprenant :** lieu, horaires, dress code, documents à apporter, lien plateforme FORGES.

---

## Variables d'environnement utiles

| Variable | Description | Exemple |
|---|---|---|
| `DATABASE_URL` | URL PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `EMAIL_TEST_OVERRIDE` | Redirige tous les emails (test) | `TidianeCisse9@outlook.fr` |
| `ENROLEMENT_TEMP_PASSWORD` | Mot de passe temporaire apprenants | `Forges@2026!` |
| `MASTERCLASS_LIEU` | Lieu pour l'email J-7 | `Hôtel Ivoire — Abidjan` |
| `MASTERCLASS_HORAIRES` | Horaires pour l'email J-7 | `08h30 – 17h30` |
| `FRONTEND_URL` | URL plateforme dans les emails | `https://forges-group.com` |

---

## Créer un nouveau groupe (ex : CIPREL)

```bash
# 1. Copier le fichier de config
cp groupes/anssi.json groupes/ciprel.json

# 2. Éditer groupes/ciprel.json avec les données CIPREL

# 3. Dry-run
DRY_RUN=true node -r ts-node/register/transpile-only \
  scripts/enrolements/import-groupe.ts --groupe groupes/ciprel.json

# 4. Production
node -r ts-node/register/transpile-only \
  scripts/enrolements/import-groupe.ts --groupe groupes/ciprel.json

# 5. À réception du paiement
node -r ts-node/register/transpile-only \
  scripts/enrolements/payer-devis.ts --devis FORGES-DEVIS-2026-002
```

---

## Récapitulatif des scripts

| Script | Rôle | Quand |
|---|---|---|
| `scripts/admin/reset-dev.ts` | Init environnement + admin | 1 fois par env |
| `scripts/enrolements/import-groupe.ts` | Org + apprenants + devis + vouchers | Par organisation |
| `scripts/enrolements/payer-devis.ts` | Confirmer paiement + activer dossiers | À réception virement |
| `scripts/enrolements/rappel-j7.ts` | Email pratique J-7 | 7 jours avant session |
