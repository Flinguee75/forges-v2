

FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 1



## FORGES
## Formation · Organisation · Gestion · Enrôlement · Suivi


CLAUDE.md — Version 2.0
Synthèse complète pour Claude Code — Mars 2026

Basé sur les Spécifications Fonctionnelles v4.8


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 2
CLAUDE.md — FORGES v2.0

⚠ STACK IMMUABLE : Node.js 20 + Express + Prisma | React 19 + Vite 8 + Tailwind 3 | PostgreSQL 16 | Redis 7 | JWT
(access 1h, refresh 7j) + bcrypt (rounds=12) | node-cron | PDFKit/Puppeteer | Nodemailer + SMTP via Redis queue | Docker +
## Docker Compose

## CHARTE GRAPHIQUE — IMMUABLE
## Élément Valeur
Primaire #1B4F72 (bleu marine FORGES)
Secondaire #2E86C1 (bleu clair)
Succès/validation #148F77 (vert)
Avertissement #D35400 (orange)
Erreur/danger #C0392B (rouge)
Info secondaire / Apporteur #6C3483 (violet)
Partenaire #E65100 (orange foncé)
Fond principal #F4F6F7 (gris très clair)
Fond carte #FFFFFF
Texte principal #1C2833
Texte secondaire #566573
Bordures #D5D8DC
Typographie Inter (Google Fonts), fallback sans-serif
Taille base 14px (text-sm Tailwind)
Border radius 8px (rounded-lg Tailwind)

Variables CSS :
## :root {
--color-primary:    #1B4F72;  --color-secondary:  #2E86C1;
--color-success:    #148F77;  --color-warning:    #D35400;
--color-danger:     #C0392B;  --color-partenaire: #E65100;
--color-apporteur:  #6C3483;  --color-bg:         #F4F6F7;
--color-text:       #1C2833;  --color-subtext:    #566573;
--color-border:     #D5D8DC;
## }

⚠ AUCUN emoji dans le frontend (supprimés par décision 2026-03-15). Navigation sans icônes, lettre initiale en sidebar
réduit.

Badges de statut normalisés — fonction getStatutBadge() standardisée :
## Statut Couleur Contexte
## EN_ATTENTE /
## EN_ATTENTE_VERIFICATION
gray Dossiers, abonnements, commissions
RETENU / VALIDE / ACTIVE / ACTIF success (vert #148F77)
Dossiers, formations, partenaires,
apporteurs
## PAYE / PAYE_DIRECTEMENT /
## REVERSEE
success (vert) Paiements, commissions apporteurs
REFUSE / REJETE / EXPIRE / RESILIE danger (rouge #C0392B) Tous contextes
## GRIS / EN_ATTENTE_VALIDATION
warning (orange #D35400) +
indicateur priorité
Dossiers, formations partenaires

FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 3
EXCEPTION / SUSPENDU warning + indicateur priorité Dossiers, abonnements, partenaires
ARCHIVE / BROUILLON gray Formations, sessions, vouchers
PUBLIEE / CONFIRME vert Formations, paiements
EN_ATTENTE_PLANIFICATION bleu clair Formations internes
STANDARD / PREMIUM / SUR_DEVIS badges distinctifs type_formation — bleu/violet/orange

Formatage : montants en FCFA avec .toLocaleString('fr-FR'), montants stockés en centimes.


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 4
RÔLES — 9 RÔLES v4.8
## Rôle Enum Accès
Administrateur FORGES ADMIN Full access — config commissions, taux, seuils
Superviseur SUPERVISEUR Backoffice opérationnel — TDB mensuel apporteurs
Responsable de formation RESPONSABLE Catalogue + validation formations partenaires (désigné)
Agent Comptable AGENT Paiements + reversements partenaires + reversements apporteurs
Apprenant (ex-Étudiant) APPRENANT Espace apprenant — abonnements, bot conseiller
Organisation ORGANISATION Espace organisation — abonnements B2B, bot conseiller
Gestionnaire Institution GESTIONNAIRE Enrôlement apprenants institutionnels
Partenaire Fournisseur PARTENAIRE Espace partenaire — soumission formations, reversements
Apporteur d'Affaires APPORTEUR Espace apporteur — code parrainage, commissions

⚠ Migration v1.2 → v2.0 : (1) enum ETUDIANT renommé APPRENANT — mettre à jour schema.prisma. (2) Dossier
espace-etudiant/ renommé espace-apprenant/ — mettre à jour tous les imports. (3) Route /etudiant/* → /apprenant/*. (4) 3
nouveaux rôles : GESTIONNAIRE, PARTENAIRE, APPORTEUR. (5) JWT_EXPIRES_IN : 24h → 1h. (6) RM-21
archivage sessions : +30j → +90j.


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 5
RÈGLES MÉTIER CRITIQUES (vérifiées côté Service)
Règles v1.2 — inchangées
## Groupe Règles
## Inscriptions
RM-01 (unicité apprenant/session), RM-15 (unicité apprenant/formation cross-sessions), RM-18
(capacité → GRIS ≤+10%, EXCEPTION >+10%)
## Dossiers
RM-05 (RETENU irréversible — Premium+Retail), RM-03 (EN_ATTENTE → ARCHIVE
scheduler), RM-19 (GRIS/EXCEPTION traités en priorité)
## Sessions
RM-16 (ouverture ≤ clôture ≤ début ≤ fin), RM-17 (non-chevauchement), RM-20 (transitions auto
scheduler), RM-21 (archivage auto +90j)
## Paiements
RM-07 (72h délai — Premium+Retail uniquement), RM-08 (max 3 tentatives), RM-09 (webhook
asynchrone), RM-10 (pas de remboursement auto)
## Vouchers
RM-37 (lié à formation), RM-38 (usage unique/employé), RM-39 (promo
BROUILLON→validation→ACTIF), RM-40 (quota+expiration), RM-41 (Org=paiement auto),
RM-42 (promo=réduction), RM-45 (refus→libérer voucher)
## Profil
RM-28 (email unique), RM-34 (type_apprenant obligatoire), RM-35 (secteur si
PROFESSIONNEL), RM-36 (niveau si APPRENANT), RM-48 (pays ISO obligatoire)
Sécurité MT-01 (toute mutation → AuditLog), MT-02 (AES-256-GCM + HTTPS)
Multi-langue — RM-97
à RM-101
RM-97 : 4 langues FR (défaut) / EN / ES / PT. RM-98 : langue_preferee dans profil utilisateur,
fallback navigateur → FR. RM-99 : traduction absente → afficher en FR + bandeau + indicateur
Admin. RM-100 : tous les emails automatiques envoyés dans langue_preferee du destinataire,
fallback FR. RM-101 : interface disponible en 4 langues. Implémentation : TraductionService
(MOD-11) partagé. Enum Langue {FR EN ES PT}. Champ langue_preferee @default(FR) sur
Apprenant, Organisation, Partenaire, Apporteur. Frontend : react-i18next +
/locales/{fr,en,es,pt}.json. Emails : templates /templates/{fr,en,es,pt}/. GET
## /api/admin/traductions/manquantes.

Règles nouvelles v4.8 — MOD-12 à MOD-15
Groupe Règles clés
RM-140 — Bifurcation inscription
Vérification Responsable (UCS08) UNIQUEMENT si type_formation=PREMIUM ET
source=RETAIL. Tous les autres cas → paiement direct sans vérification.
RM-127 — Classification
formation
type_formation (STANDARD/PREMIUM/SUR_DEVIS) assigné EXCLUSIVEMENT
par FORGES lors validation UCS18. Le Partenaire ne peut ni proposer ni modifier ce
champ.
RM-129/137 — Commission
## Partenaire
FORGES encaisse prix catalogue. prix_catalogue = prix_coutant / (1 -
commission_forges/100). Partenaire reçoit son prix coûtant net. Vérifier dans
PaiementService.
RM-143/144 — Code Apporteur
Valider : code Actif + type=APPORTEUR + pas d'autre voucher simultané. Exception :
réduction abonné -15% (RM-88) reste applicable.
RM-145 — Commission Apporteur
commission = montant_catalogue × taux_apporteur / 100. Créer CommissionApporteur
à chaque paiement confirmé avec code apporteur.
RM-146/147 — Reversements
Agrégation mensuelle J+1. Reversement si cumul >= seuil_minimum. Sinon report au
mois suivant.
RM-102 — Éligibilité abonnement
inclus_abonnement = true SI ET SEULEMENT SI type_formation=STANDARD ET
pilier_abonnement ∈ {RETAIL, TOUS}. Calculé automatiquement, jamais modifié
manuellement.
RM-118 — Bot Conseiller
Toutes interactions en questions FERMÉES uniquement (listes, boutons). Aucune saisie
libre sauf commentaire feedback optionnel.
RM-126 — Inscription Partenaire
Flux A : invitation Admin (token 48h). Flux B : auto-inscription publique →
approbation Admin.

FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 6
RM-141/142 — Apporteur
Code UUID permanent généré à l'activation. Ne change jamais. Taux commission
défaut 5%.

Règles non-Prisma (vérifiées dans Service avant écriture) :
RM-01, RM-02, RM-03, RM-05, RM-06, RM-15, RM-16, RM-17, RM-18, RM-07, RM-08, RM-13, RM-22, RM-27, RM-
## 96, RM-127, RM-140, RM-143, RM-144, RM-102

Règles supplémentaires — à implémenter dans les Services
Groupe RM Impact technique critique
Inscriptions & Dossiers RM-02 places=0 → fermeture automatique (InscriptionService)
Inscriptions & Dossiers RM-03 EN_ATTENTE_VERIFICATION non traités → ARCHIVE par scheduler
Inscriptions & Dossiers RM-05 RETENU irréversible — vérification avant écriture (DossierService)
Inscriptions & Dossiers RM-06 1 seul paiement validé par dossier — double paiement bloqué
## Formations
## RM-13 ⚠️
## CORRIGÉ
Formation archivée NE PEUT PAS être réactivée (v4.8 inverse v1.2) —
recréer
Formations RM-22
Visible SI session À venir/Ouverte (Avec session) OU statut=ACTIVE
(Demande). EN_ATTENTE_VALIDATION = invisible
Formations RM-23
Avec session → EN_ATTENTE_PLANIFICATION (invisible) tant
qu'aucune session
Formations RM-90 Badge Premium + prix -15% dans catalogue pour abonnés actifs
Formations RM-94 Standard à la demande incluse sans surcoût abonnés (sous réserve RM-102)
Formations RM-96
mode=A_LA_DEMANDE → pas de session possible — bloquer
SessionService
Sessions RM-14 4 dates obligatoires : ouverture, clôture, début, fin
Sessions RM-19
Dossiers GRIS/EXCEPTION en tête de liste Responsable (ORDER BY
priorité)
Espace Apprenant RM-26 Attestation UNIQUEMENT si dossier=PAYE ET session=CLOTUREE
Espace Apprenant RM-27
Annulation volontaire UNIQUEMENT si
EN_ATTENTE_VERIFICATION — impossible si RETENU
Sécurité/RGPD RM-29 UCS00 → rôle APPRENANT uniquement, aucune élévation possible
Sécurité/RGPD RM-32 Max 5 tentatives inscription/IP/heure → blocage 30 min (MOD-11)
Sécurité/RGPD RM-33 Consentement RGPD conservé même après suppression du compte
Organisation RM-46 GOUVERNEMENT → plusieurs sous-types simultanément autorisés
Organisation RM-47 Libellé contact référent dynamique selon type organisation
Abonnements B2B RM-62 Certifications conservées même après désactivation compte B2B
Bot Conseiller RM-117 ⚠️
LLM SUPPRIMÉ — 100% règles métier. Aucun appel API externe.
Roadmap v5.x.
Bot Conseiller RM-115/116
Déclenchement auto + règles de routage flux (profil, palier, feedback,
catalogue vide)
Contrats Inst. RM-112 1 à 5 gestionnaires selon offre (Basique/Pro=1, Enterprise=5)
Toutes les notifications, emails et interfaces doivent respecter la langue_preferee de l'utilisateur.
Règle Description Impact technique
RM-97 4 langues : FR (défaut), EN, ES, PT
Enum Langue {FR EN ES PT} — champ langue_preferee
@default(FR) sur Apprenant, Organisation, Partenaire,
## Apporteur
## RM-98
langue_preferee dans le profil. Fallback :
navigateur → FR
TraductionService (MOD-11) injecté dans EmailService et
tous modules émettant des notifications

FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 7
## RM-99
Traduction absente → afficher en FR + bandeau
informatif + indicateur Admin
GET /api/admin/traductions/manquantes — à afficher dans
ConfigAdmin (F-19)
## RM-100
Tous les emails automatiques dans
langue_preferee du destinataire, fallback FR
Templates emails dans /templates/{fr,en,es,pt}/. Tous les
appels EmailService passent langue_preferee.
## RM-101
Interface en 4 langues — react-i18next
recommandé
npm install react-i18next i18next. Fichiers
/locales/{fr,en,es,pt}.json. Sélecteur langue dans profil.


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 8
## CONVENTIONS DE CODAGE
## Élément Convention
Fichiers kebab-case : user-service.js, commission-apporteur.service.js
Variables/fonctions camelCase : calculateCommission, validateApporteurCode
Classes/modèles PascalCase : CommissionApporteurService, PartenaireRepository
## Constantes
## SCREAMING_SNAKE_CASE : DEFAULT_COMMISSION_RATE,
## SEUIL_REVERSEMENT
Routes API REST standard : GET /api/partenaires/:id/formations
Tests *.test.js — un fichier par service
Env vars jamais en dur
Composants React PascalCase + .jsx
Hooks camelCase + .js
API files kebab-case + .api.js
Props camelCase, events on*, booleans is/has/can

Règles absolues frontend :
- 1 composant = 1 fichier = 1 responsabilité
- Pas de logique métier dans UI
- Appels API dans hooks/pages, jamais inline
- Token JWT dans sessionStorage (jamais localStorage)
- Toujours gérer loading / error / empty / success
- type_formation jamais modifiable depuis l'interface Partenaire


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 9
## STRUCTURE BACKEND
backend/src/modules/
auth/ (MOD-01) | comptes/ (MOD-02) | formations/ (MOD-03)
sessions/ (MOD-04) | inscriptions/ (MOD-05) | paiements/ (MOD-06)
vouchers/ (MOD-07) | dashboard/ (MOD-08) | espace-apprenant/ (MOD-09)
espace-organisation/ (MOD-10) | transversal/ (MOD-11)
partenaires/ (MOD-12) ← NOUVEAU | apporteurs/ (MOD-13) ← NOUVEAU
bot-conseiller/ (MOD-14) ← NOUVEAU | abonnements/ (MOD-15) ← NOUVEAU
→ Chaque module : controller.js, service.js, repository.js, routes.js, dto.js (Zod),
## *.test.js

## STRUCTURE FRONTEND
frontend/src/
api/ (client.js + *.api.js)
components/ui/ + feedback/
contexts/ (AuthContext, ToastContext)
hooks/ (useAuth, useApi, useToast)
pages/
public/ | auth/ | apprenant/ | organisation/ | backoffice/
partenaire/ ← NOUVEAU | apporteur/ ← NOUVEAU
router/ (PrivateRoute, RoleGuard)
styles/index.css (variables CSS FORGES)
store/ ← état global (Zustand ou Redux Toolkit)
utils/authStorage.js (sessionStorage)


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 10
ROUTES — v4.8 COMPLÈTES
## Espace Routes
## Public
/, /login, /unauthorized, /catalogue, /formations/:id, /register, /register-partenaire ← NOUVEAU,
## /confirm-email/:token
## Apprenant (ex-
## Étudiant)
/apprenant/dashboard, catalogue, dossiers, paiements, attestations, abonnement ← NOUVEAU, bot
← NOUVEAU, profil
## Organisation
/organisation/dashboard, membres, vouchers, inscriptions, paiements, abonnement ← NOUVEAU,
b2b ← NOUVEAU, bot ← NOUVEAU, profil
## Backoffice
/backoffice/dashboard, formations*, sessions*, dossiers*, paiements*, vouchers*, comptes*,
rapports*, partenaires* ← NOUVEAU, apporteurs* ← NOUVEAU, abonnements* ← NOUVEAU,
bot-admin* ← NOUVEAU
## Partenaire ←
## NOUVEAU
/partenaire/dashboard, formations, soumettre-formation, reversements, profil
## Apporteur ←
## NOUVEAU
/apporteur/dashboard, commissions, reversements, profil

Protection par rôle :
- APPRENANT → /apprenant/*
- ORGANISATION → /organisation/*
- PARTENAIRE → /partenaire/*   ← NOUVEAU
- APPORTEUR → /apporteur/*   ← NOUVEAU
- GESTIONNAIRE → /backoffice/* (accès restreint)   ← NOUVEAU
- ADMIN + SUPERVISEUR + RESPONSABLE + AGENT → /backoffice/*


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 11
CODES ERREUR HTTP — v4.8
Format : { statusCode, error, message, details }

HTTP Code interne Règle
## 400
## BAD_REQUEST / CHRONOLOGY_ERROR /
## SESSION_NOT_OPEN
## DTO / RM-16 / UCS07
400 STANDARD_DIRECT_PAYMENT RM-140 — tentative traitement dossier Standard via UCS08
400 TYPE_FORMATION_READONLY RM-127 — modification type_formation par Partenaire
401 UNAUTHORIZED JWT absent/invalide/expiré
402 PAYMENT_REQUIRED Paiement agrégateur refusé
403 FORBIDDEN Rôle insuffisant
404 NOT_FOUND Ressource inexistante
## 409
## DUPLICATE_EMAIL /
## ALREADY_ENROLLED /
## LEGAL_ID_EXISTS / SESSION_OVERLAP
## RM-28/15/43/17
410 TOKEN_EXPIRED RM-30 — lien confirmation expiré
## 422
## VOUCHER_INVALID /
## VOUCHER_WRONG_FORMATION
## RM-40 / RM-37
## 422
## APPORTEUR_CODE_INVALID /
## VOUCHER_CUMUL_INTERDIT
## RM-143 / RM-144
## 422 FORMATION_EN_ATTENTE_VALIDATION RM-127
## 429 TOO_MANY_ATTEMPTS / RATE_LIMIT RM-08 / MOD-11
500 INTERNAL_ERROR MT-01 — journalisé automatiquement
502 PAYMENT_GATEWAY_ERROR Agrégateur indisponible


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 12
ENUMS PRISMA — v4.8 COMPLETS
## // Rôles
enum Role { ADMIN SUPERVISEUR RESPONSABLE AGENT APPRENANT ORGANISATION GESTIONNAIRE PARTENAIRE
## APPORTEUR }

// Statuts utilisateur et organisation
enum StatutUtilisateur { ACTIF INACTIF SUSPENDU }
enum TypeApprenant { PROFESSIONNEL APPRENANT }
enum TypeOrganisation { ENTREPRISE ASSOCIATION GOUVERNEMENT }
enum StatutOrganisation { EN_ATTENTE ACTIVE SUSPENDUE }

## // Formations
enum TypeFormation { STANDARD PREMIUM SUR_DEVIS }
enum ModeFormation { AVEC_SESSION A_LA_DEMANDE }
enum PilierAbonnement { RETAIL B2B INSTITUTIONNEL TOUS }
enum StatutFormation { BROUILLON EN_ATTENTE_PLANIFICATION EN_ATTENTE_VALIDATION ACTIVE
## ARCHIVEE REJETEE SUSPENDUE }

// Sessions et dossiers
enum StatutSession { BROUILLON PLANIFIEE OUVERTE CLOTUREE EN_COURS TERMINEE ARCHIVEE ANNULEE }
enum StatutDossier { EN_ATTENTE_VERIFICATION RETENU PAYE_DIRECTEMENT PAYE REJETE ANNULE GRIS
## EXCEPTION }
enum SourceFinancement { RETAIL B2B INSTITUTIONNEL ABONNEMENT VOUCHER }

// Paiements et vouchers
enum StatutPaiement { EN_ATTENTE CONFIRME ECHOUE EXPIRE REMBOURSE }
enum TypeVoucher { ORGANISATION PROMOTIONNEL }
enum TypeValeur { MONTANT POURCENTAGE }
enum StatutVoucher { BROUILLON ACTIF EPUISE EXPIRE REFUSE }
enum MethodePaiement { MOBILE_MONEY CARTE VIREMENT VOUCHER_ORG }

## // Abonnements
enum OffreRetail { ESSENTIEL PREMIUM }
enum PalierB2B { STARTER BUSINESS ENTERPRISE SUR_DEVIS }
enum OffreOrganisation { BASIQUE PRO ENTERPRISE }
enum StatutAbonnement { ACTIF SUSPENDU EXPIRE RESILIE ESSAI }

## // Partenaires
enum TypePartenaire { UNIVERSITE ORGANISME ENTREPRISE AUTRE }
enum StatutPartenaire { INVITE EN_ATTENTE_VERIFICATION ACTIF SUSPENDU RESILIE }
enum StatutValidationPartenaire { EN_ATTENTE VALIDEE REJETEE SUSPENDUE }
enum ModeInscriptionPartenaire { INVITATION AUTO_INSCRIPTION }

## // Apporteurs
enum TypeApporteur { INDIVIDU ORGANISATION }
enum StatutApporteur { ACTIF SUSPENDU RESILIE }
enum StatutCommissionApporteur { EN_ATTENTE VALIDEE REVERSEE BLOQUEE }

## // Bot Conseiller
enum FluxBot { ORIENTATION UPGRADE FEEDBACK ENQUETE IDLE COMPLETION_PROFIL }
enum StatutConversation { ACTIVE TERMINEE ABANDONNEE }
enum TypeUtilisateurBot { APPRENANT ORGANISATION }

## // Divers
enum Langue { FR EN ES PT }
enum Modalite { EN_LIGNE HYBRIDE PRESENTIEL }


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 13
TRANSITIONS D'ÉTATS — v4.8
## Entité Transitions
Dossier Standard soumission → PAYE_DIRECTEMENT (paiement direct RM-140) → attestation si session clôturée
Dossier Premium+Retail
soumission → EN_ATTENTE_VERIFICATION → RETENU(irréversible)/REJETE →
PAYE(webhook OK)/ANNULE(72h dépassé RM-07)
AccesFormationDemande paiement/abo → ACTIF → SUSPENDU(abo inactif RM-103) → EXPIRE(365j RM-92)
## Session
## BROUILLON→PLANIFIEE→OUVERTE→CLOTUREE→EN_COURS→TERMINEE→ARCHIVEE
| PLANIFIEE/OUVERTE→ANNULEE(admin)
Voucher Org→ACTIF | Promo→BROUILLON→ACTIF/REFUSE | ACTIF→EPUISE/EXPIRE
Formation partenaire
BROUILLON→EN_ATTENTE_VALIDATION→ACTIVE(Responsable valide+assigne type) |
## →REJETEE | ACTIVE→SUSPENDUE(RM-131)
Partenaire INVITE/EN_ATTENTE_VERIFICATION→ACTIF→SUSPENDU→RESILIE
AbonnementRetail (ESSAI→)ACTIF→SUSPENDU(échec prélèvement RM-73)→EXPIRE | ACTIF→RESILIE(RM-77)
CommissionApporteur
EN_ATTENTE→VALIDEE(J+1 fin mois RM-146)→REVERSEE(cumul≥seuil RM-147) |
## →BLOQUEE


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 14
SCHEDULER (node-cron) — v4.8
## Fréquence Tâches
Toutes les heures Transitions sessions (RM-20) + relances/annulations paiements (RM-07 72h)
## Minuit (00h00)
Archivage sessions +90j (RM-21), expiration vouchers (RM-40), alertes abonnements (RM-
## 82, RM-66, RM-56)
06h00 quotidien Renouvellements automatiques abonnements Retail/B2B/Organisation (RM-75, RM-109)
J+1 fin de mois
Agrégation commissions apporteurs (RM-146), calcul cumuls, notification Agent
## Comptable
J+5 / J+10 Alertes délai validation formation partenaire (RM-134) — si non traitée


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 15
## AVANCEMENT — ÉTAT ACTUEL
## Module Nom Backend Frontend
## MOD-
## 01
Authentification & Sécurité ✅ Terminé ✅ F-3 terminé
## MOD-
## 02
Gestion des Comptes ✅ Terminé ✅ F-5 terminé
## MOD-
## 03
Catalogue de Formations ✅ Terminé ✅ F-8 terminé
## MOD-
## 04
Sessions de Formation ✅ Terminé ✅ F-8 terminé
## MOD-
## 05
Inscriptions & Dossiers ✅ Terminé ✅ F-9 terminé
## MOD-
## 06
Paiements ✅ Terminé ✅ F-9 terminé
## MOD-
## 07
Vouchers ✅ Terminé ✅ F-9 terminé
## MOD-
## 08
Tableaux de Bord & Rapports ✅ Terminé ⚠️ F-10 en cours
## MOD-
## 09
Espace Apprenant ✅ Terminé ✅ F-6 terminé
## MOD-
## 10
Espace Organisation ✅ Terminé ✅ F-7 terminé
## MOD-
## 11
Transversal (Audit & Sécurité) ✅ Terminé ✅ Intégré
## MOD-
## 12
Partenaires Fournisseurs ❌ À faire ❌ À faire
## MOD-
## 13
Apporteurs d'Affaires ❌ À faire ❌ À faire
## MOD-
## 14
Bot Conseiller ❌ À faire ❌ À faire
## MOD-
## 15
Abonnements ❌ À faire ❌ À faire

Ordre implémentation backend : MOD-15 → MOD-12 → MOD-13 → MOD-14
Ordre implémentation frontend : F-10 → F-11 → F-12 → F-13 → F-14 → F-15 → F-16 → F-17 → F-18 → F-19 → F-
## 20


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 16
VARIABLES D'ENVIRONNEMENT — v4.8
# Existantes v1.2 (inchangées)
## NODE_ENV | PORT | FRONTEND_URL | CORS_ORIGINS | DATABASE_URL | REDIS_URL
JWT_SECRET (min 32 chars) | JWT_EXPIRES_IN=1h | JWT_REFRESH_SECRET | JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY (AES-256 32 bytes base64) | SMTP_* | EMAIL_FROM
## PAYMENT_API_URL | PAYMENT_API_KEY | PAYMENT_WEBHOOK_SECRET
UPLOAD_MAX_SIZE_MB=5 | UPLOAD_DIR | UPLOAD_ALLOWED_TYPES=pdf,jpg,jpeg,png
LOG_LEVEL | VITE_API_URL (frontend)

# Nouvelles v4.8
DEFAULT_COMMISSION_FORGES_PCT=20        # Commission FORGES sur formations partenaires (RM-
## 129)
DEFAULT_COMMISSION_APPORTEUR_PCT=5      # Taux commission apporteur défaut (RM-141)
SEUIL_REVERSEMENT_PARTENAIRE_XOF=50000  # Seuil min reversement partenaire (RM-138)
SEUIL_REVERSEMENT_APPORTEUR_XOF=5000    # Seuil min reversement apporteur (RM-147)
BOT_UPGRADE_COOLDOWN_JOURS=7            # Délai re-proposition upgrade bot (RM-120)
VALIDATION_PARTENAIRE_DELAI_JOURS=5     # Délai recommandé validation formation (RM-134)
ABO_RETAIL_ESSENTIEL_XOF=1500000        # 15 000 XOF en centimes
ABO_RETAIL_PREMIUM_XOF=2500000          # 25 000 XOF en centimes
ABO_ORG_BASIQUE_XOF=5000000             # 50 000 XOF en centimes
ABO_ORG_PRO_XOF=15000000               # 150 000 XOF en centimes
ABO_ORG_ENTERPRISE_XOF=40000000         # 400 000 XOF en centimes


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 17
PATTERNS STANDARDS — v4.8
- Service : injection dépendances (repo, audit), vérifications RM avant écriture, AuditLog sur toute mutation
- AppError : throw new AppError('CODE', statusCode, message?)
- DTO : Zod avec .refine() pour champs conditionnels (secteur, niveau, type_formation absent formulaire
partenaire)
- Client API : Axios centralisé avec interceptor refresh token automatique
- Pages : useState + useApi + execute() avec onSuccess callback
- cleanQueryParams() pour filtrer params vides avant envoi API
- CommissionApporteurService.create() appelé dans PaiementService après webhook SUCCESS si code_apporteur
présent
- EligibiliteService.calculerInclus() appelé automatiquement à chaque modification type_formation ou
pilier_abonnement
- type_formation : JAMAIS exposé en écriture dans l'interface Partenaire — assigné uniquement par Responsable en
## UCS18
- Bot Conseiller : toutes les questions en BotQuestion avec options[] — jamais de input text libre sauf commentaire
feedback


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 18
## FORGES
## Formation · Organisation · Gestion · Enrôlement · Suivi


## TODO ÉQUIPE DEV — BACKEND + FRONTEND
## Version 2.0 — Mars 2026

4 Modules backend 11 Étapes frontend 6 Semaines estimées Basé sur Specs v4.8
## MOD-12→15 F-10→F-20
Backend 3-4 sem · Frontend
4-5 sem
## Autosuffisant


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 19
- Règle d'Or — Une Étape par Session
⚠ RÈGLE ABSOLUE — À respecter impérativement Ne jamais demander à Claude Code de générer plusieurs étapes en une
seule session. Chaque étape doit être implémentée, testée et validée AVANT de passer à la suivante. Si Claude Code propose
de continuer automatiquement, répondre : "Stop. On valide d'abord."

1.1 Workflow par étape
## Phase Action Responsable
- Prompt Donner le prompt de l'étape à Claude Code dans le terminal Dev
## 2.
## Génération
Claude Code génère le code de l'étape en cours uniquement Claude Code
- Test Lancer npm run dev — vérifier dans le navigateur Dev
## 4.
## Validation
Cocher ✅ dans le tableau d'avancement section 5 Dev
## 5. Commit
git add . && git commit -m "feat: backend B-X" ou "feat:
frontend F-X"
## Dev
## 6. Étape
suivante
Passer à l'étape suivante uniquement si la précédente est ✅ Dev

1.2 Prompt type
Lis CLAUDE.md (version 2.0). Aujourd'hui : implémenter l'étape [B-X ou F-X] — [NOM]. Étapes déjà complètes : [liste ✅].
Respecte la charte graphique et les conventions FORGES v4.8. Ne génère PAS les étapes suivantes.


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 20
- Étapes Backend — MOD-12 à MOD-15
Le backend MOD-01 à MOD-11 est entièrement terminé. Les 4 nouveaux modules sont à implémenter dans l'ordre ci-
dessous, chacun dépendant du précédent.

B-15  MOD-15 — Module Abonnements   ⚠️ Durée estimée : 5-7h
## Prérequis
- Backend MOD-01 à MOD-11 terminés ✅
- Schema Prisma v2 appliqué (migrations abonnements)
- Variables ABO_* présentes dans .env

Fichiers à créer / modifier
backend/src/modules/abonnements/controller.js
backend/src/modules/abonnements/service.js (AbonnementRetailService, AbonnementB2BService,
AbonnementOrgService, ContratInstitutionnelService, EligibiliteService)
backend/src/modules/abonnements/repository.js
backend/src/modules/abonnements/routes.js
backend/src/modules/abonnements/dto.js (Zod)
backend/src/modules/abonnements/abonnements.test.js
backend/src/modules/abonnements/schedulers/renouvellement.scheduler.js
backend/src/modules/abonnements/schedulers/alerte-abonnement.scheduler.js

Checklist de validation
☐  POST /api/abonnements/retail/souscrire crée un AbonnementRetail avec prorata premier mois (RM-106)
☐  PUT /api/abonnements/retail/upgrade fonctionne (Essentiel→Premium, différentiel prorata RM-79)
☐  PUT /api/abonnements/retail/downgrade planifie la descente (RM-104, effectif fin période)
☐  PUT /api/abonnements/retail/suspendre respecte la limite 1×/trimestre max (RM-76)
☐  POST /api/abonnements/b2b/souscrire fonctionne pour tous types Organisation (RM-88)
☐  PUT /api/abonnements/b2b/palier gère montée prorata (RM-68) et descente planifiée (RM-110)
☐  POST /api/abonnements/organisation/souscrire déclenche fin essai gratuit (RM-80)
☐  GET /api/abonnements/:id/eligibilite-formations retourne les formations incluses (RM-102)
☐  EligibiliteService.calculerInclus() : type=STANDARD ET pilier ∈ {RETAIL,TOUS} → true (RM-102)
☐  Scheduler renouvellement 06h00 : prélèvement auto J-1, grâce 48h si échec (RM-73, RM-109)
☐  Scheduler alertes : J-7/J-2 Retail, J-30/J-7 Organisation, J-45/J-15 B2B
☐  Tests unitaires EligibiliteService et AbonnementRetailService passent

## Prompt Claude Code
Lis CLAUDE.md v2.0 sections ENUMS (AbonnementRetail, B2B, Organisation), RÈGLES MÉTIER (RM-70 à RM-114),
SCHEDULER. Implémente B-15 : MOD-15 Abonnements complet. Priorité 1 : EligibiliteService (RM-102) — il sera
appelé par MOD-03 et MOD-05. Priorité 2 : AbonnementRetailService avec prorata (RM-106). Priorité 3 :
Schedulers renouvellement et alertes. Toute mutation → AuditLog (MT-01). Ne génère PAS les étapes suivantes.

⚠ Points d'attention
- EligibiliteService doit être un service PARTAGÉ — il sera importé par MOD-03 (catalogue) et MOD-05 (inscription)
- inclus_abonnement est calculé automatiquement — jamais modifiable manuellement (RM-102)
- Le prorata premier mois (RM-106) : montant × jours_restants / jours_mois (en centimes)
- AbonnementB2B ouvert à TOUS types Organisation (Entreprise, Association, Gouvernement — RM-88)
- Scheduler renouvellement doit être IDEMPOTENT : vérifier statut avant tout prélèvement

B-12  MOD-12 — Module Partenaires Fournisseurs   ✅ TERMINÉ (2026-04-19)
## Prérequis
- B-15 validé ✅ (EligibiliteService disponible)
- Schema Prisma Partenaire et FormationPartenaire migrés
- Variable DEFAULT_COMMISSION_FORGES_PCT dans .env

Fichiers à créer / modifier
backend/src/modules/partenaires/controller.js
backend/src/modules/partenaires/service.js (PartenaireService, FormationPartenaireService,
CommissionPartenaireService)
backend/src/modules/partenaires/repository.js
backend/src/modules/partenaires/routes.js
backend/src/modules/partenaires/dto.js (Zod — 21 champs RM-136, type_formation ABSENT)
backend/src/modules/partenaires/partenaires.test.js
backend/src/modules/partenaires/schedulers/alerte-validation.scheduler.js

Checklist de validation
☐  POST /api/admin/partenaires crée invitation Flux A (token 48h) — statut INVITE (RM-126)
☐  POST /api/partenaires/register crée auto-inscription Flux B — statut EN_ATTENTE_VERIFICATION (RM-126)
☐  PUT /api/admin/partenaires/:id/approuver active le compte — statut ACTIF

FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 21
☐  POST /api/partenaires/:id/formations valide les 21 champs (RM-136) sans type_formation
☐  DTO formation partenaire REJETTE tout type_formation ou pilier_abonnement soumis (RM-127)
☐  PUT /api/responsable/formations/:id/valider assigne type_formation + pilier + calcule prix_catalogue (RM-127, RM-137)
☐  prix_catalogue = prix_coutant / (1 - commission_forges/100) calculé automatiquement (RM-137)
☐  PUT /api/responsable/formations/:id/rejeter exige motif_rejet obligatoire (RM-128)
☐  PUT /api/responsable/formations/:id/suspendre passe formation ACTIVE → SUSPENDUE (RM-131)
☐  GET /api/partenaires/:id/reversements retourne uniquement prix_coutant net — jamais commission% (RM-130)
☐  Scheduler J+5 : alerte Admin + Responsable si formation non traitée (RM-134)
☐  Scheduler J+10 : escalade Admin pour réassignation (RM-134)
☐  Tests unitaires FormationPartenaireService et CommissionPartenaireService passent

## Prompt Claude Code
Lis CLAUDE.md v2.0 sections ENUMS (Partenaire, FormationPartenaire, StatutValidationPartenaire), RÈGLES
MÉTIER (RM-126 à RM-140). Implémente B-12 : MOD-12 Partenaires Fournisseurs complet. Règle ABSOLUE : le DTO
de soumission formation (RM-136) ne doit PAS contenir type_formation ni pilier_abonnement. Ces deux champs
sont assignés UNIQUEMENT par le Responsable lors de PUT /responsable/formations/:id/valider.
CommissionPartenaireService : prix_catalogue = prix_coutant / (1 - taux/100). Toute mutation → AuditLog (MT-
01). Ne génère PAS les étapes suivantes.

⚠ Points d'attention
- RM-127 CRITIQUE : type_formation ABSENT du DTO partenaire — le retourner en 400 TYPE_FORMATION_READONLY si tenté
- RM-130 : le tableau de bord Partenaire ne doit JAMAIS afficher commission_forges_pct ni prix_catalogue
- RM-128 : seul le Responsable désigné (partenaires_assignes[]) peut valider — vérifier dans RoleGuard
- Alerte J+5 doit compter les jours ouvrés, pas les jours calendaires

B-13  MOD-13 — Module Apporteurs d'Affaires   ✅ TERMINÉ (2026-04-19)
## Prérequis
- B-12 validé ✅
- Schema Prisma Apporteur, VoucherApporteur, CommissionApporteur migrés
- Variables SEUIL_REVERSEMENT_APPORTEUR_XOF et DEFAULT_COMMISSION_APPORTEUR_PCT dans .env

Fichiers à créer / modifier
backend/src/modules/apporteurs/controller.js
backend/src/modules/apporteurs/service.js (ApporteurService, VoucherApporteurService,
CommissionApporteurService)
backend/src/modules/apporteurs/repository.js
backend/src/modules/apporteurs/routes.js
backend/src/modules/apporteurs/dto.js (Zod)
backend/src/modules/apporteurs/apporteurs.test.js
backend/src/modules/apporteurs/schedulers/reversement-apporteur.scheduler.js
← Modifier backend/src/modules/paiements/service.js : ajouter appel
CommissionApporteurService.create() après webhook SUCCESS
← Modifier backend/src/modules/vouchers/service.js : ajouter validation code apporteur (RM-143, RM-
## 144)

Checklist de validation
☐  POST /api/admin/apporteurs crée compte Apporteur, génère code UUID permanent (RM-142)
☐  POST /api/apporteurs/register crée auto-inscription — statut EN_ATTENTE_VERIFICATION
☐  PUT /api/admin/apporteurs/:id/approuver active + fixe taux_commission%
☐  GET /api/vouchers/apporteur/:code/check valide : code Actif + type=APPORTEUR + non-cumul (RM-143, RM-144)
☐  PaiementService crée CommissionApporteur après webhook SUCCESS si code_apporteur présent (RM-145)
☐  GET /api/apporteurs/:id/dashboard retourne code, QR code URL, stats mois courant
☐  GET /api/apporteurs/:id/commissions?mois= retourne détail commissions par mois
☐  GET /api/apporteurs/:id/reversements retourne historique reversements
☐  Scheduler J+1 fin de mois : agrège commissions EN_ATTENTE → VALIDEE (RM-146)
☐  Scheduler : si cumul >= seuil → REVERSEE + notification Agent Comptable (RM-147)
☐  GET /api/admin/apporteurs/rapport-mensuel retourne TDB Superviseur (RM-148)
☐  Tests unitaires CommissionApporteurService.create() et agrégation mensuelle passent

## Prompt Claude Code
Lis CLAUDE.md v2.0 sections ENUMS (Apporteur, CommissionApporteur), RÈGLES MÉTIER (RM-141 à RM-148).
Implémente B-13 : MOD-13 Apporteurs d'Affaires complet. MODIFICATION CRITIQUE de PaiementService : après
webhook SUCCESS, vérifier si paiement.code_apporteur_id présent → créer CommissionApporteur(montant ×
taux/100). MODIFICATION VoucherService : GET /vouchers/apporteur/:code/check doit vérifier RM-144 (non-
cumul) : si autre voucher actif sur la même transaction → rejeter avec VOUCHER_CUMUL_INTERDIT. Scheduler
reversement IDEMPOTENT. Toute mutation → AuditLog. Ne génère PAS les étapes suivantes.

⚠ Points d'attention
- RM-142 : code UUID permanent — généré à l'activation, ne change jamais, même si l'Apporteur change d'email
- RM-144 : non-cumul strict — MAIS réduction abonné -15% (RM-88) reste applicable (ce n'est pas un voucher)
- RM-145 : commission calculée sur montant_catalogue APRÈS réduction éventuelle -15%
- Code UUID doit être exposé + QR code générable (qrcode npm) dans le dashboard Apporteur

FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 22

B-14  MOD-14 — Bot Conseiller 100% Règles Métier   ⚠️ Durée estimée : 4-5h
## Prérequis
- B-13 validé ✅
- B-15 validé ✅ (EligibiliteService disponible)
- B-12 validé ✅ (formations partenaires indexées)

Fichiers à créer / modifier
backend/src/modules/bot-conseiller/controller.js
backend/src/modules/bot-conseiller/service.js (BotConseillerService, OrientationService,
UpgradeService, FeedbackService, EnqueteCatalogueService)
backend/src/modules/bot-conseiller/repository.js
backend/src/modules/bot-conseiller/routes.js
backend/src/modules/bot-conseiller/dto.js (Zod — réponses fermées uniquement)
backend/src/modules/bot-conseiller/bot.test.js
backend/src/modules/bot-conseiller/questions.config.js (arbre de décision)

Checklist de validation
☐  POST /api/bot/session démarre une conversation — évalue règles RM-116 pour déterminer flux prioritaire
☐  POST /api/bot/session/:id/reponse accepte UNIQUEMENT un choix parmi options[] — rejette tout texte libre (RM-118)
☐  GET /api/bot/session/:id retourne l'état courant + question suivante avec ses options[]
☐  OrientationService filtre le catalogue par profil (type_apprenant, secteur, historique, langue)
☐  UpgradeService déclenche suggestion si condition RM-119, respecte cooldown 7j (RM-120)
☐  FeedbackService collecte questionnaire 5 questions fixes (RM-122) — note_globale obligatoire
☐  EnqueteCatalogueService : formulaire 3 questions FERMÉES (domaine, niveau, volume — RM-123)
☐  EnqueteCatalogue créée si catalogue retourne 0 résultat (RM-123)
☐  GET /api/admin/enquetes-catalogue retourne TDB trié par fréquence × volume (RM-124)
☐  GET /api/admin/feedbacks retourne agrégat feedbacks formations
☐  Tests unitaires BotConseillerService.evaluerReglesFixesRM116() passent

## Prompt Claude Code
Lis CLAUDE.md v2.0 sections ENUMS (FluxBot, StatutConversation), RÈGLES MÉTIER (RM-115 à RM-125). Implémente
B-14 : MOD-14 Bot Conseiller 100% règles métier. Règle ABSOLUE : aucune question à saisie libre dans le bot
(sauf commentaire feedback optionnel 500 car max). Toutes les questions ont un tableau options[] avec les
choix valides. DTO reponse.dto.js doit valider que la valeur reçue ∈ options[] de la question courante.
questions.config.js centralise tout l'arbre de décision — aucune logique de flux dans le controller. Pas de
LLM, pas d'API externe. Roadmap LLM v5.x. Ne génère PAS les étapes suivantes.

⚠ Points d'attention
- RM-118 CRITIQUE : rejeter toute réponse hors liste options[] avec 400 REPONSE_HORS_LISTE
- RM-120 : stocker la date du dernier refus upgrade dans ConversationBot.historique — ne reproposer qu'après 7j
- RM-124 : fréquence_demande doit s'incrémenter si enquête similaire existe (même domaine + même niveau)
- Le bot doit fonctionner sans dépendance externe — aucun appel HTTP sortant

- Étapes Frontend — F-10 à F-20

Les étapes F-1 à F-9 sont terminées. F-10 et F-11 étaient en cours. Voici la suite complète intégrant les 4 nouveaux modules
v4.8.

F-10  Backoffice — Dashboard & Rapports (ADMIN)   ⚠️ Durée estimée : 4-5h
## Prérequis
- F-9 validé ✅
- Backend MOD-08 accessible

Fichiers à créer / modifier
src/pages/backoffice/dashboard/AdminDashboard.jsx
src/pages/backoffice/rapports/RapportsDashboard.jsx
src/pages/backoffice/rapports/ExportPage.jsx
src/api/dashboard.api.js

Checklist de validation
☐  Dashboard affiche KPIs globaux : total inscriptions, taux rétention, revenus du mois
☐  Graphiques recharts (barres, courbes) : évolution inscriptions et paiements
☐  Page rapports filtrable par période, formation, statut
☐  Export CSV fonctionne et télécharge un fichier
☐  Export PDF génère un rapport téléchargeable
☐  Dashboard se rafraîchit automatiquement toutes les 30 secondes

FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 23
☐  KPIs ont une tendance (↑ vert / ↓ rouge vs période précédente)

## Prompt Claude Code
Lis CLAUDE.md v2.0. Implémente F-10 : AdminDashboard avec KPIs et graphiques, page Rapports avec export.
Utiliser recharts (npm install recharts). Export CSV via API backend → téléchargement automatique. Sélecteur
de période : aujourd'hui, cette semaine, ce mois, cette année. Ne génère PAS les étapes suivantes.

⚠ Points d'attention
- Installer recharts : npm install recharts
- Prévoir skeleton loading pour les graphiques (données asynchrones)
- Les KPIs doivent afficher une flèche tendance ↑ vert ou ↓ rouge vs période précédente

F-11  Tests composants — Vitest + React Testing Library   ⚠️ Durée estimée : 3-4h
## Prérequis
- F-10 validé ✅

Fichiers à créer / modifier
src/components/ui/Button.test.jsx
src/components/ui/Badge.test.jsx
src/pages/auth/LoginPage.test.jsx
src/pages/apprenant/MesDossiers.test.jsx
src/router/RoleGuard.test.jsx
vitest.config.js

Checklist de validation
☐  npm run test passe sans erreur
☐  Composant Button testé dans toutes ses variantes
☐  RoleGuard redirige correctement selon le rôle (9 rôles v4.8)
☐  LoginPage affiche une erreur si credentials invalides
☐  MesDossiers affiche EmptyState si liste vide
☐  Coverage minimum 70% sur composants UI de base

## Prompt Claude Code
Lis CLAUDE.md v2.0. Implémente F-11 : tests Vitest + React Testing Library. Priorité : Button, Badge,
RoleGuard (9 rôles), LoginPage, MesDossiers. Mocker AuthContext. Configurer vitest.config.js pour Vite. Ne
génère PAS les étapes suivantes.

⚠ Points d'attention
- RoleGuard doit couvrir les 9 rôles v4.8 (pas seulement les 6 de la v1.2)
- Utiliser @testing-library/user-event pour simuler les interactions
- vi.mock() pour les appels API

F-12  Espace Partenaire Fournisseur — Dashboard, Formations, Reversements   ⚠️ Durée estimée : 5-6h
## Prérequis
- F-11 validé ✅
- Backend B-12 (MOD-12) terminé ✅
- Route /register-partenaire ajoutée au router

Fichiers à créer / modifier
src/pages/partenaire/PartenaireDashboard.jsx
src/pages/partenaire/MesFormations.jsx
src/pages/partenaire/SoumettreFormation.jsx  ← 21 champs RM-136
src/pages/partenaire/FormationDetail.jsx (statut validation + historique versions)
src/pages/partenaire/MesReversements.jsx
src/pages/partenaire/ProfilPartenaire.jsx
src/pages/public/RegisterPartenaire.jsx  ← auto-inscription Flux B
src/api/partenaires.api.js
← Modifier src/router/ : ajouter routes /partenaire/* protégées par rôle PARTENAIRE
← Modifier src/router/ : ajouter /register-partenaire public

Checklist de validation
☐  Page d'inscription partenaire publique accessible sans auth
☐  Dashboard partenaire affiche : nb formations actives, statuts validations, reversements nets du mois
☐  Liste formations affiche statut validation avec badge coloré (EN_ATTENTE=orange, VALIDEE=vert, REJETEE=rouge,
SUSPENDUE=orange)
☐  Formulaire soumission formation : 21 champs RM-136 — PAS de champ type_formation ni pilier_abonnement
☐  Formulaire sauvegarde un brouillon (statut BROUILLON) avant soumission complète
☐  Page reversements affiche uniquement le prix coûtant net — jamais la commission FORGES (RM-130)
☐  Profil partenaire modifiable (email, téléphone, raison sociale)

FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 24
☐  Badge couleur orange (--color-partenaire #E65100) pour distinguer l'espace partenaire

## Prompt Claude Code
Lis CLAUDE.md v2.0 sections RÔLES (PARTENAIRE), ROUTES (/partenaire/*), RÈGLES MÉTIER (RM-126 à RM-140).
Implémente F-12 : espace complet Partenaire Fournisseur. Règle ABSOLUE : le formulaire SoumettreFormation
(RM-136) ne doit PAS contenir de champ type_formation ni pilier_abonnement. Afficher clairement le statut de
validation et les corrections suggérées si statut=REJETEE. Couleur signature partenaire : #E65100 (--color-
partenaire). Ne génère PAS les étapes suivantes.

⚠ Points d'attention
- RM-130 CRITIQUE : la page reversements ne doit JAMAIS afficher commission_forges_pct
- Afficher les corrections suggérées par le Responsable quand statut=REJETEE (motif + corrections)
- Formulaire SoumettreFormation doit permettre la sauvegarde Brouillon avant envoi
- Statut EN_ATTENTE_VALIDATION doit afficher un message : "En cours d'examen — délai estimé 5 jours ouvrés"

F-13  Espace Apporteur d'Affaires — Dashboard, Commissions, Reversements   ⚠️ Durée estimée : 4-5h
## Prérequis
- F-12 validé ✅
- Backend B-13 (MOD-13) terminé ✅

Fichiers à créer / modifier
src/pages/apporteur/ApporteurDashboard.jsx  ← code UUID + QR code + lien parrainage
src/pages/apporteur/MesCommissions.jsx  ← détail par mois
src/pages/apporteur/MesReversements.jsx  ← historique + statuts
src/pages/apporteur/ProfilApporteur.jsx
src/pages/public/RegisterApporteur.jsx  ← auto-inscription publique
src/api/apporteurs.api.js
← Modifier src/router/ : ajouter routes /apporteur/* protégées par rôle APPORTEUR
← Modifier src/router/ : ajouter /register-apporteur public

Checklist de validation
☐  Dashboard affiche : code UUID copiable en 1 clic, QR code scannable, lien de parrainage partageable
☐  Statistiques mois courant : nb transactions, CA généré, commission en attente
☐  Cumul total perçu affiché en FCFA formaté
☐  Page commissions affiche tableau par mois : montant_base, taux%, commission, statut badge
☐  Statut commission : EN_ATTENTE=gris, VALIDEE=bleu, REVERSEE=vert, BLOQUEE=rouge
☐  Page reversements affiche historique avec date, montant, statut (En attente / Payé)
☐  Badge couleur violet (--color-apporteur #6C3483) pour distinguer l'espace apporteur
☐  Message si cumul < seuil : "Reversement dès X XOF atteints — cumul actuel : Y XOF"

## Prompt Claude Code
Lis CLAUDE.md v2.0 sections RÔLES (APPORTEUR), ROUTES (/apporteur/*), RÈGLES MÉTIER (RM-141 à RM-148).
Implémente F-13 : espace complet Apporteur d'Affaires. Couleur signature apporteur : #6C3483 (--color-
apporteur). Le code UUID doit être affiché avec un bouton "Copier" (clipboard API) et un QR code généré via
qrcode.react. Afficher clairement le message si cumul < seuil minimum de reversement (RM-147). Ne génère PAS
les étapes suivantes.

⚠ Points d'attention
- npm install qrcode.react pour le QR code du code apporteur
- Le lien de parrainage doit être : ${VITE_API_URL}/register?ref=${code_apporteur}
- Afficher la tendance mensuelle des commissions (graphique mini recharts sparkline)

F-14  Backoffice — Gestion Partenaires & Validation Formations   ⚠️ Durée estimée : 5-6h
## Prérequis
- F-13 validé ✅
- Backend B-12 (MOD-12) terminé ✅

Fichiers à créer / modifier
src/pages/backoffice/partenaires/PartenairesList.jsx
src/pages/backoffice/partenaires/PartenaireDetail.jsx
src/pages/backoffice/partenaires/InvitationPartenaire.jsx  ← Flux A Admin
src/pages/backoffice/partenaires/ApprobationPartenaire.jsx  ← Flux B Admin
src/pages/backoffice/partenaires/ValidationFormation.jsx  ← UCS18 Responsable
src/pages/backoffice/partenaires/FormationsPartenaire.jsx  ← liste avec filtres
src/pages/backoffice/partenaires/ReversementsPartenaires.jsx  ← Agent Comptable
← Modifier src/api/partenaires.api.js : endpoints Admin

Checklist de validation
☐  Liste partenaires filtrable par statut (INVITE/EN_ATTENTE/ACTIF/SUSPENDU/RESILIE)
☐  Formulaire invitation Admin (Flux A) envoie token 48h par email

FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 25
☐  Page approbation (Flux B) permet d'approuver ou refuser une auto-inscription
☐  Page ValidationFormation (UCS18) : Responsable désigné peut assigner type_formation + pilier + valider prix_coutant
☐  Champ type_formation dans ValidationFormation : STANDARD / PREMIUM / SUR_DEVIS (liste déroulante)
☐  Calcul prix_catalogue affiché en temps réel = prix_coutant / (1 - commission%) lors de la saisie
☐  Bouton Valider / Rejeter (motif obligatoire) / Suspendre disponibles selon rôle RESPONSABLE
☐  Page ReversementsPartenaires (Agent Comptable) : tableau mensuel avec bouton "Valider reversement"
☐  Badge alerte rouge si délai validation J+5 dépassé (RM-134)

## Prompt Claude Code
Lis CLAUDE.md v2.0 sections RÔLES (ADMIN, RESPONSABLE, AGENT), RÈGLES MÉTIER (RM-126 à RM-140). Implémente
F-14 : pages backoffice gestion partenaires et validation formations. PAGE CRITIQUE ValidationFormation :
c'est ICI que type_formation et pilier_abonnement sont assignés par le Responsable (RM-127). Le formulaire
doit afficher le calcul automatique : prix_catalogue = prix_coutant / (1 - commission%). Afficher côté
Responsable : prix coûtant proposé + commission% + prix catalogue calculé. Le Partenaire ne voit jamais ce
calcul. Ne génère PAS les étapes suivantes.

⚠ Points d'attention
- RM-127 : type_formation n'est assignable QUE depuis cette page (ValidationFormation) — jamais ailleurs dans le backoffice
- RM-128 : seul le Responsable désigné pour ce partenaire peut valider — afficher message d'erreur sinon
- Afficher badge d'alerte rouge "J+5 dépassé" si la formation attend depuis trop longtemps
- Le calcul prix_catalogue doit se mettre à jour en temps réel à la saisie du prix_coutant

F-15  Backoffice — Gestion Apporteurs & Reversements   ⚠️ Durée estimée : 3-4h
## Prérequis
- F-14 validé ✅
- Backend B-13 (MOD-13) terminé ✅

Fichiers à créer / modifier
src/pages/backoffice/apporteurs/ApporteursList.jsx
src/pages/backoffice/apporteurs/ApporteurDetail.jsx
src/pages/backoffice/apporteurs/CreateApporteur.jsx  ← création Admin
src/pages/backoffice/apporteurs/ReversementsApporteurs.jsx  ← Agent Comptable + Superviseur
← Modifier src/api/apporteurs.api.js : endpoints Admin

Checklist de validation
☐  Liste apporteurs affiche : nom, type (Individu/Organisation), taux%, statut, nb transactions mois
☐  Formulaire création Admin : nom, type, email, taux_commission%
☐  Page détail apporteur : code UUID, QR code, historique transactions, cumul commissions
☐  Page ReversementsApporteurs (TDB Superviseur RM-148) : top 10, CA par apporteur, total commissions dues
☐  Agent Comptable peut valider un reversement depuis cette page
☐  Statut commission badge : EN_ATTENTE=gris, VALIDEE=bleu, REVERSEE=vert, BLOQUEE=rouge
☐  Message si cumul < seuil : "Report au mois suivant — cumul : X XOF / seuil : Y XOF"

## Prompt Claude Code
Lis CLAUDE.md v2.0 sections RÔLES (ADMIN, SUPERVISEUR, AGENT), RÈGLES MÉTIER (RM-141 à RM-148). Implémente
F-15 : pages backoffice gestion apporteurs et reversements. Page ReversementsApporteurs visible par
SUPERVISEUR (lecture) et AGENT (lecture + valider reversement). Ne génère PAS les étapes suivantes.

⚠ Points d'attention
- RM-148 : TDB Superviseur doit afficher top 10 apporteurs du mois triés par CA généré
- Le bouton "Valider reversement" ne doit apparaître que pour le rôle AGENT

F-16  Espace Apprenant — Abonnements Retail & Formations à la Demande   ⚠️ Durée estimée : 4-5h
## Prérequis
- F-15 validé ✅
- Backend B-15 (MOD-15) terminé ✅

Fichiers à créer / modifier
src/pages/apprenant/MonAbonnement.jsx  ← UCS11.1
src/pages/apprenant/SouscrireAbonnement.jsx  ← offres Essentiel/Premium
src/pages/apprenant/FormationsALaDemande.jsx  ← UCS14
src/pages/apprenant/AccesFormation.jsx  ← contenu formation à la demande
← Modifier src/pages/apprenant/ApprenanDashboard.jsx : badge "Inclus abonnement" sur formations
éligibles (RM-102)
← Modifier src/api/espace-apprenant.api.js : endpoints abonnements

Checklist de validation
☐  Page MonAbonnement affiche : offre actuelle, date renouvellement, statut, montant mensuel
☐  Bouton Upgrade (Essentiel→Premium) affiche différentiel prorata calculé

FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 26
☐  Bouton Downgrade affiche message : "Effectif à la fin de la période (RM-104)"
☐  Bouton Suspendre visible uniquement si quota suspension non atteint (RM-76)
☐  Page SouscrireAbonnement compare les deux offres avec les formations incluses
☐  Catalogue affiche badge "Inclus abonnement" vert sur formations éligibles (RM-102)
☐  Catalogue affiche badge "Premium" violet sur formations Premium
☐  Page FormationsALaDemande liste les accès actifs avec date expiration et progression
☐  AccèsFormation suspendu affiche message : "Réactivez votre abonnement pour accéder"

## Prompt Claude Code
Lis CLAUDE.md v2.0 sections ENUMS (OffreRetail, StatutAbonnement, AccesFormationDemande), RÈGLES MÉTIER (RM-
70 à RM-79, RM-102 à RM-106). Implémente F-16 : pages abonnement Retail et accès formations à la demande.
Badge "Inclus abonnement" : vert avec texte "Inclus" sur les formations type=STANDARD et pilier ∈ {RETAIL,
TOUS}. Afficher le premier prélèvement prorata lors de la souscription (RM-106). Ne génère PAS les étapes
suivantes.

⚠ Points d'attention
- RM-102 : le badge "Inclus abonnement" dépend de type_formation=STANDARD ET pilier ∈ {RETAIL,TOUS} — récupérer depuis
l'API, ne pas recalculer côté frontend
- RM-76 : masquer le bouton Suspendre si suspension déjà utilisée ce trimestre
- Afficher le montant du premier prélèvement au prorata avant confirmation souscription

F-17  Espace Organisation — Abonnements B2B & Institutionnel   ⚠️ Durée estimée : 4-5h
## Prérequis
- F-16 validé ✅
- Backend B-15 (MOD-15) terminé ✅

Fichiers à créer / modifier
src/pages/organisation/MonAbonnementOrg.jsx  ← AbonnementOrganisation
src/pages/organisation/AbonnementB2B.jsx  ← UCS03.2, UCS12.1
src/pages/organisation/GestionApprenantsB2B.jsx  ← ajout/suppression apprenants
← Modifier src/pages/organisation/OrgDashboard.jsx : bandeau essai gratuit (RM-81)
← Modifier src/api/espace-organisation.api.js : endpoints abonnements

Checklist de validation
☐  Dashboard Organisation affiche bandeau "Essai gratuit — X jours restants" si statut=ESSAI
☐  À J+25 : offre bienvenue -20% affichée (RM-85)
☐  Page MonAbonnementOrg : statut, offre (Basique/Pro/Enterprise), date renouvellement
☐  Page AbonnementB2B : palier actuel, nb_actifs / nb_max avec barre de progression
☐  Barre de progression B2B : vert <80%, orange >80%, rouge =100% (RM-69)
☐  Bouton Montée en palier avec calcul différentiel prorata
☐  Bouton Descente en palier avec validation nb_actifs <= nb_max cible
☐  Page GestionApprenantsB2B : liste apprenants + ajout individuel ou import CSV

## Prompt Claude Code
Lis CLAUDE.md v2.0 sections ENUMS (PalierB2B, OffreOrganisation), RÈGLES MÉTIER (RM-60 à RM-85). Implémente
F-17 : pages abonnements Organisation (B2B + AbonnementOrganisation). Bandeau essai gratuit prioritaire sur
le dashboard — afficher toujours en haut si statut=ESSAI. Ne génère PAS les étapes suivantes.

⚠ Points d'attention
- RM-69 : alerte automatique quand nb_actifs = nb_max — proposer la montée en palier
- RM-110 : la descente de palier est planifiée — afficher "Effectif au renouvellement"
- Import CSV : valider format avant envoi (email obligatoire, max 100 lignes par import)

F-18  Bot Conseiller — Widget flottant Apprenant & Organisation   ⚠️ Durée estimée : 4-5h
## Prérequis
- F-17 validé ✅
- Backend B-14 (MOD-14) terminé ✅

Fichiers à créer / modifier
src/components/bot/BotWidget.jsx  ← widget flottant réutilisable
src/components/bot/BotMessage.jsx  ← bulle de message
src/components/bot/BotQuestion.jsx  ← question avec options[] boutons/liste
src/components/bot/BotFormation.jsx  ← carte formation recommandée
src/hooks/useBot.js  ← gestion session bot
← Modifier src/pages/apprenant/ApprenanDashboard.jsx : intégrer BotWidget
← Modifier src/pages/organisation/OrgDashboard.jsx : intégrer BotWidget
src/api/bot.api.js

Checklist de validation

FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 27
☐  Widget bot flottant (bouton coin bas-droite) présent sur dashboards Apprenant et Organisation
☐  Bouton ouverture bot affiche "Conseiller" (sans emoji — RM charte graphique)
☐  Toutes les questions s'affichent avec des boutons ou listes déroulantes — jamais d'input texte (RM-118)
☐  Seul le commentaire feedback (optionnel, 500 car max) autorise la saisie libre
☐  Flux Orientation : présente max 5 formations avec badges Inclus/Premium
☐  Flux Feedback : questionnaire 5 questions avec étoiles pour les notes
☐  Flux Enquête : 3 questions fermées (domaine, niveau, volume) avec listes déroulantes
☐  Flux Upgrade : suggestion abonnement avec bouton "Voir les offres" → redirect MonAbonnement
☐  Session bot abandonnée si fermeture widget
☐  Historique conversation visible dans le widget (scroll)

## Prompt Claude Code
Lis CLAUDE.md v2.0 sections RÈGLES MÉTIER (RM-115 à RM-125), CHARTE (aucun emoji). Implémente F-18 :
BotWidget flottant pour espaces Apprenant et Organisation. Règle ABSOLUE : aucune question n'a de <input
type="text"> sauf le commentaire feedback (textarea 500 car max). BotQuestion affiche toujours options[]
sous forme de boutons ou <select>. Afficher les badges "Inclus abonnement" et "Premium" sur les formations
recommandées. Ne génère PAS les étapes suivantes.

⚠ Points d'attention
- RM-118 : le composant BotQuestion doit rejeter côté client toute valeur non présente dans options[]
- Widget doit être responsive — sur mobile il prend 90% de la largeur en overlay
- Ne pas re-déclencher automatiquement le bot si l'utilisateur l'a fermé volontairement
- Animations légères : slide-in à l'ouverture, fade pour les nouvelles questions

F-19  Backoffice — Abonnements Admin & Configuration v4.8   ⚠️ Durée estimée : 3-4h
## Prérequis
- F-18 validé ✅
- Backend B-15 et B-14 terminés ✅

Fichiers à créer / modifier
src/pages/backoffice/abonnements/AbonnementsAdmin.jsx  ← liste tous les abonnements
src/pages/backoffice/abonnements/ContratInstitutionnel.jsx  ← UCS03.1
src/pages/backoffice/config/ConfigAdmin.jsx  ← UCS13 — paramètres globaux
src/pages/backoffice/bot/EnquetesCatalogue.jsx  ← TDB enquêtes triées (RM-124)
src/pages/backoffice/bot/FeedbacksAdmin.jsx  ← TDB feedbacks formations
← Modifier src/api/dashboard.api.js : endpoints config et bot admin

Checklist de validation
☐  Page AbonnementsAdmin liste tous les abonnements actifs (Retail, B2B, Organisation) avec statuts
☐  Page ContratInstitutionnel : création contrat avec identifiant INST-AAAA-NNN, gestionnaires (1-5)
☐  Page ConfigAdmin (Admin uniquement) : grille tarifaire, commissions partenaires, taux apporteurs, seuils reversement
☐  Modification commission partenaire affiche alerte : "S'applique aux nouvelles souscriptions"
☐  Page EnquetesCatalogue : tableau trié par fréquence × volume, statut, bouton "Notifier apprenants" si mis en catalogue
☐  Page FeedbacksAdmin : agrégat notes par formation, filtrable par période
☐  Tous les champs de configuration ont une valeur par défaut affichée

## Prompt Claude Code
Lis CLAUDE.md v2.0 sections RÔLES (ADMIN), RÈGLES MÉTIER (RM-107 à RM-114, RM-123, RM-124, RM-129, RM-141).
Implémente F-19 : pages admin abonnements, configuration globale v4.8, TDB bot. Page ConfigAdmin : champs
commission_forges_pct (défaut 20%), taux_commission_apporteur (défaut 5%), seuil_reversement_partenaire
(défaut 50 000 XOF), seuil_reversement_apporteur (défaut 5 000 XOF). Ne génère PAS les étapes suivantes.

⚠ Points d'attention
- La page ConfigAdmin doit être protégée par rôle ADMIN — les autres rôles ne voient pas ce menu
- EnquetesCatalogue : trier par (fréquence × volume) décroissant — c'est la priorité business
- Afficher les données de configuration actuelles en lecture avant modification

F-20  Tests composants v4.8 — Bot, Partenaire, Apporteur, Abonnements   ⚠️ Durée estimée : 4-5h
## Prérequis
- F-19 validé ✅

Fichiers à créer / modifier
src/components/bot/BotQuestion.test.jsx  ← validation options[] fermées
src/components/bot/BotWidget.test.jsx
src/pages/partenaire/SoumettreFormation.test.jsx  ← absence type_formation
src/pages/apporteur/ApporteurDashboard.test.jsx  ← affichage code UUID
src/pages/apprenant/MonAbonnement.test.jsx
src/pages/backoffice/partenaires/ValidationFormation.test.jsx  ← calcul prix_catalogue
src/router/RoleGuard.test.jsx  ← mise à jour 9 rôles

FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 28

Checklist de validation
☐  npm run test passe sans erreur — tous les tests F-11 et F-20 passent
☐  BotQuestion.test : rejette une valeur hors options[] (RM-118)
☐  SoumettreFormation.test : le formulaire n'a PAS de champ type_formation (RM-127)
☐  ValidationFormation.test : prix_catalogue se calcule automatiquement
☐  ApporteurDashboard.test : code UUID affiché + bouton copier fonctionnel
☐  RoleGuard.test : couvre les 9 rôles v4.8 (APPRENANT, PARTENAIRE, APPORTEUR, GESTIONNAIRE inclus)
☐  Coverage global ≥ 70% sur composants UI et pages clés

## Prompt Claude Code
Lis CLAUDE.md v2.0. Implémente F-20 : tests Vitest pour les composants et pages v4.8. Priorité absolue :
BotQuestion (RM-118), SoumettreFormation (RM-127), ValidationFormation (calcul prix_catalogue). Ces 3 tests
couvrent les règles les plus critiques de la v4.8. Mocker les API et AuthContext. Ne génère PAS d'autres
étapes.

⚠ Points d'attention
- BotQuestion doit tester que options=[] vides affichent un état d'erreur
- SoumettreFormation doit vérifier l'ABSENCE du champ type_formation dans le DOM rendu
- ValidationFormation : tester le calcul prix_catalogue = 100000 / (1 - 0.20) = 125000

- Tableau de Bord — Avancement Complet
4.1 Backend — Nouveaux modules v4.8
Étape Module Description Durée est. Statut Validé par
## B-15 MOD-15
Abonnements (Retail, B2B, Org, Institutionnel,
## Éligibilité)
5-7h ⬜ À faire
## B-12 MOD-12
Partenaires Fournisseurs (invitation, validation,
commissions)
5-7h ⬜ À faire
## B-13 MOD-13
Apporteurs d'Affaires (code UUID, commissions,
reversements)
4-5h ⬜ À faire
## B-14 MOD-14
Bot Conseiller 100% règles métier (questions
fermées)
4-5h ⬜ À faire

4.2 Frontend — Toutes les étapes
Étape Description Durée est. Statut Validé par
## F-1 Setup Vite + Tailwind + Router + Axios 2-3h ✅ Terminé
F-2 Charte graphique + Composants UI 3-4h ✅ Terminé
F-3 Auth + Context + Hooks + RoleGuard 3-4h ✅ Terminé
## F-4
Layouts (6 espaces — Partenaire &
Apporteur à ajouter)
## 3-4h
## ✅ Terminé (à
compléter F-
## 12/F-13)

F-5 Pages publiques + Auth 4-5h ✅ Terminé
## F-6 Espace Apprenant 4-5h ✅ Terminé
## F-7 Espace Organisation 3-4h ✅ Terminé
## F-8 Backoffice Formations + Sessions 4-5h ✅ Terminé
## F-9 Backoffice Dossiers + Paiements + Vouchers 5-6h ✅ Terminé
F-10 Backoffice Dashboard & Rapports 4-5h ⚠️ En cours
F-11 Tests composants (9 rôles v4.8) 3-4h ⚠️ En cours
F-12 Espace Partenaire Fournisseur 5-6h ⬜ À faire
F-13 Espace Apporteur d'Affaires 4-5h ⬜ À faire

FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 29
## F-14
## Backoffice Partenaires & Validation
## Formations
5-6h ⬜ À faire
F-15 Backoffice Apporteurs & Reversements 3-4h ⬜ À faire
F-16 Abonnements Retail Apprenant 4-5h ⬜ À faire
F-17 Abonnements B2B Organisation 4-5h ⬜ À faire
## F-18
Bot Conseiller Widget (Apprenant +
## Organisation)
4-5h ⬜ À faire
## F-19
## Backoffice Abonnements Admin & Config
v4.8
3-4h ⬜ À faire
F-20 Tests composants v4.8 4-5h ⬜ À faire

Durée totale estimée
Backend nouveaux modules : 18 à 24 heures | Frontend complet : 72 à 90 heures Avec 1 développeur backend + 1 développeur
frontend en parallèle : 6 à 8 semaines Claude Code réduit la génération — prévoir temps de test et validation pour chaque
étape


FORGES v4.8 — CLAUDE.md v2.0 + TODO Dev Backend + Frontend
## Document Confidentiel 30
- Bonnes Pratiques & Pièges à Éviter
5.1 Ce qu'il faut toujours faire
- Tester dans le navigateur après CHAQUE génération Claude Code avant de continuer
- Vérifier que les appels API fonctionnent réellement (onglet Network des DevTools)
- Commiter après chaque étape validée (historique Git propre)
- Mettre à jour le CLAUDE.md section avancement après chaque étape
- Vérifier le responsive mobile sur chaque page (F12 → mode mobile)
- Vérifier qu'aucun emoji n'a été introduit (charte graphique)

5.2 Pièges critiques v4.8 — À ne jamais faire
⚠ 1. Ne JAMAIS exposer type_formation en écriture dans l'interface Partenaire (RM-127) 2. Ne JAMAIS afficher
commission_forges_pct dans l'interface Partenaire (RM-130) 3. Ne JAMAIS mettre de <input type="text"> dans le Bot
Conseiller sauf commentaire feedback (RM-118) 4. Ne JAMAIS stocker le token JWT dans localStorage (utiliser
sessionStorage) 5. Ne JAMAIS demander plusieurs étapes à Claude Code en une seule session 6. Ne JAMAIS passer à l'étape
suivante sans valider la précédente dans le navigateur

5.3 Connexion avec le backend
## # Terminal 1 — Backend
cd backend && npm run dev   → http://localhost:3000

## # Terminal 2 — Frontend
cd frontend && npm run dev  → http://localhost:5173

# Si erreurs CORS : vérifier CORS_ORIGINS=http://localhost:5173 dans .env backend