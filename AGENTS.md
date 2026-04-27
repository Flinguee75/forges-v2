# FORGES — AGENTS.md v2.0

**Projet** : Plateforme web agrégateur de formations certifiantes, marché africain.

**Stack immuable** : Node.js 20 + Express + Prisma | React 19 + Vite 8 + Tailwind 3 | PostgreSQL 16 | Redis 7 | JWT (access 1h, refresh 7j) + bcrypt (rounds=12) | node-cron | PDFKit/Puppeteer | Nodemailer + SMTP via Redis queue | Docker + Docker Compose

---

## CHARTE GRAPHIQUE — IMMUABLE

| Élément | Valeur |
|---|---|
| Primaire | #1B4F72 (bleu marine FORGES) |
| Secondaire | #2E86C1 (bleu clair) |
| Succès/validation | #148F77 (vert) |
| Avertissement | #D35400 (orange) |
| Erreur/danger | #C0392B (rouge) |
| Info secondaire / Apporteur | #6C3483 (violet) |
| Partenaire Fournisseur | #E65100 (orange foncé) |
| Fond principal | #F4F6F7 (gris très clair) |
| Fond carte | #FFFFFF |
| Texte principal | #1C2833 |
| Texte secondaire | #566573 |
| Bordures | #D5D8DC |
| Typographie | Inter (Google Fonts), fallback sans-serif |
| Taille base | 14px (text-sm Tailwind) |
| Border radius | 8px (rounded-lg Tailwind) |

**Variables CSS** :
```css
:root {
  --color-primary:    #1B4F72;
  --color-secondary:  #2E86C1;
  --color-success:    #148F77;
  --color-warning:    #D35400;
  --color-danger:     #C0392B;
  --color-partenaire: #E65100;
  --color-apporteur:  #6C3483;
  --color-bg:         #F4F6F7;
  --color-text:       #1C2833;
  --color-subtext:    #566573;
  --color-border:     #D5D8DC;
}
```

**Icônes/emojis** : AUCUN emoji dans le frontend (supprimés par décision 2026-03-15). Navigation sans icônes, lettre initiale en sidebar réduit.

**Badges de statut normalisés** — fonction `getStatutBadge()` standardisée :
- EN_ATTENTE / EN_ATTENTE_VERIFICATION = gray
- RETENU / VALIDE / ACTIVE / ACTIF = success (vert #148F77)
- PAYE / PAYE_DIRECTEMENT / REVERSEE = success (vert)
- REFUSE / REJETE / EXPIRE / RESILIE = danger (rouge #C0392B)
- GRIS / EN_ATTENTE_VALIDATION = warning (orange #D35400) + indicateur priorité
- EXCEPTION / SUSPENDU = warning + indicateur priorité
- ARCHIVE / BROUILLON = gray
- PUBLIEE / CONFIRME = vert
- EN_ATTENTE_PLANIFICATION = bleu clair
- STANDARD = badge bleu | PREMIUM = badge violet | SUR_DEVIS = badge orange
- Vouchers : barre de progression quota, BROUILLON=gris, ACTIF=vert, EPUISE=orange, EXPIRE=rouge, REFUSE=rouge

**Formatage** : montants en FCFA avec `.toLocaleString('fr-FR')`, montants stockés en centimes.

---

## 9 RÔLES — v4.8

| Rôle | Enum | Accès |
|---|---|---|
| Administrateur | `ADMIN` | Full access — config commissions, taux, seuils |
| Superviseur | `SUPERVISEUR` | Backoffice opérationnel — TDB mensuel apporteurs |
| Responsable de formation | `RESPONSABLE` | Catalogue + validation formations partenaires (désigné) |
| Agent Comptable | `AGENT` | Paiements + reversements partenaires + reversements apporteurs |
| Apprenant (ex-Étudiant) | `APPRENANT` | Espace apprenant — abonnements, bot conseiller |
| Organisation | `ORGANISATION` | Espace organisation — abonnements B2B, bot conseiller |
| Gestionnaire Institution | `GESTIONNAIRE` | Enrôlement apprenants institutionnels |
| Partenaire Fournisseur | `PARTENAIRE` | Espace partenaire — soumission formations, reversements |
| Apporteur d'Affaires | `APPORTEUR` | Espace apporteur — code parrainage, commissions |

⚠️ **Migration v1.2 → v2.0** : enum `ETUDIANT` renommé `APPRENANT`. Dossier `espace-etudiant/` renommé `espace-apprenant/`. 3 nouveaux rôles : `GESTIONNAIRE`, `PARTENAIRE`, `APPORTEUR`.

---

## RÈGLES MÉTIER CRITIQUES (vérifiées côté Service)

### Règles v1.2 — inchangées

**Inscriptions** : RM-01 (unicité apprenant/session), RM-15 (unicité apprenant/formation cross-sessions), RM-18 (capacité → GRIS ≤+10%, EXCEPTION >+10%)

**Dossiers** : RM-05 (RETENU irréversible — Premium+Retail uniquement), RM-03 (EN_ATTENTE → ARCHIVE scheduler), RM-19 (GRIS/EXCEPTION traités en priorité)

**Sessions** : RM-16 (ouverture ≤ clôture ≤ début ≤ fin), RM-17 (non-chevauchement), RM-20 (transitions auto scheduler), RM-21 (archivage auto +90j — était +30j en v1.2)

**Paiements** : RM-07 (72h délai — Premium+Retail uniquement), RM-08 (max 3 tentatives), RM-09 (webhook asynchrone), RM-10 (pas de remboursement auto)

**Vouchers** : RM-37 (lié à formation), RM-38 (usage unique/employé), RM-39 (promo BROUILLON→validation→ACTIF), RM-40 (quota+expiration), RM-41 (Org=paiement auto), RM-42 (promo=réduction), RM-45 (refus→libérer voucher)

**Profil** : RM-28 (email unique), RM-34 (type_apprenant obligatoire), RM-35 (secteur si PROFESSIONNEL), RM-36 (niveau si APPRENANT), RM-48 (pays ISO obligatoire)

**Sécurité** : MT-01 (toute mutation → AuditLog), MT-02 (AES-256-GCM + HTTPS)

### Multi-langue — RM-97 à RM-101

**RM-97** : 4 langues supportées : Français (FR — défaut), Anglais (EN), Espagnol (ES), Portugais (PT).

**RM-98** : `langue_preferee` définie dans le profil de chaque utilisateur (Apprenant, Organisation, Partenaire, Apporteur). Fallback : détection navigateur → Français.

**RM-99** : Si traduction absente pour la langue préférée → afficher en Français + bandeau informatif + indicateur Admin "traduction manquante".

**RM-100** : Tous les emails automatiques (confirmation, décision dossier, reversement, notification bot) envoyés dans la `langue_preferee` du destinataire. Fallback Français.

**RM-101** : Interface disponible dans les 4 langues. Contenus formations traduits à la discrétion des Responsables.

**Implémentation** :
- `TraductionService` (MOD-11) — service partagé injecté dans EmailService et tous les modules
- Enum `Langue { FR EN ES PT }` dans schema.prisma
- Champ `langue_preferee Langue @default(FR)` sur Apprenant, Organisation, Partenaire, Apporteur
- Côté frontend : `i18n` (react-i18next recommandé) avec fichiers de traduction `/locales/{fr,en,es,pt}.json`
- Emails : templates HTML en 4 langues dans `/templates/{fr,en,es,pt}/`
- GET `/api/admin/traductions/manquantes` → liste des traductions à compléter

### Règles nouvelles v4.8 — CRITIQUES

**RM-140 — Bifurcation inscription** : Vérification Responsable (UCS08) UNIQUEMENT si `type_formation=PREMIUM` ET `source=RETAIL`. Tous les autres cas → paiement direct sans vérification. Statut `RETENU` et délai 72h ne s'appliquent QU'aux dossiers Premium+Retail.

**RM-127 — Classification formation** : `type_formation` (STANDARD/PREMIUM/SUR_DEVIS) assigné EXCLUSIVEMENT par FORGES lors de la validation UCS18. Le Partenaire ne peut ni proposer ni modifier ce champ. Rejeter avec `400 TYPE_FORMATION_READONLY` si tenté.

**RM-129/137 — Commission Partenaire** : `prix_catalogue = prix_coutant / (1 - commission_forges/100)`. FORGES encaisse le prix catalogue. Le Partenaire reçoit son prix coûtant net. Ne jamais afficher `commission_forges_pct` dans l'interface Partenaire (RM-130).

**RM-143/144 — Code Apporteur** : Valider dans VoucherValidationService : code Actif + type=APPORTEUR + pas d'autre voucher simultané → `422 VOUCHER_CUMUL_INTERDIT`. Exception : réduction abonné -15% (RM-88) reste applicable (ce n'est pas un voucher).

**RM-145 — Commission Apporteur** : `commission = montant_catalogue × taux_apporteur / 100`. Créer `CommissionApporteur` dans `PaiementService` après webhook SUCCESS si `code_apporteur_id` présent.

**RM-146/147 — Reversements Apporteur** : Agrégation mensuelle J+1 (EN_ATTENTE → VALIDEE). Reversement si cumul >= seuil_minimum. Sinon report au mois suivant.

**RM-102 — Éligibilité abonnement** : `inclus_abonnement = true` SI ET SEULEMENT SI `type_formation=STANDARD` ET `pilier_abonnement ∈ {RETAIL, TOUS}`. Calculé automatiquement par `EligibiliteService`. Jamais modifié manuellement.

**RM-118 — Bot Conseiller** : Toutes interactions en questions FERMÉES (options[]). Aucune saisie libre sauf commentaire feedback (textarea 500 car max). Rejeter avec `400 REPONSE_HORS_LISTE` si valeur ∉ options[].

**RM-126 — Inscription Partenaire** : Flux A = invitation Admin (token 48h). Flux B = auto-inscription publique → approbation Admin.

**RM-141/142 — Apporteur** : Code UUID permanent généré à l'activation. Ne change jamais. Taux commission défaut 5%. `DEFAULT_COMMISSION_APPORTEUR_PCT=5`.

**Règles non-Prisma (vérifiées dans Service avant écriture)** : RM-01, RM-15, RM-16, RM-17, RM-18, RM-07, RM-08, RM-127, RM-140, RM-143, RM-144, RM-102

### Règles supplémentaires — à implémenter dans les Services

**Inscriptions & Dossiers** :
- RM-02 : places restantes = 0 → fermeture automatique inscriptions (InscriptionService)
- RM-03 : dossiers EN_ATTENTE_VERIFICATION non traités → ARCHIVE par scheduler (MOD-04)
- RM-05 : statut RETENU irréversible — jamais rétrogradable (DossierService vérification avant écriture)
- RM-06 : un seul paiement validé par dossier — double paiement bloqué (PaiementService)

**Formations** :
- RM-13 ⚠️ CORRIGÉ v4.8 : une formation archivée **ne peut PAS être réactivée** (différent de v1.2). Elle doit être recréée.
- RM-22 : formation visible dans catalogue SI ET SEULEMENT SI session À venir ou Ouverte (Avec session), ou statut Active (À la demande). Formations EN_ATTENTE_VALIDATION invisibles.
- RM-23 : formation Avec session reste EN_ATTENTE_PLANIFICATION (invisible) tant qu'aucune session n'est créée.
- RM-90 : badge "Premium" dans catalogue + affichage prix -15% pour apprenants abonnés actifs (FormationService)
- RM-94 : formation Standard à la demande incluse sans surcoût pour abonnés Retail/B2B actifs (sous réserve RM-102)
- RM-96 : formation mode=A_LA_DEMANDE ne peut PAS avoir de session planifiée — bloquer en SessionService

**Sessions** :
- RM-14 : une session = 4 dates obligatoires (ouverture, clôture, début, fin)
- RM-19 : dossiers GRIS et EXCEPTION mis en priorité dans la liste du Responsable (tri côté requête)

**Espace Apprenant** :
- RM-26 : attestation générée UNIQUEMENT si dossier=PAYE ET session=CLOTUREE (EspaceApprenantService)
- RM-27 : annulation volontaire UNIQUEMENT si statut=EN_ATTENTE_VERIFICATION. Impossible si RETENU.

**Sécurité & RGPD** :
- RM-29 : compte créé via UCS00 → rôle APPRENANT uniquement, aucune élévation possible
- RM-32 : max 5 tentatives inscription / IP / heure → blocage 30 min (rate limiter MOD-11)
- RM-33 : consentement RGPD conservé même après suppression du compte (ne pas purger)

**Organisation** :
- RM-46 : Organisation GOUVERNEMENT peut avoir plusieurs sous-types simultanément
- RM-47 : libellé contact référent dynamique — "Contact RH" (Entreprise), "Directeur/Responsable" (Association), "Référent formation" (Gouvernement)

**Abonnements B2B** :
- RM-62 : certifications d'un apprenant B2B conservées même après désactivation de son compte B2B (ne jamais supprimer)

**Bot Conseiller** :
- RM-117 : ⚠️ LLM SUPPRIMÉ en v4.7 — le Bot fonctionne EXCLUSIVEMENT sur règles métier fixes. Pas d'appel API externe. Pas d'IA générative. Roadmap LLM v5.x uniquement.
- RM-115 : déclenchement automatique bot si : profil incomplet OU session clôturée <7j sans feedback OU taux palier B2B >80% OU 0 formation trouvée dans catalogue
- RM-116 : règles de routage fixes — profil incomplet → COMPLETION_PROFIL, palier B2B >80% → UPGRADE, abonnement absent + formation éligible → UPGRADE, session clôturée <7j → FEEDBACK

**Contrats Institutionnels** :
- RM-112 : 1 à 5 gestionnaires selon offre (Basique/Pro = 1, Enterprise = 5) — vérifier dans ContratInstitutionnelService

---

## CONVENTIONS DE CODAGE

| Élément | Convention |
|---|---|
| Fichiers | kebab-case : `commission-apporteur.service.js` |
| Variables/fonctions | camelCase : `calculateCommission`, `validateApporteurCode` |
| Classes/modèles | PascalCase : `CommissionApporteurService` |
| Constantes | SCREAMING_SNAKE_CASE : `DEFAULT_COMMISSION_RATE` |
| Routes API | REST standard : `GET /api/partenaires/:id/formations` |
| Tests | `*.test.js` — un fichier par service |
| Env vars | jamais en dur |
| Composants React | PascalCase + `.jsx` |
| Hooks | camelCase + `.js` |
| API files | kebab-case + `.api.js` |
| Props | camelCase, events `on*`, booleans `is/has/can` |

**Règles absolues frontend** : 1 composant = 1 fichier = 1 responsabilité. Pas de logique métier dans UI. Appels API dans hooks/pages jamais inline. Token JWT dans sessionStorage (jamais localStorage). Toujours gérer loading/error/empty/success. `type_formation` jamais modifiable depuis l'interface Partenaire.

---

## STRUCTURE BACKEND

```
backend/src/modules/
  auth/ (MOD-01) | comptes/ (MOD-02) | formations/ (MOD-03)
  sessions/ (MOD-04) | inscriptions/ (MOD-05) | paiements/ (MOD-06)
  vouchers/ (MOD-07) | dashboard/ (MOD-08) | espace-apprenant/ (MOD-09)
  espace-organisation/ (MOD-10) | transversal/ (MOD-11)
  partenaires/ (MOD-12) ← NOUVEAU
  apporteurs/ (MOD-13) ← NOUVEAU
  bot-conseiller/ (MOD-14) ← NOUVEAU
  abonnements/ (MOD-15) ← NOUVEAU
  → Chaque module : controller.js, service.js, repository.js, routes.js, dto.js (Zod), *.test.js
```

⚠️ **Migration** : renommer `espace-etudiant/` → `espace-apprenant/` et mettre à jour tous les imports.

## STRUCTURE FRONTEND

```
frontend/src/
  api/ (client.js + *.api.js)
  components/ui/ + feedback/ + bot/  ← bot/ NOUVEAU
  contexts/ (AuthContext, ToastContext)
  hooks/ (useAuth, useApi, useToast, useBot)  ← useBot NOUVEAU
  pages/
    public/ | auth/ | apprenant/ | organisation/ | backoffice/
    partenaire/  ← NOUVEAU
    apporteur/   ← NOUVEAU
  router/ (PrivateRoute, RoleGuard)
  styles/index.css (variables CSS FORGES)
  store/  ← état global (Zustand ou Redux Toolkit)
  utils/authStorage.js (sessionStorage)
```

---

## ROUTES — v4.8 COMPLÈTES

```
Public       : /, /login, /unauthorized, /catalogue, /formations/:id
               /register, /register-partenaire ← NOUVEAU
               /register-apporteur ← NOUVEAU
               /confirm-email/:token

Apprenant    : /apprenant/dashboard, catalogue, dossiers, paiements,
               attestations, abonnement ← NOUVEAU, bot ← NOUVEAU, profil

Organisation : /organisation/dashboard, membres, vouchers, inscriptions,
               paiements, abonnement ← NOUVEAU, b2b ← NOUVEAU
               bot ← NOUVEAU, profil

Backoffice   : /backoffice/dashboard, formations*, sessions*, dossiers*,
               paiements*, vouchers*, comptes*, rapports*,
               partenaires* ← NOUVEAU, apporteurs* ← NOUVEAU,
               abonnements* ← NOUVEAU, bot-admin* ← NOUVEAU

Partenaire   : /partenaire/dashboard, formations, soumettre-formation,
               reversements, profil  ← NOUVEAU (rôle PARTENAIRE)

Apporteur    : /apporteur/dashboard, commissions, reversements, profil
               ← NOUVEAU (rôle APPORTEUR)
```

**Protection par rôle** :
- `APPRENANT` → `/apprenant/*`
- `ORGANISATION` → `/organisation/*`
- `PARTENAIRE` → `/partenaire/*`
- `APPORTEUR` → `/apporteur/*`
- `GESTIONNAIRE` → `/backoffice/*` (accès restreint)
- `ADMIN + SUPERVISEUR + RESPONSABLE + AGENT` → `/backoffice/*`

---

## CODES ERREUR HTTP — v4.8

Format : `{ statusCode, error, message, details }`

```
400 BAD_REQUEST | CHRONOLOGY_ERROR | SESSION_NOT_OPEN
400 STANDARD_DIRECT_PAYMENT  ← NOUVEAU (RM-140)
400 TYPE_FORMATION_READONLY  ← NOUVEAU (RM-127)
401 UNAUTHORIZED
402 PAYMENT_REQUIRED
403 FORBIDDEN
404 NOT_FOUND
409 DUPLICATE_EMAIL | ALREADY_ENROLLED | LEGAL_ID_EXISTS | SESSION_OVERLAP
410 TOKEN_EXPIRED
422 VOUCHER_INVALID | VOUCHER_WRONG_FORMATION
422 APPORTEUR_CODE_INVALID   ← NOUVEAU (RM-143)
422 VOUCHER_CUMUL_INTERDIT   ← NOUVEAU (RM-144)
422 FORMATION_EN_ATTENTE_VALIDATION  ← NOUVEAU (RM-127)
429 TOO_MANY_ATTEMPTS | RATE_LIMIT
500 INTERNAL_ERROR
502 PAYMENT_GATEWAY_ERROR
```

---

## ENUMS PRISMA — v4.8 COMPLETS

```prisma
// Rôles — 9 rôles (ETUDIANT → APPRENANT, + GESTIONNAIRE, PARTENAIRE, APPORTEUR)
enum Role { ADMIN SUPERVISEUR RESPONSABLE AGENT APPRENANT ORGANISATION GESTIONNAIRE PARTENAIRE APPORTEUR }

// Utilisateur et organisation
enum StatutUtilisateur { ACTIF INACTIF SUSPENDU }
enum TypeApprenant { PROFESSIONNEL APPRENANT }
enum TypeOrganisation { ENTREPRISE ASSOCIATION GOUVERNEMENT }
enum StatutOrganisation { EN_ATTENTE ACTIVE SUSPENDUE }

// Formations — NOUVEAU
enum TypeFormation { STANDARD PREMIUM SUR_DEVIS }
enum ModeFormation { AVEC_SESSION A_LA_DEMANDE }
enum PilierAbonnement { RETAIL B2B INSTITUTIONNEL TOUS }
enum StatutFormation { BROUILLON EN_ATTENTE_PLANIFICATION EN_ATTENTE_VALIDATION ACTIVE ARCHIVEE REJETEE SUSPENDUE }

// Sessions et dossiers
enum StatutSession { BROUILLON PLANIFIEE OUVERTE CLOTUREE EN_COURS TERMINEE ARCHIVEE ANNULEE }
enum StatutDossier { EN_ATTENTE_VERIFICATION RETENU PAYE_DIRECTEMENT PAYE REJETE ANNULE GRIS EXCEPTION }
enum SourceFinancement { RETAIL B2B INSTITUTIONNEL ABONNEMENT VOUCHER }

// Paiements et vouchers
enum StatutPaiement { EN_ATTENTE CONFIRME ECHOUE EXPIRE REMBOURSE }
enum TypeVoucher { ORGANISATION PROMOTIONNEL }
enum TypeValeur { MONTANT POURCENTAGE }
enum StatutVoucher { BROUILLON ACTIF EPUISE EXPIRE REFUSE }
enum MethodePaiement { MOBILE_MONEY CARTE VIREMENT VOUCHER_ORG }

// Abonnements — NOUVEAU
enum OffreRetail { ESSENTIEL PREMIUM }
enum PalierB2B { STARTER BUSINESS ENTERPRISE SUR_DEVIS }
enum OffreOrganisation { BASIQUE PRO ENTERPRISE }
enum StatutAbonnement { ACTIF SUSPENDU EXPIRE RESILIE ESSAI }

// Partenaires — NOUVEAU
enum TypePartenaire { UNIVERSITE ORGANISME ENTREPRISE AUTRE }
enum StatutPartenaire { INVITE EN_ATTENTE_VERIFICATION ACTIF SUSPENDU RESILIE }
enum StatutValidationPartenaire { EN_ATTENTE VALIDEE REJETEE SUSPENDUE }
enum ModeInscriptionPartenaire { INVITATION AUTO_INSCRIPTION }

// Apporteurs — NOUVEAU
enum TypeApporteur { INDIVIDU ORGANISATION }
enum StatutApporteur { ACTIF SUSPENDU RESILIE }
enum StatutCommissionApporteur { EN_ATTENTE VALIDEE REVERSEE BLOQUEE }

// Bot Conseiller — NOUVEAU
enum FluxBot { ORIENTATION UPGRADE FEEDBACK ENQUETE IDLE COMPLETION_PROFIL }
enum StatutConversation { ACTIVE TERMINEE ABANDONNEE }
enum TypeUtilisateurBot { APPRENANT ORGANISATION }

// Divers
enum Langue { FR EN ES PT }
enum Modalite { EN_LIGNE HYBRIDE PRESENTIEL }
```

---

## TRANSITIONS D'ÉTATS — v4.8

**Dossier Standard** : soumission → PAYE_DIRECTEMENT (RM-140) → attestation si session clôturée

**Dossier Premium+Retail** : soumission → EN_ATTENTE_VERIFICATION → RETENU(irréversible)/REJETE → PAYE(webhook)/ANNULE(72h RM-07)

**AccesFormationDemande** : paiement/abo → ACTIF → SUSPENDU(abo inactif RM-103) → EXPIRE(365j RM-92)

**Session** : BROUILLON→PLANIFIEE→OUVERTE→CLOTUREE→EN_COURS→TERMINEE→ARCHIVEE(+90j) | PLANIFIEE/OUVERTE→ANNULEE(admin)

**Voucher** : Org→ACTIF | Promo→BROUILLON→ACTIF/REFUSE | ACTIF→EPUISE/EXPIRE

**Formation partenaire** : BROUILLON→EN_ATTENTE_VALIDATION→ACTIVE(type assigné RM-127) | →REJETEE | ACTIVE→SUSPENDUE(RM-131)

**Partenaire** : INVITE/EN_ATTENTE_VERIFICATION→ACTIF→SUSPENDU→RESILIE

**AbonnementRetail** : (ESSAI→)ACTIF→SUSPENDU(échec 48h RM-73)→EXPIRE | ACTIF→RESILIE(RM-77)

**CommissionApporteur** : EN_ATTENTE→VALIDEE(J+1 RM-146)→REVERSEE(cumul≥seuil RM-147) | →BLOQUEE

---

## SCHEDULER (node-cron) — v4.8

- **Toutes les heures** : transitions sessions (RM-20) + relances/annulations paiements (72h RM-07)
- **Minuit (00h00)** : archivage sessions +90j (RM-21), expiration vouchers (RM-40), alertes abonnements (RM-82, RM-66, RM-56)
- **06h00 quotidien** : renouvellements automatiques abonnements Retail/B2B/Organisation (RM-75, RM-109)
- **J+1 fin de mois** : agrégation commissions apporteurs (RM-146), calcul cumuls, notification Agent
- **J+5 / J+10** : alertes délai validation formation partenaire (RM-134)

⚠️ Tous les schedulers doivent être **IDEMPOTENTS** : vérifier le statut avant toute transition.

---

## ÉTAT D'AVANCEMENT — v4.8

**Backend** : ✅ **COMPLET** — Tous les modules MOD-01 à MOD-15 terminés et fonctionnels
- MOD-01 à MOD-11 : Authentification, Comptes, Formations, Sessions, Inscriptions, Paiements, Vouchers, Dashboard, Espaces Apprenant/Organisation, Transversal ✅
- MOD-12 : Partenaires Fournisseurs (invitation, validation formations, commissions) ✅
- MOD-13 : Apporteurs d'Affaires (codes UUID, commissions, reversements) ✅
- MOD-14 : Bot Conseiller 100% règles métier (questions fermées) ✅
- MOD-15 : Abonnements (Retail, B2B, Organisation, Institutionnel, Éligibilité) ✅

**Frontend** : ✅ **COMPLET** — Toutes les étapes F-1 à F-20 terminées et fonctionnelles
- F-1 à F-11 : Setup, Auth, Composants UI, Espaces Apprenant/Organisation, Backoffice base, Tests ✅
- F-12 : Espace Partenaire Fournisseur (dashboard, soumission formations, reversements) ✅
- F-13 : Espace Apporteur d'Affaires (dashboard, commissions, code QR) ✅
- F-14 : Backoffice Partenaires & Validation Formations (UCS18, calcul prix catalogue) ✅
- F-15 : Backoffice Apporteurs & Reversements (TDB Superviseur, Agent Comptable) ✅
- F-16 : Abonnements Retail Apprenant (Essentiel/Premium, formations à la demande) ✅
- F-17 : Abonnements B2B Organisation (paliers, gestion apprenants) ✅
- F-18 : Bot Conseiller Widget (Apprenant & Organisation, questions fermées) ✅
- F-19 : Backoffice Admin (abonnements, config globale v4.8, TDB bot) ✅
- F-20 : Tests composants v4.8 (9 rôles, partenaire, apporteur, bot) ✅

**📅 Date de finalisation** : Mars 2026

**🎯 Statut projet** : FORGES v4.8 — Production Ready

---

## ENV VARS — v4.8

```bash
# Existantes v1.2 (inchangées)
NODE_ENV | PORT | FRONTEND_URL | CORS_ORIGINS
DATABASE_URL | REDIS_URL
JWT_SECRET (min 32 chars) | JWT_EXPIRES_IN=1h | JWT_REFRESH_SECRET | JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY (AES-256 32 bytes base64)
SMTP_HOST | SMTP_PORT | SMTP_USER | SMTP_PASS | EMAIL_FROM
PAYMENT_API_URL | PAYMENT_API_KEY | PAYMENT_WEBHOOK_SECRET
UPLOAD_MAX_SIZE_MB=5 | UPLOAD_DIR | UPLOAD_ALLOWED_TYPES=pdf,jpg,jpeg,png
LOG_LEVEL
# Frontend
VITE_API_URL

# Nouvelles v4.8
DEFAULT_COMMISSION_FORGES_PCT=20       # Commission FORGES partenaires (RM-129)
DEFAULT_COMMISSION_APPORTEUR_PCT=5     # Taux commission apporteur défaut (RM-141)
SEUIL_REVERSEMENT_PARTENAIRE_XOF=50000 # Seuil min reversement partenaire (RM-138)
SEUIL_REVERSEMENT_APPORTEUR_XOF=5000  # Seuil min reversement apporteur (RM-147)
BOT_UPGRADE_COOLDOWN_JOURS=7          # Délai re-proposition upgrade bot (RM-120)
VALIDATION_PARTENAIRE_DELAI_JOURS=5   # Délai recommandé validation formation (RM-134)
ABO_RETAIL_ESSENTIEL_XOF=1500000      # 15 000 XOF en centimes
ABO_RETAIL_PREMIUM_XOF=2500000        # 25 000 XOF en centimes
ABO_ORG_BASIQUE_XOF=5000000           # 50 000 XOF en centimes
ABO_ORG_PRO_XOF=15000000             # 150 000 XOF en centimes
ABO_ORG_ENTERPRISE_XOF=40000000       # 400 000 XOF en centimes
```

---

## PATTERNS STANDARDS — v4.8

- **Service** : injection dépendances (repo, audit), vérifications RM avant écriture, AuditLog sur toute mutation
- **AppError** : `throw new AppError('CODE', statusCode, message?)`
- **DTO** : Zod avec `.refine()` pour champs conditionnels. DTO partenaire : type_formation ABSENT (RM-127).
- **Client API** : Axios centralisé avec interceptor refresh token automatique
- **Pages** : useState + useApi + execute() avec onSuccess callback
- **`cleanQueryParams()`** pour filtrer params vides avant envoi API
- **CommissionApporteurService.create()** appelé dans PaiementService après webhook SUCCESS si `code_apporteur_id` présent (RM-145)
- **EligibiliteService.calculerInclus()** appelé automatiquement après toute modification `type_formation` ou `pilier_abonnement` (RM-102)
- **BotQuestion** : toujours renvoyer `{ question, options[] }` — jamais d'input texte libre (RM-118)
- **type_formation** : JAMAIS exposé en écriture dans l'API ou l'interface Partenaire

## Reference 

Spec : /Users/tidianecisse/PROJET_INFO/forges-kit 2/docs/ForgesSpecsv4.8.md
COnception : /Users/tidianecisse/PROJET_INFO/forges-kit 2/docs/conception_forges_v1_3.md
plan validation : /Users/tidianecisse/PROJET_INFO/forges-kit 2/docs/plan_validation_complet.md