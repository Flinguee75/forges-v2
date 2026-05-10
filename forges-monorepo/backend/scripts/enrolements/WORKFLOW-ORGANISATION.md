# Workflow d'enrôlement — Organisation (template ANSSI)

Processus complet pour enrôler une organisation qui paye pour un groupe d'apprenants.  
Template utilisé pour ANSSI CI — réutilisable pour CIPREL, ministères, entreprises privées.

---

## Formation de référence — Masterclass GWU/CCDL

### Description courte (500 car. max — champ `description_courte`)

> Masterclass internationale co-délivrée par la George Washington University et le CCDL. 10 jours intensifs sur la cybersécurité stratégique et la gouvernance IA, du 1er au 11 juin 2026 à Abidjan. Certification reconnue par le gouvernement ivoirien, badge numérique vérifiable.

### Description longue (champ `description_longue`)

Certified Strategic Cybersecurity & AI Governance Analyst est une Masterclass internationale de haut niveau co-délivrée par la George Washington University School of Business et le Center for Cyber Diplomacy and Leadership (CCDL). Elle se tient du 1er au 11 juin 2026 à l'Agence Ivoirienne de Gestion des Fréquences (AIGF), Anoumabo, Abidjan, Côte d'Ivoire — première édition de cet événement sur le continent africain.

Conçue pour les stratèges de haut niveau, décideurs politiques, responsables IT, cadres en cybersécurité et leaders en gouvernance IA, cette formation intensive de 10 jours couvre deux semaines thématiques :

**Semaine 1 — Fondamentaux :** Paysage mondial des menaces cyber, Intelligence artificielle (opportunités, risques et implications stratégiques), Design thinking stratégique, Cadres internationaux de gouvernance (NIST, ISO 27001, EU AI Act), Régulation de l'IA, Protection des données et droits numériques, Gestion des risques cyber et IA, Cyber threat intelligence, Architecture nationale de cybersécurité.

**Semaine 2 — Mise en œuvre et leadership :** Réponse aux incidents et gestion de crise, Cyber diplomatie et coopération internationale, Attribution et dissuasion cyber, Sécurité de l'IA, IA responsable (éthique et redevabilité), Gouvernance organisationnelle de l'IA, Développement de la main-d'œuvre, Communication stratégique.

À l'issue de la session, les participants passent un examen QCM dont la réussite conditionne l'obtention du certificat. Les lauréats reçoivent le titre de **Certified Strategic Cybersecurity & AI Governance Analyst**, assorti d'un badge numérique vérifiable (LinkedIn, portfolio professionnel), reconnu par le gouvernement ivoirien et aligné sur la Stratégie nationale de cybersécurité 2026-2030.

### Métadonnées formation (reset-dev.ts)

| Champ | Valeur |
|---|---|
| `intitule` | Masterclass GWU/CCDL — Cybersécurité & IA |
| `type_formation` | `SUR_DEVIS` |
| `mode_formation` | `AVEC_SESSION` |
| `duree_jours` | 10 |
| `cout_catalogue` | 3 000 000 XOF |
| `certification_delivree` | true |
| `public_cible` | Décideurs, responsables IT, cadres cybersécurité, leaders gouvernance IA |
| `lieu` | AIGF, Anoumabo, Abidjan, Côte d'Ivoire |
| `session date_debut` | 2026-06-01 |
| `session date_fin` | 2026-06-11 |

---

## Vue d'ensemble

```
Admin         → reset-dev.ts          (1x par environnement)
Admin         → script-orga.ts         (seed simple d'organisations)
Admin         → script_organisations.ts (workflow test / point focal / vouchers)
Admin         → import-groupe.ts       (workflow standard d'organisation)
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
    "tarif_unitaire_xof": 3000000,
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
- `tarif_unitaire_xof` (public : 3 000 000 / privé : selon contrat)
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

## Script organisations seul

Pour créer ou mettre à jour des organisations sans passer par le workflow complet :

```bash
# Dry-run
DRY_RUN=true \
DATABASE_URL="..." \
node -r ts-node/register/transpile-only \
  scripts/admin/script-orga.ts --file scripts/admin/orga-seed.example.json

# Production
DATABASE_URL="..." \
node -r ts-node/register/transpile-only \
  scripts/admin/script-orga.ts --file scripts/admin/orga-seed.example.json
```

Format attendu :
- `organisations[].raison_sociale`
- `organisations[].type`
- `organisations[].email`
- `organisations[].contact_referent`
- `organisations[].pays`
- `organisations[].identifiant_legal` optionnel
- `organisations[].langue_preferee` optionnel
- `organisations[].statut` optionnel
- `organisations[].sous_types` optionnel

---

## Récapitulatif des scripts

| Script | Rôle | Quand |
|---|---|---|
| `scripts/admin/reset-dev.ts` | Init environnement + admin | 1 fois par env |
| `scripts/admin/script-orga.ts` | Seed organisations | Par lot ou organisation |
| `scripts/admin/script_organisations.ts` | Seed orga + apprenants + devis + vouchers | Par organisation test |
| `scripts/enrolements/import-groupe.ts` | Org + apprenants + devis + vouchers | Par organisation standard |
| `scripts/enrolements/payer-devis.ts` | Confirmer paiement + activer dossiers | À réception virement |
| `scripts/enrolements/rappel-j7.ts` | Email pratique J-7 | 7 jours avant session |
