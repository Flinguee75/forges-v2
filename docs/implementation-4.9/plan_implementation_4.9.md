# FORGES v4.9 — Guide d’intégration développeur

Backend **Node.js / Express / Prisma** + Frontend **React / Tailwind**  
Objectif : mise en production des nouvelles fonctionnalités.

---

# 1. Prérequis avant de commencer

- Node.js ≥ 20 LTS
- PostgreSQL 16
- Redis 7
- Docker optionnel
- Projet FORGES déjà opérationnel, version ≥ v1.7
- Accès à l’environnement de développement `dev`
- Accès aux variables `.env`
- Compte sandbox NGSER pour les tests de paiement

---

# 2. Backend — Ordre d’exécution

## Étape 1 — Modifier le schéma Prisma

Dans le fichier :

```txt
prisma/schema.prisma
```

Ajouter ou adapter les modèles suivants :

```prisma
model Devis {
  id                  String      @id @default(uuid())
  numero_devis        String      @unique
  organisation_id     String
  formation_id        String
  session_id          String?
  nb_places           Int
  tarif_unitaire_xof  Decimal     @db.Decimal(12,2)
  montant_total_xof   Decimal     @db.Decimal(12,2)
  statut              StatutDevis @default(CREE)
  notes_admin         String?
  paid_at             DateTime?
  cancelled_at        DateTime?
  created_by          String
  created_at          DateTime    @default(now())
}

model Paiement {
  // champs existants...
  payment_token_ngser String?
  order_ngser         String?   @unique
  montant_initie      Decimal?  @db.Decimal(12,2)
}

model FormationPartenaire {
  // champs existants...
  url_certificat_partenaire String?
  activation_confirmee_le   DateTime?
  ratio_online_pct          Int?
}

enum StatutDevis {
  CREE
  PAYE
  ANNULE
}
```

Puis lancer la migration :

```bash
npx prisma migrate dev --name add_devis_ngser_export
```

---

## Étape 2 — Ajouter les services backend

Copier les fichiers suivants dans :

```txt
backend/src/modules/
```

Fichiers à ajouter :

```txt
devis/devis.service.js
devis/devis.controller.js
devis/devis.routes.js

paiements/paiement-ngser.service.js
paiements/ipn.controller.js

partenaires/export-csv.service.js
partenaires/proxy-acces.service.js
```

À vérifier :

- Adapter les imports selon la structure existante.
- Vérifier les dépendances Prisma.
- Vérifier les dépendances internes du projet.

---

## Étape 3 — Enregistrer les routes

Dans :

```txt
backend/src/app.js
```

ou :

```txt
server.js
```

Ajouter les imports :

```js
const devisRoutes = require('./modules/devis/devis.routes');
const paiementRoutes = require('./modules/paiements/paiement.routes');
const partenaireRoutes = require('./modules/partenaires/partenaire.routes');
```

Puis enregistrer les routes :

```js
app.use('/api/admin/devis', devisRoutes);
app.use('/api/paiements', paiementRoutes);
app.use('/api/partenaire', partenaireRoutes);
```

---

## Étape 4 — Ajouter les variables d’environnement

Dans le fichier :

```txt
.env
```

Ajouter :

```env
COMMISSION_FORGES_DEFAULT_PCT=30
HMAC_ANONYMISATION_SEL=un_sel_secret_64chars

NGSER_BASE_URL=https://securetest.crossroad-africa.net/
NGSER_AUTH_TOKEN=votre_token_sandbox
NGSER_OPERATION_TOKEN_PAIEMENT=votre_token_operation
NGSER_NOTIFICATION_URL=https://api.forges-group.com/webhooks/paiement

NGSER_RECONCILIATION_PENDING_MINUTES=30
```

À vérifier :

- Les secrets ne doivent jamais être loggés.
- Les variables doivent être documentées.
- Les valeurs sandbox doivent être séparées des valeurs production.

---

# 3. Frontend — Ajout des pages et composants

## Étape 5 — Copier les composants React

Placer les fichiers suivants dans :

```txt
frontend/src/
```

Fichiers à ajouter :

```txt
pages/DevisForm.jsx
pages/ReconciliationExport.jsx
components/BotWidget.jsx
pages/NGSERPayment.jsx
```

Rôle des fichiers :

| Fichier | Rôle |
|---|---|
| `pages/DevisForm.jsx` | Création de devis côté admin |
| `pages/ReconciliationExport.jsx` | Export CSV partenaire, rôle `PARTENAIRE` |
| `components/BotWidget.jsx` | Widget flottant avec questions fermées |
| `pages/NGSERPayment.jsx` | Redirection vers NGSER |

Ajouter ensuite les routes correspondantes dans :

```txt
App.jsx
```

ou dans le routeur principal du frontend.

---

## Étape 6 — Ajouter les appels API

Dans :

```txt
services/api.js
```

Ajouter :

```js
export const devisApi = {
  creer: (data) => api.post('/admin/devis', data),
  marquerPaye: (id) => api.put(`/admin/devis/${id}/paye`),
  annuler: (id) => api.put(`/admin/devis/${id}/annuler`)
};

export const paiementApi = {
  initierNGSER: (dossierId) =>
    api.post('/paiements/initier', { dossier_id: dossierId })
};

export const partenaireApi = {
  exportCSV: (mois) =>
    api.get('/partenaire/export-csv', { params: { mois } })
};
```

À vérifier :

- Les chemins API doivent correspondre aux routes backend.
- Les rôles doivent être protégés côté backend.
- Le frontend ne doit pas exposer de secret NGSER.

---

# 4. Tests — Vérification des nouvelles fonctionnalités

## Étape 7 — Installer les dépendances de test

Si elles sont absentes, installer :

```bash
npm install --save-dev jest supertest @testing-library/react vitest
```

---

## Étape 8 — Copier les fichiers de test

Ajouter les fichiers suivants :

```txt
tests/unit/devis.service.test.js
tests/unit/paiement-ngser.service.test.js
tests/integration/export-csv.test.js
tests/frontend/ReconciliationExport.test.jsx
```

Objectif des tests :

| Fichier | Objectif |
|---|---|
| `tests/unit/devis.service.test.js` | Tests MOD-16 |
| `tests/unit/paiement-ngser.service.test.js` | Tests RM-157 à RM-162 |
| `tests/integration/export-csv.test.js` | Test export HMAC |
| `tests/frontend/ReconciliationExport.test.jsx` | Test frontend export |

Exécuter :

```bash
npm run test
```

ou :

```bash
npm test
```

Critères attendus :

- Les tests existants continuent de passer.
- Les nouveaux tests passent.
- Les 335 tests passent.
- La couverture atteint au moins 80 %.

---

# 5. Validation finale avant mise en production

Avant mise en production, vérifier les points suivants :

- [ ] Swagger accessible en environnement dev :

```txt
/api/docs
```

- [ ] Swagger désactivé en production.

- [ ] L’endpoint suivant retourne une redirection vers NGSER sandbox :

```http
POST /api/paiements/initier
```

- [ ] L’IPN NGSER est bien reçu.

- [ ] L’IPN met correctement à jour le statut du paiement.

- [ ] Les logs MT-01 confirment le bon traitement du paiement.

- [ ] L’export CSV partenaire contient un identifiant HMAC stable.

- [ ] L’export CSV partenaire ne contient aucune donnée personnelle.

- [ ] Le widget bot flottant affiche uniquement des questions fermées.

- [ ] Le widget bot flottant ne fait pas planter l’interface.

- [ ] Toutes les variables `.env` sont documentées.

- [ ] Les secrets ne sont jamais loggés.

- [ ] Les exigences RM-162 sont respectées.

---

# Résultat attendu

Une fois les étapes validées, les nouvelles fonctionnalités suivantes sont intégrées :

- Création de devis
- Gateway NGSER
- Export CSV partenaire
- Proxy d’accès partenaire
- Widget bot flottant

En cas de problème :

- Consulter les logs MT-01.
- Vérifier la documentation Swagger.
- Vérifier les variables `.env`.
- Vérifier les droits d’accès aux routes backend.