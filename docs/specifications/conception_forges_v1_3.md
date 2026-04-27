

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 1




## FORGES
## Formation · Organisation · Gestion · Enrôlement · Suivi


## DOCUMENT DE CONCEPTION TECHNIQUE
## Version 1.3  ·  Mars 2026

Basé sur les Spécifications Fonctionnelles v4.8
Document destiné à l'équipe de développement


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 2
Table des Révisions

Version Date Nature des modifications Auteur
## 1.0
## Mars
## 2026
Création initiale — basé sur Specs v3.6. MOD-01 à MOD-11.
## À
définir
## 1.1
## Mars
## 2026
Corrections mineures. Diagrammes inter-modules. Enrichissement
## Prisma.
## À
définir
## 1.2
## Mars
## 2026
Enrichissement MOD-02. Corrections DTOs.
## À
définir
## 1.3
## Mars
## 2026
Mise à jour complète basée sur Specs v4.8. +4 modules (MOD-12 à
MOD-15). ERD complet v12 intégré. Chapitre 10B Diagrammes de
Composants (4 diagrammes). Graphe de dépendances entre
modules. Section 16 Migration BDD (stratégie v1.2→v1.3, seed,
commandes Prisma). Section 17 Swagger/OpenAPI (configuration,
schémas de réponse, exemples endpoints clés). 17 chapitres.
Document autosuffisant.
## À
définir


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 3
Table des Matières

- Descriptif du Projet
1.1 Vision et Objectifs
1.2 Acteurs du Système
## 1.3 Stack Technique
## 1.4 Architecture Générale
1.5 Conventions de Codage
- Tableau des Cas d'Utilisation
## 3. Règles Métier — Synthèse
- Description des Modules (MOD-01 à MOD-15)
- Diagrammes de Séquence par Module
- Diagrammes de Séquence Inter-Modules
- Modèle de Données — Entités Clés
- Matrice Modules ↔ Cas d'Utilisation
## 9. Glossaire Technique
## 10. Architecture Visuelle
10.1 Schéma des Couches Applicatives
## 10.2 Déploiement Docker
10.3 Machines à États
10.3.1 Dossier d'Inscription (v4.8 — RM-140)
10.3.2 Session de Formation
10.3.3 Formation (cycle de vie enrichi)
10.3.4 AbonnementRetail
10.3.5 Partenaire Fournisseur & CommissionApporteur
10.4 Diagrammes de Séquence Inter-Modules
## 10.4.1 Flux Inscription Standard → Paiement → Attestation
10.4.2 Flux Inscription Premium+Retail → Vérification
## 10.4.3 Flux Partenaire : Soumission → Validation → Publication
## 10.4.4 Flux Apporteur : Code → Commission → Reversement
## 10.4.5 Flux Abonnement Retail : Souscription → Accès → Renouvellement
## 10.4.6 Flux Bot Conseiller 100% Règles Métier
10.4.7 Flux Scheduler Global Inter-Modules
10B. Diagrammes de Composants par Module
10B.1 Légende des types
10B.2 MOD-01 à MOD-04
10B.3 MOD-05 à MOD-08
## 10B.4 MOD-09, MOD-10, MOD-11, MOD-14
## 10B.5 MOD-12, MOD-13, MOD-15
- DTOs — Contrats d'Interface API
- Gestion des Erreurs
- Stratégie de Tests
- Guide d'Environnement — Setup Local
- Schéma Prisma Annoté v2
- Stratégie de Migration Base de Données
- Documentation Swagger / OpenAPI


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 4
- Descriptif du Projet
1.1 Vision et Objectifs
FORGES est une plateforme web d'agrégation de formations certifiantes internationales, conçue pour
le marché africain. Elle gère le cycle de vie complet d'une formation : création, planification,
inscription, traitement des dossiers, paiement et suivi.

La v1.3 de ce document intègre les évolutions majeures des specs v4.0 à v4.8 : système
d'abonnements multi-niveaux, Partenaires Fournisseurs avec modèle commission prix
coûtant/catalogue, Bot Conseiller 100% règles métier, Voucher Apporteur d'Affaires.

Acronyme FORGES
F — Formation  |  O — Organisation  |  R — Gestion  |  G — Enrôlement  |  E — Suivi

1.2 Acteurs du Système
## Acteur Rôle Accès
Administrateur Gestion globale, commissions, config Full access
Responsable de
formation
Catalogue, validation formations partenaires Formations + validation
Superviseur Sessions, vouchers promo, TDB apporteurs Backoffice opérationnel
Agent Comptable Paiements, commissions, reversements Module financier
Apprenant Inscription, suivi, bot conseiller Espace apprenant
Organisation Abonnements, vouchers, membres, bot Espace organisation
## Gestionnaire
## Institution
Enrôlement apprenants, rapports bailleurs Espace institutionnel
## Partenaire
## Fournisseur
Soumission formations, reversements Espace partenaire (orange)
Apporteur d'Affaires Parrainage, suivi commissions Espace apporteur (violet)
## Bot Conseiller
Orientation, upgrade, feedback, enquête
(100% règles)
Acteur système (vert)
Système (scheduler) Transitions statuts, commissions mensuelles Automatique

## 1.3 Stack Technique
## Couche Technologie Rôle
## Backend
## Node.js + Express + Prisma
## ORM
API REST, logique métier
Frontend React + Vite + Tailwind CSS Interface utilisateur responsive
Base de données PostgreSQL Persistance principale
Cache Redis Sessions, rate limiting, files de tâches

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 5
Scheduler node-cron
Transitions statuts, renouvellements, commissions
mensuelles
PDF PDFKit / Puppeteer Attestations, rapports, relevés apporteurs
Authentification JWT + bcrypt Access 1h, refresh 7j
Emails Nodemailer + SMTP Notifications, confirmations, reversements
Paiements Module agrégateur externe Mobile Money (MTN / Orange)
Conteneurisation Docker + Docker Compose Déploiement multi-environnements

## 1.4 Architecture Générale
Architecture en 5 couches strictement séparées :
- Présentation (React) — interface responsive, widget Bot Conseiller flottant
- API Gateway (Express) — routage, JWT, RBAC (9 rôles), rate limiting
- Services métier — 15 modules (MOD-01 à MOD-15)
- Accès données (Prisma) — ORM PostgreSQL, 20+ entités
- Services transversaux — MT-01 (audit), MT-02 (chiffrement), scheduler, emails

1.5 Conventions de Codage
## Convention Règle
Fichiers kebab-case : user-service.js, commission-apporteur.service.js
Variables/fonctions camelCase : calculateCommission, validateApporteurCode
Classes/modèles PascalCase : CommissionApporteurService, PartenaireRepository
## Constantes
## SCREAMING_SNAKE_CASE : DEFAULT_COMMISSION_RATE,
## SEUIL_REVERSEMENT
Routes API REST : GET /api/formations, POST /api/partenaires/:id/formations
Structure dossiers src/modules/{module}/controller, service, repository, routes, dto
Tests *.test.js — un fichier par service
Environnement .env — jamais de secrets en dur


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 6
- Tableau des Cas d'Utilisation

ID Intitulé Acteur Principal Module
UCS00 S'inscrire sur la Plateforme Apprenant MOD-02
UCS01 Authentifier un Utilisateur Tous acteurs MOD-01
UCS02 Gérer les Comptes Utilisateurs Administrateur MOD-02
UCS03 Gérer un Compte Organisation Organisation MOD-02
UCS03.1 Abonnement Institutionnel Admin + Gestionnaire MOD-15
UCS03.2 Abonnement B2B Organisation MOD-15
UCS04 Gérer les Formations Admin / Responsable MOD-03
UCS05 Gérer les Sessions de Formation Superviseur / Scheduler MOD-04
UCS06 Gérer les Vouchers
## Organisation / Agent
## Comptable
## MOD-07
## UCS07
S'inscrire à une Session (bifurcation
## RM-140)
Apprenant MOD-05
## UCS08
Traiter un Dossier (Premium +
Retail — RM-140)
Responsable / Scheduler MOD-05
## UCS09
Gérer les Paiements +
## Commissions
## Apprenant / Agent
## Comptable
## MOD-06
## UCS09.1
## Renouvellement Abonnement
## Automatique
Scheduler MOD-15
UCS10 Tableau de Bord et Rapports Tous rôles MOD-08
UCS11 Espace Apprenant Apprenant MOD-09
UCS11.1 Gestion Abonnement Retail Apprenant MOD-15
UCS12 Espace Organisation Organisation MOD-10
UCS12.1 Dashboard Abonnement B2B Organisation MOD-15
## UCS13
## Configuration Module Abonnement
## Admin
Administrateur MOD-15
## UCS14
Accéder à une Formation à la
## Demande
Apprenant MOD-05
## UCS15
## Bot Conseiller Apprenant (règles
métier)
Apprenant / Système MOD-14
## UCS16
## Bot Conseiller Organisation (règles
métier)
Organisation / Système MOD-14
UCS17 Espace Partenaire Fournisseur Partenaire / Admin MOD-12
UCS18 Validation Formation Partenaire Responsable désigné MOD-12
UCS19 Voucher Apporteur d'Affaires Apporteur / Admin MOD-13
UCS20 Espace Apporteur d'Affaires Apporteur MOD-13

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 7
MT-01 Journalisation des Actions Système (automatique) MOD-11
## MT-02
Chiffrement des Données
## Échangées
Système (automatique) MOD-11


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 8
## 3. Règles Métier — Synthèse
Les 148 règles métier sont spécifiées exhaustivement dans les Specs Fonctionnelles v4.8. Ce
tableau récapitule les groupes et leurs modules d'implémentation.

Groupe RM Nb Module(s)
## Inscriptions
RM-01 à
## RM-05
## 5 MOD-05
## Paiements
RM-06 à
## RM-10
## 5 MOD-06
## Formations
RM-11 à
## RM-13
## 3 MOD-03
## Sessions
RM-14 à
## RM-21
## 8 MOD-04
## Planification
RM-22 à
## RM-25
## 4 MOD-04
## Espace Apprenant
RM-26 à
## RM-27
## 2 MOD-09
## Auto-inscription
RM-28 à
## RM-33
## 6 MOD-02
## Profils, Organisations,
## Vouchers
RM-34 à
## RM-49
## 16 MOD-02, MOD-07
## Abonnements
## Institutionnels
RM-50 à
## RM-59
## 10 MOD-15
Abonnements B2B
RM-60 à
## RM-69
## 10 MOD-15
## Abonnements Retail
RM-70 à
## RM-79
## 10 MOD-15
## Abonnements
## Organisation
RM-80 à
## RM-85
## 6 MOD-15
## Formations Premium
RM-86 à
## RM-90
## 5 MOD-03, MOD-06
Formations à la Demande
RM-91 à
## RM-96
## 6 MOD-03, MOD-05
## Multi-langue
RM-97 à
## RM-101
## 5 MOD-11
## Éligibilité Abonnement
RM-102 à
## RM-103
## 2 MOD-15
## Corrections Workflow
## Abonnements
RM-104 à
## RM-114
## 11 MOD-15
## Bot Conseiller — Règles
## Métier
RM-115 à
## RM-125
## 11 MOD-14
## Partenaires Fournisseurs
## & Commissions
RM-126 à
## RM-140
## 15 MOD-12

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 9
## Voucher Apporteur
d'Affaires
RM-141 à
## RM-148
## 8 MOD-13

3.1 Règle clé — Bifurcation RM-140
## Cas Condition Flux
Standard (toute source) type=Standard
Paiement direct — pas de
vérification Responsable
Premium + B2B/Inst/Voucher type=Premium, source≠Retail
Paiement direct — pas de
vérification
Premium + Retail type=Premium, source=Retail
Vérification Responsable (UCS08)
obligatoire
À la demande mode=À la demande
Accès direct via UCS14 — pas de
dossier

3.2 Règle clé — Commission Partenaire (RM-129, RM-137)
Prix catalogue = prix_coutant_valide / (1 - commission_forges / 100)
Montant reversé = prix_catalogue × (1 - commission_forges / 100)  [=
prix_coutant_valide]

3.3 Règle clé — Commission Apporteur (RM-145)
Commission apporteur = montant_catalogue_payé × taux_commission_apporteur / 100
Sans plafond mensuel. Code UUID permanent. Non cumulable avec autre voucher (sauf réduction
abonné -15% RM-88).

3.4 Table de Référence Complète — 148 Règles par Service
Ce tableau liste toutes les règles métier avec leur service d'implémentation et leur criticité. Les règles
marquées ⚠️ ont un impact direct sur des transitions d'état ou des validations critiques — elles doivent
être vérifiées AVANT toute écriture en base.

RM Règle Service responsable Criticité
## RM-
## 01
Unicité dossier actif par
apprenant/session
InscriptionService.checkUnicite()
## ⚠️ Non-
## Prisma
## RM-
## 02
places=0 → fermeture
automatique inscriptions
InscriptionService.checkCapacity() ⚠️ Critique
## RM-
## 03
## EN_ATTENTE_VERIFICATION
non traités → ARCHIVE
## (scheduler)
SessionScheduler ⚠️ Critique
## RM-
## 04
Délai de traitement configurable DossierService — config Normale
## RM-
## 05
RETENU irréversible — jamais
rétrogradable
DossierService.validerTransition()
## ⚠️ Non-
## Prisma
## RM-
## 06
1 seul paiement validé par
dossier — doublon bloqué
PaiementService.checkDoublon() ⚠️ Critique

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 10
## RM-
## 07
72h délai paiement
(Premium+Retail) — scheduler
annulation
PaiementService + SessionScheduler
## ⚠️ Non-
## Prisma
## RM-
## 08
Max 3 tentatives paiement —
blocage temporaire
PaiementService.checkTentatives()
## ⚠️ Non-
## Prisma
## RM-
## 09
Webhook paiement asynchrone
— retry 5min/1h
WebhookController + PaiementService ⚠️ Critique
## RM-
## 10
Pas de remboursement
automatique — manuel Agent
## Comptable
PaiementService — commentaire Normale
## RM-
## 11
Formation avec paiements →
archivage obligatoire (pas de
suppression)
FormationService.delete() ⚠️ Critique
## RM-
## 12
Tarif non modifiable après 1ère
inscription
FormationService.update() ⚠️ Critique
## RM-
## 13
Formation archivée NE PEUT
PAS être réactivée — recréer
FormationService — ⚠️ CORRIGÉ v4.8 ⚠️ Critique
## RM-
## 14
4 dates obligatoires : ouverture,
clôture, début, fin
SessionService.create()
## ⚠️ Non-
## Prisma
## RM-
## 15
Unicité apprenant/formation
cross-sessions
InscriptionService.checkUniciteFormation()
## ⚠️ Non-
## Prisma
## RM-
## 16
Ordre chronologique dates —
ouverture ≤ clôture ≤ début ≤ fin
SessionService.validerDates()
## ⚠️ Non-
## Prisma
## RM-
## 17
Non-chevauchement sessions
d'une même formation
SessionService.checkChevauchement()
## ⚠️ Non-
## Prisma
## RM-
## 18
Capacité → GRIS (≤+10%),
## EXCEPTION (>+10%)
InscriptionService.determinerStatut()
## ⚠️ Non-
## Prisma
## RM-
## 19
GRIS/EXCEPTION prioritaires
dans liste Responsable
DossierRepository.findPrioritaires() ⚠️ Critique
## RM-
## 20
Transitions auto sessions
## (scheduler 00h00)
SessionScheduler.checkTransitions() Scheduler
## RM-
## 21
Archivage auto sessions +90j SessionScheduler.archiverAnciennes() Scheduler
## RM-
## 22
Formation visible SI session À
venir/Ouverte OU mode=À la
demande ACTIVE
FormationRepository.findCatalogue() ⚠️ Critique
## RM-
## 23
Avec session →
## EN_ATTENTE_PLANIFICATION
si aucune session
FormationService.post-create() Normale
## RM-
## 24
Modification dates session avec
inscrits → notification
## Responsable
SessionService.update() Normale
## RM-
## 25
Planification annuelle —
fréquence + 1ère date +
capacité
SessionService.createBulk() Normale

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 11
## RM-
## 26
Attestation UNIQUEMENT si
dossier=PAYE ET
session=CLOTUREE
EspaceApprenantService.getAttestation() ⚠️ Critique
## RM-
## 27
Annulation volontaire
UNIQUEMENT si
## EN_ATTENTE_VERIFICATION
DossierService.annulerVolontaire() ⚠️ Critique
## RM-
## 28
Email unique — insensible à la
casse
ApprenantService.register()
## ⚠️ Non-
## Prisma
## RM-
## 29
UCS00 → rôle APPRENANT
fixe — aucune élévation
ApprenantService.register() ⚠️ Critique
## RM-
## 30
Token confirmation 24h —
compte purgé après 7j
ApprenantService + scheduler Normale
## RM-
## 31
Email existant → message
générique (pas d'info sur état
compte)
ApprenantService.register() ⚠️ Sécurité
## RM-
## 32
Max 5 tentatives
inscription/IP/heure → blocage
## 30min
RateLimiter (MOD-11) ⚠️ Sécurité
## RM-
## 33
Consentement RGPD conservé
même après suppression
compte
ApprenantService.delete() ⚠️ RGPD
## RM-
## 34
type_apprenant obligatoire —
non modifiable après activation
ApprenantService.register() + DTO ⚠️ Critique
## RM-
## 35
secteur_activite obligatoire si
type=PROFESSIONNEL
DTO Zod refine() ⚠️ Critique
## RM-
## 36
niveau_etude obligatoire si
type=APPRENANT
DTO Zod refine() ⚠️ Critique
## RM-
## 37
Voucher toujours lié à une
formation spécifique
VoucherValidationService.validate() ⚠️ Critique
## RM-
## 38
Voucher Org usage unique par
bénéficiaire
VoucherValidationService.checkUsage()
## ⚠️ Non-
## Prisma
## RM-
## 39
Voucher promo : BROUILLON
→ validation Superviseur →
## ACTIF
VoucherService.valider() ⚠️ Critique
## RM-
## 40
Quota et expiration obligatoires
— non modifiables après
activation
VoucherService + DTO ⚠️ Critique
## RM-
## 41
Voucher Org → dossier PAYE
automatiquement sans UCS09
InscriptionService.appliquerVoucherOrg() ⚠️ Critique
## RM-
## 42
Voucher promo → réduction sur
solde dû
InscriptionService.appliquerVoucherPromo() Normale
## RM-
## 43
Identifiant légal unique par type
## Organisation
OrganisationService.register()
## ⚠️ Non-
## Prisma

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 12
## RM-
## 44
TDB RH → uniquement
inscriptions bénéficiaires
voucher org
EspaceOrgRepository.findBeneficiaires() Normale
## RM-
## 45
Rejet dossier avec voucher Org
→ voucher libéré
DossierService.refuser() ⚠️ Critique
## RM-
## 46
Org GOUVERNEMENT →
plusieurs sous-types simultanés
OrganisationService — tableau sous_types[] ⚠️ Critique
## RM-
## 47
Libellé contact référent
dynamique selon type
OrganisationService — libellé adaptatif Normale
## RM-
## 48
pays_residence/nationalite
obligatoires ISO 3166-1
DTO Zod + ApprenantService ⚠️ Critique
## RM-
## 49
Document complémentaire
optionnel PDF/JPG/PNG max
5Mo
FileUploadService + DTO Normale
## RM-
## 50
Contrat lié à un programme —
pas de mutualisation
ContratInstitutionnelService Normale
## RM-
## 51
SaaS annuel facturé en totalité à
activation
ContratInstitutionnelService.activer() ⚠️ Critique
## RM-
## 52
Fees par certifié — facturés
mensuellement si cumul > seuil
ContratInstitutionnelService + scheduler Critique
## RM-
## 53
Apprenant institutionnel peut
avoir compte Retail individuel
Aucune contrainte — comportement normal Info
## RM-
## 54
Gestionnaire Institution → ne
peut pas modifier tarifs
RoleGuard — GESTIONNAIRE restrictions ⚠️ Sécurité
## RM-
## 55
Certification tracée avec code
contrat INST-AAAA-NNN
AttestationService.generate() Normale
## RM-
## 56
Alertes expiration contrat J-60/J-
## 30
AlerteAbonnementScheduler ⚠️ Scheduler
## RM-
## 57
Expiration contrat → accès
Gestionnaires suspendu
ContratInstitutionnelService + scheduler ⚠️ Critique
## RM-
## 58
Renouvellement = nouveau
contrat lié à historique
ContratInstitutionnelService.renouveler() Normale
## RM-
## 59
Enrôlement individuel ou CSV —
lié au code contrat
ContratInstitutionnelService.enroller() Normale
## RM-
## 60
AbonnementB2B lié à
Organisation (tous types)
AbonnementB2BService Normale
## RM-
## 61
nb_actifs ne peut dépasser
nb_max palier
AbonnementB2BService.ajouterApprenant() ⚠️ Critique
## RM-
## 62
Certifications B2B conservées
après désactivation apprenant
AbonnementB2BService.desactiverApprenant()
## ⚠️
## CRITIQUE
— ne jamais
supprimer
## RM-
## 63
Facturation B2B annuelle non
remboursable
AbonnementB2BService — commentaire Info

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 13
## RM-
## 64
Premium facturé séparément
sauf Enterprise (RM-89)
EligibiliteService.checkPremiumInclus() ⚠️ Critique
## RM-
## 65
Apprenant B2B peut avoir
compte Retail individuel
Aucune contrainte Info
## RM-
## 66
Alertes expiration B2B J-45/J-15 AlerteAbonnementScheduler Scheduler
## RM-
## 67
Suspension accès B2B à
expiration
AbonnementB2BService + scheduler ⚠️ Critique
## RM-
## 68
Montée palier B2B prorata
immédiate
AbonnementB2BService.monterPalier() ⚠️ Critique
## RM-
## 69
Alerte palier atteint →
proposition montée
AbonnementB2BService.checkPlafond() Normale
## RM-
## 70
1 seul AbonnementRetail actif
par apprenant
AbonnementRetailService.souscrire() ⚠️ Critique
## RM-
## 71
Premium jamais inclus
abonnement Retail standard
EligibiliteService.calculerInclus() ⚠️ Critique
## RM-
## 72
Max 3 formations actives
simultanées Retail
AbonnementRetailService.checkNbFormations() ⚠️ Critique
## RM-
## 73
Grâce 48h si échec prélèvement
## Retail
RenouvellementScheduler ⚠️ Scheduler
## RM-
## 74
## Données/certifications
conservées après résiliation
AbonnementRetailService.resilier() — ne pas supprimer ⚠️ RGPD
## RM-
## 75
Consentement renouvellement
auto obligatoire
AbonnementRetailService.souscrire() + DTO ⚠️ RGPD
## RM-
## 76
Suspension 1x/trimestre max —
1 mois max
AbonnementRetailService.suspendre() ⚠️ Critique
## RM-
## 77
Résiliation effective fin de
période payée
AbonnementRetailService.resilier() Normale
## RM-
## 78
Réactivation après suspension
→ cycle reprend à date
réactivation
AbonnementRetailService.reactiver() Normale
## RM-
## 79
Upgrade Essentiel→Premium :
prorata + immédiat
AbonnementRetailService.upgrader() ⚠️ Critique
## RM-
## 80
AbonnementOrganisation requis
après essai gratuit
OrganisationService + scheduler ⚠️ Critique
## RM-
## 81
Essai gratuit 30j toute nouvelle
## Organisation
OrganisationService.activer() ⚠️ Critique
## RM-
## 82
Alertes fin essai J-7/J-2 AlerteAbonnementScheduler Scheduler
## RM-
## 83
Accès suspendu à J+30 sans
abonnement
OrganisationService + scheduler ⚠️ Critique
## RM-
## 84
1 seul AbonnementOrganisation
actif par Organisation
AbonnementOrgService.souscrire() ⚠️ Critique

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 14
## RM-
## 85
Offre bienvenue -20% à J+25 OrganisationService + scheduler Normale
## RM-
## 86
type_formation = responsabilité
FORGES exclusivement
FormationService + DTO partenaire (absent)
## ⚠️
## CRITIQUE
## RM-
## 87
Premium jamais inclus
abonnements Standard
EligibiliteService.calculerInclus() ⚠️ Critique
## RM-
## 88
Réduction -15% abonnés actifs
sur Premium
PaiementService.appliquerReduction() ⚠️ Critique
## RM-
## 89
## Enterprise = 2 Premium
inclus/an — compteur réinitialisé
AbonnementB2BService.checkPremiumInclus() ⚠️ Critique
## RM-
## 90
Badge Premium + prix -15%
affiché dans catalogue pour
abonnés
FormationRepository.findCatalogue() — champ
abonne_actif
## Normale
## RM-
## 91
mode_formation obligatoire —
conditionne flux UCS07 vs
## UCS14
FormationService.create() + DTO ⚠️ Critique
## RM-
## 92
Accès limité à
duree_acces_jours (défaut 365j)
AccesFormationDemandeService.create() ⚠️ Critique
## RM-
## 93
Accessible immédiatement
après paiement — statut
ACTIVE dès création
AccesFormationDemandeService ⚠️ Critique
## RM-
## 94
Standard à la demande incluse
abonnement (RM-102)
EligibiliteService.calculerInclus() Normale
## RM-
## 95
Premium à la demande = achat
unitaire même abonnés
AccesFormationDemandeService.verifierAcces() ⚠️ Critique
## RM-
## 96
mode=A_LA_DEMANDE → pas
de session possible
SessionService.create() — bloquer ⚠️ Critique
## RM-
## 97
4 langues : FR (défaut), EN, ES,
## PT
Enum Langue + champ langue_preferee Normale
## RM-
## 98
langue_preferee dans profil —
fallback navigateur → FR
TraductionService.detecterLangue() Normale
## RM-
## 99
Traduction absente → FR +
bandeau + indicateur Admin
TraductionService.getTraduction() ⚠️ Critique
## RM-
## 100
Emails dans langue_preferee
destinataire — fallback FR
EmailService.send() — paramètre langue ⚠️ Critique
## RM-
## 101
Interface en 4 langues — react-
i18next frontend
Frontend i18n — fichiers /locales/ Normale
## RM-
## 102
inclus_abonnement =
type=STANDARD ET pilier ∈
## {RETAIL,TOUS}
EligibiliteService.calculerInclus()
## ⚠️ Non-
## Prisma
## RM-
## 103
AccesFormationDemande
suspendu si abonnement inactif
AbonnementRetailService +
AccesFormationDemandeService
## ⚠️ Critique
## RM-
## 104
Downgrade planifié — effectif fin
de période
AbonnementRetailService.downgrader() Normale

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 15
## RM-
## 105
AccesFormationDemande
suspendu pendant suspension
abonnement
AbonnementRetailService.suspendre() ⚠️ Critique
## RM-
## 106
Premier mois prorata : montant
× jours_restants / jours_mois
AbonnementRetailService.souscrire() ⚠️ Critique
## RM-
## 107
Grille tarifaire
AbonnementOrganisation
(Basique/Pro/Enterprise)
AbonnementOrgService — config Normale
## RM-
## 108
Contenu détaillé par offre
## Organisation
AbonnementOrgService — enum fonctionnalités Normale
## RM-
## 109
## Renouvellement
AbonnementOrganisation auto
— alertes J-30/J-7
RenouvellementScheduler + AlerteScheduler Scheduler
## RM-
## 110
Descente palier B2B effective au
renouvellement annuel
AbonnementB2BService.descendrePalier() Normale
## RM-
## 111
AccesFormationDemande
source=B2B suspendu si B2B
expire
AbonnementB2BService.expirer() ⚠️ Critique
## RM-
## 112
1 à 5 gestionnaires selon offre
(Basique/Pro=1, Enterprise=5)
ContratInstitutionnelService.ajouterGestionnaire() ⚠️ Critique
## RM-
## 113
Avenant = modifie fee/date de
fin — pas le SaaS déjà facturé
ContratInstitutionnelService.creerAvenant() ⚠️ Critique
## RM-
## 114
Seuil fees défaut 25 000 XOF —
report si inférieur
ContratInstitutionnelService — config Normale
## RM-
## 115
Déclenchement bot : manuel ou
conditions auto
BotConseillerService.determinerFlux() ⚠️ Critique
## RM-
## 116
Règles fixes routage flux (profil,
palier, feedback, catalogue)
BotConseillerService.evaluerReglesRM116() ⚠️ Critique
## RM-
## 117
LLM SUPPRIMÉ — 100% règles
métier — aucune API externe
BotConseillerService — ⚠️ NE PAS intégrer LLM
## ⚠️
## Architectural
## RM-
## 118
Questions FERMÉES
uniquement — options[]
obligatoire
BotQuestion DTO + BotConseillerService ⚠️ Critique
## RM-
## 119
Suggestion upgrade si condition
satisfaite
UpgradeService.evaluerCondition() Normale
## RM-
## 120
Refus upgrade → cooldown 7j
— 3 refus → 30j
UpgradeService.enregistrerRefus() ⚠️ Critique
## RM-
## 121
Flux Feedback si session
clôturée <7j + pas de feedback
BotConseillerService.detecterFeedbackManquant() ⚠️ Critique
## RM-
## 122
Questionnaire feedback 5
questions fixes — note_globale
obligatoire
FeedbackService.collecter() Normale
## RM-
## 123
Enquête catalogue 3 questions
fermées (domaine, niveau,
volume)
EnqueteCatalogueService.creer() ⚠️ Critique

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 16
## RM-
## 124
fréquence++ si enquête similaire
existante (même domaine +
niveau)
EnqueteCatalogueService.incrementerFrequence() Normale
## RM-
## 125
Bot 100% règles — aucun appel
API externe — données
confinées
BotConseillerService — aucun import externe ⚠️ Sécurité
## RM-
## 126
Flux A invitation (token 48h) et
Flux B auto-inscription
PartenaireService.inviter() / register() Normale
## RM-
## 127
type_formation et pilier
## EXCLUSIVEMENT FORGES —
absent du DTO partenaire
FormationPartenaireService.valider() + DTO rejet
## ⚠️
## CRITIQUE
## RM-
## 128
Validation par Responsable
désigné uniquement
RoleGuard.checkResponsableDesigne() ⚠️ Sécurité
## RM-
## 129
FORGES encaisse prix
catalogue — Partenaire reçoit
prix coûtant net
PaiementService + CommissionPartenaireService ⚠️ Critique
## RM-
## 130
TDB Partenaire → jamais
commission_forges_pct ni
prix_catalogue
PartenaireRepository.findDashboard() — champs exclus
## ⚠️
## CRITIQUE
## RM-
## 131
Suspension formation Active →
invisible + notification
FormationPartenaireService.suspendre() Normale
## RM-
## 132
Reversement mensuel
formations incluses abonnement
CommissionPartenaireService.calculerReversementInclus() ⚠️ Critique
## RM-
## 133
## Désactivation Partenaire →
préavis 30j sauf faute grave
PartenaireService.suspendre() Normale
## RM-
## 134
Alerte délai validation J+5/J+10 AlerteValidationScheduler Scheduler
## RM-
## 135
Bot recommande formations
partenaires ACTIVE au même
titre
OrientationService — inclure formations partenaires
## ACTIVE
## Normale
## RM-
## 136
Formulaire soumission 21
champs — type_formation
## ABSENT
CreateFormationPartenaireDto — validation Zod
## ⚠️
## CRITIQUE
## RM-
## 137
prix_catalogue calculé
automatiquement =
prix_coutant/(1-commission%)
CommissionPartenaireService.calculerPrixCatalogue() ⚠️ Critique
## RM-
## 138
Reversement mensuel
partenaire si cumul > seuil
CommissionPartenaireService.reverserMensuel() ⚠️ Critique
## RM-
## 139
TDB reversements Agent
## Comptable
CommissionPartenaireService.getTdbAgent() Normale
## RM-
## 140
Bifurcation inscription :
Premium+Retail → UCS08,
sinon → paiement direct
InscriptionService.bifurquer()
## ⚠️
## CRITIQUE
## RM-
## 141
Apporteur = Individu ou
Organisation — taux défaut 5%
ApporteurService.create() Normale

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 17
## RM-
## 142
Code UUID permanent généré à
activation — ne change jamais
ApporteurService.activer() ⚠️ Critique
## RM-
## 143
Validation code : Actif +
type=APPORTEUR + non-cumul
VoucherApporteurService.valider() ⚠️ Critique
## RM-
## 144
Non-cumulable avec autre
voucher — sauf réduction
abonné -15%
VoucherApporteurService.checkCumul()
## ⚠️ Non-
## Prisma
## RM-
## 145
Commission = montant ×
taux/100 — créée après
webhook SUCCESS
PaiementService.createCommissionApporteur() ⚠️ Critique
## RM-
## 146
Agrégation mensuelle J+1 :
## EN_ATTENTE → VALIDEE
ReversementApporteurScheduler.agreguer() Scheduler
## RM-
## 147
Reversement si cumul >= seuil
— sinon report
ReversementApporteurScheduler.reverser() ⚠️ Critique
## RM-
## 148
TDB mensuel Superviseur +
## Agent Comptable
CommissionApporteurService.getTdbMensuel() Normale


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 18
- Description des Modules

MOD-01 — Module Authentification & Sécurité
## Description
Gère l'identité de tous les acteurs. 9 rôles en v1.3 : ADMIN, RESPONSABLE, SUPERVISEUR,
## AGENT, APPRENANT, ORGANISATION, GESTIONNAIRE, PARTENAIRE, APPORTEUR.

## Composants
## Composant Type Rôle
AuthController Controller Endpoints authentification
AuthService Service Logique JWT, refresh, bcrypt coût 12
UserRepository Repository Accès BDD Utilisateur
JwtMiddleware Middleware Validation token JWT
RoleGuard Middleware RBAC — 9 rôles
TokenBlacklist Cache Redis Tokens révoqués (logout)

Endpoints API
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

Cas d'utilisation implémentés
## UCS01

MOD-02 — Module Gestion des Comptes
## Description
Gère Apprenants, Organisations, utilisateurs backoffice. En v1.3 : invitation Partenaires (Flux A —
MOD-12) et création Apporteurs (MOD-13).

## Composants
## Composant Type Rôle
ApprenantController Controller Auto-inscription et profil Apprenant
OrganisationController Controller Création et gestion Organisation
AdminUserController Controller Comptes backoffice, invitations Partenaire/Apporteur
ApprenantService Service Logique inscription (RM-28 à RM-36)
OrganisationService Service Validation identifiant légal, essai 30j (RM-80 à RM-85)

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 19
EmailService Service partagé Emails de confirmation (token UUID 24h — RM-30)

Endpoints API
- POST /api/apprenants/register
- GET /api/apprenants/confirm/:token
- POST /api/organisations/register
- GET /api/organisations/confirm/:token
- POST /api/admin/users
- PUT /api/admin/users/:id/status
- POST /api/admin/partenaires — invitation Flux A (RM-126)
- POST /api/admin/apporteurs — création Apporteur (RM-141)

Cas d'utilisation implémentés
## UCS00 · UCS02 · UCS03

MOD-03 — Module Catalogue de Formations
## Description
Cycle de vie formations internes. En v1.3 : type_formation assigné exclusivement par FORGES (RM-
86, RM-127), calcul automatique inclus_abonnement (RM-102).

## Composants
## Composant Type Rôle
FormationController Controller CRUD formations
FormationService Service Logique métier (RM-11 à RM-13, RM-86, RM-102)
FormationRepository Repository Accès BDD Formation
CatalogueController Controller Catalogue public filtrable
EligibiliteService Service Calcul inclus_abonnement (RM-102)
MediaService Service partagé Upload brochures PDF, vidéos

Endpoints API
- GET /api/formations
- POST /api/formations
- PUT /api/formations/:id
- PUT /api/formations/:id/archive
- GET /api/formations/:id/accessibilite?apprenant_id=

Cas d'utilisation implémentés
## UCS04 · UCS14

MOD-04 — Module Sessions de Formation
## Description

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 20
Planification et cycle de vie sessions (formations Avec session uniquement — RM-91, RM-96).
Scheduler 00h00 pour transitions automatiques.

## Composants
## Composant Type Rôle
SessionController Controller CRUD sessions
SessionService Service Logique planification (RM-14 à RM-21)
SessionRepository Repository Accès BDD Session
SessionScheduler Scheduler cron Transitions auto 00h00 (RM-20, RM-21)
NotificationService Service partagé Notifications modification sessions (RM-24)

Endpoints API
- GET /api/formations/:id/sessions
- POST /api/formations/:id/sessions
- PUT /api/sessions/:id
- POST /api/formations/:id/sessions/bulk — planification annuelle (RM-25)

Cas d'utilisation implémentés
## UCS05

MOD-05 — Module Inscriptions & Dossiers
## Description
Cœur fonctionnel. En v1.3 : bifurcation RM-140 (paiement direct vs vérification), formations à la
demande (UCS14), validation code apporteur (RM-143, RM-144).

## Composants
## Composant Type Rôle
InscriptionController Controller Soumission dossier (Apprenant)
DossierController Controller
Traitement dossiers Premium+Retail
(Responsable)
InscriptionService Service Logique soumission + bifurcation RM-140
DossierService Service
Retenu/Rejeté/Annulé (Premium+Retail
uniquement)
AccesFormationDemandeService Service
Accès formations à la demande (RM-92, RM-
## 103, RM-111)
VoucherValidationService
## Service
partagé
Validation vouchers + code apporteur (RM-143,
## RM-144)

Endpoints API
- POST /api/sessions/:id/inscrire — bifurcation RM-140

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 21
- POST /api/formations/:id/acceder — accès à la demande (UCS14)
- GET /api/dossiers
- PUT /api/dossiers/:id/retenir
- PUT /api/dossiers/:id/refuser
- DELETE /api/dossiers/:id — annulation volontaire (RM-27)

Cas d'utilisation implémentés
## UCS07 · UCS08 · UCS14

MOD-06 — Module Paiements & Commissions
## Description
Intégration agrégateur, transactions, calcul commissions. En v1.3 : commission partenaire (RM-129,
RM-137), commission apporteur (RM-145), reversements mensuels (RM-138, RM-147).

## Composants
## Composant Type Rôle
PaiementController Controller Initiation et suivi paiement
WebhookController Controller Callbacks agrégateur (RM-09)
PaiementService Service
Paiement + calcul commissions partenaire et
apporteur
CommissionPartenaireService Service
Calcul prix catalogue (RM-137), reversements
## (RM-138)
CommissionApporteurService Service
Calcul, agrégation et reversement commissions
apporteurs (RM-145 à RM-148)
AggregateurClient Client HTTP Appels API paiement externe
AttestationService Service Génération PDF attestation (RM-26)

Endpoints API
- POST /api/paiements/initier
- POST /api/paiements/webhook
- GET /api/dossiers/:id/attestation
- GET /api/partenaires/:id/reversements
- POST /api/admin/reversements/partenaires
- GET /api/apporteurs/:id/commissions
- POST /api/admin/reversements/apporteurs

Cas d'utilisation implémentés
## UCS09

MOD-07 — Module Vouchers
## Description

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 22
Deux types : Organisation (Flux A) et Promotionnel (Flux B). Le Voucher Apporteur est géré dans
MOD-13. Validation non-cumul (RM-144).

## Composants
## Composant Type Rôle
VoucherController Controller Gestion vouchers
VoucherService Service Flux A et Flux B (RM-37 à RM-42)
VoucherRepository Repository Accès BDD Voucher
VoucherValidationService Service partagé Validation (RM-143, RM-144) partagé MOD-05
QuotaService Service Quota et expiration (RM-40)

Endpoints API
- POST /api/vouchers/organisation
- POST /api/vouchers/promo
- PUT /api/vouchers/:id/valider
- GET /api/vouchers/:code/check

Cas d'utilisation implémentés
## UCS06 · UCS12

MOD-08 — Module Tableaux de Bord & Rapports
## Description
Vues analytiques personnalisées. En v1.3 : vue Partenaire (RM-130), vue Apporteur (RM-148), onglet
reversements Agent Comptable.

## Composants
## Composant Type Rôle
DashboardController Controller KPI par rôle (9 vues)
ReportController Controller Génération PDF, CSV, Excel
DashboardService Service Agrégation métriques selon profil
StatsRepository Repository Requêtes analytiques (vues matérialisées PostgreSQL)

Endpoints API
- GET /api/dashboard
- GET /api/reports/inscriptions
- GET /api/reports/paiements
- GET /api/reports/partenaires
- GET /api/reports/apporteurs
- GET /api/reports/:id/export?format=

Cas d'utilisation implémentés

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 23
## UCS10

MOD-09 — Module Espace Apprenant
## Description
Interface personnelle. En v1.3 : dossiers Standard (payés directement) et Premium+Retail,
AccesFormationDemande avec statuts RM-103/RM-111.

## Composants
## Composant Type Rôle
EspaceApprenantController Controller Agrégation données personnelles
EspaceApprenantService Service Logique espace personnel (RM-26, RM-27, RM-103)
NotificationService Service partagé Notifications email et in-app

Endpoints API
- GET /api/espace-apprenant/dashboard
- GET /api/espace-apprenant/dossiers
- GET /api/espace-apprenant/acces-formations
- GET /api/espace-apprenant/attestations
- DELETE /api/espace-apprenant/dossiers/:id — annulation (RM-27)

Cas d'utilisation implémentés
## UCS11 · UCS11.1

MOD-10 — Module Espace Organisation
## Description
Interface Organisations. En v1.3 : double abonnement (AbonnementOrganisation + AbonnementB2B),
dashboard B2B, Bot Conseiller (UCS16).

## Composants
## Composant Type Rôle
EspaceOrgController Controller Tableau de bord Organisation
EspaceOrgService Service Logique espace (RM-44, RM-45, RM-80 à RM-85)
BeneficiaireService Service Suivi inscriptions membres (RM-44)
AbonnementOrgService Service
Essai 30j, AbonnementOrganisation (RM-107 à RM-
## 109)

Endpoints API
- GET /api/espace-organisation/dashboard
- GET /api/espace-organisation/beneficiaires
- PUT /api/espace-organisation/profil
- POST /api/espace-organisation/abonnement/souscrire

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 24

Cas d'utilisation implémentés
## UCS12 · UCS12.1

MOD-11 — Module Transversal — Journalisation & Sécurité
## Description
MT-01 et MT-02 actifs sur tous les modules. En v1.3 : nouvelles actions tracées partenaires,
apporteurs, bot.

## Composants
## Composant Type Rôle
AuditLogger
## Middleware
global
Journalisation 30+ types d'actions (MT-01) — append-only
EncryptionService Service partagé AES-256-GCM (MT-02)
TraductionService Service Multi-langue FR/EN/ES/PT (RM-97 à RM-101)
SecurityHeaders
## Middleware
global
HSTS, CSP, X-Frame-Options, CORS
RateLimiter
## Middleware
global
Brute-force Redis (RM-32)
HealthController Controller GET /health

Endpoints API
- GET /api/audit-logs — Admin uniquement
- GET /health
- GET /api/admin/traductions/manquantes

Cas d'utilisation implémentés
## MT-01 · MT-02

MOD-12 — Module Partenaires Fournisseurs (v1.3)
## Description
Nouveau module v1.3. Deux modes inscription (RM-126), soumission 21 champs (RM-136), validation
avec assignation type_formation par FORGES (RM-127, RM-128), calcul prix catalogue (RM-137),
reversements (RM-138).

## Composants
## Composant Type Rôle
PartenaireController Controller Espace Partenaire (Flux A et Flux B)
FormationPartenaireService Service
Workflow validation, assignation type_formation
## (RM-127, RM-128)

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 25
CommissionPartenaireService Service
Calcul prix catalogue (RM-137), reversements
## (RM-138, RM-139)
PartenaireRepository Repository Accès BDD Partenaire
AlerteValidationScheduler Scheduler Alertes J+5/J+10 (RM-134)

Endpoints API
- POST /api/admin/partenaires — invitation Flux A
- POST /api/partenaires/register — auto-inscription Flux B
- POST /api/partenaires/:id/formations — soumission (RM-136, SANS type_formation)
- PUT /api/responsable/formations/:id/valider — assignation type + prix (RM-127)
- PUT /api/responsable/formations/:id/rejeter
- PUT /api/responsable/formations/:id/suspendre
- GET /api/partenaires/:id/reversements

Cas d'utilisation implémentés
## UCS17 · UCS18

MOD-13 — Module Apporteurs d'Affaires (v1.3)
## Description
Nouveau module v1.3. Code UUID permanent (RM-142), commission % CA (RM-145), agrégation
mensuelle (RM-146), reversement conditionnel (RM-147), tableau de bord dédié UCS20.

## Composants
## Composant Type Rôle
ApporteurController Controller Espace Apporteur (UCS20)
ApporteurService Service
Inscription, activation, code UUID (RM-141,
## RM-142)
VoucherApporteurService Service Code apporteur, non-cumul (RM-143, RM-144)
CommissionApporteurService Service
Calcul (RM-145), agrégation (RM-146),
reversement (RM-147)
ReversementApporteurScheduler Scheduler Agrégation J+1 fin de mois (RM-146, RM-147)

Endpoints API
- POST /api/admin/apporteurs — création Admin
- POST /api/apporteurs/register — auto-inscription
- GET /api/apporteurs/:id/dashboard — code, stats, commissions (UCS20)
- GET /api/apporteurs/:id/commissions?mois=
- GET /api/apporteurs/:id/reversements
- GET /api/apporteurs/:id/export?format=pdf
- POST /api/admin/reversements/apporteurs/:id/valider
- GET /api/vouchers/apporteur/:code/check — RM-143

Cas d'utilisation implémentés
## UCS19 · UCS20

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 26

MOD-14 — Module Bot Conseiller (v1.3)
## Description
Nouveau module v1.3. 100% règles métier (RM-117 supprimée). Toutes interactions en questions
fermées (RM-118). 4 flux : orientation, upgrade, feedback, enquête catalogue. Roadmap LLM v5.x.

## Composants
## Composant Type Rôle
BotConseillerController Controller Sessions bot (UCS15, UCS16)
BotConseillerService Service Moteur règles fixes (RM-116), routage flux
OrientationService Service Filtrage catalogue par profil (RM-118)
UpgradeService Service
Suggestion upgrade (RM-119), gestion refus (RM-
## 120)
FeedbackService Service Questionnaire 5 questions (RM-122)
EnqueteCatalogueService Service Formulaire 3 questions fermées (RM-123, RM-124)

Endpoints API
- POST /api/bot/session — démarrage
- POST /api/bot/session/:id/reponse — envoi réponse (choix fermé)
- GET /api/bot/session/:id — état courant
- GET /api/admin/enquetes-catalogue — TDB enquêtes (RM-124)
- GET /api/admin/feedbacks

Cas d'utilisation implémentés
## UCS15 · UCS16

MOD-15 — Module Abonnements (v1.3)
## Description
Nouveau module v1.3 regroupant Retail mensuel, B2B annuel, Organisation annuel, Institutionnel
annuel. Prorata, montées/descentes palier, renouvellements auto, éligibilité (RM-102).

## Composants
## Composant Type Rôle
AbonnementRetailService Service RM-70 à RM-79, RM-104 à RM-106
AbonnementB2BService Service RM-60 à RM-69, RM-110, RM-111
AbonnementOrgService Service RM-80 à RM-85, RM-107 à RM-109
ContratInstitutionnelService Service RM-50 à RM-59, RM-112 à RM-114
EligibiliteService Service
Calcul inclus_abonnement (RM-102), accès
formations (RM-103)

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 27
RenouvellementScheduler Scheduler UCS09.1 : prélèvements auto J-1 (RM-75, RM-109)
AlerteAbonnementScheduler Scheduler Alertes expiration tous types abonnements

Endpoints API
- POST /api/abonnements/retail/souscrire
- PUT /api/abonnements/retail/upgrade
- PUT /api/abonnements/retail/downgrade — planifié (RM-104)
- POST /api/abonnements/b2b/souscrire
- PUT /api/abonnements/b2b/palier
- POST /api/abonnements/organisation/souscrire
- POST /api/admin/contrats/institutionnels
- POST /api/admin/contrats/:id/avenants
- GET /api/abonnements/:id/eligibilite-formations

Cas d'utilisation implémentés
## UCS03.1 · UCS03.2 · UCS09.1 · UCS11.1 · UCS12.1 · UCS13



FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 28
- Diagrammes de Séquence par Module

Les diagrammes de séquence détaillés par UCS sont disponibles dans les Specs Fonctionnelles v4.8
(UCS00 à UCS20). Ce chapitre présente les séquences clés au niveau des composants internes pour
les flux les plus critiques.

5.1 MOD-01 — Authentification (UCS01)
01 Utilisateur   → AuthController  : POST /api/auth/login {email, password}
02 AuthService   → UserRepository  : findByEmail(email)
03 [Null/inactif]→ AuthController  : 401 Unauthorized (message générique)
04 AuthService   → PasswordService : verify(password, hash) — bcrypt coût 12
05 AuthService   → AuditLogger     : log(LOGIN_SUCCESS, userId, ip)
06 AuthController→ Utilisateur     : 200 OK { accessToken (1h), refreshToken (7j) }

5.2 MOD-05 — Inscription avec bifurcation RM-140 (UCS07)
01 Apprenant     → InscriptionController : POST /api/sessions/:id/inscrire
02 InscriptionService → SessionRepository  : findById() + checkCapacity()
03 InscriptionService → DossierRepository  : existsByApprenantAndFormation() (RM-
## 15)
04 InscriptionService                       : Évalue RM-140
05 [Standard / Premium hors Retail]         : →
PaiementService.initierPaiementDirect()
→ Dossier statut PAYE_DIRECTEMENT — Responsable notifié (INFO)
06 [Premium + source=Retail]                : → Dossier EN_ATTENTE_VERIFICATION
→ EmailService.notifyResponsable(ACTION_REQUISE)

5.3 MOD-06 — Paiement + Calcul Commissions (UCS09)
01 Apprenant     → PaiementController : POST /api/paiements/initier
02 PaiementService → AggregateurClient : initPayment({montant, ref, callback_url})
03 API Externe   → WebhookController  : POST /webhook {status=SUCCESS, txId}
04 PaiementService → DossierService   : statut → PAYE
05 [Si partenaire] CommissionPartenaireService.calculate()
montant_reverse = montant × (1 - commission_forges/100)  — RM-129
06 [Si code_apporteur] CommissionApporteurService.create()
commission = montant × taux_apporteur/100  — RM-145 (statut=EN_ATTENTE)
07 AuditLogger : PAIEMENT_CONFIRME + COMMISSION_PARTENAIRE + COMMISSION_APPORTEUR

5.4 MOD-12 — Validation Formation Partenaire (UCS18)
01 Partenaire    → FormationPartenaireController : POST /partenaires/:id/formations
02 FormationPartenaireService : Valide 21 champs RM-136 (SANS type_formation)
03 Formation statut → EN_ATTENTE_VALIDATION
04 NotificationService → Responsable désigné : alerte validation requise
05 [Responsable valide] : assigne type_formation + pilier_abonnement (RM-127)
CommissionPartenaireService.calculatePrixCatalogue(RM-137)
prix_catalogue = prix_coutant / (1 - commission_forges/100)
06 Formation statut → ACTIVE — visible dans catalogue
07 [J+5 sans traitement] AlerteValidationScheduler → Admin + Responsable (RM-134)

5.5 MOD-13 — Cycle Mensuel Commissions Apporteur (RM-146/147)
01 [J+1 fin de mois] ReversementApporteurScheduler.run()
02 CommissionApporteurRepository.findEnAttenteByMonth(mois)
03 [Par apporteur] : cumul = Σ(montant_commission du mois)
04 CommissionApporteur.statut → VALIDEE
05 [cumul >= seuil_minimum] : créer reversement, notifier Agent Comptable

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 29
06 [cumul < seuil] : report cumul au mois suivant
07 AuditLogger : REVERSEMENT_APPORTEUR_EFFECTUE

5.6 MOD-14 — Bot Conseiller (UCS15 — Flux Orientation)
01 Apprenant     → BotConseillerController : POST /api/bot/session
02 BotConseillerService.evaluerReglesFixesRM116()
03 [Flux ORIENTATION] OrientationService.getQuestion(etape=1)
→ Question liste déroulante : 'Votre secteur ?' (JAMAIS de saisie libre — RM-
## 118)
04 Apprenant     → POST /api/bot/session/:id/reponse {choix}
05 OrientationService.filtrerCatalogue(secteur, type_apprenant, historique, langue)
06 → 5 formations max avec badges Inclus / Premium (RM-118)


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 30
- Diagrammes de Séquence Inter-Modules
Ces diagrammes illustrent les interactions entre modules lors des flux complexes traversant plusieurs
domaines fonctionnels. Les diagrammes visuels sont reproduits au Chapitre 10.4.

6.1 Flux Complet : Inscription → Paiement → Attestation (Standard)
[MOD-02] Apprenant s'inscrit et confirme son email → compte ACTIF
[MOD-01] Apprenant s'authentifie → JWT obtenu
[MOD-03] Apprenant consulte le catalogue → sessions disponibles
[MOD-05] Apprenant soumet dossier → bifurcation RM-140 → paiement direct
[MOD-06] PaiementService initie paiement → webhook SUCCESS → dossier PAYÉ
[MOD-06] AttestationService génère PDF (MT-02 chiffrement)
[MOD-09] Attestation disponible dans Espace Apprenant
[MOD-11] AuditLogger trace tous les événements (MT-01)

6.2 Flux Inscription Premium+Retail → Vérification Responsable (RM-
## 140)
[MOD-05] Inscription Premium + source=Retail → dossier EN_ATTENTE_VERIFICATION
[MOD-11] DOSSIER_CREE_EN_ATTENTE journalisé
[MOD-05] Notification Responsable désigné (ACTION requise)
[MOD-05] Responsable retient → dossier RETENU — 72h
[MOD-06] Apprenant paie → webhook SUCCESS → dossier PAYÉ
[MOD-06] Commission partenaire calculée (RM-129) si applicable

## 6.3 Flux Partenaire : Soumission → Validation → Publication
[MOD-12] Partenaire soumet formation (21 champs RM-136, SANS type_formation)
[MOD-12] Notification Responsable désigné (RM-128)
[MOD-12] Responsable valide + assigne type_formation (RM-127)
[MOD-12] CommissionPartenaireService calcule prix_catalogue (RM-137)
[MOD-03] Formation → Active dans catalogue
[MOD-14] Bot Conseiller peut recommander cette formation (RM-135)

## 6.4 Flux Apporteur : Code → Transaction → Commission →
## Reversement
[MOD-13] Admin crée Apporteur → code UUID permanent généré (RM-142)
[MOD-07] VoucherValidationService.validateApporteur(code) — RM-143, RM-144
[MOD-06] Paiement confirmé → CommissionApporteurService.create() (RM-145)
[MOD-13] Fin de mois → ReversementScheduler agrège commissions (RM-146)
[MOD-13] cumul >= seuil → reversement + notification Apporteur (RM-147)

## 6.5 Flux Abonnement Retail : Souscription → Accès → Renouvellement
[MOD-15] Souscription → premier prélèvement prorata (RM-106)
[MOD-15] EligibiliteService recalcule inclus_abonnement (RM-102)
[MOD-03] Catalogue affiche badge 'Inclus abonnement'
[MOD-15] Scheduler J-1 : prélèvement automatique renouvellement (RM-75)
[MOD-15] Échec → grâce 48h → SUSPENDU (RM-73)
[MOD-05] AccesFormationDemande source=Abonnement → SUSPENDU (RM-103)

6.6 Flux Scheduler Global Inter-Modules
[MOD-04] 00h00 : SessionScheduler.checkTransitions() — transitions auto (RM-20)
[MOD-05] Sessions CLOTUREES → dossiers EN_ATTENTE archivés (RM-03)
[MOD-06] Dossiers RETENUS > 72h → ANNULÉS automatiquement (RM-07)

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 31
[MOD-07] Vouchers expirés → statut EXPIRE (RM-40)
[MOD-12] J+5 sans validation → alerte Responsable (RM-134)
[MOD-15] 06h00 : RenouvellementScheduler — prélèvements abonnements (RM-75)
[MOD-15] Fin de mois : agrégation commissions apporteurs (RM-146)


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 32
- Modèle de Données — Entités Clés

Le diagramme ERD v12 ci-dessous est la référence complète pour la définition du schéma Prisma. Il
est reproduit ici pour que les développeurs n'aient pas à ouvrir les specs fonctionnelles (document
autosuffisant).


Figure 3 — ERD Complet v12 — FORGES v4.8 — 20+ entités avec attributs clés et relations

Entité Attributs clés Relations principales
## Apprenant
id, email, type_apprenant, secteur, langue,
pays, abo_retail_id FK
→ Dossier (1:N), →
AbonnementRetail (1:0..1), →
AccesFormDemande (1:N)
## Formation
id, intitulé, type_formation*,
mode_formation, inclus_abo, prix_coutant,
partenaire_id FK
→ Session (1:N), → Dossier
(1:N), → FormationPartenaire
## (1:0..1)
## Dossier
id, apprenant_id FK, formation_id FK, statut,
source_financement
## → Paiement (1:0..1)

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 33
## Paiement
id, dossier_id FK, montant_catalogue,
commission_part%, montant_reverse,
code_apporteur FK
→ CommissionApporteur
## (1:0..1)
## Partenaire
id, raison_sociale, commission_forges%,
statut, resp_designe_id FK
→ Formation (1:N via
FormationPartenaire)
FormationPartenaire
id, formation_id FK, partenaire_id FK,
statut_validation, prix_coutant_soumis,
prix_coutant_valide
Lien validation Partenaire ↔
## Formation
## Apporteur
id, nom, type, code_apporteur UUID,
taux_commission%, statut
→ VoucherApporteur (1:1), →
CommissionApporteur (1:N)
VoucherApporteur
id, apporteur_id FK, code UUID,
nb_utilisations
→ Paiement (1:N)
CommissionApporteur
id, apporteur_id FK, paiement_id FK,
montant_commission, statut
Trace chaque commission
générée
AbonnementRetail
id, apprenant_id FK, offre, statut,
montant_mensuel, downgrade_planifie
Abonnement mensuel individuel
ConversationBot
id, utilisateur_id FK, flux_actif, historique
JSON (choix fermés)
Sessions bot — questions
fermées uniquement (RM-118)
EnqueteCatalogue
id, domaine (liste), niveau (liste),
volume_estime (liste)
3 champs fermés uniquement
## (RM-123)

- type_formation assigné exclusivement par FORGES lors de la création (RM-86) ou validation (RM-
127). Jamais par le Partenaire.


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 34
- Matrice de Correspondance Modules ↔ Cas d'Utilisation

Module Nom UCS Implémentés
MOD-01 Authentification & Sécurité UCS01
MOD-02 Gestion des Comptes UCS00, UCS02, UCS03
MOD-03 Catalogue de Formations UCS04, UCS14 (partiel)
MOD-04 Sessions de Formation UCS05
MOD-05 Inscriptions & Dossiers UCS07, UCS08, UCS14
MOD-06 Paiements & Commissions UCS09
MOD-07 Vouchers UCS06, UCS12 (partiel)
MOD-08 Tableaux de Bord & Rapports UCS10
MOD-09 Espace Apprenant UCS11
MOD-10 Espace Organisation UCS12
MOD-11 Transversal (Audit & Sécurité) MT-01, MT-02 (tous modules)
## MOD-12
## Partenaires Fournisseurs
## (v1.3)
## UCS17, UCS18
MOD-13 Apporteurs d'Affaires (v1.3) UCS19, UCS20
MOD-14 Bot Conseiller (v1.3) UCS15, UCS16
MOD-15 Abonnements (v1.3)
## UCS03.1, UCS03.2, UCS09.1, UCS11.1, UCS12.1,
## UCS13

8.1 Ordre d'Implémentation Recommandé
- MOD-11 — Services transversaux (socle obligatoire)
- MOD-01 — Authentification
- MOD-02 — Gestion des comptes
- MOD-03 — Formations
- MOD-04 — Sessions
- MOD-07 — Vouchers
- MOD-05 — Inscriptions & Dossiers (cœur fonctionnel)
- MOD-06 — Paiements & Commissions
- MOD-09 — Espace Apprenant
- MOD-10 — Espace Organisation
- MOD-08 — Tableaux de bord
- MOD-15 — Abonnements
- MOD-12 — Partenaires Fournisseurs
- MOD-14 — Bot Conseiller
- MOD-13 — Apporteurs d'Affaires

Note : les modules v1.3 (MOD-12 à MOD-15) peuvent être développés en parallèle après stabilisation
des modules core (MOD-01 à MOD-11).

8.2 Graphe de Dépendances

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 35
Le diagramme ci-dessous visualise les dépendances entre modules. Les flèches indiquent les
dépendances — un module ne peut être développé qu'après tous ses prérequis. Les chiffres
indiquent l'ordre d'implémentation recommandé.


Figure 4 — Graphe de dépendances entre les 15 modules FORGES v1.3


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 36
## 9. Glossaire Technique

## Terme Définition
AES-256-GCM Chiffrement symétrique authentifié — données sensibles au repos (MT-02)
Apporteur d'Affaires
Individu ou Organisation — code UUID permanent, commission % CA (RM-
141 à RM-148)
bcrypt Hachage mots de passe avec sel cryptographique — coût 12
## Bot Conseiller
Acteur système 100% règles métier — questions fermées uniquement (RM-
118). Roadmap LLM v5.x.
## Commission
## FORGES
% prélevé sur prix catalogue. Partenaire reçoit son prix coûtant net (RM-129).
DTO Data Transfer Object — validation des entrées API (Zod ou class-validator)
ERD Entity-Relationship Diagram — voir Figure 2 des Specs v4.8
inclus_abonnement
Booléen calculé : type=Standard ET pilier ∈ {Retail, Tous} (RM-102). Non
modifiable.
JWT JSON Web Token — access token 1h, refresh token 7j (MT-02)
Mobile Money Paiement MTN Money / Orange Money via agrégateur externe
ORM Object-Relational Mapper — Prisma abstrait les requêtes SQL
## Partenaire
## Fournisseur
Organisme distribuant ses formations via FORGES. Représenté en orange.
Prix catalogue
= prix_coutant / (1 - commission_forges/100). Calculé automatiquement (RM-
## 137).
RBAC Role-Based Access Control — 9 rôles en v1.3
Redis Base in-memory : cache, sessions, files d'emails, rate limiting
## RM-140
Bifurcation : vérification Responsable UNIQUEMENT si type=Premium ET
source=Retail
Roadmap LLM v5.x LLM dans le Bot envisagé après analyse patterns + cadre gouvernance IA
Scheduler/Cron
Tâche planifiée node-cron : transitions sessions, renouvellements,
commissions
UUID Universally Unique Identifier — codes apporteur, tokens, contrats
Webhook Callback HTTP asynchrone de l'agrégateur de paiement
XOF Franc CFA (UEMOA) — 1 USD ≈ 600 XOF (mars 2026)


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 37
## 10. Architecture Visuelle

Ce chapitre rassemble tous les schémas visuels de l'architecture FORGES v1.3 : couches
applicatives, déploiement Docker, machines à états et diagrammes de séquence inter-modules. Ces
diagrammes sont la référence pour l'implémentation correcte des transitions d'état et des interactions
entre modules. Toute transition non représentée doit être rejetée avec une erreur 400.


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 38
10.1 Schéma des Couches Applicatives

La plateforme FORGES suit une architecture en 5 couches strictement séparées. Chaque couche ne
communique qu'avec la couche adjacente, garantissant maintenabilité et testabilité.


Figure 1 — Architecture en 5 couches applicatives FORGES v1.3

## Couche Composant Rôle Technologie
## 1 —
## Présentation
## React + Vite + Tailwind
## CSS
Interface web responsive. Widget Bot
Conseiller flottant. Espace Partenaire
et Apporteur.
## React 18+
## 2 — API
## Gateway
## Express +
JwtMiddleware +
RoleGuard
Routage REST, authentification JWT,
RBAC 9 rôles, rate limiting Redis.
## Express 4+
## 3 — Services
## Métier
15 modules (MOD-01 à
## MOD-15)
Logique applicative, règles métier RM-
01 à RM-148.
## Node.js 20+
## 4 — Accès
## Données
Prisma ORM +
PostgreSQL
Abstraction BDD, migrations
versionnées, 20+ entités, enums v2.
## Prisma 5+,
PostgreSQL 16
## 5 — Services
## Transversaux
Redis, node-cron, MT-
## 01, MT-02
Cache, scheduler, audit append-only,
chiffrement AES-256-GCM, emails,
traductions.
Redis 7, node-
cron


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 39
Règles d'architecture à respecter
- La couche Présentation ne contacte jamais Prisma directement — toujours via l'API Gateway.
- Les Services Métier ne contiennent jamais de SQL brut — toujours via les Repositories
## Prisma.
- MOD-11 (audit, chiffrement) est injecté dans tous les autres modules en tant que service
partagé.
- Les Schedulers (MOD-04, MOD-15, MOD-13) sont des services cron indépendants — pas de
logique métier dans les tâches cron elles-mêmes.


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 40
## 10.2 Déploiement Docker

## Conteneur Image Port Rôle
forges-api node:20-alpine 3000 API Express principale (15 modules)
forges-frontend
node:20-alpine (build) +
nginx
80 / 443 SPA React servie par Nginx
forges-db postgres:16-alpine 5432 Base de données PostgreSQL
forges-redis redis:7-alpine 6379 Cache, sessions, files de tâches
forges-nginx nginx:alpine 80 / 443 Reverse proxy + SSL termination

## Volumes Docker
postgres_data → persistance BDD  |  redis_data → persistance Redis  |  uploads_data → documents
uploadés  |  logs_data → logs applicatifs

⚠️ Variables d'environnement sensibles (v1.3)
DEFAULT_COMMISSION_FORGES_PCT (défaut 20%) ·
DEFAULT_COMMISSION_APPORTEUR_PCT (défaut 5%) ·
SEUIL_REVERSEMENT_PARTENAIRE_XOF (défaut 50 000) ·
SEUIL_REVERSEMENT_APPORTEUR_XOF (défaut 5 000) ·
BOT_UPGRADE_COOLDOWN_JOURS (défaut 7) · VALIDATION_PARTENAIRE_DELAI_JOURS
(défaut 5). Ne jamais committer dans le dépôt.


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 41
10.3 Machines à États

Ces diagrammes définissent tous les états possibles des entités principales et les conditions de
transition. Toute transition non représentée doit être rejetée avec une erreur 400 BAD_REQUEST.

10.3.1 Dossier d'Inscription (v4.8 — RM-140)
Deux flux distincts selon RM-140. Le flux Standard ne passe jamais par les statuts Retenu/Rejeté.


Figure 3 — Machine à états Dossier d'Inscription v4.8 — Flux Standard vs Premium+Retail

Statut Flux concerné Transition entrante Transition sortante
En attente de vérification
## Premium + Retail
uniquement
Soumission inscription
## (RM-140)
## → Retenu
(Responsable) | →
## Rejeté | → Annulé
## (volontaire)
Payé directement
## Standard /
Premium hors
## Retail
Paiement direct confirmé
## (RM-140)
## → Attestation
disponible (clôture
session)
## Retenu
## Premium + Retail
uniquement
## Décision Responsable
## → Payé (paiement <
## 72h) | → Annulé (> 72h
## — RM-07)
## Payé Premium + Retail
Webhook paiement
confirmé
## → Attestation
disponible (clôture
session)
## Rejeté Premium + Retail
## Décision Responsable
(motif obligatoire)
## Terminal

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 42
Annulé Tous flux
Volontaire (RM-27) |
Expiration 72h (RM-07) |
Échec paiement ×3
## Terminal
AccèsFormationDemande
## Actif
À la demande
Paiement ou
abonnement actif (RM-
## 92, RM-102)
## → Suspendu (abo
inactif RM-103) | →
## Expiré (365j)

10.3.2 Session de Formation (RM-20, RM-21)


Figure 4 — Machine à états Session de Formation — transitions automatiques via scheduler

## Statut Déclencheur Condition
Planifiée Création manuelle Superviseur Session nouvellement créée
À venir Scheduler 00h00 date_ouverture > now()
## Inscriptions
ouvertes
## Scheduler 00h00
date_ouverture <= now() && date_cloture >
now()
En cours Scheduler 00h00 date_debut <= now() && date_fin > now()
Clôturée Scheduler 00h00 date_fin <= now()
Archivée Scheduler 00h00 Clôturée depuis > 90 jours (RM-21)
Annulée Annulation manuelle Avant Inscriptions ouvertes, si aucun inscrit

10.3.3 Formation — Cycle de vie enrichi (RM-22, RM-127, RM-131)


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 43

Figure 5 — Machine à états Formation — Interne FORGES vs Partenaire Fournisseur

Statut Interne FORGES Formation Partenaire
Brouillon Création (mode=Avec session) Sauvegarde partielle avant soumission
En attente
planification
Aucune session créée (RM-23) N/A
En attente
validation
## N/A
Soumission complète (RM-136). Invisible
dans catalogue.
## Active
Session planifiée ou mode=À la
demande
Validée par Responsable +
type_formation assigné (RM-127)
## Archivée
Archivage manuel ou automatique
## (RM-11)
Idem — si paiements validés
Rejetée N/A
Rejet Responsable — motif + corrections
(RM-128). Resoumission possible.
Suspendue N/A
Problèmes qualité post-publication (RM-
131). Invisible catalogue.

10.3.4 AbonnementRetail (RM-70 à RM-79, RM-104 à RM-106)


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 44

Figure 6 — Machine à états AbonnementRetail — gestion prorata, upgrade, downgrade, suspension

## Transition Déclencheur Règle
## → Actif (souscription)
Paiement initial confirmé
(prorata RM-106)
Premier prélèvement = montant ×
jours_restants / jours_mois
## Actif → Suspendu
Échec prélèvement + grâce
48h (RM-73)
AccèsFormationDemande
source=Abonnement → Suspendu (RM-
## 103)
Suspendu → Actif Resouscription ou réactivation
AccèsFormationDemande réactivés
automatiquement
Actif (downgrade planifié) Demande apprenant (RM-104)
Effectif à fin de période. Champ
downgrade_planifie positionné.
## Actif → Expiré
Grâce 48h dépassée sans
paiement
AccèsFormationDemande → Suspendu
## (RM-103)
Actif → Résilié Résiliation volontaire (RM-77)
Accès maintenu jusqu'à fin de période
payée

10.3.5 Partenaire Fournisseur & CommissionApporteur (v1.3)


Figure 7 — Machine à états Partenaire Fournisseur et cycle CommissionApporteur

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 45

## Entité Statut Déclencheur
Partenaire Invité → Actif (Flux A) Activation lien invitation 48h (RM-126)
## Partenaire
En attente → Actif (Flux
## B)
Approbation Admin (RM-126)
## Partenaire Actif → Suspendu
Admin — préavis 30j sauf faute grave (RM-
## 133)
## Partenaire Suspendu → Résilié
Résiliation Admin (RM-133) — formations
archivées, données conservées 5 ans
CommissionApporteur En attente → Validée Agrégation mensuelle J+1 (RM-146)
CommissionApporteur Validée → Reversée
Cumul >= seuil minimum + validation Agent
Comptable (RM-147)
CommissionApporteur → Bloquée
Fraude ou litige détecté — Admin bloque
manuellement


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 46
10.4 Diagrammes de Séquence Inter-Modules

Ces 7 diagrammes couvrent l'ensemble des flux critiques de la plateforme FORGES v1.3. Les
couleurs des participants correspondent aux modules : bleu = modules core (MOD-01 à MOD-11),
orange = MOD-12 (Partenaires), violet = MOD-13 (Apporteurs), vert = MOD-14 (Bot Conseiller), violet
foncé = MOD-11 (Transversal).

10.4.1 Flux Inscription Standard → Paiement Direct → Attestation (RM-140)
Flux nominal pour une formation Standard. Le Responsable n'intervient pas — il est notifié en
information uniquement.


Figure 8 — Flux Standard : MOD-02 → MOD-05 (RM-140 paiement direct) → MOD-06 → MOD-09


10.4.2 Flux Inscription Premium+Retail → Vérification Responsable (RM-140)
Flux déclenché uniquement si type_formation=Premium ET source=Retail. Seul cas nécessitant
l'intervention du Responsable de formation.


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 47

Figure 9 — Flux Premium+Retail : MOD-05 (vérification) → MOD-08 → MOD-06 (RM-140)


## 10.4.3 Flux Partenaire : Soumission → Validation → Publication
Flux complet depuis la soumission d'une formation partenaire jusqu'à sa publication dans le
catalogue. Point clé : type_formation assigné exclusivement par FORGES lors de la validation (RM-
## 127).


Figure 10 — Flux Partenaire : MOD-12 → MOD-03 (publication) → MOD-14 (recommandation bot)



FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 48
## 10.4.4 Flux Apporteur : Code → Transaction → Commission → Reversement
Flux complet du cycle de vie d'une commission apporteur. La commission est générée à la
confirmation de paiement et reversée mensuellement si le cumul dépasse le seuil minimum (RM-
## 147).


Figure 11 — Flux Apporteur : MOD-13 → MOD-07 (validation code) → MOD-06 (commission) → reversement


10.4.5 Flux Abonnement Retail : Souscription → Accès Formations → Renouvellement
Flux complet d'un abonnement Retail depuis la souscription jusqu'au renouvellement automatique.
Illustre les impacts sur l'éligibilité (RM-102) et les AccèsFormationDemande (RM-103).


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 49

Figure 12 — Flux Abonnement Retail : MOD-15 → MOD-03 (éligibilité RM-102) → MOD-06 (renouvellement)


10.4.6 Flux Bot Conseiller 100% Règles Métier (MOD-14)
Flux Bot Conseiller — orientation formations par arbre de décision. Toutes les interactions sont des
questions à choix fermés (listes déroulantes, boutons). Aucune saisie libre acceptée sauf le
commentaire optionnel du feedback (RM-118, RM-122, RM-123).



FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 50
Figure 13 — Flux Bot Conseiller : MOD-14 → MOD-03 (filtrage catalogue) → MOD-15 (éligibilité) → MOD-11
## (audit)


10.4.7 Flux Scheduler Global Inter-Modules
Le scheduler est le composant le plus transversal de FORGES — il intervient dans 6 modules
simultanément. Deux déclencheurs principaux : 00h00 (transitions sessions) et 06h00
(renouvellements abonnements) et fin de mois J+1 (commissions apporteurs).


Figure 14 — Scheduler global : MOD-04, MOD-05, MOD-06, MOD-07, MOD-12, MOD-15 → MOD-11 (audit)


⚠️ Note développeurs — Transitions automatiques
Toute transition automatique doit être idempotente : si le scheduler s'exécute deux fois sur le même
élément, l'état résultant doit être identique. Utiliser des vérifications de statut avant chaque mise à jour
(ex: WHERE statut = 'RETENU' AND expires_at < NOW()). Les échecs de scheduler doivent être
journalisés (MT-01 niveau ERROR) mais ne doivent pas bloquer les autres transitions de la même
exécution.


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 51
10B. Diagrammes de Composants par Module

Ces diagrammes présentent les composants internes de chaque module : Controllers (exposition
API), Services (logique métier), Repositories (accès données), Middlewares, Schedulers et Clients
HTTP. Ils permettent à chaque développeur de comprendre la responsabilité de chaque classe avant
de commencer l'implémentation.

10B.1 Légende des types de composants
## Type Couleur Rôle Règle
## Controller Bleu
Exposition des endpoints REST,
validation des requêtes entrantes
Ne contient jamais de logique
métier — délègue aux Services
## Service Vert
Logique applicative, règles métier,
orchestration
Contient les règles RM. N'accède
jamais à la BDD directement.
## Repository Orange
Accès à la base de données via
Prisma ORM
Ne contient que des requêtes.
Jamais de logique métier.
## Middleware Violet
Intercepteurs transversaux (auth,
logging, rate-limit)
Injectés globalement ou par route
## Scheduler Brun
Tâches cron automatiques
(transitions, renouvellements,
commissions)
Idempotentes obligatoirement
## Client Gris
Appels vers services externes
(agrégateur paiement)
Toujours via circuit-breaker + retry

10B.2 MOD-01 Authentification · MOD-02 Comptes · MOD-03 Formations
· MOD-04 Sessions

Figure 15 — Composants MOD-01 à MOD-04

10B.3 MOD-05 Inscriptions · MOD-06 Paiements · MOD-07 Vouchers ·
MOD-08 Dashboard

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 52

Figure 16 — Composants MOD-05 à MOD-08

10B.4 MOD-09 Espace Apprenant · MOD-10 Espace Org · MOD-11
Transversal · MOD-14 Bot

Figure 17 — Composants MOD-09, MOD-10, MOD-11, MOD-14

10B.5 MOD-12 Partenaires · MOD-13 Apporteurs · MOD-15 Abonnements

Figure 18 — Composants MOD-12, MOD-13, MOD-15

⚠️ Règles d'architecture intra-module
- Controller → Service uniquement (jamais Controller → Repository directement). 2. Service →
Repository uniquement pour la persistance. 3. Service → Service d'un autre module uniquement via
injection (pas d'import direct entre controllers). 4. Schedulers : appellent uniquement leurs propres

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 53
Services. 5. MOD-11 (AuditLogger, EncryptionService) est injectable dans tous les autres modules —
pas de duplication.


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 54
- DTOs — Contrats d'Interface API

Les DTOs définissent le contrat de chaque endpoint. Validation systématique via Zod ou class-
validator côté serveur.

11.1 MOD-01 — Authentification
DTO Champ Type Obligatoire Validation
LoginDto email string Oui Format email
LoginDto password string Oui Min 8 caractères
RefreshDto refreshToken string Oui JWT valide non expiré
ResetPasswordDto newPassword string Oui Min 8 car., 1 maj., 1 chiffre

11.2 MOD-02 — Comptes
DTO Champ Type Obligatoire Validation
RegisterApprenantDto email string Oui Format email, unicité (RM-28)
RegisterApprenantDto type_apprenant enum Oui
## PROFESSIONNEL |
## APPRENANT (RM-34)
RegisterApprenantDto secteur_activite string Conditionnel
Si PROFESSIONNEL (RM-
## 35)
RegisterApprenantDto niveau_etude string Conditionnel Si APPRENANT (RM-36)
RegisterApprenantDto pays_residence string Oui ISO 3166-1 (RM-48)
RegisterApprenantDto langue_preferee enum Non
FR|EN|ES|PT (défaut FR —
## RM-98)
RegisterOrganisationDto identifiant_legal string Conditionnel Unique par type (RM-43)
RegisterOrganisationDto pays string Oui ISO 3166-1 (RM-48)

11.3 MOD-03 à MOD-07 — Formations, Sessions, Inscriptions,
## Paiements, Vouchers
DTO Champs principaux Validations clés
CreateFormationDto
titre, description, mode_formation,
pilier_abonnement, langues
type_formation ABSENT (assigné
## FORGES — RM-86, RM-127)
CreateSessionDto formation_id, capacite, 4 dates
Ordre chronologique (RM-16) ; non-
chevauchement (RM-17)
InscriptionDto
session_id, voucher_code?,
code_apporteur?
Unicité apprenant/formation (RM-01,
RM-15) ; non-cumul
voucher+apporteur (RM-144)
DecisionDossierDto statut, motif_refus?
Premium+Retail EN_ATTENTE
seulement (RM-140) ; motif si
## REJETE

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 55
InitierPaiementDto dossier_id, methode
Dossier RETENU ou paiement direct
; 72h (RM-07) ; max 3 tentatives
## (RM-08)
CreateVoucherOrgDto
formation_id, quota_max,
date_expiration, valeur
quota_max > 0 ; date future (RM-40)
CreateVoucherPromoDto
formation_id, quota_max,
date_expiration
Statut initial BROUILLON (RM-39)

11.4 MOD-12 — Partenaires Fournisseurs
DTO Champs principaux Validations clés
CreateFormationPartenaireDto
titre, description courte/longue,
mode_formation, durée,
prix_coutant, modalité,
public_cible, objectifs, langues,
certification
21 champs (RM-136).
type_formation et pilier
ABSENTS. prix_coutant > 0
## (RM-129).
ValiderFormationPartenaireDto
type_formation,
pilier_abonnement,
prix_coutant_valide
type_formation :
Standard|Premium|Sur devis —
responsabilité FORGES (RM-
## 127)
RejeterFormationPartenaireDto
motif_rejet,
corrections_suggerees?
motif_rejet obligatoire (RM-128)

11.5 MOD-13 — Apporteurs d'Affaires
DTO Champs principaux Validations clés
CreateApporteurDto
nom, type, email,
taux_commission%
type : Individu | Organisation ;
taux 0–100% ; défaut 5% (RM-
## 141)
AppliquerCodeApporteurDto code_apporteur
UUID existant, type=Apporteur,
statut=Actif, pas d'autre voucher
actif (RM-143, RM-144)


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 56
- Gestion des Erreurs

{ "statusCode": 400, "error": "BAD_REQUEST", "message": "Description lisible",
## "details": [...] }

HTTP Code interne Situation Règle
## 400 BAD_REQUEST
Données invalides, champ
manquant
Validation DTO
400 CHRONOLOGY_ERROR Dates session incohérentes RM-16
400 SESSION_NOT_OPEN Inscription sur session fermée UCS07
## 400 STANDARD_DIRECT_PAYMENT
Tentative traitement dossier
Standard via UCS08
## RM-140
## 400 TYPE_FORMATION_READONLY
Modification type_formation par
## Partenaire
## RM-127
401 UNAUTHORIZED Token absent, invalide ou expiré MOD-01
402 PAYMENT_REQUIRED Paiement refusé par l'agrégateur UCS06
403 FORBIDDEN Rôle insuffisant RBAC
404 NOT_FOUND Ressource inexistante Général
409 DUPLICATE_EMAIL Email déjà utilisé RM-28
409 ALREADY_ENROLLED Apprenant déjà inscrit RM-01, RM-15
410 TOKEN_EXPIRED Lien de confirmation expiré RM-30
## 422 VOUCHER_INVALID
Voucher invalide, expiré ou
épuisé
## RM-40
422 APPORTEUR_CODE_INVALID Code apporteur invalide ou inactif RM-143
422 VOUCHER_CUMUL_INTERDIT Code apporteur non cumulable RM-144
## 422 FORMATION_EN_ATTENTE
Formation partenaire non encore
validée
## RM-127
429 TOO_MANY_ATTEMPTS Max tentatives paiement atteint RM-08
429 RATE_LIMIT Trop de requêtes MOD-11
## 500 INTERNAL_ERROR
Erreur serveur — journalisée
automatiquement
## MT-01
502 PAYMENT_GATEWAY_ERROR Agrégateur ne répond pas MOD-06

12.2 Middleware de Gestion Globale des Erreurs
Un middleware global Express intercepte toutes les erreurs non gérées et les normalise au format
standard :
- Erreurs de validation DTO → 400 avec détail des champs invalides (tableau details[])
- Erreurs Prisma P2002 (contrainte unique) → 409 Conflict
- Erreurs Prisma P2025 (not found) → 404 Not Found
- Erreurs JWT expirés ou invalides → 401 Unauthorized

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 57
- Erreurs 500 non prévues → journalisées via AuditLogger (MT-01, niveau ERROR) + alerte
email Admin
- Erreurs agrégateur paiement (timeout, 5xx) → 502 PAYMENT_GATEWAY_ERROR

// src/middleware/error-handler.js
app.use((err, req, res, next) => {
// Prisma unique constraint
if (err.code === 'P2002') return res.status(409).json({ error: 'CONFLICT' });
// Prisma not found
if (err.code === 'P2025') return res.status(404).json({ error: 'NOT_FOUND' });
## // JWT
if (err.name === 'JsonWebTokenError') return res.status(401).json({ error:
## 'UNAUTHORIZED' });
## // Default 500
auditLogger.error('INTERNAL_ERROR', { err, userId: req.user?.id, ip: req.ip });
return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erreur serveur'
## });
## });


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 58
- Stratégie de Tests

13.1 Pyramide de Tests
## Niveau Outil
## Couverture
cible
Ce qu'on teste
Tests unitaires Jest
≥ 80% des
services
Logique métier isolée (mocks
repositories)
Tests d'intégration Jest + Supertest
≥ 60% des
endpoints
Controllers + Services + DB (base de
test dédiée)
Tests E2E
Playwright ou
## Cypress
Flux critiques Parcours complets multi-modules
Tests de contrat
Zod / class-
validator
100% des DTOs Validation des entrées API

13.2 Flux Prioritaires à Tester (v1.3)
- UCS07 — Bifurcation RM-140 : Standard (paiement direct) vs Premium+Retail (vérification)
- UCS08 — Décision dossier Premium+Retail (Retenu, Rejeté, expiration 72h scheduler)
- UCS09 — Paiement + webhook + commission partenaire (RM-129) + commission apporteur
## (RM-145)
- UCS17/UCS18 — Soumission + validation + assignation type_formation (RM-127) + calcul
prix catalogue (RM-137)
- UCS19 — Code apporteur + non-cumul voucher (RM-144) + calcul commission (RM-145)
- MOD-13 — Agrégation mensuelle + reversement conditionnel (RM-146, RM-147)
- MOD-14 — Bot Conseiller : flux orientation questions fermées (RM-118) + enquête 3
questions (RM-123)
- MOD-15 — Renouvellement automatique (UCS09.1) + éligibilité formations (RM-102)
- Machines à états : toutes les transitions représentées dans le Chapitre 10.3
- Transitions scheduler : idempotence des transitions automatiques (RM-20, RM-21, RM-07)

13.3 Organisation des Fichiers de Tests
src/modules/
inscription/    → inscription.service.test.js (bifurcation RM-140)
paiements/      → paiement.service.test.js (commissions RM-129, RM-145)
partenaires/    → partenaire.service.test.js, validation.service.test.js
apporteurs/     → apporteur.service.test.js, commission.service.test.js
bot-conseiller/ → bot.service.test.js (règles fixes, questions fermées)
abonnements/    → abonnement-retail.test.js, eligibilite.test.js
src/e2e/
inscription-standard.e2e.js   → flux Standard paiement direct
inscription-premium.e2e.js    → flux Premium+Retail vérification
partenaire-validation.e2e.js  → soumission → type_formation assigné → publication
apporteur-commission.e2e.js   → code → transaction → reversement


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 59
- Guide d'Environnement — Setup Local

## 14.1 Prérequis
- Node.js ≥ 20 LTS
- Docker Desktop (ou Docker + Docker Compose v2)
## • Git
- VS Code avec extensions ESLint, Prettier, Prisma

14.2 Variables d'Environnement (.env)
## ⚠️ Sécurité
Ne jamais committer le fichier .env. Utiliser .env.example avec des valeurs fictives.

## Variable Exemple Description
NODE_ENV development
development
| staging |
production
## PORT 3000
Port API
## Express
DATABASE_URL postgresql://user:pass@localhost:5432/forges URL Prisma
REDIS_URL redis://localhost:6379
## Connexion
## Redis
JWT_SECRET secret_256bits_min_32_chars
## Clé
signature
## JWT
JWT_EXPIRES_IN 1h
## Durée
access token
JWT_REFRESH_SECRET refresh_secret_different
Clé refresh
token
JWT_REFRESH_EXPIRES_IN 7d
## Durée
refresh token
ENCRYPTION_KEY clé_AES_256_base64
## Clé
chiffrement
## AES-256-
## GCM (MT-
## 02)
SMTP_HOST smtp.example.com
## Serveur
## SMTP
SMTP_PORT 587 Port SMTP
SMTP_USER no-reply@forges.ci
## Utilisateur
## SMTP
SMTP_PASS motdepasse_smtp
Mot de
passe SMTP

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 60
EMAIL_FROM FORGES <no-reply@forges.ci>
## Expéditeur
affiché
PAYMENT_API_URL https://api.aggregateur.ci
## URL
agrégateur
paiement
PAYMENT_API_KEY votre_api_key
Clé API
agrégateur
PAYMENT_WEBHOOK_SECRET secret_webhook
## Secret
validation
webhooks
## UPLOAD_MAX_SIZE_MB 5
Taille max
upload (RM-
## 49)
UPLOAD_DIR ./uploads
## Répertoire
fichiers
uploadés
FRONTEND_URL http://localhost:5173
## URL
frontend
## (liens
emails)
CORS_ORIGINS http://localhost:5173
## Origines
## CORS
autorisées
LOG_LEVEL info
error | warn |
info | debug
## DEFAULT_COMMISSION_FORGES_PCT 20
## Commission
## FORGES
partenaires
## (RM-129)
## DEFAULT_COMMISSION_APPORTEUR_PCT 5
## Taux
commission
apporteur
## (RM-141)
## SEUIL_REVERSEMENT_PARTENAIRE_XOF 50000
Seuil min
reversement
partenaire
## (RM-138)
## SEUIL_REVERSEMENT_APPORTEUR_XOF 5000
Seuil min
reversement
apporteur
## (RM-147)
## BOT_UPGRADE_COOLDOWN_JOURS 7
Délai re-
proposition
upgrade bot
## (RM-120)
## VALIDATION_PARTENAIRE_DELAI_JOURS 5
## Délai
recommandé

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 61
validation
## (RM-134)

## 14.3 Démarrage Rapide
- git clone https://github.com/your-org/forges.git && cd forges
- cp .env.example .env  # puis éditer les valeurs
- docker-compose up -d forges-db forges-redis
- cd backend && npm install
- npx prisma migrate dev --name init
- npx prisma generate
- npm run seed
- npm run dev  →  http://localhost:3000
- cd ../frontend && npm install && npm run dev  →  http://localhost:5173
- Swagger : http://localhost:3000/api/docs

14.4 Structure de Dossiers
forges/
backend/src/modules/
auth/              ← MOD-01  |  comptes/          ← MOD-02
formations/        ← MOD-03  |  sessions/         ← MOD-04
inscriptions/      ← MOD-05  |  paiements/        ← MOD-06
vouchers/          ← MOD-07  |  dashboard/        ← MOD-08
espace-apprenant/  ← MOD-09  |  espace-org/       ← MOD-10
transversal/       ← MOD-11  |  partenaires/      ← MOD-12
apporteurs/        ← MOD-13  |  bot-conseiller/   ← MOD-14
abonnements/       ← MOD-15
backend/src/shared/    ← email, upload, notification, scheduler
backend/prisma/        ← schema.prisma v2, migrations/
frontend/src/pages/    ← une page par UCS
frontend/src/components/ ← BotWidget, PartenaireFormation, ApporteurDashboard...
frontend/src/hooks/    ← useAuth, usePaiement, useAbonnement...
frontend/src/services/ ← appels API typés vers l'API Gateway
frontend/src/store/    ← état global (Zustand ou Redux Toolkit)


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 62
- Schéma Prisma Annoté v2

Le schéma Prisma v2 est la traduction directe de l'ERD v12. Les annotations @// indiquent les règles
métier à implémenter au niveau service (jamais au niveau Prisma).

## 15.1 Modèle Apprenant
model Apprenant {
id               String            @id @default(uuid())
email            String            @unique              // RM-28
password_hash    String
nom              String
prenoms          String
type_apprenant   TypeApprenant                          // RM-34 obligatoire
secteur_activite String?                                // RM-35 si Professionnel
niveau_etude     String?                                // RM-36 si Apprenant
pays_residence   String                                 // RM-48 ISO 3166-1
pays_nationalite String                                 // RM-48
langue_preferee  Langue            @default(FR)         // RM-98
statut           StatutUtilisateur @default(INACTIF)
organisation_id  String?
organisation     Organisation?     @relation(fields:[organisation_id],
references:[id])
abonnement_retail AbonnementRetail?
dossiers         Dossier[]
acces_formations AccesFormationDemande[]
conversations_bot ConversationBot[]
feedbacks        FeedbackFormation[]
created_at       DateTime          @default(now())
## }

## 15.2 Modèle Formation
model Formation {
id                    String          @id @default(uuid())
intitule              String
description_courte    String          @db.VarChar(500)
description_longue    String?
duree_jours           Int
cout_catalogue        Int             // = prix_coutant/(1-commission%) — RM-137
responsable_id        String
// RM-86, RM-127 : assigné EXCLUSIVEMENT par FORGES — JAMAIS par le Partenaire
type_formation        TypeFormation
mode_formation        ModeFormation                      // RM-91
statut                StatutFormation  @default(BROUILLON)
inclus_abonnement     Boolean          @default(false)   // RM-102 calculé auto
pilier_abonnement     PilierAbonnement?
duree_acces_jours     Int              @default(365)     // RM-92
prix_coutant          Int?             // null si formation interne
prerequis             String?
objectifs_pedagogiques String[]
modalite              Modalite?
certification_delivree Boolean         @default(false)
public_cible          String?
partenaire_id         String?
partenaire            Partenaire?      @relation(fields:[partenaire_id],
references:[id])
formation_partenaire  FormationPartenaire?
sessions              Session[]
dossiers              Dossier[]
## }


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 63
## 15.3 Modèle Dossier & Paiement
model Dossier {
id                     String          @id @default(uuid())
apprenant_id           String
formation_id           String
voucher_id             String?
// RM-140 : RETENU uniquement si type=Premium ET source=Retail
statut                 StatutDossier   @default(EN_ATTENTE_VERIFICATION)
source_financement     SourceFinancement
montant_remise         Int             @default(0)
document_complementaire String?        // RM-49 max 5Mo
motif_refus            String?         // obligatoire si REJETE
traite_par             String?
traite_le              DateTime?
created_at             DateTime        @default(now())
apprenant  Apprenant   @relation(fields:[apprenant_id], references:[id])
formation  Formation   @relation(fields:[formation_id], references:[id])
voucher    Voucher?    @relation(fields:[voucher_id], references:[id])
paiement   Paiement?
## }

model Paiement {
id                        String          @id @default(uuid())
dossier_id                String          @unique
montant_catalogue         Int
methode                   MethodePaiement
statut                    StatutPaiement  @default(EN_ATTENTE)
transaction_id            String?
tentatives                Int             @default(0)   // RM-08 max 3
expires_at                DateTime        // +72h si Retenu (RM-07)
confirmed_at              DateTime?
commission_partenaire_pct Float?          // null si formation interne
montant_reverse_partenaire Int?           // = montant × (1-commission%) RM-129
code_apporteur_id         String?
commission_apporteur_pct  Float?
dossier          Dossier           @relation(fields:[dossier_id],
references:[id])
code_apporteur   VoucherApporteur? @relation(fields:[code_apporteur_id],
references:[id])
commission_aport CommissionApporteur?
## }

15.4 Modèles Partenaire & FormationPartenaire
model Partenaire {
id                    String          @id @default(uuid())
raison_sociale        String
type                  TypePartenaire
pays                  String
email_principal       String          @unique
commission_forges_pct Float           @default(20)   // RM-129
statut                StatutPartenaire @default(EN_ATTENTE_VERIFICATION)
mode_inscription      ModeInscriptionPartenaire
responsable_designe_id String?        // RM-128
formations            Formation[]
created_at            DateTime        @default(now())
## }
model FormationPartenaire {
id                     String                    @id @default(uuid())
formation_id           String                    @unique
partenaire_id          String
statut_validation      StatutValidationPartenaire @default(EN_ATTENTE)
version                Int                       @default(1)
prix_coutant_soumis    Int                       // proposé Partenaire (RM-136)

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 64
prix_coutant_valide    Int?                      // validé/négocié (UCS18)
commentaire_responsable String?
// RM-127 : type_formation assigné par Responsable lors validation UNIQUEMENT
## }

15.5 Modèles Apporteur, VoucherApporteur & CommissionApporteur
model Apporteur {
id                         String          @id @default(uuid())
nom                        String
type                       TypeApporteur
email                      String          @unique
code_apporteur             String          @unique @default(uuid()) // RM-142
taux_commission_pct        Float           @default(5)              // RM-141
statut                     StatutApporteur @default(ACTIF)
organisation_id            String?
voucher                    VoucherApporteur?
commissions                CommissionApporteur[]
## }
model VoucherApporteur {
id             String    @id @default(uuid())
apporteur_id   String    @unique
code           String    @unique
statut         StatutVoucherApporteur @default(ACTIF)
nb_utilisations Int      @default(0)
paiements      Paiement[]
## }
model CommissionApporteur {
id                  String                    @id @default(uuid())
apporteur_id        String
paiement_id         String                    @unique
montant_base_xof    Int
taux_commission_pct Float
montant_commission_xof Int
mois_facturation    String                    // AAAA-MM
statut              StatutCommissionApporteur @default(EN_ATTENTE)
## }

15.6 Enums Prisma v2
enum Role { ADMIN SUPERVISEUR RESPONSABLE AGENT APPRENANT ORGANISATION GESTIONNAIRE
## PARTENAIRE APPORTEUR }
enum TypeApprenant { PROFESSIONNEL APPRENANT }
enum TypeFormation { STANDARD PREMIUM SUR_DEVIS }
enum ModeFormation { AVEC_SESSION A_LA_DEMANDE }
enum PilierAbonnement { RETAIL B2B INSTITUTIONNEL TOUS }
enum StatutFormation { BROUILLON EN_ATTENTE_PLANIFICATION EN_ATTENTE_VALIDATION
## ACTIVE ARCHIVEE REJETEE SUSPENDUE }
enum StatutDossier { EN_ATTENTE_VERIFICATION RETENU PAYE_DIRECTEMENT PAYE REJETE
## ANNULE GRIS EXCEPTION }
enum SourceFinancement { RETAIL B2B INSTITUTIONNEL ABONNEMENT VOUCHER }
enum StatutAbonnement { ACTIF SUSPENDU EXPIRE RESILIE ESSAI }
enum OffreRetail { ESSENTIEL PREMIUM }
enum PalierB2B { STARTER BUSINESS ENTERPRISE SUR_DEVIS }
enum StatutPartenaire { INVITE EN_ATTENTE_VERIFICATION ACTIF SUSPENDU RESILIE }
enum StatutValidationPartenaire { EN_ATTENTE VALIDEE REJETEE SUSPENDUE }
enum TypeApporteur { INDIVIDU ORGANISATION }
enum StatutApporteur { ACTIF SUSPENDU RESILIE }
enum StatutCommissionApporteur { EN_ATTENTE VALIDEE REVERSEE BLOQUEE }
enum FluxBot { ORIENTATION UPGRADE FEEDBACK ENQUETE IDLE COMPLETION_PROFIL }
enum Langue { FR EN ES PT }
enum Modalite { EN_LIGNE HYBRIDE PRESENTIEL }


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 65
⚠️ Note importante
RM-01 (unicité inscription/session), RM-15 (unicité/formation), RM-17 (non-chevauchement sessions)
et RM-144 (non-cumul code apporteur) ne peuvent PAS être exprimées en contraintes Prisma —
implémenter dans les Services. type_formation est nullable dans le formulaire partenaire (RM-136) —
assigné UNIQUEMENT par le Responsable lors de la validation (RM-127). Ne jamais exposer
type_formation en écriture dans une API Partenaire.
- Stratégie de Migration Base de Données

Ce chapitre définit la stratégie de migration des données entre versions du schéma Prisma. Les
migrations doivent être réversibles, versionnées et testées avant déploiement en production.

16.1 Principes de migration
- Chaque migration est un fichier daté et nommé dans prisma/migrations/ — jamais de
modification directe en production.
- Toute migration doit être réversible (rollback plan défini avant application).
- Les migrations destructives (suppression de colonnes ou tables) nécessitent un double
déploiement : d'abord rendre la colonne optionnelle, puis la supprimer dans une migration
suivante.
- Les données existantes doivent être préservées lors de toute migration de version majeure.
- Utiliser prisma migrate dev pour le développement, prisma migrate deploy pour la production.

16.2 Migrations v1.2 → v1.3 — Détail des changements
## Migration Type Description Rollback
add_apprenant_rename
## Non-
destructive
Renommer colonne
etudiant_id → apprenant_id
dans Dossier, Paiement,
AccesFD. Créer vue de
compatibilité etudiant_id si
nécessaire.
Renommer en sens
inverse
add_formation_partenaire_fields
## Non-
destructive
Ajouter colonnes nullable à
Formation : prix_coutant,
prerequis,
objectifs_pedagogiques[],
modalite,
certification_delivree,
organisme_certificateur,
public_cible,
nb_places_max_session,
partenaire_id FK.
## DROP COLUMN
(nullable — aucune
donnée)
add_type_formation_enum
## Non-
destructive
Étendre StatutFormation :
ajouter
## EN_ATTENTE_VALIDATION,
## REJETEE, SUSPENDUE.
Ajouter TypeFormation :
## STANDARD, PREMIUM,
## SUR_DEVIS.
Supprimer valeurs
enum ajoutées

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 66
create_partenaire_tables Additive
Créer tables Partenaire,
FormationPartenaire. Aucune
modification des tables
existantes.
## DROP TABLE
## Partenaire,
FormationPartenaire
create_apporteur_tables Additive
Créer tables Apporteur,
VoucherApporteur,
CommissionApporteur.
Ajouter colonnes Paiement :
commission_partenaire_pct,
montant_reverse,
code_apporteur_id FK.
## DROP TABLE
## Apporteur, ... +
## DROP COLUMN
## Paiement
create_abonnement_tables Additive
Créer tables
AbonnementRetail,
AbonnementOrganisation,
AbonnementB2B,
ContratInstitutionnel,
AccesFormationDemande.
Ajouter FK abo_org_id,
abo_b2b_id dans
## Organisation.
## DROP TABLE
abonnements +
## DROP COLUMN
## Organisation
create_bot_tables Additive
Créer tables
ConversationBot,
EnqueteCatalogue,
FeedbackFormation.
DROP TABLE bot
tables
add_role_enum_v13
## Non-
destructive
Étendre enum Role : ajouter
## GESTIONNAIRE,
## PARTENAIRE,
## APPORTEUR.
Supprimer valeurs
enum ajoutées
add_langue_pilier_enums Additive
Créer enums Langue,
PilierAbonnement,
TypeApporteur,
StatutCommissionApporteur,
etc.
Supprimer enums
ajoutés
migrate_etudiant_to_apprenant
## Data
migration
Renommer table Etudiant →
Apprenant. Migrer toutes les
## FK.
Renommer en sens
inverse

16.3 Commandes Prisma essentielles
# Créer une migration (développement)
npx prisma migrate dev --name description_courte_de_la_migration

# Appliquer les migrations en production (sans prompt interactif)
npx prisma migrate deploy

# Vérifier le statut des migrations
npx prisma migrate status

# Régénérer le client Prisma après modification du schéma
npx prisma generate

# Exécuter le seed (données initiales)
npx prisma db seed


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 67
# Réinitialiser la BDD de développement (DESTRUCTIF — jamais en prod)
npx prisma migrate reset

16.4 Données initiales — Seed v1.3
Le script de seed (prisma/seed.ts) doit initialiser les données obligatoires au démarrage d'un nouvel
environnement :
## Données Contenu Module
Compte Admin FORGES Email, mot de passe bcrypt, rôle ADMIN MOD-01
Types de formation STANDARD, PREMIUM, SUR_DEVIS MOD-03
Langues supportées FR, EN, ES, PT MOD-11
## Domaines
EnqueteCatalogue
IT, Finance, Santé, Droit, Management, IA,
## Cybersécurité, Autre
## MOD-14
Niveaux formation Débutant, Intermédiaire, Avancé, Expert MOD-14
## Configuration
commissions
## DEFAULT_COMMISSION_FORGES_PCT=20,
## DEFAULT_COMMISSION_APPORTEUR_PCT=5
## MOD-12/13
Seuils reversement
## SEUIL_PARTENAIRE=50000 XOF,
## SEUIL_APPORTEUR=5000 XOF
## MOD-06
Paliers B2B
## Starter (1–20), Business (21–50), Enterprise (51–
100), Sur devis
## MOD-15
## Offres
AbonnementOrganisation
Basique (50 000 XOF/an), Pro (150 000),
## Enterprise (400 000)
## MOD-15
Offres AbonnementRetail
Essentiel (15 000 XOF/mois), Premium (25 000
XOF/mois)
## MOD-15


FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 68
- Documentation Swagger / OpenAPI

La documentation Swagger est générée automatiquement via swagger-jsdoc et swagger-ui-express.
Elle est accessible en développement et staging à : http://localhost:3000/api/docs

## 17.1 Configuration Swagger
// src/swagger.config.js
module.exports = {
definition: {
openapi: '3.0.0',
info: { title: 'FORGES API', version: '1.3.0',
description: 'API FORGES — Agrégateur de formations certifiantes' },
servers: [{ url: '/api' }],
components: {
securitySchemes: {
bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
## }
## },
security: [{ bearerAuth: [] }]
## },
apis: ['./src/modules/**/*.routes.js']
## };

17.2 Schémas de réponse — Entités principales
Entité Schéma de réponse (champs exposés)
Champs EXCLUS de la
réponse
## Apprenant
id, email, nom, prenoms, type_apprenant,
secteur?, niveau?, pays_residence,
pays_nationalite, langue_preferee, statut,
created_at
password_hash — jamais
exposé
## Formation
id, intitule, description_courte,
description_longue?, type_formation,
mode_formation, statut,
inclus_abonnement, pilier_abonnement?,
cout_catalogue, duree_jours,
langues_disponibles
prix_coutant (interne
## FORGES),
commission_partenaire_pct
## Dossier
id, apprenant_id, formation_id, statut,
source_financement, created_at, traite_le?
motif_refus (exposé
uniquement à l'apprenant
concerné)
## Paiement
id, dossier_id, montant_catalogue,
methode, statut, confirmed_at?
commission_partenaire_pct,
montant_reverse (interne
## FORGES)
## Partenaire (vue Admin)
id, raison_sociale, type, pays, email,
commission_forges_pct, statut
Tous champs financiers —
accès Admin uniquement
## Partenaire (vue
## Partenaire)
id, raison_sociale, statut,
nb_formations_actives,
revenus_cumules_verses_xof
commission_forges_pct —
jamais exposé au
Partenaire (RM-130)
CommissionApporteur
id, montant_base_xof,
taux_commission_pct,
Accessible uniquement par
l'Apporteur concerné et
## Admin

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 69
montant_commission_xof,
mois_facturation, statut

17.3 Exemples de schémas OpenAPI par module
MOD-05 — POST /api/sessions/:id/inscrire
requestBody:
content:
application/json:
schema:
type: object
required: [source_financement]
properties:
voucher_code:    { type: string, format: uuid, description: 'Code voucher
Organisation ou Promo' }
code_apporteur:  { type: string, format: uuid, description: 'Code
parrainage Apporteur (RM-143)' }
source_financement: { type: string, enum: [RETAIL, B2B, INSTITUTIONNEL,
## ABONNEMENT, VOUCHER] }
document_complementaire: { type: string, format: binary, description:
'PDF/JPG/PNG max 5Mo (RM-49)' }
responses:
201: { description: 'Dossier créé — bifurcation RM-140 (paiement direct ou
vérification)' }
409: { $ref: '#/components/responses/AlreadyEnrolled' }
422: { $ref: '#/components/responses/VoucherInvalid' }

MOD-06 — POST /api/paiements/webhook (endpoint sécurisé)
# Cet endpoint ne doit PAS apparaître dans la documentation Swagger publique
# Il est sécurisé par signature HMAC-SHA256 (PAYMENT_WEBHOOK_SECRET)
# Accessible uniquement depuis l'IP de l'agrégateur de paiement
requestBody:
content:
application/json:
schema:
properties:
status:         { type: string, enum: [SUCCESS, FAILED, PENDING] }
transaction_id: { type: string }
amount:         { type: integer, description: 'Montant en centimes XOF' }
signature:      { type: string, description: 'HMAC-SHA256 pour
validation' }

MOD-12 — POST /api/partenaires/:id/formations
# 21 champs (RM-136) — type_formation et pilier_abonnement ABSENTS
requestBody:
content:
application/json:
schema:
required: [intitule, description_courte, description_longue,
mode_formation,
duree_jours, prix_coutant, modalite, public_cible,
objectifs_pedagogiques, langues_disponibles,
certification_delivree]
properties:
intitule:              { type: string, minLength: 5, maxLength: 150 }
mode_formation:        { type: string, enum: [AVEC_SESSION, A_LA_DEMANDE]
## }
prix_coutant:          { type: integer, minimum: 1, description: 'XOF —
prix que FORGES reverse au partenaire (RM-129)' }

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 70
# type_formation : ABSENT — assigné par FORGES lors de la validation (RM-
## 127)
# pilier_abonnement : ABSENT — assigné par FORGES lors de la validation

17.4 Codes de réponse standard — Catalogue complet
Endpoint clé 200/201 (succès) 400/422 (validation) 403/409 (conflit/auth)
POST /auth/login
200 { accessToken,
refreshToken }
## 400 BAD_REQUEST 401 UNAUTHORIZED
## POST
## /apprenants/register
201 { message: "Confirmez
votre email" }
## 400 BAD_REQUEST 409 DUPLICATE_EMAIL
## POST
## /sessions/:id/inscrire
201 { dossier, flux:
## "DIRECT"|"VERIFICATION" }
## 400 SESSION_NOT_OPEN 409 ALREADY_ENROLLED
PUT /dossiers/:id/retenir 200 { dossier, expires_at }
## 400
## STANDARD_DIRECT_PAYMENT
## (RM-140)
## 403 FORBIDDEN
POST /paiements/initier 200 { payment_url } 422 DOSSIER_NOT_RETENU 429 TOO_MANY_ATTEMPTS
## POST
## /partenaires/:id/formations
201 { formation_id, statut:
## "EN_ATTENTE_VALIDATION"
## }
400 BAD_REQUEST (champ
manquant RM-136)
## 422
## TYPE_FORMATION_READONLY
## (RM-127)
## GET
## /vouchers/:code/check
200 { valid: true|false, type } 422 VOUCHER_INVALID
## 422
## VOUCHER_CUMUL_INTERDIT
## (RM-144)
## GET
## /bot/session/:id/reponse
200 { question_suivante |
fin_conversation }
## 400 REPONSE_HORS_LISTE
## (RM-118)
## 401 UNAUTHORIZED

⚠️ Sécurité Swagger en production
La documentation Swagger doit être désactivée en production (NODE_ENV=production). Utiliser un
accès par authentification en staging. Ne jamais exposer les schémas de réponse incluant les données
financières internes (commission_forges_pct, montant_reverse) dans la documentation publique.

FORGES — Conception Technique v1.3 — Confidentiel
## Document Confidentiel 71
