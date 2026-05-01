# FORGES v4.9 — Dossier d’implémentation complet

## Sources analysées

- `FORGES_Specs_v4_9.docx`
- `FORGES_Guide_Integration_Addendum_v4_9.docx`

## Conclusion rapide

Oui, il y a des informations supplémentaires importantes sur l’implémentation v4.9.

Le document de spécifications v4.9 donne la vision fonctionnelle complète : nouvelles règles métier RM-149 à RM-162, UCS21, Devis, credentials de livraison, export CSV partenaire, variables `.env`, NGSER, IPN, réconciliation, MT-01 et MT-02.

L’addendum au guide d’intégration ajoute des détails plus opérationnels qui changent directement la manière de coder :

1. L’IPN NGSER doit répondre HTTP 200 immédiatement, avant la logique métier.
2. Le `ReconciliationScheduler` est explicitement identifié comme une étape manquante du guide principal.
3. Les secrets doivent être masqués systématiquement avant tout log MT-01.
4. La commission par défaut passe à `30%` FORGES / `70%` Partenaire.
5. Les valeurs métier ne doivent jamais être codées en dur : elles doivent venir du `.env`.
6. Le proxy AES-256 est obligatoire pour les URLs partenaires des formations à la demande.
7. Il existe quelques incohérences à arbitrer avant développement, notamment sur le nom exact de certaines variables et l’endpoint de réconciliation NGSER.

---

# 1. Périmètre v4.9 à implémenter

| Bloc | RMs / UCS | Description |
|---|---|---|
| Devis SUR_DEVIS | RM-149 à RM-151, UCS21 | Création, annulation, paiement manuel, notification organisation |
| Credentials livraison | RM-152 à RM-154 | URL partenaire chiffrée AES-256, proxy d’accès, aucun credential exposé |
| Export CSV Partenaire | RM-155, UCS17 | Export anonymisé avec HMAC stable, sans PII |
| Variables d’environnement | RM-156 | Toute constante métier globale dans `.env`, surcharge par entité via `??` |
| Gateway NGSER | RM-157 à RM-162, UCS09 | Paiement mobile money, IPN, réconciliation, mapping statuts, intégrité montant |
| Logs / audit | MT-01 | Nouveaux événements NGSER, Devis, CSV |
| Chiffrement | MT-02 | AES URLs partenaires, HMAC CSV, secrets NGSER |

---

# 2. Devis SUR_DEVIS — RM-149 à RM-151 / UCS21

## 2.1 Objectif

Gérer les commandes B2B institutionnelles ou grands comptes sur devis, sans paiement automatique intégré en v4.9.

Flux attendu :

1. Admin crée le devis.
2. Organisation reçoit le devis par email.
3. Agent Comptable confirme la réception du paiement hors plateforme.
4. Admin ou Agent Comptable, selon décision RBAC, marque le devis comme payé.
5. Admin crée manuellement l’AbonnementB2B SUR_DEVIS.
6. Admin génère manuellement les vouchers liés à la formation.
7. Les vouchers sont envoyés à l’organisation.

## 2.2 Modèle `Devis`

```prisma
model Devis {
  id                    String      @id @default(uuid())

  numero_devis          String      @unique
  organisation_id       String
  formation_id          String
  session_id            String?

  nb_places             Int
  tarif_unitaire_xof    Int
  montant_total_xof     Int

  statut                StatutDevis @default(CREE)

  date_interlocuteur    DateTime?
  nom_interlocuteur     String?
  mode_paiement         String?
  notes_admin           String?

  paid_at               DateTime?
  cancelled_at          DateTime?

  created_at            DateTime    @default(now())
  updated_at            DateTime    @updatedAt
}

enum StatutDevis {
  CREE
  PAYE
  ANNULE
}
```

## 2.3 Règles métier

| Règle | Implémentation |
|---|---|
| Numéro automatique | Format `FORGES-DEVIS-YYYY-NNN`, séquence réinitialisée chaque année |
| Montant total | `nb_places × tarif_unitaire_xof`, jamais modifiable manuellement |
| Statut initial | `CREE` |
| Annulation | Autorisée uniquement si statut `CREE` |
| Paiement | Passage manuel à `PAYE`, `paid_at` renseigné |
| Devis payé | Ne peut pas être annulé via la plateforme |
| Expiration | Aucune expiration automatique, aucun scheduler |
| Après paiement | AbonnementB2B + vouchers créés manuellement |
| Notification | Email organisation dans sa langue préférée |
| Logs | `DEVIS_CREE`, `DEVIS_PAYE`, `DEVIS_ANNULE` |

## 2.4 Endpoints à prévoir

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| `POST` | `/api/admin/devis` | ADMIN | Créer un devis |
| `GET` | `/api/admin/devis` | ADMIN / AGENT_COMPTABLE | Lister les devis |
| `GET` | `/api/admin/devis/:id` | ADMIN / AGENT_COMPTABLE | Détail devis |
| `PATCH` | `/api/admin/devis/:id/payer` | ADMIN / AGENT_COMPTABLE | Marquer comme payé |
| `PATCH` | `/api/admin/devis/:id/annuler` | ADMIN | Annuler un devis `CREE` |
| `GET` | `/api/organisation/devis` | ORGANISATION | Lecture seule des devis de son organisation, à arbitrer car le document mentionne aussi un possible report v4.10 |

## 2.5 Point à arbitrer

La matrice des rôles indique que l’Organisation a une lecture de ses devis, mais UCS21 précise que la consultation organisation peut être hors scope v4.9 et reportée v4.10.

Décision recommandée :

- v4.9 minimale : backoffice Admin + Agent Comptable uniquement ;
- v4.9 enrichie : ajouter `GET /api/organisation/devis` en lecture seule si le délai le permet.

---

# 3. Gateway NGSER — RM-157 à RM-162 / UCS09

## 3.1 Objectif

NGSER devient l’agrégateur de paiement Mobile Money utilisé par FORGES pour les encaissements.

Moyens couverts : MTN Money, Orange Money, Wave, Moov, etc.

Les reversements partenaires et apporteurs restent manuels hors plateforme.

## 3.2 Flux NGSER obligatoire

| Phase | Action FORGES | Point critique |
|---|---|---|
| 1. Initiation | Backend appelle `POST /v3/sessions` | Stocker `payment_token`, `order_ngser`, `montant_initie` |
| 2. Paiement client | Client redirigé vers `payment_url` | Le frontend ne fixe jamais le montant |
| 3. IPN | NGSER appelle `NGSER_NOTIFICATION_URL` | L’IPN fait foi, pas la redirection client |
| 4. Réconciliation | Scheduler traite les paiements `PENDING` | Rattrape les IPN perdus ou non traités |

## 3.3 Données à stocker dans `Paiement`

Champs à ajouter ou vérifier :

```prisma
model Paiement {
  id                          String   @id @default(uuid())

  dossier_id                  String?
  montant_xof                 Int
  statut                      StatutPaiement
  methode                     String?

  provider                    String?  // "NGSER"
  order_ngser                 String?  @unique
  payment_token_ngser         String?
  montant_initie_xof          Int?
  wallet_ngser                String?
  code_ngser                  Int?
  status_ngser                String?
  ngser_payload_last          Json?

  initiated_at                DateTime?
  confirmed_at                DateTime?
  failed_at                   DateTime?
  reconciled_at               DateTime?

  created_at                  DateTime @default(now())
  updated_at                  DateTime @updatedAt
}
```

## 3.4 Format `order_ngser`

Contrainte : unique, alphanumérique avec tirets, maximum 25 caractères.

Format recommandé :

```text
FRG-YYYY-SEQ-XXXXXX
```

Exemple :

```text
FRG-2026-042-A3F7B2
```

| Segment | Exemple | Longueur |
|---|---:|---:|
| Préfixe | `FRG` | 3 |
| Année | `2026` | 4 |
| Séquence jour | `042` | 3 |
| Suffixe UUID | `A3F7B2` | 6 |
| Séparateurs | `-` | 3 |
| Total | `FRG-2026-042-A3F7B2` | 19 |

## 3.5 Endpoint d’initiation paiement

Route recommandée :

```http
POST /api/paiements/initier
```

ou route plus explicite :

```http
POST /api/paiements/initier-ngser
```

Payload frontend minimal :

```json
{
  "dossier_id": "D-..."
}
```

Le frontend ne doit jamais envoyer le montant final.

Le backend doit :

1. Charger le dossier.
2. Vérifier son éligibilité au paiement.
3. Calculer le montant réel.
4. Appliquer les réductions légitimes.
5. Générer `order_ngser`.
6. Appeler NGSER `POST /v3/sessions`.
7. Stocker `payment_token_ngser`, `order_ngser`, `montant_initie_xof`, `statut = PENDING`.
8. Retourner `payment_url`.

## 3.6 Paramètres envoyés à NGSER

```json
{
  "name": "NGSER_NAME",
  "authentication_token": "NGSER_AUTH_TOKEN",
  "currency": "xof",
  "operation_token": "NGSER_OPERATION_TOKEN_PAIEMENT",
  "order": "FRG-2026-042-A3F7B2",
  "transaction_amount": 100000
}
```

## 3.7 Réponse attendue NGSER

```json
{
  "payment_token": "...",
  "payment_url": "https://...",
  "expired_url": "https://..."
}
```

---

# 4. IPN NGSER — RM-158 à RM-161

## 4.1 Règle la plus importante

L’IPN doit répondre HTTP 200 immédiatement, avant la logique métier.

Raison : si FORGES ne répond pas rapidement, NGSER peut considérer l’IPN comme échoué et retenter, ce qui augmente le risque de double traitement.

## 4.2 Endpoint canonique

Le `.env` v4.9 donne :

```text
NGSER_NOTIFICATION_URL=https://api.forges-group.com/webhooks/paiement
```

Donc l’endpoint canonique devrait être :

```http
POST /webhooks/paiement
```

Compatibilité possible avec l’ancien endpoint v4.8 :

```http
POST /api/paiements/webhook
```

Décision recommandée :

- implémenter `/webhooks/paiement` comme route canonique v4.9 ;
- garder `/api/paiements/webhook` comme alias temporaire pour Newman/v4.8 si nécessaire.

## 4.3 Séquence obligatoire

```js
router.post('/webhooks/paiement', async (req, res) => {
  // 1. Réponse immédiate
  res.status(200).json({ received: true });

  // 2. Traitement asynchrone sécurisé
  processIpn(req.body).catch(async (error) => {
    await auditLogger.error('IPN_TRAITEMENT_ERREUR', {
      message: error.message,
      order_id: req.body?.order_id,
    });
  });
});
```

Le traitement métier doit ensuite :

1. Extraire `order_id`, `status`, `code`, `transaction_amount`, `wallet`.
2. Chercher le paiement par `order_ngser`.
3. Si paiement inconnu : log warning, ne rien valider.
4. Si paiement déjà `PAYE`, `ANNULE` ou `ECHOUE` : log `IPN_IDEMPOTENCE`, ne rien refaire.
5. Comparer `transaction_amount` avec `montant_initie_xof`.
6. Si montant différent : paiement `ECHOUE`, dossier `ANNULE`, log `IPN_MONTANT_INVALIDE`.
7. Appliquer le mapping RM-160.
8. Mettre à jour paiement + dossier.
9. Calculer commissions partenaire/apporteur si succès.
10. Notifier l’apprenant si nécessaire.

## 4.4 Mapping statuts NGSER → FORGES

| Code NGSER | Status NGSER | Paiement FORGES | Dossier FORGES | Action |
|---:|---|---|---|---|
| `1` | `SUCCESS` | `PAYE` | `PAYE` | Calcul commissions |
| `0` | `FAIL` | `ECHOUE` | `ANNULE` | Notification apprenant |
| `5` | `FAIL` | `ECHOUE` | `ANNULE` | Client a annulé ou non finalisé |
| `4` | `FAIL` / HTTP 404 | `ECHOUE` | selon contexte, généralement `ANNULE` | Alerte Admin ERROR |
| `3` | `PENDING` | `PENDING` ou `PENDING_NGSER` | Inchangé | Scheduler prend le relais |
| autre | inconnu | `PENDING` ou `PENDING_NGSER` | Inchangé | Warning + scheduler |

## 4.5 Statut interne recommandé

Pour éviter l’ambiguïté avec d’autres paiements `PENDING`, utiliser un statut explicite :

```text
PENDING_NGSER
```

Si l’énumération actuelle ne permet que `PENDING`, documenter que `provider = NGSER` distingue ces paiements.

## 4.6 Vérification anti-fraude du montant

Règle :

```js
if (Number(transaction_amount) !== Number(paiement.montant_initie_xof)) {
  await paiementRepo.update(paiement.id, { statut: 'ECHOUE' });
  await dossierRepo.update(paiement.dossier_id, { statut: 'ANNULE' });
  await auditLogger.error('IPN_MONTANT_INVALIDE', {
    order_ngser,
    montant_recu: transaction_amount,
    montant_initie: paiement.montant_initie_xof,
  });
  return;
}
```

Test obligatoire :

- initialiser un paiement de `100000 XOF` ;
- envoyer un IPN `SUCCESS` avec `transaction_amount = 1` ;
- attendu : paiement `ECHOUE`, dossier `ANNULE`, aucun passage à `PAYE`, log `IPN_MONTANT_INVALIDE`.

---

# 5. ReconciliationScheduler — RM-159

## 5.1 Pourquoi il est critique

Sans réconciliation, un paiement peut rester bloqué indéfiniment si :

- l’IPN n’arrive jamais ;
- le serveur redémarre pendant le traitement ;
- un timeout réseau interrompt le callback ;
- NGSER a bien encaissé, mais FORGES n’a pas clôturé.

## 5.2 Déclaration au démarrage serveur

Le scheduler doit être enregistré au démarrage du serveur, pas seulement en production.

Exemple :

```js
const cron = require('node-cron');
const { reconciliationScheduler } = require('../modules/paiements/reconciliation.scheduler');

const interval = Number(process.env.NGSER_RECONCILIATION_PENDING_MINUTES ?? 30);

cron.schedule(`*/${interval} * * * *`, () => {
  reconciliationScheduler.run().catch(error => {
    auditLogger.error('RECONCILIATION_ERREUR', { message: error.message });
  });
});
```

## 5.3 Algorithme attendu

1. Chercher les paiements :
   - `provider = 'NGSER'`
   - statut `PENDING` ou `PENDING_NGSER`
   - `created_at` ou `initiated_at` plus ancien que `NGSER_RECONCILIATION_PENDING_MINUTES`
2. Pour chaque paiement :
   - récupérer un `auth_token` auprès de NGSER ;
   - appeler l’endpoint de vérification de statut ;
   - appliquer exactement la même logique que l’IPN : idempotence, intégrité montant, mapping statut, commissions, logs.
3. Logger `RECONCILIATION_TRIGGERED`.
4. Logger `RECONCILIATION_PAIEMENT_CLOS` pour chaque paiement clôturé.

## 5.4 Incohérence à arbitrer dans les documents

Les specs indiquent :

```text
POST /service/auth
POST /check_payment_status/{order}
```

L’addendum indique :

```text
GET {NGSER_BASE_URL}/v3/sessions/status?order_id=...
```

Décision à prendre avant développement :

- vérifier la documentation NGSER réelle ;
- choisir l’endpoint officiel ;
- figer ce choix dans `paiement-ngser.client.js` ;
- écrire un test contractuel avec mock NGSER.

## 5.5 Incohérence de nom de variable

Les specs utilisent :

```text
NGSER_RECONCILIATION_PENDING_MINUTES
```

L’addendum utilise parfois :

```text
NGSER_RECONCILIATION_PENDING_MIN
```

Décision recommandée :

- utiliser `NGSER_RECONCILIATION_PENDING_MINUTES` comme nom canonique ;
- accepter temporairement `NGSER_RECONCILIATION_PENDING_MIN` en fallback si déjà présent.

```js
const pendingMinutes =
  Number(process.env.NGSER_RECONCILIATION_PENDING_MINUTES)
  || Number(process.env.NGSER_RECONCILIATION_PENDING_MIN)
  || 30;
```

---

# 6. Credentials de livraison — RM-152 à RM-154

## 6.1 Formations à la demande

Pour les formations à la demande livrées par partenaire externe :

- l’URL réelle est chiffrée en base avec AES-256 ;
- l’apprenant ne reçoit jamais cette URL directement ;
- FORGES expose un proxy d’accès ;
- le proxy valide le droit d’accès ;
- le proxy déchiffre l’URL à la volée ;
- le proxy redirige vers le contenu réel.

## 6.2 Service recommandé

```text
backend/src/modules/acces/proxy-acces-formation.service.js
```

Responsabilités :

1. Vérifier que l’utilisateur est authentifié.
2. Vérifier que l’utilisateur possède un `AccesFormationDemande` actif.
3. Charger l’URL chiffrée.
4. Déchiffrer avec `AES_SECRET_KEY`.
5. Journaliser l’accès sans URL réelle.
6. Rediriger.

## 6.3 Endpoint recommandé

```http
GET /api/formations-demande/:id/acceder
```

ou

```http
GET /api/acces-formations/:accesId/proxy
```

## 6.4 Interdictions absolues

L’URL ou les credentials ne doivent jamais apparaître :

- dans le HTML ;
- dans les logs ;
- dans les réponses API ;
- dans les exports CSV ;
- dans les exports PDF ;
- dans Swagger ;
- dans les erreurs serveur.

## 6.5 Formations avec session

Pour les formations avec session :

- FORGES ne stocke pas forcément les credentials finaux de session ;
- le partenaire fournit les credentials dans les 24h après confirmation du paiement ;
- FORGES notifie automatiquement le partenaire dès que le dossier passe `PAYE` ;
- FORGES trace l’horodatage de notification partenaire.

Log recommandé :

```text
NOTIFICATION_PARTENAIRE_CREDENTIALS_ENVOYEE
```

---

# 7. Export CSV Partenaire — RM-155

## 7.1 Objectif

Permettre au partenaire d’exporter la liste de ses apprenants actifs sans exposer de données personnelles directes.

## 7.2 Endpoint

```http
GET /api/partenaire/export-csv
```

## 7.3 Colonnes autorisées

```csv
identifiant_anonymise,
formation_intitule,
activation_confirmee_le,
statut_acces,
certification_obtenue,
url_verification_certificat,
langue_formation
```

## 7.4 Données interdites

Le CSV ne doit jamais contenir :

- `apprenant_id`
- email
- nom
- prénom
- téléphone
- date de naissance
- identifiant légal
- credentials
- URL réelle de formation
- `paiement_id`
- données d’un autre partenaire

## 7.5 Génération HMAC

Règle :

```js
const identifiant = hmacSha256(
  `${apprenant_id}:${partenaire_id}`,
  process.env.HMAC_ANONYMISATION_SEL
);
```

Pour obtenir un format UUID stable, deux options :

Option A — garder le HMAC hexadécimal complet.

Option B — convertir le HMAC en pseudo-UUID.

Décision recommandée : respecter le libellé `UUID distinct` si le frontend ou le CSV attend un UUID ; sinon documenter que `identifiant_anonymise` est un identifiant stable non réversible.

## 7.6 Tests obligatoires

| Test | Attendu |
|---|---|
| Export partenaire A | Ne contient que ses apprenants |
| Même apprenant + même partenaire | Même `identifiant_anonymise` |
| Même apprenant + partenaire différent | Identifiant différent |
| Recherche PII dans CSV | Aucun email, nom, prénom, téléphone |
| Credential dans CSV | Aucun |
| HMAC sel absent | Erreur de config au démarrage, pas génération silencieuse |

---

# 8. Variables d’environnement — RM-156 / RM-162

## 8.1 Principe d’architecture

Toute constante métier globale doit venir du `.env`.

Interdit :

```js
const commission = partenaire.commission_forges_pct ?? 30;
const delai = 72;
```

Correct :

```js
const commission = partenaire.commission_forges_pct
  ?? Number(process.env.COMMISSION_FORGES_DEFAULT_PCT);

const delai = Number(process.env.PAIEMENT_EXPIRATION_HEURES);
```

## 8.2 Variables `.env` v4.9

```bash
# BASE DE DONNEES
DATABASE_URL=postgresql://user:pass@localhost:5432/forges

# AUTHENTIFICATION
JWT_SECRET=secret_256bits_min_32_chars
JWT_REFRESH_SECRET=secret_256bits_min_32_chars

# COMMISSIONS
COMMISSION_FORGES_DEFAULT_PCT=30
COMMISSION_APPORTEUR_DEFAULT_PCT=5

# SEUILS DE REVERSEMENT
SEUIL_REVERSEMENT_PARTENAIRE_XOF=50000
SEUIL_REVERSEMENT_APPORTEUR_XOF=5000

# ABONNEMENTS ET ESSAIS
ESSAI_GRATUIT_DUREE_JOURS=30
OFFRE_BIENVENUE_REDUCTION_PCT=20
OFFRE_BIENVENUE_DELAI_JOURS=25

# PAIEMENTS ET GRACE
PAIEMENT_EXPIRATION_HEURES=72
GRACE_PERIOD_ABONNEMENT_HEURES=48
SUSPENSION_MAX_PAR_TRIMESTRE=1
SUSPENSION_MAX_DUREE_JOURS=30

# FORMATIONS
ACCES_FORMATION_DEMANDE_DUREE_JOURS=365
IMPORT_ASYNC_SEUIL_APPRENANTS=500

# BOT CONSEILLER
BOT_UPGRADE_COOLDOWN_JOURS=7
BOT_UPGRADE_TAUX_DECLENCHEMENT_PCT=80
BOT_FEEDBACK_VOUCHERS_UTILISES_PCT=80

# VALIDATION PARTENAIRES
VALIDATION_FORMATION_DELAI_JOURS=5
VALIDATION_FORMATION_ESCALADE_JOURS=10
INVITATION_PARTENAIRE_TOKEN_EXPIRATION_HEURES=48

# SECURITE DONNEES — NE JAMAIS LOGGER
AES_SECRET_KEY=secret_256_bits_base64
HMAC_ANONYMISATION_SEL=secret_256_bits

# GATEWAY MONETIQUE NGSER — NE JAMAIS LOGGER
NGSER_BASE_URL=https://securetest.crossroad-africa.net/
NGSER_NAME=FORGES TEST
NGSER_AUTH_TOKEN=secret_ngser
NGSER_OPERATION_TOKEN_PAIEMENT=secret_operation
NGSER_NOTIFICATION_URL=https://api.forges-group.com/webhooks/paiement
NGSER_REDIRECT_URL=https://app.forges-group.com/paiement/retour
NGSER_RECONCILIATION_PENDING_MINUTES=30

# ENVIRONNEMENT
NODE_ENV=development
```

## 8.3 Correction importante

En v4.8, certains documents indiquaient une commission FORGES par défaut à `20`.

En v4.9, la valeur correcte est :

```bash
COMMISSION_FORGES_DEFAULT_PCT=30
```

Donc vérifier :

- `.env.dev`
- `.env.test`
- `.env.demo`
- `.env.production`
- `.env.example`
- les valeurs hardcodées dans le code

## 8.4 Variables sensibles à masquer

Ne jamais logger :

```text
NGSER_AUTH_TOKEN
NGSER_OPERATION_TOKEN_PAIEMENT
AES_SECRET_KEY
HMAC_ANONYMISATION_SEL
JWT_SECRET
JWT_REFRESH_SECRET
authentication_token
operation_token
```

---

# 9. Audit / logs MT-01 à ajouter

## 9.1 Événements NGSER

| Événement | Niveau | Déclencheur |
|---|---|---|
| `PAIEMENT_NGSER_INITIE` | INFO | Session NGSER créée |
| `PAIEMENT_NGSER_INIT_ECHEC` | ERROR | Timeout ou erreur API NGSER |
| `IPN_RECU` | INFO | Callback reçu |
| `IPN_MONTANT_INVALIDE` | ERROR | Montant reçu différent du montant initialisé |
| `IPN_IDEMPOTENCE` | WARNING | IPN reçu pour transaction déjà clôturée |
| `IPN_CODE_INCONNU` | WARNING | Code non reconnu |
| `PAIEMENT_CONFIRME` | INFO | Paiement confirmé |
| `PAIEMENT_ECHOUE` | ERROR | Paiement échoué |
| `RECONCILIATION_TRIGGERED` | INFO | Scheduler lancé |
| `RECONCILIATION_PAIEMENT_CLOS` | INFO | Paiement clôturé par scheduler |
| `COMMISSION_PARTENAIRE_CALCULEE` | INFO | Commission partenaire calculée |
| `COMMISSION_APPORTEUR_GENEREE` | INFO | Commission apporteur générée |

## 9.2 Événements Devis

| Événement | Niveau | Déclencheur |
|---|---|---|
| `DEVIS_CREE` | INFO | Création devis |
| `DEVIS_PAYE` | INFO | Passage en payé |
| `DEVIS_ANNULE` | WARNING | Annulation manuelle |

## 9.3 Événements CSV / credentials

| Événement | Niveau | Déclencheur |
|---|---|---|
| `CSV_PARTENAIRE_EXPORTE` | INFO | Export CSV partenaire |
| `PROXY_ACCES_FORMATION` | INFO | Accès via proxy |
| `PROXY_ACCES_REFUSE` | WARNING | Accès non autorisé |
| `NOTIFICATION_PARTENAIRE_CREDENTIALS_ENVOYEE` | INFO | Partenaire notifié après paiement |

---

# 10. Masquage des secrets dans `AuditLogger`

## 10.1 Liste de clés à masquer

```js
const SECRETS_A_MASQUER = [
  'NGSER_AUTH_TOKEN',
  'NGSER_OPERATION_TOKEN_PAIEMENT',
  'AES_SECRET_KEY',
  'HMAC_ANONYMISATION_SEL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'authentication_token',
  'operation_token',
  'payment_token',
  'payment_token_ngser',
  'auth_token',
  'contenu_video_url',
  'url_reelle',
  'credentials',
];
```

## 10.2 Fonction de masquage récursive recommandée

```js
function masquerSecrets(value) {
  if (Array.isArray(value)) {
    return value.map(masquerSecrets);
  }

  if (value && typeof value === 'object') {
    const clean = {};

    for (const [key, val] of Object.entries(value)) {
      if (SECRETS_A_MASQUER.includes(key)) {
        clean[key] = '[MASQUE]';
      } else {
        clean[key] = masquerSecrets(val);
      }
    }

    return clean;
  }

  return value;
}
```

## 10.3 Règle

Appeler `masquerSecrets()` avant chaque :

```js
auditLogger.info(...)
auditLogger.warn(...)
auditLogger.error(...)
console.log(...)
console.error(...)
```

En production, éviter de logger `req.body` complet.

---

# 11. UCS modifiés ou ajoutés

## 11.1 UCS09 — Paiements

Mis à jour pour intégrer NGSER : initiation session, redirection `payment_url`, IPN authoritative, scheduler de réconciliation, vérification montant, mapping statut, calcul commissions, paiement manuel Agent Comptable possible.

## 11.2 UCS13 — Configuration Admin

Mis à jour pour distinguer valeurs globales dans `.env` et surcharges par entité en base.

Exemple :

```js
const commission = partenaire.commission_forges_pct
  ?? Number(process.env.COMMISSION_FORGES_DEFAULT_PCT);
```

## 11.3 UCS14 — Formation à la demande

Mis à jour pour intégrer URL externe partenaire chiffrée, accès via proxy FORGES et aucune exposition de l’URL réelle.

## 11.4 UCS17 — Espace Partenaire

Mis à jour pour intégrer l’export CSV anonymisé.

## 11.5 UCS18 — Validation formation partenaire

Mis à jour pour intégrer collecte / validation des URLs de contenu partenaire et chiffrement AES-256 avant stockage.

## 11.6 UCS21 — Gestion des Devis

Nouveau cas d’utilisation : création devis, annulation manuelle, paiement manuel, notifications, création manuelle B2B + vouchers après paiement.

---

# 12. Fichiers backend à créer ou modifier

## 12.1 Paiements NGSER

```text
backend/src/modules/paiements/ngser.client.js
backend/src/modules/paiements/paiement-ngser.service.js
backend/src/modules/paiements/ipn.controller.js
backend/src/modules/paiements/reconciliation.scheduler.js
backend/src/modules/paiements/paiement.routes.js
backend/src/modules/paiements/paiement.controller.js
```

## 12.2 Devis

```text
backend/src/modules/devis/devis.service.js
backend/src/modules/devis/devis.controller.js
backend/src/modules/devis/devis.routes.js
backend/src/modules/devis/devis.repository.js
```

## 12.3 Export CSV partenaire

```text
backend/src/modules/partenaires/export-csv.service.js
backend/src/modules/partenaires/export-csv.controller.js
```

## 12.4 Proxy accès formation

```text
backend/src/modules/formations/proxy-acces-formation.service.js
backend/src/modules/formations/proxy-acces-formation.controller.js
```

## 12.5 Transversal sécurité / audit

```text
backend/src/modules/transversal/audit-logger.service.js
backend/src/modules/transversal/crypto.service.js
backend/src/shared/schedulers.js
backend/src/config/env.validation.js
```

## 12.6 Prisma

```text
backend/prisma/schema.prisma
backend/prisma/migrations/...
backend/seed_for_test.js
```

---

# 13. Fichiers frontend à créer ou modifier

## 13.1 Devis

```text
frontend/src/pages/admin/DevisList.jsx
frontend/src/pages/admin/DevisForm.jsx
frontend/src/pages/admin/DevisDetail.jsx
frontend/src/services/devisApi.js
```

## 13.2 Paiement NGSER

```text
frontend/src/pages/paiements/NGSERPayment.jsx
frontend/src/pages/paiements/PaiementRetour.jsx
frontend/src/services/paiementApi.js
```

## 13.3 Partenaire export

```text
frontend/src/pages/partenaire/ExportCSV.jsx
frontend/src/services/partenaireApi.js
```

## 13.4 Formation à la demande

```text
frontend/src/pages/apprenant/FormationsDemande.jsx
frontend/src/services/accesFormationApi.js
```

---

# 14. Tests obligatoires v4.9

## 14.1 P0 — Paiement NGSER

| Test | Attendu |
|---|---|
| Initiation backend | `payment_url` reçu, `payment_token` stocké |
| Montant frontend falsifié | Ignoré ou refusé |
| IPN SUCCESS montant correct | Paiement `PAYE`, dossier `PAYE` |
| IPN SUCCESS montant invalide | Paiement `ECHOUE`, dossier `ANNULE`, log ERROR |
| IPN FAIL code 0 | Paiement `ECHOUE`, dossier `ANNULE` |
| IPN FAIL code 5 | Paiement `ECHOUE`, dossier `ANNULE` |
| IPN code 4 | Paiement `ECHOUE`, alerte Admin |
| IPN PENDING | Paiement reste `PENDING` |
| IPN inconnu | Warning, paiement reste `PENDING` |
| IPN doublon | HTTP 200, aucune double action |
| Paiement déjà PAYE | HTTP 200, ignoré |
| Paiement inconnu | HTTP 200, warning |
| Timeout NGSER init | Aucun paiement confirmé, log ERROR |

## 14.2 P0 — Réconciliation

| Test | Attendu |
|---|---|
| Scheduler enregistré au démarrage | Log après 1 cycle |
| Pending ancien success | Paiement `PAYE` |
| Pending ancien fail | Paiement `ECHOUE` |
| Pending récent | Ignoré |
| NGSER indisponible | Reste `PENDING`, log ERROR |
| Montant différent au check status | Paiement `ECHOUE`, log `IPN_MONTANT_INVALIDE` |
| Paiement déjà PAYE | Ignoré |

## 14.3 P0 — Secrets / logs

| Test | Attendu |
|---|---|
| Grep `NGSER_AUTH_TOKEN` logs | Aucun résultat |
| Grep `authentication_token` logs | Aucun résultat |
| Grep `AES_SECRET_KEY` logs | Aucun résultat |
| Grep `HMAC_ANONYMISATION_SEL` logs | Aucun résultat |
| Erreur NGSER | Logs utiles mais sans secret |
| Log IPN | Contient `order_id`, statut, wallet, montant, mais pas token |

## 14.4 P0 — Export CSV

| Test | Attendu |
|---|---|
| Export partenaire | CSV généré |
| PII absente | Aucun email/nom/prénom/téléphone |
| `apprenant_id` absent | OK |
| HMAC stable | Même apprenant/partenaire = même identifiant |
| HMAC isolé | Même apprenant/autre partenaire = autre identifiant |
| Credentials absents | OK |
| Colonnes strictes | Seulement colonnes autorisées |

## 14.5 P0 — Proxy AES

| Test | Attendu |
|---|---|
| URL stockée | Chiffrée en base |
| Page HTML | Pas d’URL réelle |
| Réponse API | Pas d’URL réelle |
| Logs | Pas d’URL réelle |
| Accès autorisé | Redirection proxy OK |
| Accès non autorisé | 403 + log warning |
| AES key absente | Erreur config au démarrage |

## 14.6 P1 — Devis

| Test | Attendu |
|---|---|
| Création devis | Numéro auto, statut `CREE` |
| Montant total | `nb_places × tarif_unitaire_xof` |
| Annuler devis `CREE` | Statut `ANNULE`, `cancelled_at` |
| Annuler devis `PAYE` | Refus |
| Marquer payé | Statut `PAYE`, `paid_at` |
| Devis payé | Notification organisation |
| Après paiement | Pas de génération automatique B2B/vouchers |
| Logs | `DEVIS_CREE`, `DEVIS_PAYE`, `DEVIS_ANNULE` |

## 14.7 P1 — Variables `.env`

| Test | Attendu |
|---|---|
| `COMMISSION_FORGES_DEFAULT_PCT=30` | Présent dans tous les environnements |
| `commission_forges_pct=null` | Fallback `.env` |
| Valeur partenaire définie | Surcharge `.env` |
| Valeur codée en dur | Aucune occurrence |
| `.env.example` | Complet |
| Secrets prod | Non commités |

---

# 15. Incohérences ou points à clarifier avant développement

## 15.1 Endpoint réconciliation NGSER

Deux versions apparaissent :

- Specs : `POST /service/auth` puis `POST /check_payment_status/{order}`
- Addendum : `GET /v3/sessions/status?order_id=...`

Action : valider avec la documentation NGSER réelle, figer dans `ngser.client.js`, écrire des tests autour de l’API choisie.

## 15.2 Variable `NGSER_RECONCILIATION_PENDING_MINUTES`

Deux noms apparaissent :

- `NGSER_RECONCILIATION_PENDING_MINUTES`
- `NGSER_RECONCILIATION_PENDING_MIN`

Action : choisir `NGSER_RECONCILIATION_PENDING_MINUTES` comme canonique, fallback temporaire sur l’ancien nom.

## 15.3 Statut `PENDING` ou `PENDING_NGSER`

Les specs parlent plutôt de `PENDING`, l’addendum utilise `PENDING_NGSER`.

Action : si enum existante flexible, ajouter `PENDING_NGSER`; sinon garder `PENDING` + `provider='NGSER'`.

## 15.4 Route IPN

Deux routes peuvent coexister :

- v4.9 `.env` : `/webhooks/paiement`
- v4.8 existant : `/api/paiements/webhook`

Action : route canonique v4.9 `/webhooks/paiement`; alias legacy possible `/api/paiements/webhook`.

## 15.5 Rôle de confirmation paiement Devis

Le texte indique que l’Agent Comptable confirme la réception du paiement, mais que l’Admin passe manuellement le devis en `PAYE`.

Action : implémentation stricte = Agent Comptable confirme, Admin finalise ; implémentation simplifiée = `ADMIN` et `AGENT_COMPTABLE` peuvent appeler `PATCH /payer`, mais logguer l’acteur.

## 15.6 Consultation devis par Organisation

La matrice mentionne lecture organisation, mais UCS21 dit que cela peut être hors scope v4.9.

Action : décider explicitement si `GET /api/organisation/devis` est inclus v4.9 ou reporté v4.10.

---

# 16. Ordre d’implémentation recommandé

## J1 — Baseline + migration

1. Vérifier v4.8 stable.
2. Backup/restore staging.
3. Ajouter champs Prisma : `Devis`, `StatutDevis`, champs NGSER dans `Paiement`, champs credentials chiffrés si absents.
4. Ajouter `.env.example`.
5. Migration + rollback.

## J2 — Devis + env config

1. Service Devis.
2. Routes Devis.
3. Tests Devis.
4. Validation `.env`.
5. Commission par défaut à 30.

## J3 — Initiation NGSER

1. `ngser.client.js`.
2. `paiement-ngser.service.js`.
3. Endpoint initiation.
4. Stockage `payment_token`, `order_ngser`, `montant_initie_xof`.
5. Tests initiation.

## J4 — IPN

1. Endpoint `/webhooks/paiement`.
2. HTTP 200 immédiat.
3. Traitement async.
4. Idempotence.
5. Vérification montant.
6. Mapping statuts.
7. Tests IPN.

## J5 — Réconciliation + secrets

1. `reconciliation.scheduler.js`.
2. Enregistrement au startup serveur.
3. Tests pending.
4. Masquage secrets.
5. Grep logs.

## J6 — CSV + proxy AES

1. Export CSV partenaire.
2. HMAC stable.
3. Proxy AES.
4. Tests PII.
5. Tests URL non exposée.

## J7 — Staging + Go/No-Go

1. Smoke tests.
2. Rejeu IPN success/fail/pending/doublon/montant invalide.
3. Rejeu réconciliation.
4. Export CSV réel.
5. Vérification logs/secrets.
6. Rapport final.

---

# 17. Checklist production-driven v4.9

## Go seulement si tous les P0 passent

| Domaine | Critère |
|---|---|
| Backup | Backup et restore testés |
| Migration | Rollback documenté et testé |
| NGSER initiation | `payment_url` reçu, montant stocké backend |
| IPN | HTTP 200 immédiat, idempotence, montant vérifié |
| Réconciliation | Scheduler actif et testé |
| Montant invalide | Bloqué même si status NGSER = SUCCESS |
| CSV | Aucune PII |
| Credentials | Aucune URL réelle exposée |
| Secrets | Aucun secret dans logs/repo/API |
| Commission | Défaut 30% partout |
| Logs | Diagnostic possible par `order_ngser` |
| Runbook | Incident paiement documenté |

---

# 18. Synthèse stratégique

La v4.9 n’est pas seulement une évolution fonctionnelle. Elle ajoute des risques de production réels :

1. Risque financier : montant falsifié, double IPN, double commission.
2. Risque opérationnel : paiement bloqué en `PENDING`.
3. Risque sécurité : secrets NGSER, AES, HMAC dans les logs.
4. Risque confidentialité : export CSV ou URL partenaire exposant des données sensibles.
5. Risque métier : devis payé sans création manuelle B2B/vouchers.
6. Risque configuration : anciennes valeurs v4.8, notamment commission à 20 au lieu de 30.

Le point le plus critique à traiter avant production est NGSER : initiation backend, IPN immédiat, idempotence, contrôle montant, réconciliation.
