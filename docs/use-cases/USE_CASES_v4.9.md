# FORGES v4.9 — Documentation complète des Use Cases

**Version:** 4.9  
**Date:** Mai 2026  
**Branch:** implementation-4.9  
**Status:** 11 UCS modifiés/ajoutés

---

## Table des matières

1. [UCS00 - Authentification & Autorisation](#ucs00)
2. [UCS01 - Gestion des Apprenants](#ucs01)
3. [UCS02 - Gestion des Organisations](#ucs02)
4. [UCS03 - Abonnements Retail/B2B](#ucs03)
5. [UCS04 - Formations & Sessions](#ucs04)
6. [UCS05 - Vouchers & Codes Promotionnels](#ucs05)
7. [UCS06 - Inscriptions Apprenants](#ucs06)
8. [UCS07 - Progression & Certificats](#ucs07)
9. [**UCS09 - Paiements (MODIFIÉ v4.9)**](#ucs09)
10. [UCS10 - Notifications](#ucs10)
11. [UCS11 - Rôles & Permissions](#ucs11)
12. [UCS12 - Audit & Logs](#ucs12)
13. [**UCS13 - Configuration Admin (MODIFIÉ v4.9)**](#ucs13)
14. [**UCS14 - Formations à la Demande (MODIFIÉ v4.9)**](#ucs14)
15. [UCS15 - Bot Conseiller (Intelligence Métier)](#ucs15)
16. [UCS16 - Bot Conseiller (Recommandations)](#ucs16)
17. [**UCS17 - Espace Partenaire Export (MODIFIÉ v4.9)**](#ucs17)
18. [**UCS18 - Validation Formation Partenaire (MODIFIÉ v4.9)**](#ucs18)
19. [**UCS21 - Gestion des Devis (NOUVEAU v4.9)**](#ucs21)

---

## UCS00 - Authentification & Autorisation

### Objectif
Sécuriser l'accès à l'application par JWT et gérer les rôles/permissions.

### Acteurs
- Administrateur
- Superviseur
- Agent Comptable
- Responsable Organisation
- Gestionnaire Organisation
- Apporteur d'Affaires
- Partenaire
- Apprenant

### Flux principal
1. Utilisateur se connecte (email + mot de passe)
2. Backend vérifie les credentials
3. Backend génère JWT + refresh token
4. Frontend stocke tokens en localStorage sécurisé
5. Frontend envoie JWT en header Authorization

### Points techniques
- **JWT Secret:** Min 32 caractères (env `JWT_SECRET`)
- **Expiration JWT:** À définir (recommandé: 1h)
- **Expiration Refresh:** À définir (recommandé: 7j)
- **Algorithme:** HS256
- **Rôles:** ADMIN, SUPERVISEUR, AGENT_COMPTABLE, RESPONSABLE, GESTIONNAIRE, APPORTEUR, PARTENAIRE, APPRENANT

### Middleware requis
```typescript
authenticate() // Vérifie JWT valide
authorize('ADMIN', 'SUPERVISEUR') // Vérifie rôle
```

### Sécurité
- ✅ Password hashing bcrypt
- ✅ Tokens en httpOnly cookie optionnel
- ✅ CORS configuré
- ✅ Rate limiting sur login

---

## UCS01 - Gestion des Apprenants

### Objectif
Enregistrer et gérer les apprenants (ex-Étudiants) dans le système.

### Acteurs
- Administrateur
- Organisation (création via import)
- Apprenant (auto-enregistrement)

### Entités
```prisma
model Apprenant {
  id                    String
  email                 String @unique
  nom                   String
  prenom                String
  telephone             String?
  date_naissance        DateTime?
  statut                String @default("ACTIF") // ACTIF, INACTIF, SUSPENDU
  organisation_id       String?
  organisation          Organisation?
  langue_preferee       String @default("FR") // FR, EN
  created_at            DateTime @default(now())
}
```

### Flux CRUD
1. **Création:** Email, nom, prénom requis
2. **Lecture:** Apprenant peut lire son profil
3. **Modification:** Apprenant modifie son profil
4. **Suppression:** Soft delete (statut INACTIF)

### Essai gratuit
- **Durée:** 30 jours (env `ESSAI_GRATUIT_DUREE_JOURS`)
- **Activation:** Auto à création
- **Expiration:** Automat après 30j sans paiement

### Validations
- Email format valide
- Nom/Prénom min 2 caractères
- Téléphone format local

---

## UCS02 - Gestion des Organisations

### Objectif
Gérer les organisations B2B (écoles, entreprises, ONG, etc.).

### Types d'organisations
- **ECOLE:** Établissement d'enseignement
- **ENTREPRISE:** Organisme privé
- **ONG:** Association/fondation
- **PARTENAIRE:** Fournisseur de contenu

### Entités
```prisma
model Organisation {
  id                    String
  nom                   String @unique
  type                  String // ECOLE, ENTREPRISE, ONG, PARTENAIRE
  email_contact         String
  adresse               String?
  pays                  String
  statut                String @default("ACTIF") // ACTIF, SUSPENDU, FERMEE
  commission_forges_pct Int? // Surcharge globale
  created_at            DateTime @default(now())
}
```

### Responsable Organisation
```prisma
model ResponsableOrganisation {
  id                    String
  organisation_id       String
  utilisateur_id        String // Lien Auth
  role                  String // RESPONSABLE ou GESTIONNAIRE
  created_at            DateTime @default(now())
}
```

### Flux
1. Admin crée organisation
2. Admin ajoute responsable (email) → Invitation
3. Responsable accepte invitation → Création compte
4. Responsable gère apprenants/formations de l'orga

---

## UCS03 - Abonnements Retail/B2B

### Objectif
Gérer 3 types d'abonnements: Retail, B2B Premium, B2B Standard, B2B Sur Devis.

### Types
| Type | Qui | Durée | Tarification | Renouvellement |
|------|-----|-------|--------------|----------------|
| **RETAIL** | Apprenant indiv | 1 mois | Au panier | Manuel |
| **B2B_PREMIUM** | Organisation | 1 an | Facturé upfront | Manuel |
| **B2B_STANDARD** | Organisation | 1 an | Facturé upfront | Manuel |
| **B2B_SUR_DEVIS** | Org gde compte | Variable | Devis signé | Manuel (v4.9) |

### Entités
```prisma
model AbonnementRetail {
  id                    String
  apprenant_id          String
  montant_xof           Int
  statut                String @default("ACTIF") // ACTIF, EXPIRE, ANNULE
  date_debut            DateTime
  date_fin              DateTime
  created_at            DateTime @default(now())
}

model AbonnementB2B {
  id                    String
  organisation_id       String
  type                  String // PREMIUM, STANDARD, SUR_DEVIS
  nb_places             Int
  montant_xof           Int
  statut                String @default("ACTIF")
  date_debut            DateTime
  date_fin              DateTime
  devis_id              String? // Lien si SUR_DEVIS (v4.9)
  created_at            DateTime @default(now())
}
```

### Règles métier
- Retail: Accès formations uniquement si abonnement actif
- B2B: Créer vouchers après paiement
- B2B_SUR_DEVIS: Création manuelle après paiement devis (v4.9)
- Essai auto 30j pour nouvel apprenant

### Notifications
- Email activation abonnement
- Email 7j avant expiration
- Email expiration

---

## UCS04 - Formations & Sessions

### Objectif
Créer et gérer formations et sessions associées.

### Entités
```prisma
model Formation {
  id                    String
  titre                 String
  description           String?
  type                  String // STANDARD, SUR_DEMANDE
  statut                String @default("ACTIVE") // ACTIVE, INACTIVE, SUSPENDUE
  prix_catalogue_xof    Int
  partenaire_id         String?
  url_contenu           String? // Chiffrée en v4.9 si SUR_DEMANDE
  langue                String @default("FR")
  created_at            DateTime @default(now())
}

model Session {
  id                    String
  formation_id          String
  titre                 String
  date_debut            DateTime
  date_fin              DateTime?
  statut                String // OUVERTE, INSCRIPTIONS_OUVERTES, EN_COURS, TERMINEE
  nb_places_max         Int?
  created_at            DateTime @default(now())
}
```

### Types de formations
- **STANDARD:** Session calendaire avec dates fixes
- **SUR_DEMANDE:** Accès immédiat via URL partenaire chiffrée (v4.9)

### Statuts session
- `OUVERTE`: Inscriptions possibles
- `INSCRIPTIONS_OUVERTES`: Phase de pré-inscription
- `EN_COURS`: Formation en cours
- `TERMINEE`: Archivée

---

## UCS05 - Vouchers & Codes Promotionnels

### Objectif
Générer des vouchers d'accès formations pour organisations B2B.

### Entités
```prisma
model Voucher {
  id                    String
  code                  String @unique
  type                  String // STANDARD, PREMIUM
  formation_id          String
  apprenant_id          String? // Assigné à apprenant
  organisation_id       String? // Assigné à org
  statut                String // DISPONIBLE, UTILISE, EXPIRE
  date_expiration       DateTime?
  cree_par              String // User ID admin
  created_at            DateTime @default(now())
}
```

### Flux
1. Admin crée abonnement B2B
2. Admin génère N vouchers pour la formation
3. Vouchers envoyés à organisation
4. Apprenant saisit code → Accès formation automatique

### Validations
- Code unique
- Pas doublon utilisateur/formation
- Expiration respect date_fin abonnement

---

## UCS06 - Inscriptions Apprenants

### Objectif
Gérer les inscriptions des apprenants à formations/sessions.

### Entités
```prisma
model Dossier {
  id                    String
  apprenant_id          String
  formation_id          String
  session_id            String?
  statut                String @default("EN_ATTENTE_VERIFICATION")
  // EN_ATTENTE_VERIFICATION, RETENU, REJETE, PAYE, ANNULE
  source_financement    String // ABONNEMENT, VOUCHER, etc.
  created_at            DateTime @default(now())
}
```

### Statuts dossier
| Statut | Signification |
|--------|---------------|
| `EN_ATTENTE_VERIFICATION` | Inscription créée, en attente vérification |
| `RETENU` | Apprenant accepté, paiement en attente |
| `REJETE` | Apprenant refusé |
| `PAYE` | Paiement confirmé, formation accessible |
| `ANNULE` | Dossier annulé |

### Flux
1. Apprenant clique "S'inscrire"
2. Dossier créé en `EN_ATTENTE_VERIFICATION`
3. Admin valide → `RETENU`
4. Paiement initié
5. Paiement confirmé → `PAYE`
6. Accès formation disponible

---

## UCS07 - Progression & Certificats

### Objectif
Tracker progression apprenant et délivrer certificats.

### Entités
```prisma
model ProgressionApprenant {
  id                    String
  dossier_id            String
  pourcentage           Int // 0-100
  date_debut            DateTime
  date_fin              DateTime?
  created_at            DateTime @default(now())
}

model Certificat {
  id                    String
  dossier_id            String
  code_certificat       String @unique
  date_emission         DateTime
  lien_verification     String
  created_at            DateTime @default(now())
}
```

### Flux certification
1. Apprenant complète 100% formation
2. Certificat généré automatiquement
3. Email notification apprenant + lien
4. Certificat consultable via URL publique + code

---

## UCS09 - Paiements (MODIFIÉ v4.9)

**🔴 NOUVEAU:** Support NGSER Gateway (Mobile Money)

### Objectif
Gérer les paiements via Gateway NGSER (MTN, Orange, Wave, Moov).

### Architecture paiement v4.9

```
┌─ Initiation backend
├─ Payment Token reçu
├─ Frontend redirigé vers payment_url
├─ Client effectue paiement Mobile Money
└─ IPN reçu (authoritative)
   ├─ HTTP 200 immédiat
   ├─ Traitement async
   ├─ Idempotence garantie
   ├─ Montant vérifié
   ├─ Mapping statuts appliqué
   └─ Scheduler réconciliation (J+30min si PENDING)
```

### Entités
```prisma
model Paiement {
  id                         String @id @default(uuid())
  dossier_id                 String? @unique
  montant_xof                Int
  statut                     String @default("EN_ATTENTE")
  // EN_ATTENTE, PENDING, PAYE, ECHOUE, ANNULE
  
  // NGSER v4.9
  provider                   String? // "NGSER"
  order_ngser                String? @unique // FRG-2026-042-A3F7B2
  payment_token_ngser        String?
  montant_initie_xof         Int?
  wallet_ngser               String?
  code_ngser                 Int?
  status_ngser               String?
  ngser_payload_last         Json?
  
  initiated_at               DateTime?
  confirmed_at               DateTime?
  failed_at                  DateTime?
  reconciled_at              DateTime?
  
  created_at                 DateTime @default(now())
  updated_at                 DateTime @updatedAt
}
```

### Flux d'initiation paiement

**Route:** `POST /api/paiements/initier`

```json
// Request (frontend)
{
  "dossier_id": "D-12345"
}

// Response (backend)
{
  "statusCode": 200,
  "data": {
    "order_ngser": "FRG-2026-042-A3F7B2",
    "payment_url": "https://secure-ngser.com/pay/token123",
    "montant_initie_xof": 100000
  }
}
```

**Logique backend:**
1. Charger dossier
2. Vérifier éligibilité (statut, pas doublon)
3. Calculer montant réel (avec réductions légitimes)
4. Générer `order_ngser` (FRG-YYYY-DDD-XXXXXX)
5. Appeler NGSER `/v3/sessions` avec:
   - `name`, `authentication_token`, `currency="xof"`
   - `operation_token`, `order`, `transaction_amount`
6. Stocker `payment_token_ngser`, `order_ngser`, `montant_initie_xof`
7. Statut paiement = `PENDING`
8. Retourner `payment_url` + `order_ngser`

### Endpoint IPN (v4.9)

**Route:** `POST /webhooks/paiement` (canonique v4.9)  
**Alias legacy:** `POST /api/paiements/webhook`

**Comportement CRITIQUE:**
```javascript
// ÉTAPE 1: Répondre HTTP 200 IMMÉDIATEMENT
res.status(200).json({ received: true });

// ÉTAPE 2: Traitement async sans bloquer
processIpn(req.body).catch(error => {
  auditLogger.error('IPN_TRAITEMENT_ERREUR', {
    message: error.message,
    order_id: req.body?.order_id
  });
});
```

**Traitement IPN (asynchrone):**

```javascript
async function processIpn(payload) {
  const { order_id, status, code, transaction_amount, wallet } = payload;
  
  // 1. Chercher paiement par order_ngser
  const paiement = await paiementRepo.findByOrderNgser(order_id);
  if (!paiement) {
    auditLogger.warn('IPN_PAIEMENT_INCONNU', { order_id });
    return;
  }
  
  // 2. Vérifier idempotence (déjà traité)
  if (['PAYE', 'ANNULE', 'ECHOUE'].includes(paiement.statut)) {
    auditLogger.info('IPN_IDEMPOTENCE', { order_id, current_statut: paiement.statut });
    return;
  }
  
  // 3. Vérifier montant (ANTI-FRAUDE)
  if (Number(transaction_amount) !== Number(paiement.montant_initie_xof)) {
    await paiementRepo.update(paiement.id, { statut: 'ECHOUE' });
    await dossierRepo.update(paiement.dossier_id, { statut: 'ANNULE' });
    auditLogger.error('IPN_MONTANT_INVALIDE', {
      order_ngser: order_id,
      montant_recu: transaction_amount,
      montant_initie: paiement.montant_initie_xof
    });
    return;
  }
  
  // 4. Appliquer mapping statuts RM-160
  const mapping = {
    '1': { paiement_statut: 'PAYE', dossier_statut: 'PAYE', action: 'calcul_commissions' },
    '0': { paiement_statut: 'ECHOUE', dossier_statut: 'ANNULE', action: 'notifier_apprenant' },
    '5': { paiement_statut: 'ECHOUE', dossier_statut: 'ANNULE', action: 'notifier_apprenant' },
    '3': { paiement_statut: 'PENDING', dossier_statut: 'RETENU', action: 'scheduler' },
    '4': { paiement_statut: 'ECHOUE', dossier_statut: 'ANNULE', action: 'alerte_admin' }
  };
  
  const action = mapping[code] || { paiement_statut: 'PENDING', dossier_statut: 'RETENU' };
  
  // 5. Mettre à jour statuts
  await paiementRepo.update(paiement.id, {
    statut: action.paiement_statut,
    code_ngser: code,
    status_ngser: status,
    wallet_ngser: wallet,
    confirmed_at: action.paiement_statut === 'PAYE' ? new Date() : undefined
  });
  
  await dossierRepo.update(paiement.dossier_id, {
    statut: action.dossier_statut
  });
  
  // 6. Si succès: calculer commissions
  if (action.paiement_statut === 'PAYE') {
    await calculerCommissions(paiement.dossier_id);
    auditLogger.info('PAIEMENT_CONFIRME', { order_ngser: order_id });
  }
  
  // 7. Notifier apprenant si nécessaire
  if (action.action === 'notifier_apprenant') {
    await emailService.envoyerNotification(...);
  }
}
```

### Mapping statuts NGSER → FORGES (RM-160)

| Code | Status | Paiement FORGES | Dossier FORGES | Action |
|------|--------|-----------------|----------------|--------|
| `1` | SUCCESS | `PAYE` | `PAYE` | ✅ Calcul commissions |
| `0` | FAIL | `ECHOUE` | `ANNULE` | 📧 Notifier apprenant |
| `5` | FAIL | `ECHOUE` | `ANNULE` | 📧 Annulation client |
| `3` | PENDING | `PENDING` | `RETENU` | ⏱️ Scheduler j+30min |
| `4` | ERROR | `ECHOUE` | `ANNULE` | 🚨 Alerte Admin |
| autre | UNKNOWN | `PENDING` | `RETENU` | ⚠️ Warning log |

### Réconciliation automatique (v4.9)

**Scheduler:** Chaque 30min (env `NGSER_RECONCILIATION_PENDING_MINUTES`)

```javascript
// Au démarrage serveur (app.ts)
const cron = require('node-cron');
const interval = Number(process.env.NGSER_RECONCILIATION_PENDING_MINUTES ?? 30);

cron.schedule(`*/${interval} * * * *`, () => {
  reconciliationScheduler.run().catch(error => {
    auditLogger.error('RECONCILIATION_ERREUR', { message: error.message });
  });
});
```

**Algorithme réconciliation:**

```javascript
async function reconcile() {
  auditLogger.info('RECONCILIATION_TRIGGERED');
  
  // 1. Chercher paiements PENDING trop vieux
  const paiements = await paiementRepo.findByConditions({
    provider: 'NGSER',
    statut: 'PENDING',
    created_at: { lt: Date.now() - 30 * 60 * 1000 }
  });
  
  for (const paiement of paiements) {
    // 2. Chercher statut réel auprès de NGSER
    const authToken = await ngserClient.authenticate();
    const status = await ngserClient.checkStatus(paiement.order_ngser, authToken);
    
    // 3. Appliquer logique IPN exactement
    await processIpn({
      order_id: paiement.order_ngser,
      status: status.status,
      code: status.code,
      transaction_amount: status.transaction_amount,
      wallet: status.wallet
    });
    
    auditLogger.info('RECONCILIATION_PAIEMENT_CLOS', {
      order_ngser: paiement.order_ngser,
      nouveau_statut: status.code
    });
  }
}
```

### Tests obligatoires UCS09

| Test | Attendu |
|------|---------|
| Initiation backend | `payment_url` + `order_ngser` retournés |
| Frontend ne peut pas forcer montant | Backend recalcule |
| IPN SUCCESS montant correct | Paiement `PAYE`, dossier `PAYE` |
| IPN SUCCESS montant invalide | Paiement `ECHOUE`, dossier `ANNULE`, log ERROR |
| IPN FAIL codes 0, 5 | Paiement `ECHOUE`, dossier `ANNULE` |
| IPN code 4 | Paiement `ECHOUE`, alerte Admin |
| IPN PENDING (code 3) | Paiement reste `PENDING`, attente scheduler |
| IPN doublon même order | HTTP 200, aucune double action |
| Paiement déjà PAYE + IPN | HTTP 200, ignoré (idempotence) |
| Timeout NGSER init | Log ERROR, paiement non créé |
| Scheduler active | Paiements anciens PENDING clôturés |

### Sécurité UCS09

- ✅ **Montant:** Jamais envoyé frontend, toujours recalculé backend
- ✅ **Idempotence:** IPN traitée max une fois (même `order_ngser`)
- ✅ **Secrets:** NGSER tokens jamais dans logs (masqués avant audit)
- ✅ **Anti-fraude:** Montant IPN vs montant initialisé vérifié
- ✅ **Atomicité:** Transaction paiement + dossier + commissions cohérents

---

## UCS10 - Notifications

### Objectif
Envoyer notifications email contextuelles aux acteurs.

### Canaux
- **Email primaire**
- **Notifications in-app (optionnel v4.9)**

### Types de notifications

| Événement | Destinataire | Template | Langue |
|-----------|--------------|----------|--------|
| Inscription confirmée | Apprenant | confirmation_dossier | Préférée |
| Paiement reçu | Apprenant | paiement_confirme | Préférée |
| Formation prête | Apprenant | acces_formation | Préférée |
| Certificat obtenu | Apprenant | certificat_genere | Préférée |
| Devis créé | Org | devis_cree | Préférée |
| Devis payé | Org | devis_paye | Préférée |
| Credentials reçues | Org/Partenaire | credentials_livraison | Préférée |
| Rapport CSV | Partenaire | export_csv | Préférée |

### Implémentation
- Service `EmailService`
- Templates Handlebars
- Queue Bullmq pour async
- Retry automtique 3x

---

## UCS11 - Rôles & Permissions

### Objectif
Gérer granularité des permissions par rôle.

### Matrice RBAC

| Rôle | Entités accessibles | Actions |
|------|-------------------|---------|
| **ADMIN** | Toutes | Create, Read, Update, Delete |
| **SUPERVISEUR** | Orga/Formations/Apprenants | Read, audit |
| **AGENT_COMPTABLE** | Paiements/Devis | Read, Update statut |
| **RESPONSABLE_ORGANISATION** | Propre orga | Read, Update |
| **GESTIONNAIRE_ORGANISATION** | Propre orga + apprenants | Read, Create apprenants |
| **APPORTEUR** | Stats commissions | Read |
| **PARTENAIRE** | Propre formation + export CSV | Read, export |
| **APPRENANT** | Propre profil/dossier | Read, Update profil |

### Middleware
```typescript
authorize('ADMIN', 'SUPERVISEUR') // Requires one of listed roles
authorizeSingleRole('ADMIN') // Requires exactly this role
authorizeOwnerOrAdmin() // Own resource or ADMIN
```

---

## UCS12 - Audit & Logs

### Objectif
Tracer tous les événements importants pour compliance et debug.

### Événements à logger (MT-01)

**Format standard:**
```json
{
  "timestamp": "2026-05-05T14:30:00Z",
  "event": "EVENT_NAME",
  "user_id": "user123",
  "role": "ADMIN",
  "resource": "Dossier",
  "resource_id": "dossier456",
  "action": "UPDATE",
  "status": "SUCCESS",
  "details": { /* contexte */ },
  "ip": "192.168.1.1"
}
```

### Événements critiques

| Événement | Niveau | Contexte |
|-----------|--------|----------|
| LOGIN | INFO | Email, IP, timestamp |
| LOGIN_FAIL | WARN | Email, raison |
| LOGOUT | INFO | User ID |
| DOSSIER_CREE | INFO | User ID, formation |
| DOSSIER_STATUT_CHANGE | INFO | Ancien → nouveau statut |
| PAIEMENT_INITIE | INFO | order_ngser, montant |
| PAIEMENT_CONFIRME | INFO | order_ngser, code NGSER |
| PAIEMENT_ECHOUE | ERROR | order_ngser, code, raison |
| DEVIS_CREE | INFO | devis ID, montant |
| DEVIS_PAYE | INFO | devis ID |
| ADMIN_CONFIG_CHANGE | INFO | param, ancienne → nouvelle valeur |
| SECURITE_TENTATIVE_FRAUD | ERROR | Détails tentative |

### Masquage des secrets (MT-01)

**Secrets à JAMAIS logger:**
```
NGSER_AUTH_TOKEN
NGSER_OPERATION_TOKEN
AES_SECRET_KEY
HMAC_ANONYMISATION_SEL
JWT_SECRET
JWT_REFRESH_SECRET
payment_token
authentication_token
credentials
```

**Fonction de masquage:**
```typescript
function maskSecrets(data: any): any {
  const MASK_KEYS = [
    'NGSER_AUTH_TOKEN',
    'authentication_token',
    'payment_token',
    'AES_SECRET_KEY',
    'HMAC_ANONYMISATION_SEL'
  ];
  
  if (Array.isArray(data)) return data.map(maskSecrets);
  if (data && typeof data === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = MASK_KEYS.includes(key) ? '[MASQUE]' : maskSecrets(value);
    }
    return result;
  }
  return data;
}
```

---

## UCS13 - Configuration Admin (MODIFIÉ v4.9)

**🔴 NOUVEAU:** Surcharge de configuration par entité

### Objectif
Permettre à Admin de configurer les paramètres métier globaux et surcharges par organisation.

### Architecture config v4.9

```
┌─ Paramètres globaux (défaut)
│  └─ .env (source de vérité)
│
├─ Surcharge Organisation
│  └─ Base données (OrganisationConfig)
│
└─ Résolution
   └─ org_config.value ?? env_default
```

### Variables d'environnement v4.9 (RM-156)

```bash
# COMMISSIONS (nouveau défaut v4.9 = 30%)
COMMISSION_FORGES_DEFAULT_PCT=30              # Was 20 in v4.8
COMMISSION_APPORTEUR_DEFAULT_PCT=5

# SEUILS REVERSEMENT
SEUIL_REVERSEMENT_PARTENAIRE_XOF=50000
SEUIL_REVERSEMENT_APPORTEUR_XOF=5000

# ABONNEMENTS
ESSAI_GRATUIT_DUREE_JOURS=30
OFFRE_BIENVENUE_REDUCTION_PCT=20
OFFRE_BIENVENUE_DELAI_JOURS=25

# PAIEMENTS
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

# SECURITE (NE JAMAIS LOGGER)
AES_SECRET_KEY=secret_256bits_base64
HMAC_ANONYMISATION_SEL=secret_256bits

# NGSER GATEWAY (NE JAMAIS LOGGER)
NGSER_BASE_URL=https://securetest.crossroad-africa.net/
NGSER_NAME=FORGES
NGSER_AUTH_TOKEN=secret_ngser
NGSER_OPERATION_TOKEN_PAIEMENT=secret_operation
NGSER_NOTIFICATION_URL=https://api.forges-group.com/webhooks/paiement
NGSER_REDIRECT_URL=https://app.forges-group.com/paiement/retour
NGSER_RECONCILIATION_PENDING_MINUTES=30
```

### Surcharge par Organisation

```prisma
model OrganisationConfig {
  id                    String @id
  organisation_id       String @unique
  commission_forges_pct Int? // Surcharge défaut
  seuil_reversement_xof Int? // Surcharge défaut
  created_at            DateTime
  updated_at            DateTime
}
```

### Résolution des paramètres

```typescript
// Exemple: obtenir commission FORGES pour une org
function getCommissionForges(organisation?: Organisation): number {
  if (organisation?.commission_forges_pct !== null) {
    return organisation.commission_forges_pct;
  }
  return Number(process.env.COMMISSION_FORGES_DEFAULT_PCT) || 30;
}

// Partout dans le code
const commission = getCommissionForges(organisation);
```

### Endpoints Admin v4.9

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `GET` | `/api/admin/config` | ADMIN | Lire params globaux |
| `PATCH` | `/api/admin/config` | ADMIN | Mettre à jour .env (dev) |
| `GET` | `/api/admin/organisations/:id/config` | ADMIN | Lire surcharge org |
| `PATCH` | `/api/admin/organisations/:id/config` | ADMIN | Créer/update surcharge |

### Tests obligatoires UCS13

| Test | Attendu |
|------|---------|
| Valeur défaut | 30% (commission FORGES) |
| Surcharge org | 25% override pour organisation spécifique |
| Absence surcharge | Fallback 30% par défaut |
| Validation montants | Aucune valeur négative |
| Logs config | Changements tracés |

---

## UCS14 - Formations à la Demande (MODIFIÉ v4.9)

**🔴 NOUVEAU:** Chiffrement AES des URLs partenaires + proxy d'accès

### Objectif
Livrer formations partenaires sans exposer les credentials/URL réelles.

### Architecture v4.9

```
1. Partenaire fournit URL privée
   ↓ (chiffré en base)
2. FORGES stocke URL_CHIFFREE
   ↓
3. Apprenant clique "Accéder formation"
   ↓
4. FORGES valide droit d'accès
   ↓ (déchiffre à la volée)
5. FORGES redirige vers URL réelle
   ↓ (via proxy sécurisé)
6. Apprenant accède contenu partenaire
```

### Entités

```prisma
model Formation {
  id                    String @id
  titre                 String
  type                  String // STANDARD ou SUR_DEMANDE
  
  // Nouveau en v4.9 si type = SUR_DEMANDE
  url_contenu           String? // Chiffrée avec AES-256
  partner_external_url  String? // Stockée chiffrée
  
  created_at            DateTime
}

model AccesFormationDemande {
  id                    String @id
  apprenant_id          String
  formation_id          String
  statut                String // ACTIF, EXPIRE, REVOQUE
  date_debut            DateTime
  date_expiration       DateTime // ACCES_FORMATION_DEMANDE_DUREE_JOURS
  created_at            DateTime
}
```

### Chiffrement/Déchiffrement (MT-02)

```typescript
// Service crypto
class CryptoService {
  private secretKey = process.env.AES_SECRET_KEY; // 256 bits base64
  
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.secretKey, 'base64'), iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }
  
  decrypt(ciphertext: string): string {
    const [ivHex, encrypted] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.secretKey, 'base64'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

// Usage: stocker URL chiffrée
const urlChiffree = cryptoService.encrypt('https://partner-private.com/course-123');
await formationRepo.update(formationId, { url_contenu: urlChiffree });
```

### Endpoint proxy d'accès (v4.9)

**Route:** `GET /api/formations-demande/:id/acceder`

```typescript
router.get('/formations-demande/:id/acceder', authenticate, async (req, res, next) => {
  try {
    const apprenant = req.user;
    const formation = await formationRepo.findById(req.params.id);
    
    if (formation.type !== 'SUR_DEMANDE') {
      return res.status(400).json({ error: 'Formation non à la demande' });
    }
    
    // 1. Vérifier que l'apprenant a droit d'accès
    const acces = await accesRepo.findByApprenantAndFormation(apprenant.id, formation.id);
    if (!acces || acces.date_expiration < new Date()) {
      auditLogger.warn('PROXY_ACCES_REFUSE', {
        apprenant_id: apprenant.id,
        formation_id: formation.id,
        raison: !acces ? 'NO_ACCESS' : 'EXPIRED'
      });
      return res.status(403).json({ error: 'Accès refusé ou expiré' });
    }
    
    // 2. Déchiffrer l'URL
    const urlReelle = cryptoService.decrypt(formation.url_contenu);
    
    // 3. Logger accès (sans URL réelle!)
    auditLogger.info('PROXY_ACCES_FORMATION', {
      apprenant_id: apprenant.id,
      formation_id: formation.id,
      // URL NOT LOGGED
    });
    
    // 4. Rediriger
    res.redirect(urlReelle);
    
  } catch (error) {
    next(error);
  }
});
```

### Règles de sécurité v4.9

- ❌ **URL réelle JAMAIS dans:**
  - HTML/Template
  - Response API
  - Logs/Audit
  - Export CSV/PDF
  - Swagger
  - Messages d'erreur
  - Frontend

- ✅ **Proxy sécurisé:**
  - Authentification requise
  - Droit d'accès vérifié
  - Expiration vérifiée
  - Accès loggé (sans URL)
  - Redirection sécurisée

### Tests obligatoires UCS14

| Test | Attendu |
|------|---------|
| URL stockée | Chiffrée en base (pas visible en SQL) |
| Page HTML | Pas d'URL réelle |
| API response | Pas d'URL réelle |
| Logs | Pas d'URL réelle |
| Export CSV/PDF | Pas d'URL réelle |
| Accès autorisé | Redirection 302 vers URL réelle |
| Accès non autorisé | 403 Forbidden |
| Accès expiré | 403 Forbidden |
| AES key absent | Erreur config au démarrage |
| Decrypt échoue | 500 Error + log |

---

## UCS17 - Espace Partenaire Export (MODIFIÉ v4.9)

**🔴 NOUVEAU:** Export CSV anonymisé sans PII

### Objectif
Permettre partenaires d'exporter liste apprenants sans données sensibles.

### Endpoint v4.9

**Route:** `GET /api/partenaire/export-csv`

### Colonnes autorisées

```csv
identifiant_anonymise,
formation_intitule,
activation_confirmee_le,
statut_acces,
certification_obtenue,
url_verification_certificat,
langue_formation
```

### Données INTERDITES

❌ `apprenant_id`  
❌ Email  
❌ Nom / Prénom  
❌ Téléphone  
❌ Date de naissance  
❌ Identifiant légal  
❌ Credentials  
❌ URL réelle formation  
❌ `paiement_id`  
❌ Données autre partenaire

### Anonymisation HMAC (MT-02)

```typescript
// Générer identifiant stable non réversible
function genererIdentifiantAnonyme(apprenant_id: string, partenaire_id: string): string {
  const hmac = crypto
    .createHmac('sha256', process.env.HMAC_ANONYMISATION_SEL)
    .update(`${apprenant_id}:${partenaire_id}`)
    .digest('hex')
    .substring(0, 12);
  
  return hmac; // Ex: "a3f7b2d1c4e9"
}

// Même apprenant + même partenaire = même ID
// Même apprenant + autre partenaire = ID différent
```

### Implémentation

```typescript
router.get('/partenaire/export-csv', authenticate, authorize('PARTENAIRE'), async (req, res, next) => {
  try {
    const partenaire = req.user;
    
    // 1. Chercher apprenants qui ont accès formations partenaire
    const apprenants = await getApprenantsPartenaire(partenaire.id);
    
    // 2. Générer CSV anonymisé
    const rows = apprenants.map(app => [
      genererIdentifiantAnonyme(app.id, partenaire.id), // Anonyme
      app.formation.titre,
      formatDate(app.dossier.confirmed_at),
      app.dossier.statut,
      app.certificat ? 'OUI' : 'NON',
      app.certificat?.url_verification || '',
      app.formation.langue
    ]);
    
    const csv = [
      ['identifiant_anonymise', 'formation_intitule', 'activation_confirmee_le', 
       'statut_acces', 'certification_obtenue', 'url_verification_certificat', 'langue_formation'],
      ...rows
    ].map(row => row.map(escapeCSV).join(',')).join('\n');
    
    // 3. Logger export
    auditLogger.info('CSV_PARTENAIRE_EXPORTE', {
      partenaire_id: partenaire.id,
      nb_lignes: rows.length
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="apprenants.csv"');
    res.send(csv);
    
  } catch (error) {
    next(error);
  }
});
```

### Tests obligatoires UCS17

| Test | Attendu |
|------|---------|
| Export accessible | CSV généré |
| CSV partenaire A | Seulement ses apprenants |
| Aucune PII | Pas d'email/nom/prénom/téléphone |
| Identifiant stable | Même apprenant + même partenaire = même ID |
| Identifiant isolé | Même apprenant + partenaire différent = ID différent |
| Credentials absent | Aucun token/password |
| Grep PII | Aucune trouvaille |
| HMAC sel absent | Erreur config au démarrage |

---

## UCS18 - Validation Formation Partenaire (MODIFIÉ v4.9)

**🔴 NOUVEAU:** Collection credentials partenaire + validation URL

### Objectif
Collecte validée des URLs de contenu partenaire et chiffrement avant stockage.

### Flux validation v4.9

```
1. Partenaire soumet formation
   ├─ Titre, description, tarif
   ├─ Type: STANDARD ou SUR_DEMANDE
   └─ Si SUR_DEMANDE: URL partenaire
   
2. Admin valide métadonnées
   
3. Admin demande credentials
   
4. Partenaire fournit:
   ├─ URL contenu
   ├─ Identifiants accès (optionnel)
   └─ Documents support
   
5. Admin teste accès
   
6. Admin approuve
   ├─ URL chiffrée en base (AES-256)
   ├─ Formation passe ACTIVE
   └─ Apprenants peuvent accéder via proxy
```

### Entités

```prisma
model FormationPartenaire {
  id                    String @id
  partenaire_id         String
  titre                 String
  description           String?
  type                  String // STANDARD, SUR_DEMANDE
  tarif_partenaire_xof  Int?
  statut                String // BROUILLON, EN_VALIDATION, ACTIVE, INACTIVE
  
  // Credentials chiffrées si SUR_DEMANDE
  url_contenu           String? // Chiffrée AES-256
  credentials_chiffres  String? // Chiffrés AES-256 si nécessaire
  
  created_at            DateTime
  updated_at            DateTime
}

model ValidationFormationPartenaire {
  id                    String @id
  formation_id          String
  admin_id              String
  date_validation       DateTime
  statut                String // APPROUVEE, REJETEE
  motif_rejet           String?
  created_at            DateTime
}
```

### Workflow validation

1. **Partenaire soumet** → `BROUILLON`
2. **Admin vérifie infos** → `EN_VALIDATION`
3. **Admin demande URL/credentials**
4. **Partenaire fournit → Admin chiffre**
5. **Admin teste accès**
6. **Admin approuve** → `ACTIVE`
   - URL stockée chiffrée
   - Credentials stockées chiffrées
   - Formation accessible

### Chiffrement des credentials

```typescript
// Chiffrer avant stockage
async function chiffrerCredentials(credentials: any): Promise<string> {
  const json = JSON.stringify(credentials);
  return cryptoService.encrypt(json);
}

// Déchiffrer seulement si admin (pour tests)
async function dechiffrerCredentialsAdmin(chiffre: string): Promise<any> {
  const json = cryptoService.decrypt(chiffre);
  return JSON.parse(json);
}
```

### Tests obligatoires UCS18

| Test | Attendu |
|------|---------|
| URL stockée | Chiffrée en base |
| Credentials stockés | Chiffrés en base |
| Formation ACTIVE | Proxy fonctionne |
| Accès apprenant | Redirection OK |
| Admin déchiffre | Credentials lisibles pour test |
| Logs | Pas d'URL réelle |
| Migration v4.8→v4.9 | URLs existantes chiffrées |

---

## UCS21 - Gestion des Devis (NOUVEAU v4.9)

**🟢 ENTIÈREMENT NOUVEAU en v4.9**

### Objectif
Gérer devis B2B pour grands comptes sans paiement automatique (paiement hors plateforme).

### Architecture v4.9

```
Admin crée Devis
  ├─ Numéro auto: FORGES-DEVIS-2026-001
  ├─ N places × tarif unitaire
  ├─ Organisation destinataire
  └─ Statut: CREE
  
Email devis → Organisation
  
Org reçoit devis
  
Agent Comptable confirme paiement reçu
  
Admin marque payé
  ├─ Statut: PAYE
  ├─ paid_at = timestamp
  └─ Email notification org
  
Admin crée AbonnementB2B manuellement
  ├─ Type: SUR_DEVIS
  ├─ Lien devis_id
  └─ Statut: ACTIF
  
Admin génère Vouchers
  └─ Envoyés à organisation
  
Apprenants utilisent vouchers
  └─ Accès formations activé
```

### Entités (RM-149 à RM-151)

```prisma
model Devis {
  id                    String @id @default(uuid())
  
  // Identifiant
  numero_devis          String @unique // FORGES-DEVIS-2026-001
  
  // Association
  organisation_id       String @unique
  formation_id          String?
  session_id            String?
  
  // Contenu devis
  nb_places             Int
  tarif_unitaire_xof    Int
  montant_total_xof     Int // nb_places × tarif_unitaire (auto-calculé)
  
  // Statut
  statut                String @default("CREE") // CREE, PAYE, ANNULE
  
  // Contact & détails
  date_interlocuteur    DateTime?
  nom_interlocuteur     String?
  mode_paiement         String?
  notes_admin           String?
  
  // Timestamps
  paid_at               DateTime?
  cancelled_at          DateTime?
  
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  
  // Relations
  organisation          Organisation @relation(fields: [organisation_id], references: [id])
}

enum StatutDevis {
  CREE
  PAYE
  ANNULE
}
```

### Numérotation automatique v4.9

**Format:** `FORGES-DEVIS-YYYY-NNN`

```typescript
// Générer numéro dévis
async function genererNumeroDevis(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await devisRepo.countByYear(year);
  const seq = String(count + 1).padStart(3, '0');
  return `FORGES-DEVIS-${year}-${seq}`;
}

// Ex: FORGES-DEVIS-2026-001, 002, 003, ...
// Réinitialise chaque année
```

### Endpoints devis v4.9 (RM-149 à RM-151)

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `POST` | `/api/admin/devis` | ADMIN | Créer devis |
| `GET` | `/api/admin/devis` | ADMIN / AGENT_COMPTABLE | Lister |
| `GET` | `/api/admin/devis/:id` | ADMIN / AGENT_COMPTABLE | Détail |
| `PATCH` | `/api/admin/devis/:id/payer` | ADMIN / AGENT_COMPTABLE | Marquer payé |
| `PATCH` | `/api/admin/devis/:id/annuler` | ADMIN | Annuler devis CREE |
| `GET` | `/api/organisation/devis` | ORGANISATION | Lecture propres devis (optionnel v4.9) |

### Création devis

**Route:** `POST /api/admin/devis`

```json
{
  "organisation_id": "org-123",
  "formation_id": "form-456",
  "nb_places": 50,
  "tarif_unitaire_xof": 100000,
  "mode_paiement": "VIREMENT",
  "nom_interlocuteur": "Jean Dupont",
  "notes_admin": "Devis pour l'école XYZ"
}
```

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "id": "devis-789",
    "numero_devis": "FORGES-DEVIS-2026-001",
    "organisation_id": "org-123",
    "nb_places": 50,
    "tarif_unitaire_xof": 100000,
    "montant_total_xof": 5000000,
    "statut": "CREE",
    "created_at": "2026-05-05T14:30:00Z"
  }
}
```

### Logique backend

```typescript
async function creerDevis(payload: CreateDevisDTO): Promise<Devis> {
  // 1. Valider organisation existe
  const org = await organisationRepo.findById(payload.organisation_id);
  if (!org) throw new Error('ORGANISATION_NOT_FOUND');
  
  // 2. Générer numéro
  const numero = await genererNumeroDevis();
  
  // 3. Calculer montant total (jamais modifiable)
  const montant_total = payload.nb_places * payload.tarif_unitaire_xof;
  
  // 4. Créer devis
  const devis = await devisRepo.create({
    numero_devis: numero,
    organisation_id: payload.organisation_id,
    formation_id: payload.formation_id,
    nb_places: payload.nb_places,
    tarif_unitaire_xof: payload.tarif_unitaire_xof,
    montant_total_xof: montant_total,
    statut: 'CREE',
    mode_paiement: payload.mode_paiement,
    nom_interlocuteur: payload.nom_interlocuteur,
    notes_admin: payload.notes_admin
  });
  
  // 5. Logger
  await auditLogger.info('DEVIS_CREE', {
    devis_id: devis.id,
    numero_devis: numero,
    organisation_id: org.id,
    montant_total_xof: montant_total,
    created_by: req.user.userId
  });
  
  // 6. Email organisation
  await emailService.envoyer({
    to: org.email_contact,
    template: 'devis_cree',
    data: {
      numero_devis: numero,
      montant_total_xof: montant_total,
      nb_places: payload.nb_places
    },
    langue: org.langue_preferee
  });
  
  return devis;
}
```

### Paiement devis

**Route:** `PATCH /api/admin/devis/:id/payer`

```json
{
  "date_paiement": "2026-05-05T14:30:00Z"
}
```

**Logique:**
```typescript
async function payerDevis(devisId: string, adminId: string): Promise<Devis> {
  // 1. Charger devis
  const devis = await devisRepo.findById(devisId);
  if (!devis) throw new Error('DEVIS_NOT_FOUND');
  
  // 2. Vérifier statut (seulement CREE peut devenir PAYE)
  if (devis.statut !== 'CREE') {
    throw new Error(`CANNOT_PAY_DEVIS_${devis.statut}`);
  }
  
  // 3. Mettre à jour statut
  await devisRepo.update(devisId, {
    statut: 'PAYE',
    paid_at: new Date()
  });
  
  // 4. Logger
  await auditLogger.info('DEVIS_PAYE', {
    devis_id: devisId,
    numero_devis: devis.numero_devis,
    montant_total_xof: devis.montant_total_xof,
    paid_by: adminId
  });
  
  // 5. Email organisation
  await emailService.envoyer({
    to: devis.organisation.email_contact,
    template: 'devis_paye',
    data: {
      numero_devis: devis.numero_devis,
      montant_total_xof: devis.montant_total_xof
    },
    langue: devis.organisation.langue_preferee
  });
  
  return await devisRepo.findById(devisId);
}
```

### Annulation devis

**Route:** `PATCH /api/admin/devis/:id/annuler`

```typescript
async function annulerDevis(devisId: string, adminId: string): Promise<Devis> {
  const devis = await devisRepo.findById(devisId);
  
  // 1. Vérifier statut (seulement CREE peut être annulé)
  if (devis.statut !== 'CREE') {
    throw new Error(`CANNOT_CANCEL_DEVIS_${devis.statut}`);
  }
  
  // 2. Mettre à jour
  await devisRepo.update(devisId, {
    statut: 'ANNULE',
    cancelled_at: new Date()
  });
  
  // 3. Logger
  await auditLogger.warn('DEVIS_ANNULE', {
    devis_id: devisId,
    numero_devis: devis.numero_devis,
    cancelled_by: adminId
  });
  
  return await devisRepo.findById(devisId);
}
```

### Post-paiement: création AbonnementB2B + Vouchers (MANUEL)

⚠️ **Important v4.9:** Création manuelle, pas automatique!

```typescript
// Admin crée AbonnementB2B lié au devis
async function creerAbonnementFromDevis(devisId: string) {
  const devis = await devisRepo.findById(devisId);
  
  if (devis.statut !== 'PAYE') {
    throw new Error('DEVIS_NOT_PAID');
  }
  
  const abonnement = await abonnementRepo.create({
    organisation_id: devis.organisation_id,
    type: 'SUR_DEVIS',
    devis_id: devisId,
    nb_places: devis.nb_places,
    montant_xof: devis.montant_total_xof,
    statut: 'ACTIF',
    date_debut: new Date(),
    date_fin: addYears(new Date(), 1)
  });
  
  // Générer vouchers
  for (let i = 0; i < devis.nb_places; i++) {
    const code = await generateVoucherCode(); // Ex: FORGES-2026-ABC123
    await voucherRepo.create({
      code,
      formation_id: devis.formation_id,
      organisation_id: devis.organisation_id,
      statut: 'DISPONIBLE',
      date_expiration: abonnement.date_fin
    });
  }
  
  // Email org avec vouchers
  await emailService.envoyer({
    to: devis.organisation.email_contact,
    template: 'vouchers_generes',
    data: {
      numero_devis: devis.numero_devis,
      vouchers: [...], // Liste vouchers
      nb_places: devis.nb_places
    }
  });
}
```

### Logs événements devis (MT-01)

| Événement | Niveau | Contexte |
|-----------|--------|----------|
| `DEVIS_CREE` | INFO | ID, numéro, org, montant, admin |
| `DEVIS_PAYE` | INFO | ID, numéro, montant, admin |
| `DEVIS_ANNULE` | WARN | ID, numéro, admin, raison |
| `DEVIS_NUMERO_CONFLIT` | ERROR | Doublon numéro détecté |

### Tests obligatoires UCS21

| Test | Attendu |
|------|---------|
| Création devis | Numéro auto généré |
| Numéro unique | Pas de doublon |
| Montant calculé | `nb_places × tarif_unitaire` |
| Montant non modifiable | Backend recalcule |
| Annuler CREE | Succès |
| Annuler PAYE | Refusé (error) |
| Marquer payé | Statut PAYE + email org |
| Email organisation | Reçu en langue préférée |
| Post-paiement manuel | Admin crée AbonnementB2B + Vouchers |
| Logs complets | DEVIS_CREE, DEVIS_PAYE, DEVIS_ANNULE |

---

## Récapitulatif des modifications v4.9

### UCS modifiés
| UCS | Modification |
|-----|-------------|
| **UCS09** | ✅ Paiements NGSER + IPN + Réconciliation |
| **UCS13** | ✅ Config Admin avec surcharges par org + .env 30% |
| **UCS14** | ✅ Formations à la demande avec URL chiffrée AES + proxy |
| **UCS17** | ✅ Export CSV anonymisé HMAC (sans PII) |
| **UCS18** | ✅ Validation formation partenaire + chiffrement credentials |

### UCS nouveaux
| UCS | Nouveau |
|-----|---------|
| **UCS21** | 🟢 Gestion Devis (création, paiement, annulation) |

### Autres UCS inchangés
UCS00, UCS01, UCS02, UCS03, UCS04, UCS05, UCS06, UCS07, UCS10, UCS11, UCS12, UCS15, UCS16

---

## Points critiques de sécurité v4.9

### MT-01 — Audit & Logs
- ✅ Secrets JAMAIS loggés
- ✅ Tous événements NGSER tracés
- ✅ Toutes modifications config tracées
- ✅ Tous accès formations à la demande loggés

### MT-02 — Chiffrement
- ✅ AES-256 URLs formations partenaires
- ✅ HMAC stable anonymisation CSV
- ✅ Secrets NGSER en .env (non commités)

### RM-160 — Intégrité paiements
- ✅ Montant IPN vérifié vs montant backend
- ✅ Idempotence garantie (même IPN max 1 fois)
- ✅ Paiements PENDING réconciliés auto chaque 30min

---

## Validation production v4.9

- [ ] Tous les tests P0 passent
- [ ] Secrets absents des logs
- [ ] URLs réelles jamais exposées
- [ ] Montant falsifié impossible
- [ ] IPN doublon géré
- [ ] Scheduler réconciliation actif
- [ ] Commission défaut = 30%
- [ ] .env.example complet
- [ ] Migration rollback testé
- [ ] Runbook incident paiement

---

**Document généré le:** 5 mai 2026  
**Version:** 1.0 - USE_CASES_v4.9.md  
**Branch:** implementation-4.9
