

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 1




## FORGES
## Version 4.8

Document des Spécifications
Cas d'utilisation — Application Web


## Mars 2026


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 2
Table des Révisions

Version Date Nature des modifications Sections Auteur
## 1.0–3.6
## 01–
## 07/03/2026
Création initiale, évolutions successives
(Sessions, Organisations, Vouchers,
## UCS00-UCS12)
## Document
complet
## À
définir
## 4.0 Mars 2026
Modules abonnement
Retail/B2B/Institutionnel. UCS03.1, 03.2,
## 09.1, 11.1, 12.1, 13. RM-50–79.
## Sections 1-9
## À
définir
## 4.1 Mars 2026
Apprenant (ex-Étudiant). Essai 30j
Organisation. Diagrammes textuels. RM-
## 80–85.
## Document
complet
## À
définir
## 4.2 Mars 2026
B2B tous types Organisation.
Premium/Standard/Sur devis. Formations
à la demande. Multi-langue. UCS14. RM-
## 86–101.
## Document
complet
## À
définir
## 4.3 Mars 2026
22 diagrammes PNG intégrés. Corrections
RM. Harmonisation terminologie.
## Document
complet
## À
définir
## 4.4 Mars 2026
Corrections workflow abonnements. RM-
102, RM-103. Glossaire section 1.
Numéros de page.
## Document
complet
## À
définir
## 4.5 Mars 2026
Optimisation abonnements RM-104–114.
Bot Conseiller hybride UCS15/UCS16.
## RM-115–125.
## Document
complet
## À
définir
## 4.6 Mars 2026
Partenaire Fournisseur. UCS17/UCS18.
Entités Partenaire/FormationPartenaire.
## RM-126–135.
## Document
complet
## À
définir
## 4.7 Mars 2026
Bot 100% règles métier (RM-117
supprimée). Simplification vérification
dossier RM-140. RM-136 formulaire
partenaire. Pied de page corrigé.
## Document
complet
## À
définir
## 4.8 Mars 2026
Document complet autosuffisant. Tous
UCS00–UCS20. Toutes RM-01–148.
Figure 1 (Diagramme Global UCS) et
Figure 2 (ERD v12) générées. UCS20
Espace Apporteur d'Affaires (tableau de
bord dédié). Correction tableau 7.22 (code
apporteur = traçage sans réduction
apprenant). Pied de page : numéro de
page extrême droite. Révision v4.8.
## Document
complet
## À
définir


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 3
Table des Matières

Table des Révisions
Table des Matières
## 1. Glossaire
## 2. Introduction
- Propriétés des Entités
- Spécification des Acteurs
- Diagramme Global des Cas d'Utilisation
- Modèle de Données (ERD)
## 7. Règles Métier
7.1 Inscriptions (RM-01–05)
7.2 Paiements (RM-06–10)
7.3 Formations (RM-11–13)
7.4 Sessions (RM-14–21)
7.5 Planification (RM-22–25)
7.6 Cycle de vie d'un Dossier
7.7 Espace Apprenant (RM-26–27)
7.8 Auto-inscription (RM-28–33)
7.9 Profils, Organisations, Vouchers (RM-34–49)
7.10 Abonnements Institutionnels (RM-50–59)
7.11 Abonnements B2B (RM-60–69)
7.12 Abonnements Retail (RM-70–79)
7.13 Abonnements Organisation (RM-80–85)
7.14 Formations Premium (RM-86–90)
7.15 Formations à la Demande (RM-91–96)
7.16 Multi-langue (RM-97–101)
7.17 Éligibilité Abonnement et Accès (RM-102–103)
7.18 Corrections Workflow Abonnements (RM-104–114)
7.19 Bot Conseiller — Règles Métier (RM-115–125)
7.20 Partenaires Fournisseurs (RM-126–140)
7.21 Voucher Apporteur d'Affaires (RM-141–148)
## 7.22 Récapitulatif Visibilité Formations
## 8. Exigences Non Fonctionnelles
- Matrice des Rôles et Permissions
- Spécification des Cas d'Utilisation
UCS00 à UCS20 + MT-01 + MT-02
- Index des Cas d'Utilisation


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 4
## 1. Glossaire
Termes techniques et métier — FORGES v4.8. Document autosuffisant.

## Terme Définition
AbonnementB2B
Abonnement annuel souscrit par toute Organisation (tous types) pour
former ses membres. Paliers : Starter (1–20 apprenants), Business (21–
50), Enterprise (51–100 + 2 formations Premium/an incluses), Sur devis
(>100). Montée en palier prorata (RM-68). Descente de palier au
renouvellement (RM-110). Voir UCS03.2, UCS12.1.
AbonnementOrganisation
Abonnement donnant accès aux fonctionnalités plateforme FORGES
après essai 30 jours. Offres : Basique (50 000 XOF/an), Pro (150 000
XOF/an), Enterprise (400 000 XOF/an — RM-107). Renouvellement
annuel automatique (RM-109). Prérequis pour souscrire
AbonnementB2B.
AbonnementRetail
Abonnement mensuel individuel. Offres : Essentiel (15 000 XOF/mois),
Premium (25 000 XOF/mois). Downgrade possible à la fin de période
(RM-104). Premier mois au prorata (RM-106). Max 3 formations
simultanées (RM-72).
AccesFormationDemande
Accès d'un apprenant à une formation à la demande. Durée configurable
(défaut 365 jours — RM-92). Source : Abonnement (suspendu si
abonnement inactif — RM-103), Achat unitaire (durée fixe), B2B
(suspendu si B2B expiré — RM-111), Institutionnel.
Apporteur d'Affaires
Individu ou Organisation (Profil B) ayant reçu un code de parrainage
UUID permanent pour recommander FORGES. Perçoit une commission
% du CA généré par les transactions utilisant son code (RM-141–148).
Représenté en violet dans les diagrammes.
## Apprenant
Participant à une formation FORGES, en formation initiale ou continue.
Remplace Étudiant depuis v4.1. Interagit avec le Bot Conseiller (UCS15).
## Bot Conseiller
Acteur système 100% règles métier (sans LLM — décision v4.7).
Fonctions par arbres de décision : orientation formations (questions
fermées — RM-118), suggestion upgrade (RM-119), feedback post-
formation (RM-122), enquête catalogue (RM-123). Accessible aux
Apprenants (UCS15) et Organisations (UCS16). Toutes interactions en
questions à choix (listes, boutons — RM-118). Roadmap LLM envisagée
en v5.x.
## Commission Apporteur
% du CA généré par les transactions utilisant le code de l'Apporteur.
Calculée et reversée mensuellement si cumul >
seuil_minimum_reversement (RM-146, RM-147). Aucun plafond mensuel
## (RM-141).
Commission FORGES
(Partenaire)
FORGES encaisse le prix catalogue auprès de l'apprenant. FORGES
reverse au Partenaire son prix coûtant = prix_catalogue × (1 −
commission_forges/100). FORGES conserve la commission. Le
Partenaire ne facture jamais directement l'apprenant (RM-129).
CommissionApporteur
Entité enregistrant chaque commission générée par un code apporteur :
apporteur_id, transaction_id, montant_base, taux%,
montant_commission, statut (En attente | Validée | Reversée).
ConversationBot
Session de conversation entre un utilisateur et le Bot Conseiller.
Historique JSON, flux actif, actions déclenchées.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 5
ContratInstitutionnel
Contrat SaaS annuel avec un ministère/bailleur. Multi-gestionnaires (1–5
selon offre AbonnementOrganisation — RM-112). Avenant possible (RM-
113). Seuil minimum facturation fees (RM-114). Format : INST-AAAA-
## NNN.
EnqueteCatalogue
Besoin de formation non catalogué, recueilli via formulaire structuré 3
questions fermées (RM-123). Exploité par Admin pour piloter la roadmap
partenariats.
Essai gratuit
30 jours d'accès complet accordés à toute nouvelle Organisation (RM-
81). Offre bienvenue à J+25 (RM-85).
FeedbackFormation
Questionnaire de satisfaction fixe 5 questions collecté après une
formation terminée (RM-122). Note globale obligatoire.
FormationPartenaire
Lien Formation ↔ Partenaire avec statut validation, version, historique.
Le type_formation et pilier_abonnement sont assignés exclusivement par
FORGES lors de la validation (UCS18 — RM-127).
Formation à la demande
mode_formation=À la demande. Accessible 24h/24 sans session
planifiée (RM-91 à RM-96).
## Formation Premium
type_formation=Premium. Assigné par FORGES uniquement (RM-127).
Achat unitaire obligatoire hors palier Enterprise. Réduction -15% abonnés
actifs (RM-88).
## Formation Standard
type_formation=Standard. Assigné par FORGES uniquement (RM-127).
Incluse dans abonnements selon RM-102.
Formation Sur devis
type_formation=Sur devis. Assigné par FORGES. Tarif négocié
individuellement.
## FORGES
Formation, Organisation, Gestion, Enrôlement, Suivi. Agrégateur de
formations certifiantes. GIE OHADA (Point Focal × NSC 50/50). Côte
d'Ivoire.
## GWU
George Washington University. Partenaire stratégique FORGES.
Certifications Cybersécurité et IA à 2 000 000 XOF. Type : Formation
Premium (assigné par FORGES).
inclus_abonnement
Booléen calculé automatiquement par le système. Vrai si ET
SEULEMENT SI type_formation=Standard ET pilier_abonnement ∈
{Retail, Tous} (RM-102). Non modifiable manuellement.
## Partenaire Fournisseur
Organisme de formation, université ou entreprise certifiante distribuant
ses formations via FORGES. Deux modes : invitation Admin ou auto-
inscription avec approbation (RM-126). Soumet des formations via
UCS17. Reçoit son prix coûtant reversé mensuellement. Représenté en
orange.
Prix catalogue
Prix affiché et encaissé par FORGES auprès de l'apprenant. Calculé
automatiquement = prix_coutant_partenaire / (1 −
commission_forges/100) (RM-129).
Prix coûtant partenaire
Montant que le Partenaire souhaite percevoir par formation vendue.
Soumis dans RM-136, validé ou négocié lors de UCS18. Le Partenaire
ne voit jamais la commission FORGES dans son interface.
## RM-140
Bifurcation inscription : vérification dossier (UCS08) uniquement si
type_formation=Premium ET source=Retail. Tous les autres cas →
paiement direct.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 6
Roadmap LLM v5.x
Introduction d'une composante LLM dans le Bot Conseiller envisagée en
v5.x, après analyse des patterns d'utilisation réels et définition d'un cadre
de gouvernance IA.
## UUID
Universally Unique Identifier. Codes Voucher/Apporteur, tokens, contrats,
accès formations.
## Voucher Apporteur
Type de voucher associé à un Apporteur d'Affaires. Code permanent
UUID. Commission % sur CA généré. Non cumulable avec tout autre
voucher. Exception : réduction abonné Retail (-15%) applicable en plus
## (RM-144).
XOF Franc CFA (UEMOA) — ISO 4217. 1 USD ≈ 600 XOF (mars 2026).


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 7
## 2. Introduction
## Objectif
L'objectif du projet est de fournir une plateforme web capable de :

- Permettre aux apprenants de s'inscrire en ligne pour des formations disponibles sur la
plateforme ;
- Gérer les dossiers de candidature et permettre aux responsables de les examiner (formations
Premium + Retail uniquement) ;
- Notifier les apprenants retenus et leur permettre de procéder au paiement en ligne ;
- Offrir des tableaux de bord d'activités et financier pour le suivi des inscriptions et paiements ;
- Gérer des abonnements récurrents : Retail mensuel, B2B annuel, Institutionnel annuel ;
- Proposer un essai gratuit de 30 jours aux Organisations suivi d'un abonnement obligatoire ;
- Gérer trois niveaux de formations : Standard, Premium et Sur devis — classification décidée
exclusivement par FORGES ;
- Proposer des formations à la demande accessibles 24h/24 ;
- Supporter quatre langues : Français, Anglais, Espagnol, Portugais ;
- Assister les apprenants et organisations via un Bot Conseiller 100% règles métier (questions
fermées — orientation, upgrade, feedback, enquête catalogue) ;
- Permettre aux Partenaires Fournisseurs de soumettre leurs formations, avec validation et
classification par FORGES ;
- Récompenser les Apporteurs d'Affaires via un système de commission sur le CA généré.

Note v4.8 — Principes fondamentaux
- FORGES est l'unique interlocuteur financier de l'apprenant. Le Partenaire reçoit son prix
coûtant reversé mensuellement.
- La classification type_formation (Standard / Premium / Sur devis) est une décision exclusive
de FORGES, jamais du Partenaire.
- Le Bot Conseiller fonctionne exclusivement sur règles métier fixes et questions fermées.
Roadmap LLM v5.x.
- La vérification de dossier par le Responsable est limitée aux formations Premium + source
Retail (RM-140).


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 8
- Propriétés des Entités

## Entité Propriétés
## Apprenant
- Nom, Prénoms, Date de naissance, Contact, Email, Numéro
identification - type_apprenant : Professionnel | Apprenant (RM-34) -
secteur_activite (RM-35), niveau_etude (RM-36) - FK organisation_id
(nullable), pays_residence, pays_nationalite (ISO 3166-1 — RM-48) -
langue_preferee : FR | EN | ES | PT (RM-98) - abonnement_id FK
AbonnementRetail (nullable)
## Formation
- Intitulé, Description courte (500 car.), Description longue (HTML max 5
000 car.) - URL Brochure (PDF max 10Mo), URL Vidéo externe
(optionnel) - Durée (jours), Coût catalogue, Nombre places, Responsable
assigné - type_formation : Standard | Premium | Sur devis (assigné par
FORGES — RM-127) - mode_formation : Avec session | À la demande
(RM-91) - statut : Brouillon | En attente planification | En attente validation
| Active | Archivée | Rejetée | Suspendue - inclus_abonnement : booléen
calculé (RM-102) - pilier_abonnement : Retail | B2B | Institutionnel | Tous
(assigné par FORGES — RM-127) - duree_acces_jours : entier défaut
365 (si À la demande) - contenu_video_url (si À la demande) -
langues_disponibles : liste FR|EN|ES|PT - partenaire_id FK Partenaire
(nullable) - Champs partenaire : prerequis, objectifs_pedagogiques (1–
10), programme_syllabus, modalite, certification_delivree,
organisme_certificateur, public_cible, nb_places_max_session -
prix_coutant_partenaire XOF (nullable — null si formation interne
## FORGES)
Dossier d'inscription
- Identifiant, Apprenant, Formation, Date soumission - Statut : En attente
de vérification | Retenu | Rejeté | Payé | Annulé - NB v4.8 : statut
"Retenu" uniquement pour formations Premium + Retail (RM-140).
Formations Standard → statut Payé directement. - Commentaire
responsable, document_complementaire (RM-49) - source_financement :
Retail | B2B | Institutionnel | Abonnement | Voucher
## Paiement
- Identifiant, Apprenant, Montant catalogue, Date/heure, Méthode - Statut,
Référence transaction - type_paiement : Unitaire | Abonnement -
commission_partenaire_appliquee % (RM-129 — null si formation interne)
- montant_reverse_partenaire XOF (calculé : montant × (1 −
commission%)) - code_apporteur FK VoucherApporteur (nullable — RM-
145) - commission_apporteur_appliquee % (nullable)
## Utilisateur
- Nom, Prénoms, Login, Email, Mot de passe, Téléphone - Rôle :
## Administrateur | Responsable | Agent Comptable | Superviseur -
langue_preferee : FR | EN | ES | PT - partenaires_assignes : liste FK
Partenaire (RM-128)
## Organisation
- Raison sociale, Type, Sous-type Gouvernement, Identifiant légal,
Contact référent - Email, Téléphone, Statut, pays, langue_preferee -
abonnement_org_id FK AbonnementOrganisation, date_fin_essai -
abonnement_b2b_id FK AbonnementB2B (nullable) - apporteur_id FK
Apporteur (nullable — si Organisation est aussi apporteuse)
## Partenaire
- id UUID, raison_sociale, type (Université|Organisme|Entreprise
certifiante|Autre) - pays (ISO 3166-1), email_principal, téléphone -
commission_forges % (défaut 20 — RM-129) - statut : Invité | En attente
vérification | Actif | Suspendu | Résilié - mode_inscription : Invitation |
Auto-inscription - responsable_designe_id FK Utilisateur (RM-128) -
nb_formations_actives, revenus_cumules_verses XOF

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 9
FormationPartenaire
- id UUID, formation_id FK, partenaire_id FK, responsable_validateur_id
FK - statut_validation : En attente | Validée | Rejetée | Suspendue -
date_soumission, date_validation, version entier - prix_coutant_soumis
XOF (proposé par Partenaire — RM-136) - prix_coutant_valide XOF
(validé/négocié lors UCS18) - commentaire_responsable,
corrections_suggerees - NB : type_formation et pilier_abonnement
assignés par le Responsable lors de la validation (RM-127)
## Apporteur (v4.8)
- id UUID, nom, type : Individu | Organisation - organisation_id FK
(nullable — si type=Organisation) - email, téléphone, pays -
code_apporteur : UUID permanent et unique (RM-142) -
taux_commission % (configuré par Admin — RM-141) - statut : Actif |
Suspendu | Résilié - date_inscription - cumul_commissions_dues XOF,
cumul_commissions_versees XOF
VoucherApporteur (v4.8)
- id UUID, apporteur_id FK - code : UUID permanent (= code_apporteur
de l'Apporteur) - type : Apporteur (distinct de Organisation et
Promotionnel) - statut : Actif | Suspendu - nb_utilisations compteur,
date_derniere_utilisation - NB : Non cumulable avec tout autre type de
voucher (RM-144)
CommissionApporteur
## (v4.8)
- id UUID, apporteur_id FK, paiement_id FK - montant_base XOF
(montant transaction) - taux_commission %, montant_commission XOF -
date_generation, mois_facturation (AAAA-MM) - statut : En attente |
## Validée | Reversée | Bloquée
AbonnementRetail
- id UUID, apprenant_id FK, offre : Essentiel | Premium - statut,
montant_mensuel, methode_paiement, dates - renouvellement_auto (RM-
75), nb_formations_actives (max 3 — RM-72) - downgrade_planifie (RM-
104), prorata_premier_mois (RM-106)
AbonnementOrganisation
- id UUID, organisation_id FK - statut : Essai | Actif | Expiré | Suspendu |
Résilié - offre_org : Basique | Pro | Enterprise (RM-107) - montant_annuel
XOF, perimetre_fonctionnel, dates, renouvellement_auto (RM-109)
AbonnementB2B
- id UUID, organisation_id FK (tous types) - palier : Starter | Business |
Enterprise | Sur devis - nb_apprenants_max, nb_apprenants_actifs,
dates, montant_annuel XOF, statut - nb_premium_inclus compteur (RM-
89), descente_palier_planifiee (RM-110)
ContratInstitutionnel
- id UUID (INST-AAAA-NNN), institution_nom, programme, bailleur -
gestionnaires_ids liste FK (1–5 selon offre — RM-112) - dates,
montant_saas_annuel XOF, fee_par_certifie XOF - seuil_facturation_fees
XOF (RM-114), statut - avenants liste (date, nature, montant_nouveau —
## RM-113)
AccesFormationDemande
- id UUID, apprenant_id FK, formation_id FK - date_achat,
date_expiration_acces (RM-92) - statut : Actif | Suspendu | Expiré -
source : Abonnement | Achat unitaire | B2B | Institutionnel -
remise_appliquee %
ConversationBot
- id UUID, utilisateur_id FK, type_utilisateur : Apprenant | Organisation -
date_debut, date_fin, flux_actif, statut - historique JSON (choix
sélectionnés — pas de texte libre except feedback commentaire) -
actions_declenchees liste, langue
EnqueteCatalogue
- id UUID, source_type, source_id FK, date_saisie - domaine (liste
déroulante), niveau_cible (liste), volume_estime (liste) -
frequence_demande compteur, statut, commentaire_admin

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 10
FeedbackFormation
- id UUID, apprenant_id/organisation_id FK, formation_id FK - session_id
FK (nullable), date_saisie, canal : Bot | Manuel - note_globale 1-5
(obligatoire), note_contenu 1-5 (optionnel) - note_formateur 1-5
(optionnel), commentaire_libre 500 car. (seul champ texte libre) -
recommande booléen (obligatoire)
TraductionContenu
- id UUID, entite_type, entite_id FK - langue : FR | EN | ES | PT, champ,
valeur, statut


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 11
- Spécification des Acteurs

Administrateur (Superadmin)
Configure l'ensemble de la plateforme. Crée les comptes Partenaire (invitation), approuve les auto-
inscriptions, désigne les Responsables désignés, configure les commissions partenaires (RM-129),
les taux apporteurs (RM-141), les paramètres Bot Conseiller et le seuil minimum de reversement
## (RM-147).

Apprenant (ex-Étudiant)
Participant à une formation FORGES. Inscription directe (Standard) ou via vérification Responsable
(Premium + Retail — RM-140). Interagit avec le Bot Conseiller via questions fermées (UCS15). Peut
utiliser un code Apporteur.

Responsable de Formation
Examine les dossiers Premium + Retail (UCS08 — RM-140). En tant que Responsable désigné :
valide/rejette les formations partenaires ET assigne type_formation et pilier_abonnement (UCS18 —
RM-127). Consulte les FeedbackFormation.

## Agent Comptable
Supervise les opérations financières. Gère les relevés de commissions partenaires (RM-129), les
reversements aux Partenaires et les commissions Apporteurs (RM-146, RM-148). Consulte le tableau
mensuel des reversements.

## Superviseur
Vue globale. Planifie les sessions (formations Avec session). Valide les vouchers promotionnels.
Consulte le tableau de bord mensuel Apporteurs (volume, conversions, taux — RM-148).

## Gestionnaire Institution
Multi-gestionnaires possibles (RM-112). Enrôle les apprenants, suit les certifications, génère les
rapports bailleurs.

Responsable RH / Formation Organisation
Gère l'AbonnementB2B. Interagit avec le Bot Conseiller Organisation (UCS16 — questions fermées).

## Bot Conseiller
Acteur système 100% règles métier. Toutes interactions en questions fermées (listes déroulantes,
boutons — RM-118). Orientation : filtrage catalogue par arbre de décision. Upgrade : règles RM-
116/RM-119. Feedback : questionnaire fixe (RM-122). Enquête : formulaire 3 questions fermées (RM-
123). Roadmap LLM v5.x.

Module de Paiement (Système tiers)
API REST pour paiements unitaires et abonnements récurrents Mobile Money.


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 12
Système de Traduction
Composant interne gérant le multi-langue FR/EN/ES/PT (RM-97 à RM-101).

## Partenaire Fournisseur
Organisme de formation/université/entreprise certifiante. Deux modes d'accès (RM-126). Soumet des
formations via UCS17. Ne fixe pas le type_formation (responsabilité FORGES — RM-127). Reçoit
son prix coûtant reversé mensuellement (RM-129). Représenté en orange.

Apporteur d'Affaires (v4.8)
Individu ou Organisation (Profil B) ayant reçu un code de parrainage permanent UUID (RM-141, RM-
142). Partage son code à son réseau. Perçoit une commission % sur le CA généré par les
transactions utilisant son code (RM-145). Suivi mensuel : tableau de bord dédié (RM-148).
Représenté en violet.

## Organisation
Structure externe finançant des formations. Essai 30j + AbonnementOrganisation. AbonnementB2B
complémentaire. Peut être Apporteuse d'Affaires. Interagit avec Bot Conseiller (UCS16).



FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 13
- Diagramme Global des Cas d'Utilisation
Figure 1 — Diagramme global UML v4.8. Acteurs : Apprenant, Organisation, Admin, Responsable,
Superviseur, Agent Comptable, Partenaire Fournisseur (orange), Apporteur d'Affaires (violet), Bot
Conseiller (vert), Système. UCS00–UCS20, MT-01, MT-02.


Figure 1 — Diagramme Global des Cas d'Utilisation FORGES v4.8


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 14
- Modèle de Données (ERD)
Figure 2 — ERD v12 (vue simplifiée). Entités principales et relations clés. Couleurs : bleu = cœur
métier, orange = Partenaire Fournisseur, violet = Apporteur d'Affaires, vert = Bot Conseiller.


Figure 2 — ERD v12 — Modèle de données FORGES v4.8 (vue simplifiée)

6.1 Cardinalités et règles d'association
Entité 1 Entité 2 Cardinalité Règle métier
## Apprenant Dossier 1 — N
Un apprenant soumet un dossier
par formation Avec session.
Apprenant AbonnementRetail 1 — 0..1
Un seul abonnement Retail actif
par apprenant (RM-70).
Apprenant ConversationBot 1 — N Plusieurs sessions bot possibles.
Organisation AbonnementOrganisation 1 — 0..1
Un AbonnementOrganisation actif
par Organisation (RM-84).
Organisation AbonnementB2B 1 — 0..1
Tout type Organisation peut avoir
un AbonnementB2B (RM-88).
## Organisation Apporteur 1 — 0..1
Une Organisation peut aussi être
Apporteuse d'Affaires.
## Partenaire Formation 1 — N
Un partenaire soumet plusieurs
formations.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 15
Formation FormationPartenaire 1 — 0..1
Une formation partenaire a une
FormationPartenaire active.
Apporteur VoucherApporteur 1 — 1
Un apporteur a un code
permanent unique (RM-142).
VoucherApporteur Paiement 1 — N
Un code apporteur peut être utilisé
sur plusieurs transactions.
Paiement CommissionApporteur 1 — 0..1
Un paiement avec code apporteur
génère une commission.
ContratInstitutionnel Utilisateur N — M Multi-gestionnaires (RM-112).
Apprenant AccesFormationDemande 1 — N
Plusieurs accès formations à la
demande possibles.


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 16
## 7. Règles Métier
Ensemble exhaustif des règles métier de la plateforme FORGES v4.8. Ce document est autosuffisant
— aucun renvoi aux versions précédentes.

7.1 Règles relatives aux Inscriptions
ID Règle Description
RM-01 Unicité d'inscription
Un apprenant ne peut soumettre qu'un seul dossier actif par
formation Avec session. Un nouveau dossier n'est possible que si le
précédent est rejeté ou annulé.
RM-02 Clôture automatique
Quand le nombre de places restantes atteint zéro, le système ferme
automatiquement les inscriptions. Aucun nouveau dossier ne peut
être soumis.
## RM-03
Dossier en attente et
archivage
Si une formation est archivée alors que des dossiers sont en
attente, ces dossiers sont automatiquement annulés et les
apprenants notifiés.
## RM-04
Délai de traitement
obligatoire
Toute formation doit avoir un délai de traitement configuré avant
d'être ouverte aux inscriptions.
## RM-05
Irréversibilité du statut
## Retenu
Un dossier Retenu ne peut être annulé que manuellement par un
Admin, uniquement si aucun paiement n'a été effectué. Applicable
uniquement aux formations Premium + Retail (RM-140).

7.2 Règles relatives aux Paiements
ID Règle Description
## RM-06
Paiement unique par
dossier
Un apprenant dont le dossier est retenu ne peut effectuer qu'un
seul paiement validé par dossier. Toute tentative de double
paiement est bloquée.
RM-07 Délai de paiement
L'apprenant retenu dispose de 72 heures pour payer. Passé ce
délai, le dossier repasse en statut Annulé et la place est libérée.
Applicable uniquement aux dossiers Premium + Retail (RM-140).
RM-08 Nombre de tentatives
En cas d'échec, l'apprenant peut retenter le paiement jusqu'à 3 fois
par session. Au-delà, une attente de 15 minutes est imposée.
## RM-09
Réponse asynchrone
## API
Si le module de paiement ne répond pas dans 30 secondes, la
transaction est en attente avec vérification toutes les 5 minutes
pendant 1 heure.
## RM-10
## Non-remboursement
automatique
Aucun remboursement n'est traité automatiquement. Tout
remboursement est initié manuellement par l'Agent Comptable.

7.3 Règles relatives aux Formations
ID Règle Description
## RM-11
Protection de
l'historique
Toute formation avec au moins un paiement validé ne peut être
supprimée. Elle est obligatoirement archivée.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 17
RM-12 Cohérence du tarif
La modification du coût d'inscription n'affecte pas les dossiers déjà
traités. Le tarif d'origine est conservé dans l'historique.
## RM-13
Réouverture d'une
formation
Une formation archivée ne peut pas être réactivée. Elle doit être
recréée comme nouvelle formation pour conserver l'historique
intact.

7.4 Règles relatives aux Sessions
ID Règle Description
## RM-14
Définition d'une
session
Une session est une occurrence concrète d'une formation Avec
session à une date précise. Elle hérite de la durée de la formation
parente. Non applicable aux formations À la demande (RM-91).
## RM-15
Unicité d'inscription
par formation
Un apprenant ne peut avoir qu'un seul dossier actif (En attente de
vérification, Retenu ou Payé) par formation à un instant T. Un
dossier Rejeté ou Annulé ne bloque pas une nouvelle inscription.
## RM-16
## Cohérence
chronologique des 4
dates
Ordre obligatoire : date_ouverture < date_cloture < date_debut <
date_fin. Toute violation bloque l'enregistrement.
## RM-17
## Non-chevauchement
des sessions
Deux sessions d'une même formation ne peuvent pas se
chevaucher dans le temps. Vérification automatique à la création et
modification.
## RM-18
Fenêtre d'exception
— règle des 10%
Après date_debut, des inscriptions exceptionnelles sont autorisées
pendant floor(duree_jours × 10%), minimum 1 jour. Ces dossiers
sont de type Exception et nécessitent validation manuelle
(uniquement si Premium + Retail — RM-140).
## RM-19
Priorité de traitement
— dossiers Gris et
## Exception
Signalés en priorité dans l'interface du Responsable. Délai
recommandé : 24h. Applicable uniquement aux dossiers Premium +
Retail (RM-140).
## RM-20
## Transitions
automatiques de
statut de session
Scheduler quotidien 00h00 : Planifiée → À venir → Inscriptions
ouvertes → En cours → Clôturée, selon les 4 dates.
## RM-21
Archivage des
sessions passées
Session Clôturée depuis plus de 90 jours → archivage
automatique. Dossiers, paiements et attestations restent
accessibles en lecture.

7.5 Règles relatives à la Planification
ID Règle Description
## RM-22
Visibilité d'une
formation
Formations Avec session : visible si session À venir ou Inscriptions
ouvertes. Formations à la demande : visibles dès activation (RM-
93). Formations En attente de validation partenaire : invisibles (RM-
## 127).
## RM-23
## Planification
obligatoire après
création
Formation Avec session reste En attente de planification tant
qu'aucune session n'est créée. Invisible pour les apprenants.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 18
## RM-24
## Responsabilité
notification
modification
Modification des dates d'une session ayant des inscrits →
notification manuelle par le Responsable. La modification est tracée
dans l'historique.
RM-25 Planification annuelle
Le Superviseur peut planifier toutes les sessions d'une formation
pour une année en une seule opération, en définissant une
fréquence, une première date et une capacité par défaut.

7.6 Cycle de vie d'un Dossier (v4.7 — simplifié)
Le diagramme ci-dessous illustre les deux flux selon RM-140 : paiement direct (formations Standard)
et vérification (formations Premium + Retail).


Figure — Cycle de vie dossier v4.8 — Flux Standard vs Premium+Retail

## Transition Déclencheur Description
## Soumis → Payé
directement
## Système + Module
## Paiement
Formation Standard ou Premium hors Retail (RM-
140). Paiement immédiat. Responsable notifié en
information.
Soumis → En attente de
vérification
## Système
Formation Premium + source Retail uniquement
(RM-140). Responsable notifié pour action.
En attente → Retenu Responsable
72h pour payer (RM-07). Apprenant notifié (RM-
## 100).
En attente → Rejeté Responsable Motif obligatoire. Apprenant notifié.
En attente → Annulé
Apprenant ou
## Système
Annulation volontaire (RM-27) ou session
supprimée.
Retenu → Payé Système (API)
Paiement confirmé. Attestation disponible à la
clôture (RM-26).
## Retenu → Annulé
Apprenant ou
## Système
Avant paiement ou délai 72h expiré (RM-07).

7.7 Règles relatives à l'Espace Apprenant

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 19
ID Règle Description
## RM-26
Attestation de
formation
Générée sur demande si : (1) dossier au statut Payé ET (2) session
Clôturée. Contenu : nom, formation, durée, dates, date génération,
UUID, cachet électronique. PDF chiffré AES-256 (MT-02).
RM-27 Annulation volontaire
L'apprenant peut annuler uniquement si statut = En attente de
vérification. Une fois Retenu, contact Responsable obligatoire.
Expiration 72h sans paiement : annulation automatique (RM-07).

7.8 Règles relatives à l'Auto-inscription
ID Règle Description
RM-28 Unicité de l'email
Une adresse email par compte, quel que soit son statut. Vérification
insensible à la casse.
RM-29 Rôle fixe Apprenant
Tout compte créé via UCS00 reçoit automatiquement le rôle
Apprenant. Aucune élévation de privilège possible.
## RM-30
Expiration du lien de
confirmation
Lien valide 24 heures. Compte non confirmé purgé après 7 jours
d'inactivité.
## RM-31
Protection contre
l'énumération
Email déjà utilisé : message d'erreur générique sans révéler l'état
du compte.
## RM-32
Limitation des
tentatives
d'inscription
Maximum 5 soumissions par adresse IP par heure. Blocage
temporaire de 30 minutes au-delà.
## RM-33
Conservation du
consentement RGPD
Consentement enregistré avec timestamp et version des CGU.
Conservé même après suppression du compte.

7.9 Règles relatives aux Profils Apprenants, Organisations et Vouchers
ID Règle Description
## RM-34
type_apprenant
obligatoire
Champ type_apprenant (Professionnel | Apprenant) obligatoire à
l'inscription (UCS00). Non modifiable après activation.
## RM-35
Secteur obligatoire si
## Professionnel
Si type_apprenant = Professionnel, le secteur_activite doit être
sélectionné dans la liste fournie.
## RM-36
Niveau obligatoire si
Apprenant scolarisé
Si type_apprenant = Apprenant, le niveau_etude doit être
sélectionné dans la liste fournie.
## RM-37
Voucher lié à une
formation
Un voucher (Organisation ou Promotionnel) est obligatoirement lié
à une formation spécifique. Non utilisable sur une autre formation.
## RM-38
Usage unique par
bénéficiaire
Un code voucher Organisation ne peut être utilisé qu'une seule fois,
par un seul bénéficiaire, pour la formation associée.
## RM-39
Workflow validation
voucher promo
Voucher promotionnel créé par l'Agent Comptable
(statut=Brouillon). Devient Actif après validation explicite par un
## Superviseur.
## RM-40
Quota et expiration
obligatoires
Tout voucher promotionnel doit avoir quota_max >= 1 et une
date_expiration valide. Ces champs sont non modifiables après
activation.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 20
## RM-41
## Voucher Organisation
= paiement
automatique
Dossier couvert à 100% par un voucher Organisation → statut Payé
automatiquement sans passer par UCS09.
## RM-42
Voucher promo =
réduction sur solde
Un voucher promotionnel réduit le montant dû. Si la remise ne
couvre pas la totalité, l'apprenant règle le solde via UCS09.
## RM-43
Unicité identifiant
légal par type
L'identifiant légal (SIRET, code diplomatique) doit être unique au
sein de son type d'organisation.
RM-44 Visibilité RH limitée
Le tableau de bord RH affiche uniquement les inscriptions des
bénéficiaires ayant utilisé un voucher émis par cette organisation.
## RM-45
Rejet dossier avec
voucher Organisation
Rejet → voucher réactivé automatiquement (quota décrémenté).
Organisation et bénéficiaire notifiés avec motif.
## RM-46
## Multi-sous-types
## Gouvernement
Une Organisation Gouvernement peut sélectionner plusieurs sous-
types simultanément. Chaque sous-type peut avoir son propre
identifiant légal facultatif.
## RM-47
Libellé contact
référent adaptatif
Libellé dynamique : Contact RH (Entreprise),
Directeur/Responsable (Association), Référent formation
(Gouvernement). Obligatoire pour tous les types.
## RM-48
Champ pays
obligatoire
pays_residence et pays_nationalite (Apprenant), pays
(Organisation). ISO 3166-1. Conditionne les statistiques
géographiques.
## RM-49
## Document
complémentaire
facultatif
L'apprenant peut joindre un document (PDF/JPG/PNG, max 5 Mo)
à son dossier lors de l'inscription (UCS07). Accessible au
Responsable lors du traitement.

7.10 Règles relatives aux Abonnements Institutionnels
ID Règle Description
## RM-50
Unicité contrat par
programme
Un contrat institutionnel est lié à un programme identifié. Pas de
mutualisation inter-programmes.
## RM-51
Facturation SaaS en
totalité
Montant SaaS annuel facturé en totalité à l'activation du contrat.
## RM-52
Facturation fee
mensuelle
Fees par certifié comptabilisés en temps réel, facturés
mensuellement si cumul > seuil (RM-114).
## RM-53
## Indépendance
compte Retail
Un apprenant institutionnel peut aussi avoir un compte Retail
individuel.
## RM-54
## Restrictions
## Gestionnaire
## Institution
Ne peut pas modifier les tarifs ni les paramètres du contrat.
## RM-55
## Traçabilité
certifications
Toute certification institutionnelle tracée avec le code contrat (INST-
## AAAA-NNN).
## RM-56
Alertes expiration
contrat
Alerte automatique J-60 et J-30 (email Admin FORGES + tous les
## Gestionnaires).
## RM-57
Suspension accès à
expiration
Statut → Expiré. Accès de tous les Gestionnaires suspendu.
Données conservées 5 ans.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 21
## RM-58
Renouvellement par
nouveau contrat
Le renouvellement crée un nouveau contrat lié à l'historique du
précédent.
## RM-59
Enrôlement masse ou
individuel
Enrôlement individuel ou import CSV. Chaque apprenant lié au
code contrat.

7.11 Règles relatives aux Abonnements B2B
ID Règle Description
## RM-60
Lien abonnement
B2B / Organisation
AbonnementB2B lié à une Organisation (tous types — Entreprise,
Association, Gouvernement). Distinct de AbonnementOrganisation.
## RM-61
Plafond d'apprenants
actifs
nb_apprenants_actifs ne peut pas dépasser nb_apprenants_max
du palier souscrit.
## RM-62
## Conservation
certifications après
désactivation
Les certifications d'un apprenant B2B sont conservées même après
désactivation de son compte B2B.
## RM-63
Facturation annuelle
non remboursable
Pas de remboursement au prorata en cas de résiliation anticipée.
## RM-64
## Formations Premium
et abonnement B2B
Facturées séparément pour tous les paliers, sauf Enterprise (2
incluses/an — RM-89).
## RM-65
## Indépendance
compte Retail B2B
Un apprenant B2B peut aussi avoir un abonnement Retail
individuel.
## RM-66
Alertes expiration
abonnement B2B
Alerte J-45 et J-15 (email Responsable RH/Formation + Admin
## FORGES).
## RM-67
Suspension accès à
expiration B2B
Accès de tous les apprenants B2B suspendu. Données et
certifications conservées 1 an.
## RM-68
Montée en palier
prorata
Possible à tout moment. Facturation du différentiel au prorata
temporis.
## RM-69
Alerte plafond palier
atteint
nb_actifs = nb_max → alerte automatique proposant une montée
en palier.

7.12 Règles relatives aux Abonnements Retail
ID Règle Description
## RM-70
Unicité abonnement
## Retail
Un seul abonnement Retail actif par apprenant à tout moment.
## RM-71
## Formations Premium
hors abonnement
Retail standard
Les formations Premium ne sont jamais incluses dans les
abonnements Retail (RM-87). Achat unitaire obligatoire.
## RM-72
Limite formations
simultanées
Maximum 3 formations actives simultanément par abonné Retail,
toutes offres confondues.
## RM-73
Période de grâce
renouvellement
Échec de prélèvement : grâce de 48h. Au-delà : accès suspendu
(non supprimé).

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 22
## RM-74
## Conservation
données après
résiliation
Données et certifications conservées indéfiniment après résiliation.
## RM-75
## Consentement
renouvellement
automatique
Consentement explicite obligatoire à la souscription (RGPD).
Enregistré avec timestamp.
RM-76 Limitation suspension 1 fois par trimestre maximum. Durée maximale : 1 mois.
## RM-77
## Aucun
remboursement mois
en cours
Résiliation effective à la fin de la période mensuelle payée.
## RM-78
Réactivation après
suspension
Cycle de facturation reprend à la date de réactivation.
RM-79 Upgrade offre prorata
Upgrade Essentiel → Premium : différentiel facturé au prorata du
mois en cours. Effectif immédiatement.

7.13 Règles relatives aux Abonnements Organisation
ID Règle Description
## RM-80
## Abonnement
obligatoire après
essai
Après 30 jours d'essai gratuit, un AbonnementOrganisation est
requis pour continuer à accéder à la plateforme.
RM-81 Essai gratuit 30 jours
Toute nouvelle Organisation bénéficie de 30 jours d'accès complet
gratuit à l'activation de son compte.
RM-82 Alerte fin d'essai Alerte automatique à J-7 et J-2 avant expiration de l'essai.
## RM-83
Suspension accès à
expiration essai
Sans abonnement souscrit à J+30 : accès suspendu. Données
conservées 90 jours.
## RM-84
Unicité abonnement
## Organisation
Un seul AbonnementOrganisation actif à la fois par Organisation.
## RM-85
Offre de bienvenue à
la conversion
À J+25 : offre de -20% valable 7 jours pour encourager la
souscription.

7.14 Règles relatives aux Formations Premium
ID Règle Description
## RM-86
Type formation :
responsabilité
## FORGES
exclusivement
Le champ type_formation (Standard | Premium | Sur devis) est
assigné exclusivement par FORGES lors de la création (formations
internes) ou de la validation (formations partenaires — RM-127). Le
Partenaire ne peut ni proposer ni modifier ce champ.
## RM-87
Premium hors
abonnement standard
Une formation Premium n'est jamais incluse dans les abonnements
Retail ou B2B standard. Achat unitaire obligatoire, sauf palier
Enterprise (RM-89).
## RM-88
Réduction abonné
actif sur Premium
Un abonné Retail actif ou bénéficiaire B2B actif bénéficie d'une
réduction de 15% sur l'achat d'une formation Premium.
## RM-89
Premium inclus palier
## Enterprise
Le palier Enterprise inclut 2 certifications Premium par an et par
Organisation. Compteur réinitialisé au renouvellement annuel.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 23
## RM-90
## Affichage Premium
dans catalogue
Badge "Premium" distinctif dans le catalogue. Prix affiché avec le
tarif réduit -15% pour les apprenants abonnés actifs.

7.15 Règles relatives aux Formations à la Demande
ID Règle Description
## RM-91
Mode formation
obligatoire
Le champ mode_formation (Avec session | À la demande) est
obligatoire à la création. Conditionne le flux d'accès : UCS07 (Avec
session) ou UCS14 (À la demande).
## RM-92
Durée d'accès
formations à la
demande
Accès pendant duree_acces_jours à compter de la date d'achat ou
d'activation (défaut : 365 jours). Configurable par le Responsable
lors de la validation partenaire.
## RM-93
## Disponibilité
immédiate
Formation à la demande accessible immédiatement après paiement
ou validation abonnement. Statut Active dès création (sans attente
de planification).
## RM-94
Formation Standard à
la demande et
abonnement
Incluse sans surcoût pour les abonnés Retail/B2B actifs, sous
réserve de RM-102.
## RM-95
Formation Premium à
la demande
Achat unitaire obligatoire même pour les abonnés. Accès limité à
duree_acces_jours. Réduction -15% abonnés actifs applicable
## (RM-88).
## RM-96
Pas de session pour
formations à la
demande
Une formation mode=À la demande ne peut pas avoir de session
planifiée. UCS05 désactivé pour ce type de formation.

7.16 Règles relatives au Multi-langue
ID Règle Description
RM-97 Langues supportées
4 langues : Français (FR — défaut), Anglais (EN), Espagnol (ES),
Portugais (PT).
## RM-98
Langue préférée
utilisateur
Définie dans le profil de chaque utilisateur. À défaut : détection
navigateur. Fallback : Français.
## RM-99
Fallback langue
manquante
Si une traduction est absente pour la langue préférée : affichage en
Français + bandeau informatif + indicateur Admin (traduction
manquante).
## RM-
## 100
## Traduction
notifications
Tous les emails automatiques sont envoyés dans la langue
préférée du destinataire. Fallback Français si traduction
manquante.
## RM-
## 101
Traduction interface
Interface disponible dans les 4 langues. Contenus des formations
traduits à la discrétion des Responsables de formation.

7.17 Règles relatives à l'Éligibilité Abonnement et Accès à la Demande
ID Règle Description
## RM-
## 102
Éligibilité formation
abonnement Retail
Une formation est accessible sans surcoût à un abonné Retail actif
si ET SEULEMENT SI : type_formation=Standard ET

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 24
pilier_abonnement ∈ {Retail, Tous}. Le champ inclus_abonnement
est calculé automatiquement. Non modifiable manuellement. Le
catalogue affiche un badge "Inclus abonnement".
## RM-
## 103
Expiration accès
formation à la
demande après
résiliation
Pour source=Abonnement Retail ou B2B : accès suspendu (non
supprimé) si abonnement inactif. Réactivation automatique à la
resouscription. Pour source=Achat unitaire : durée
duree_acces_jours (RM-92) indépendante du statut d'abonnement.

## 7.18 Corrections Workflow Abonnements
ID Règle Description
## RM-
## 104
## Downgrade
AbonnementRetail
## Premium → Essentiel
L'apprenant peut demander un downgrade depuis UCS11.1.
Effectif à la fin de la période mensuelle en cours. Aucun
remboursement de la différence. Champ downgrade_planifie
positionné jusqu'à effectivité.
## RM-
## 105
Suspension abonnement
et
AccesFormationDemande
Pendant la suspension volontaire (RM-76), les
AccesFormationDemande source=Abonnement passent en
statut Suspendu. Réactivés à la reprise. Accès expirant pendant
la suspension non prolongés.
## RM-
## 106
Premier mois
abonnement Retail au
prorata
Montant premier prélèvement = montant_mensuel ×
jours_restants / jours_mois. Cycle mensuel normal dès le 1er du
mois suivant.
## RM-
## 107
Grille tarifaire
AbonnementOrganisation
Basique : 50 000 XOF/an (TDB + vouchers + export PDF). Pro :
150 000 XOF/an (+ stats avancées + export Excel). Enterprise :
400 000 XOF/an (+ API + SLA 99,9% + 5 gestionnaires). Tarifs
révisables par Admin via UCS13.
## RM-
## 108
## Contenu
AbonnementOrganisation
par offre
Basique : tableau de bord référent, commande vouchers, suivi
inscriptions, export PDF. Pro : tout Basique + statistiques
détaillées, export Excel, multi-Organisation. Enterprise : tout Pro
+ accès API FORGES, SLA 99,9%, jusqu'à 5 gestionnaires
(RM-112), support dédié.
## RM-
## 109
## Renouvellement
AbonnementOrganisation
Traité dans UCS09.1. Alertes J-30 et J-7. Prélèvement
automatique si renouvellement_auto=true. Échec : grâce 48h
puis suspension. Données et historique conservés 90 jours.
## RM-
## 110
Descente de palier
AbonnementB2B
Conditions : nb_actifs <= nb_max palier cible. Effective au
renouvellement annuel. Si nb_actifs > nb_max cible à
l'effectivité : surplus désactivé automatiquement avec
notification Admin et Responsable RH.
## RM-
## 111
Extension RM-103 à
source=B2B
AccesFormationDemande source=B2B → Suspendu si
AbonnementB2B expire ou est résilié. Réactivation automatique
si resouscription avant 365j. Expiré définitif après 365j.
## RM-
## 112
## Multi-gestionnaires
ContratInstitutionnel
1 à 5 gestionnaires selon offre AbonnementOrganisation (1
pour Basique/Pro, 5 pour Enterprise). Chaque action tracée
individuellement (MT-01). Le gestionnaire principal peut
ajouter/révoquer les autres.
## RM-
## 113
## Avenant
ContratInstitutionnel
Modifie le fee par certifié ou la date de fin. Ne modifie pas le
SaaS annuel déjà facturé. Historique des avenants conservé
dans le contrat.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 25
## RM-
## 114
Seuil minimum facturation
fees
Défaut : 25 000 XOF. En dessous du seuil : fees reportés au
mois suivant (cumul glissant). En fin de contrat : solde facturé
quel que soit le montant.

7.19 Règles relatives au Bot Conseiller — 100% Règles Métier
ID Règle Description
## RM-
## 115
Déclenchement du
## Bot Conseiller
Manuel (bouton "Conseiller"), ou automatique si : profil incomplet,
session clôturée < 7j sans feedback, taux utilisation palier B2B >
80%, ou 0 formation trouvée dans catalogue.
## RM-
## 116
Règles fixes —
déclenchement
automatique
(a) Profil incomplet → invite à compléter avant orientation. (b) Taux
palier B2B > 80% → flux Upgrade. (c) Abonnement absent +
formation Standard éligible RM-102 → flux Upgrade. (d) Session
clôturée < 7j + pas de feedback → flux Feedback.
## RM-
## 117
Règle supprimée v4.7
RM-117 (recours LLM) supprimée. Le Bot Conseiller fonctionne
exclusivement sur règles métier fixes et questions fermées. Aucune
donnée ne quitte le système FORGES. Roadmap LLM envisagée
en v5.x après analyse des patterns d'utilisation réels et définition
d'un cadre de gouvernance IA dédié.
## RM-
## 118
Présentation des
recommandations —
questions fermées
uniquement
Le bot pose des questions à choix exclusivement (listes
déroulantes, boutons, cases à cocher). Aucune question ouverte à
texte libre. Filtrage catalogue par arbre de décision :
type_apprenant + secteur/niveau + historique + langue préférée.
Max 5 formations présentées. Badges "Inclus abonnement" (RM-
102) et "Premium" affichés. Ordre : pertinence profil > popularité >
nouveauté.
## RM-
## 119
Suggestion upgrade
abonnement
Déclenchée si : (a) formation Premium souhaitée + apprenant non
abonné ou abonné Essentiel, ou (b) palier B2B nb_actifs = nb_max
(RM-69). Suggestion non émise si refus < 7 jours (RM-120).
Argumentaire personnalisé basé sur règles uniquement.
## RM-
## 120
Gestion des refus de
suggestion upgrade
Refus enregistré dans ConversationBot avec date. Pas de
reproposition avant 7 jours. Après 3 refus consécutifs : suspension
suggestion 30 jours.
## RM-
## 121
Déclenchement flux
## Feedback
Conditions : session clôturée < 7j ET aucun feedback pour cette
session, ou AccesFormationDemande expiré ET aucun feedback.
Un seul feedback par formation par apprenant/organisation.
## RM-
## 122
Questionnaire de
satisfaction — 5
questions fixes
(1) Note globale 1–5 étoiles (obligatoire), (2) Note contenu 1–5
(optionnel), (3) Note formateur/organisation 1–5 (optionnel si Avec
session), (4) Commentaire libre 500 car. max (optionnel — seul
champ texte libre du bot), (5) Recommanderiez-vous ? Oui/Non
(obligatoire). Affiché dans la langue préférée (RM-98).
## RM-
## 123
## Flux Enquête
## Catalogue —
formulaire structuré
fermé
Déclenché si filtre catalogue retourne 0 résultat pertinent.
Formulaire 3 questions fermées à choix : (1) Domaine (liste
déroulante : IT, Finance, Santé, Droit, Management, IA,
Cybersécurité, Autre), (2) Niveau cible (liste : Débutant,
Intermédiaire, Avancé, Expert), (3) Volume estimé (liste : 1–5, 6–
20, 21–50, 51+). Aucune saisie libre. Données directement
exploitables sans interprétation.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 26
## RM-
## 124
Enregistrement et
exploitation
EnqueteCatalogue
Enregistrée avec domaine, niveau, volume. Fréquence incrémentée
si enquête similaire existante (matching exact : domaine + niveau).
Tableau de bord Admin trié par fréquence × volume. Apprenants
notifiés à la mise en catalogue.
## RM-
## 125
## Confidentialité Bot
## Conseiller —
données confinées
Bot 100% règles métier : aucune donnée ne quitte le système
FORGES. Le bot ne peut pas modifier des données utilisateur
(lecture seule), déclencher des paiements, accéder aux données
d'autres utilisateurs, ni communiquer avec des systèmes externes.
Toutes interactions tracées dans ConversationBot (MT-01).

7.20 Règles relatives aux Partenaires Fournisseurs et Commissions
ID Règle Description
## RM-
## 126
Modes d'inscription
## Partenaire
## Fournisseur
(A) Invitation Admin : token 48h, statut Invité → Actif après
activation. (B) Auto-inscription publique : statut En attente de
vérification → Actif après approbation Admin. Compte opérationnel
uniquement en statut Actif.
## RM-
## 127
## Classification
formation :
responsabilité
## FORGES
Le type_formation (Standard | Premium | Sur devis) et le
pilier_abonnement sont assignés exclusivement par le
Responsable désigné de FORGES lors de la validation UCS18. Le
Partenaire ne propose ni ne modifie ces attributs. Un champ
commentaire libre non structuré lui permet de suggérer un
positionnement (optionnel, sans valeur contractuelle).
## RM-
## 128
Validation par
Responsable de
formation désigné
Seul le Responsable désigné (partenaires_assignes) peut valider,
rejeter ou suspendre les formations du partenaire. Validation :
Formation → Active, visible dans le catalogue. Rejet : motif
obligatoire + corrections suggérées optionnelles. Délai
recommandé : 5 jours ouvrés (RM-134). Le Responsable assigne
type_formation et pilier_abonnement lors de la validation.
## RM-
## 129
## Commission
## FORGES —
FORGES encaisse,
reverse prix coûtant
FORGES est l'unique interlocuteur financier de l'apprenant.
L'apprenant paie FORGES au prix catalogue. FORGES reverse au
Partenaire son prix coûtant = prix_catalogue × (1 −
commission_forges/100). FORGES conserve la commission. Le
Partenaire ne facture jamais directement un apprenant FORGES.
Commission défaut : 20%. Configurable par Admin par partenaire.
Le Partenaire voit uniquement son prix coûtant et le montant de
reversement net dans son tableau de bord.
## RM-
## 130
Tableau de bord
Partenaire — visibilité
limitée
Le Partenaire voit uniquement : ses formations (statuts, nb
apprenants inscrits agrégés, notes feedback agrégées), ses
reversements mensuels nets. Pas d'accès aux données des autres
partenaires ni aux données personnelles des apprenants.
## RM-
## 131
Suspension formation
partenaire active
Le Responsable désigné peut suspendre une formation Active si
problèmes de qualité constatés après publication. Formation
invisible immédiatement. Apprenants avec dossier En attente ou
Retenu notifiés. Dossiers Payés non affectés. Réactivation après
correction + revalidation.
## RM-
## 132
## Commission
partenaire et
formations incluses
abonnement
Pour une formation partenaire incluse dans un abonnement
(inclus_abonnement=true — RM-102), FORGES calcule un
reversement mensuel = nb_apprenants_actifs_sur_formation ×
prix_coutant_partenaire / duree_mois_formation. Reversé

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 27
mensuellement si cumul > seuil_minimum (RM-114 étendu aux
partenaires).
## RM-
## 133
Désactivation compte
## Partenaire
Suspension : formations → Suspendu, nouvelles soumissions
bloquées. Préavis 30 jours sauf faute grave. Résiliation : formations
archivées (RM-11) ou supprimées. Données financières
conservées 5 ans.
## RM-
## 134
Délai validation et
alertes
Délai recommandé : 5 jours ouvrés. À J+5 : alerte Admin +
Responsable désigné. À J+10 : escalade Admin pour réassignation
éventuelle.
## RM-
## 135
Bot Conseiller et
formations
partenaires
Bot recommande les formations partenaires Active au même titre
que les formations internes (RM-118). Formations En attente,
Rejetées ou Suspendues jamais recommandées.
EnqueteCatalogue peut déboucher sur prospection d'un nouveau
Partenaire (signalée dans tableau de bord Admin — RM-124).
## RM-
## 136
## Formulaire
soumission formation
partenaire — 21
champs
Champs OBLIGATOIRES (12) : (1) Intitulé (5–150 car.), (2)
Description courte (max 500 car.), (3) Description longue HTML
(max 5 000 car.), (4) mode_formation : Avec session | À la
demande, (5) Durée en jours, (6) Prix coûtant souhaité XOF (RM-
129), (7) Modalité : 100% en ligne | Hybride | Présentiel, (8) Public
cible (max 500 car.), (9) Objectifs pédagogiques : liste 1–10 items
(max 200 car./item), (10) Langues disponibles : au moins 1 parmi
FR|EN|ES|PT, (11) Certification délivrée : Oui | Non, (12)
Commentaire de positionnement (texte libre optionnel, sans valeur
contractuelle — suggestion type_formation). Champs
OBLIGATOIRES SI APPLICABLE (3) : (13) Organisme certificateur
(si certification=Oui), (14) Contenu vidéo URL (si mode=À la
demande), (15) Nombre de places max par session (si mode=Avec
session). Champs OPTIONNELS (6) : (16) Prérequis (max 500
car.), (17) Programme/Syllabus : URL PDF (max 10 Mo) ou texte
structuré, (18) URL Brochure PDF (max 10 Mo), (19) URL Vidéo de
présentation (YouTube/Vimeo), (20) Durée d'accès suggérée si À la
demande (entier jours, suggestion, défaut 365), (21) Sauvegarde
Brouillon : autorisée avant soumission complète. Note :
type_formation et pilier_abonnement sont ABSENTS du formulaire
partenaire — assignés exclusivement par FORGES lors de la
validation (RM-127). Le prix catalogue affiché aux apprenants est
calculé automatiquement = prix_coûtant / (1 − commission%) (RM-
## 129).
## RM-
## 137
Prix catalogue calculé
automatiquement
Prix catalogue = prix_coutant_valide / (1 −
commission_forges/100). Calculé et affiché automatiquement par
FORGES dès validation du prix coûtant lors de UCS18. Non
modifiable manuellement. Le Partenaire ne voit jamais le prix
catalogue ni la commission dans son interface.
## RM-
## 138
## Reversement
mensuel partenaire
FORGES reverse mensuellement à chaque Partenaire le cumul des
prix coûtants dus pour le mois : Σ(prix_coutant_valide par
transaction du mois). Reversement conditionnel : cumul >
seuil_minimum_reversement (configurable Admin, défaut 50 000
XOF). Solde en dessous du seuil reporté au mois suivant. En cas
de résiliation du compte Partenaire : solde total reversé quel que
soit le montant.
## RM-
## 139
Tableau de bord
reversements Agent
## Comptable
L'Agent Comptable consulte mensuellement : liste des partenaires
avec montant dû, détail transactions, statut reversement (En attente
| Validé | Payé). Génère les virements depuis cette interface.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 28
Chaque reversement journalisé (MT-01 :
## REVERSEMENT_PARTENAIRE_EFFECTUE).
## RM-
## 140
Bifurcation inscription
: vérification vs
paiement direct
Vérification dossier (UCS08) UNIQUEMENT si
type_formation=Premium ET source_financement=Retail. Dans
tous les autres cas (Standard toute source, Premium hors Retail) :
paiement direct sans vérification. Responsable notifié en
information uniquement pour formations Standard. Statut "Retenu"
et délai 72h (RM-07) ne s'appliquent qu'aux dossiers Premium +
## Retail.

7.21 Règles relatives au Voucher Apporteur d'Affaires (RM-141 à RM-148)
ID Règle Description
## RM-
## 141
Définition et profils
Apporteur d'Affaires
Tout individu ou Organisation (Profil B) peut devenir Apporteur
d'Affaires après inscription et approbation par l'Admin FORGES.
L'Apporteur perçoit une commission en % du CA généré par les
transactions utilisant son code. Taux de commission : configurable
par Admin par apporteur (défaut 5%). Aucun plafond mensuel. Le
rôle d'Apporteur est distinct de tout autre rôle sur la plateforme et
peut se cumuler (un Apprenant ou une Organisation peut aussi être
## Apporteur).
## RM-
## 142
Code apporteur —
UUID permanent
À l'activation du compte Apporteur, FORGES génère un code UUID
unique, non prédictible et permanent. Ce code ne change jamais
sauf demande explicite de l'Admin. L'Apporteur partage librement
son code (email, réseaux sociaux, messagerie). Pas de campagne
ni de date d'expiration.
## RM-
## 143
Validation du code
apporteur lors d'une
transaction
Lors d'une inscription ou d'un achat, l'apprenant peut saisir un code
apporteur. La plateforme vérifie : (1) code existant et de
type=Apporteur, (2) compte Apporteur en statut Actif, (3) non-cumul
avec tout autre voucher (RM-144). Si valide, le code est enregistré
sur la transaction sans modifier le prix catalogue payé par
l'apprenant.
## RM-
## 144
Non-cumulabilité du
code apporteur
Un code apporteur ne peut pas être utilisé en même temps qu'un
autre voucher (Organisation ou Promotionnel). Si un autre voucher
est déjà appliqué sur la transaction, le code apporteur est refusé.
Exception : la réduction abonné Retail -15% (RM-88) est applicable
en plus du code apporteur car elle découle du statut d'abonnement
et non d'un voucher.
## RM-
## 145
Calcul de la
commission
apporteur
Commission générée à la confirmation de chaque paiement utilisant
un code apporteur valide. Montant = montant_catalogue_payé ×
taux_commission_apporteur / 100. Enregistrée dans
CommissionApporteur (statut=En attente). La commission est
calculée sur le montant effectivement encaissé par FORGES (après
réduction éventuelle -15% abonné — RM-88).
## RM-
## 146
Calcul et agrégation
mensuelle
En fin de mois (J+1), FORGES agrège les commissions En attente
de chaque apporteur pour le mois écoulé. Cumul calculé =
Σ(CommissionApporteur du mois). Statut commissions agrégées →
Validée. Tableau de bord mensuel mis à jour pour Superviseur et
## Agent Comptable.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 29
## RM-
## 147
Seuil minimum de
reversement
apporteur
Le reversement n'est effectué que si cumul_commissions_dues >=
seuil_minimum_reversement (configurable Admin, défaut 5 000
XOF). En dessous du seuil : commissions reportées au mois
suivant (cumul glissant). En cas de clôture du compte Apporteur :
solde total reversé quel que soit le montant.
## RM-
## 148
Suivi mensuel
Superviseur et Agent
## Comptable
Superviseur : tableau de bord mensuel apporteurs (nombre de
codes actifs, volume transactions par apporteur, taux de
conversion, top 10 apporteurs du mois, commissions totales dues).
Agent Comptable : détail des commissions dues par apporteur
(montant_base, taux%, montant_commission, transactions
concernées), statut reversements (En attente | Validé | Payé),
historique des reversements passés. Rapport exportable
PDF/Excel. Journalisation :
## REVERSEMENT_APPORTEUR_EFFECTUE (MT-01).

7.22 Récapitulatif — Visibilité et Accès aux Formations selon Profil
Ce tableau synthétise les droits d'accès aux formations selon le profil de l'utilisateur et le type de
formation. Il est la référence unique pour tout développement ou test lié à la visibilité du catalogue.

## Profil
Standard incluse
## RM-102
## Standard
non incluse
Premium Sur devis
À la
demande
## Standard
À la
demande
## Premium
Apprenant sans
abonnement
Visible — achat
unitaire
## Visible —
achat unitaire
## Visible —
achat
unitaire
## Sur
demande
## Admin
## Visible —
achat
unitaire
## Visible —
achat
unitaire
## Abonné Retail
## Essentiel
## ✅ Incluse
(pilier=Retail|Tous)
Achat unitaire
## Achat
unitaire (-
## 15% RM-88)
## Sur
demande
✅ Incluse si
## Standard
## RM-102
## Achat
unitaire (-
## 15%)
## Abonné Retail
## Premium
## ✅ Incluse
## (catalogue
Standard complet)
Achat unitaire
## Achat
unitaire (-
## 15%)
## Sur
demande
✅ Incluse si
## Standard
## Achat
unitaire (-
## 15%)
Bénéficiaire B2B
Starter/Business
✅ Incluse si
pilier=B2B|Tous
Achat unitaire
## (-15%)
## Achat
unitaire (-
## 15%)
## Sur
demande
✅ Incluse si
## Standard +
## B2B
## Achat
unitaire (-
## 15%)
Bénéficiaire B2B
## Enterprise
## ✅ Incluse
Achat unitaire
## (-15%)
## 2
incluses/an
## (RM-89)
puis achat
## Sur
demande
## ✅ Incluse
## 2
incluses/an
puis achat
## Apprenant
## Institutionnel
Selon contrat Selon contrat
## Selon
contrat
## Selon
contrat
## Selon
contrat
## Selon
contrat
## Organisation (via
vouchers)
## Accès
bénéficiaires via
voucher
## Accès
bénéficiaires
via voucher
## Accès
bénéficiaires
via voucher
## Sur
demande
Via voucher
ou B2B
Via voucher
ou B2B
Apprenant avec
code Apporteur
Prix catalogue
normal (pas de
réduction — code
= traçage
commission)
## Prix
catalogue
normal
## Prix
catalogue
normal (-
15% si
abonné —
## RM-88)
## Sur
demande
## Prix
catalogue
normal
## Prix
catalogue
normal (-
15% si
abonné)

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 30

Légende : ✅ = inclus sans surcoût dans l'abonnement actif. (-15%) = réduction abonné actif
applicable (RM-88). 'Selon contrat' = défini dans le ContratInstitutionnel (UCS03.1). 'Sur demande' =
accessible uniquement après contact Admin FORGES.


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 31
## 8. Exigences Non Fonctionnelles

## 8.1 Performance
## Indicateur Objectif Condition
Temps de réponse pages < 2 secondes
Charge nominale (200 utilisateurs
simultanés)
Temps de réponse API paiement < 5 secondes Hors timeout réseau externe
Génération rapport PDF < 10 secondes Données d'une journée complète
Débit maximal
## 500
requêtes/minute
Pic de charge lors des périodes
d'inscription
## Disponibilité
## 99,5 % (hors
maintenance)
Fenêtre glissante de 30 jours
Chargement vidéo à la demande < 5 secondes Connexion 4G standard
Réponse Bot Conseiller < 1 seconde
100% déterministe, règles locales,
aucun appel externe
Validation formation partenaire
Délai recommandé
5 jours ouvrés
Alerte à J+5 (RM-134)
Calcul commission apporteur < 5 secondes Après confirmation paiement (RM-145)
Rapport mensuel apporteurs < 30 secondes Agrégation J+1 fin de mois (RM-146)

8.2 Disponibilité et Maintenabilité
- Disponibilité cible : 99,5 % hors maintenance planifiée.
- Maintenance programmée : 22h00–06h00, notification 48h à l'avance.
- RTO (Recovery Time Objective) : reprise de service en moins de 2 heures.
- RPO (Recovery Point Objective) : perte de données maximale tolérée de 1 heure
(sauvegarde horaire).
- Déploiements sans interruption de service (rolling deployments).
- Bot Conseiller : disponibilité identique à la plateforme (règles locales — pas de dépendance
externe).

## 8.3 Scalabilité
- Volume initial estimé : 5 000 apprenants inscrits, 50 formations actives simultanément.
- Module abonnement : 10 000 abonnements actifs simultanés (Retail + B2B + Organisation).
- Bot Conseiller : 1 000 sessions simultanées, réponse < 1 seconde.
- Partenaires Fournisseurs : jusqu'à 500 partenaires actifs, 5 000 formations partenaires.
- Apporteurs d'Affaires : jusqu'à 10 000 codes actifs, calcul commission mensuel < 30
secondes.
- Architecture montée en charge horizontale (ajout de serveurs) sans refonte du code.
- Base de données : supporte 100 000 dossiers archivés sans dégradation des performances.

## 8.4 Compatibilité
## Contexte Exigence

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 32
Navigateurs web
Chrome 100+, Firefox 100+, Safari 15+, Edge 100+ (2 dernières
années)
Appareils mobiles
Interface responsive — résolution minimale 375px. Bot intégré en
widget flottant.
Accessibilité Conformité WCAG 2.1 niveau AA recommandée
## Multi-langue
Support Unicode complet. FR/EN/ES/PT. Interface, notifications, Bot
## (RM-98).
## Espace Partenaire
Interface responsive. Upload vidéo et PDF. Tableau reversements
mensuel.
## Espace Apporteur
Interface simple (code, statistiques, historique reversements).
## Mobile-friendly.

8.5 Évolutivité et Contraintes Architecturales
Cette section définit les principes architecturaux garantissant la capacité d'évolution de FORGES
sans refonte majeure.

8.5.1 Principes d'évolution du modèle de données
- Toute nouvelle entité doit être ajoutée sans modifier les tables existantes (extension par ajout
de tables de liaison ou de colonnes nullable).
- Les champs obligatoires ne peuvent devenir optionnels qu'avec migration de données. Aucun
champ optionnel ne peut devenir obligatoire sans refonte du formulaire et migration.
- Le champ statut de chaque entité principale (Formation, Dossier, Abonnement) est extensible
— de nouveaux statuts peuvent être ajoutés en RM sans refonte du cycle de vie existant.
- Les entités CommissionApporteur et FormationPartenaire sont conçues pour être étendues à
d'autres types de partenariat commercial sans modification des entités Formation et
## Paiement.

8.5.2 Roadmap LLM v5.x — contraintes architecturales
- L'introduction d'un composant LLM en v5.x devra respecter les contraintes suivantes : (1) les
données transmises au LLM doivent être anonymisées (PII remplacées par pseudonymes
irréversibles — MT-02), (2) le bot doit fonctionner en mode dégradé règles-seules si l'API
LLM est indisponible, (3) aucune décision de paiement ni de modification de données ne peut
être prise par le LLM.
- La table ConversationBot est déjà structurée pour recevoir un champ llm_context (nullable)
en v5.x sans migration destructive.

8.5.3 Versioning API Partenaires
- Si une API FORGES Partenaires est exposée en v5.x, elle devra respecter un versioning
sémantique (/api/v1/, /api/v2/). Les versions n+1 ne peuvent pas briser la compatibilité des
versions n.
- Les champs type_formation et pilier_abonnement restent des décisions FORGES — ils ne
seront jamais exposés en écriture dans une API Partenaire.

8.5.4 Rétrocompatibilité des données
- Une migration de version majeure des specs ne doit pas invalider les données existantes.
Les règles RM ne peuvent pas être supprimées si elles sont référencées dans des données
en base (dossiers, paiements, contrats actifs).

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 33
- La suppression effective de RM-117 (LLM) est structurellement sans impact car aucune
donnée en base ne référence ce composant.


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 34
- Matrice des Rôles et Permissions

## Symbole Signification
✓ Complet Accès complet en lecture et écriture
✓ Partiel Accès limité (détaillé en note)
 Lecture Consultation uniquement, sans modification
✗ Aucun Accès refusé
— Non applicable

## Fonctionnalit
é
## Adm
in
## Resp
## .
## Supe
rv.
Ag.Co
mpt.
## Appren
ant
## Org
## .
## Parten
aire
## Apport
eur
## Systè
me
## UCS00 —
## S'inscrire
## Apprenant
## ✗ ✗ ✗ ✗ ✓ ✗ ✗ ✗
## ✓
## Auto
## UCS01 —
## Authentifier
## ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ —
## UCS02 —
## Gérer
## Comptes +
## Invitation
## ✓ ✗ ✗ ✗ ✗ ✗ ✗ ✗ —
## UCS03 —
## Compte
## Organisation
## — — — — —
## ✓
## Aut
o
## ✗ ✗
## ✓
## Auto
## UCS03.1 —
## Abonnement
## Institutionnel
## ✓ ✗ ✗  ✗ ✗ ✗ ✗
## ✓
## Auto
## UCS03.2 —
## Abonnement
## B2B
## ✓ ✗ ✗  ✗ ✓ ✗ ✗
## ✓
## Auto
## UCS04 —
## Gérer
## Formations
## ✓
## ✓
## Partie
l
## ✗ ✗ ✗ ✗ ✗ ✗ —
## UCS05 —
## Gérer
## Sessions
(Avec
session)
## ✓ ✗ ✓ ✗ ✗ ✗ ✗ ✗
## ✓
## Auto
## UCS06 —
## Vouchers
## — —
## ✓
valide
## ✓
propose
## —
## ✓
## Flux
## A
## ✗ ✗ —
## UCS07 —
## S'inscrire
## Session
## ✗ ✗ ✗ ✗ ✓ ✗ ✗ ✗ —

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 35
## UCS08 —
## Traiter
## Dossier
(Premium+Re
tail)
## ✗
## ✓
## Désig
né
## ✗ ✗ ✗ ✗ ✗ ✗
## ✓
## Auto
## UCS09 —
## Gérer
## Paiements
## ✗ ✗ ✗ ✓ ✓ ✓ ✗ ✗
## ✓
## Auto
## UCS09.1 —
## Renouvelleme
nt
## Abonnement
## ✗ ✗ ✗  ✓ ✓ ✗ ✗
## ✓
## Auto
## UCS10 —
TDB et
## Rapports
## ✓
## ✓
## Partie
l
## ✓ ✓ ✗ ✗
## 
## Partiel
## 
## Siens
## ✓
## Auto
## UCS11 —
## Espace
## Apprenant
## ✗ ✗ ✗ ✗ ✓ ✗ ✗ ✗
## ✓
## Auto
## UCS11.1 —
## Gestion
## Abonnement
## Retail
## ✗ ✗ ✗  ✓ ✗ ✗ ✗
## ✓
## Auto
## UCS12 —
## Espace
## Organisation
## ✗ ✗ ✗ ✗ ✗ ✓ ✗ ✗
## ✓
## Auto
## UCS12.1 —
## Dashboard
## Abonnement
## B2B
##  ✗ ✗  ✗ ✓ ✗ ✗
## ✓
## Auto
## UCS13 —
## Config
## Module
## Abonnement
## ✓ ✗ ✗ ✗ ✗ ✗ ✗ ✗ —
## UCS14 —
Formation à la
## Demande
## ✗ ✗ ✗  ✓ ✗ ✗ ✗
## ✓
## Auto
UCS15 — Bot
## Conseiller
## Apprenant
## ✗ ✗ ✗ ✗ ✓ ✗ ✗ ✗
## ✓
## Auto
UCS16 — Bot
## Conseiller
## Organisation
## ✗ ✗ ✗ ✗ ✗ ✓ ✗ ✗
## ✓
## Auto
## UCS17 —
## Espace
## Partenaire
## ✓
## Conf
ig
## ✗ ✗  ✗ ✗ ✓ ✗
## ✓
## Auto
## UCS18 —
## Validation
## Formation
## Partenaire
## ✗
## ✓
## Désig
né
## ✗ ✗ ✗ ✗ ✗ ✗ —

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 36
## UCS19 —
## Voucher
## Apporteur
d'Affaires
## ✓
## Conf
ig
## ✗
## 
## TDB
## ✓ TDB
+ vers.
## ✓
## Saisie
code
## ✓
## Sais
ie
cod
e
## ✗ ✓ TDB
## ✓
## Auto
## UCS20 —
## Espace
## Apporteur
d'Affaires
## ✗ ✗ ✗ ✗ ✗ ✗ ✗ ✓ —
EnqueteCatal
ogue —
## Consultation
## ✓
## ✓
## Lectu
re
## ✗ ✗ ✗ ✗ ✗ ✗
## ✓
## Auto
FeedbackFor
mation —
## Consultation
## ✓ ✓ ✗ ✗ ✗ ✗ ✗ ✗
## ✓
## Auto
## Reversement
s Partenaire
## ✓ ✗ ✗ ✓ ✗ ✗
## 
## Siens
## ✗
## ✓
## Auto
## Reversement
s Apporteur
## ✓ ✗
## 
## TDB
## ✓
valide
## ✗ ✗ ✗
## 
## Siens
## ✓
## Auto


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 37
- Spécification des Cas d'Utilisation
Ce chapitre spécifie l'intégralité des 20 cas d'utilisation de la plateforme FORGES v4.8, plus les 2
mécanismes transversaux. Chaque UCS inclut son diagramme de séquence, son processus de base,
ses alternatives et ses règles métier associées. Ce document est autosuffisant.

UCS00 : S'inscrire sur la Plateforme
## Champ Valeur
Identifiant UCS00
Acteur appelant Apprenant (auto-inscription publique)
## Objectif
Permettre à un nouvel apprenant de créer son compte, le valider par
email, et lui proposer optionnellement un abonnement Retail
Déclencheur L'apprenant accède à la page d'inscription publique
Précondition Aucune — page publique accessible sans authentification
## Postcondition
Compte Apprenant créé et activé. Proposition abonnement Retail
optionnelle (étape 16).

Diagramme de séquence

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 38

Figure — Diagramme de séquence UCS00

Processus de base
- L'apprenant accède à la page d'inscription publique ;
- La plateforme affiche le formulaire : nom, prénoms, email, mot de passe, pays
résidence/nationalité (RM-48), langue préférée (RM-98), consentement RGPD (RM-33) ;
- L'apprenant remplit et soumet ; [Alternatives 1, 2, 3]
- La plateforme vérifie l'unicité de l'email (RM-28) ; [Alternative 4]
- La plateforme hache le mot de passe (bcrypt, coût 12 — MT-02) ;
- La plateforme crée le compte (statut : En attente, rôle : Apprenant — RM-29) ;
- La plateforme génère un token UUID v4, expiration 24h (RM-30) ;
- La plateforme envoie l'email de confirmation dans la langue préférée (RM-100) ;
- L'apprenant clique sur le lien ; [Alternative 5]
- La plateforme active le compte, journalise COMPTE_CREE (MT-01, INFO) ;
- La plateforme redirige vers UCS01 ;
- [Étape 16 — Optionnelle] Proposition de souscription abonnement Retail ; [Alternative 6] Fin
## UCS00.

## Processus Alternatifs
- Alternative 1 — Champ obligatoire manquant : champs signalés, formulaire non soumis.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 39
- Alternative 2 — Format email invalide ou mot de passe trop faible : message d'erreur explicite
(critères affichés).
- Alternative 3 — Consentement RGPD non coché : soumission bloquée, case mise en
évidence.
- Alternative 4 — Email déjà utilisé : message générique sans révéler l'état du compte (RM-31).
- Alternative 5 — Token expiré (> 24h) : nouveau token généré sur demande (RM-30).
- Alternative 6 — Proposition abonnement : accepte → UCS11.1, ignore → accès catalogue
formations payantes.

Règles métier associées
RM-28, RM-29, RM-30, RM-31, RM-32, RM-33, RM-48, RM-98, RM-100, RM-102, MT-01, MT-02


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 40
UCS01 : Authentifier un Utilisateur
## Champ Valeur
Identifiant UCS01
Acteur appelant
Tout utilisateur (Apprenant, Organisation, Admin, Responsable,
## Superviseur, Agent Comptable, Partenaire, Apporteur)
## Objectif
Permettre l'accès sécurisé à la plateforme et afficher l'espace de travail
adapté au profil
Déclencheur L'utilisateur accède à la page de connexion
Précondition Posséder un compte actif sur la plateforme
## Postcondition
Session utilisateur ouverte. Tableau de bord affiché selon profil et langue
préférée.

Diagramme de séquence

Figure — Diagramme de séquence UCS01

Processus de base
- Le système affiche la page de connexion dans la langue du navigateur (RM-98) ;
- L'utilisateur saisit son login et mot de passe ;
- Le système vérifie les identifiants (bcrypt — MT-02) ; [Alternative 1]
- Le système génère les tokens JWT (access 1h, refresh 7j — MT-02) ;
- Le système détermine le profil et filtre le tableau de bord ;
- Le système affiche l'espace de travail dans la langue préférée (RM-98) ; Fin UCS01.


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 41
## Processus Alternatifs
- Alternative 1 — Identifiants incorrects ou compte inactif : message d'erreur générique (log
WARNING > 3 échecs, ERROR > 5 échecs).

Règles métier associées
## RM-98, MT-01, MT-02


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 42
UCS02 : Gérer les Comptes Utilisateurs
## Champ Valeur
Identifiant UCS02
Acteur appelant Administrateur
## Objectif
Créer, désactiver, réactiver les comptes utilisateurs internes, et inviter des
Partenaires Fournisseurs (Flux A)
Déclencheur L'Administrateur accède au menu Gestion des comptes
Précondition Être connecté en tant qu'Administrateur
## Postcondition
Compte créé, désactivé ou réactivé. Invitation Partenaire envoyée si
applicable (RM-126).

Diagramme de séquence

Figure — Diagramme de séquence UCS02

Processus de base
- L'Administrateur accède au menu Gestion des comptes ;

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 43
- L'Administrateur sélectionne l'action (Créer / Désactiver / Réactiver / Inviter Partenaire / Créer
## Apporteur) ;
- La plateforme vérifie les contraintes d'unicité (login, email) ; [Alternative 1]
- La plateforme exécute l'action et journalise (MT-01) ; Fin UCS02.

## Processus Alternatifs
- Alternative 1 — Login ou email déjà utilisé : création bloquée, retour formulaire.
- Alternative 2 — Désactiver compte déjà inactif : système signale l'état.
- Alternative 3 — Suppression compte avec dossiers actifs : désactivation uniquement
proposée.
- Alternative 4 — Invitation Partenaire (Flux A — RM-126) : saisie raison sociale, type, email,
commission%. Token 48h envoyé.
- Alternative 5 — Création Apporteur (RM-141) : saisie nom, type, email, taux commission%.
Code UUID permanent généré (RM-142).

Règles métier associées
## RM-126, RM-141, RM-142, MT-01, MT-02


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 44
UCS03 : Gérer un Compte Organisation
## Champ Valeur
Identifiant UCS03
Acteur appelant Organisation (auto-inscription publique)
## Objectif
Permettre à une Organisation de créer son compte, bénéficier d'un essai
gratuit 30 jours, puis souscrire un AbonnementOrganisation.
L'AbonnementB2B est une option complémentaire distincte.
Déclencheur L'Organisation accède à la page de création de compte publique
Précondition Page publique — aucune authentification requise.
## Postcondition
Compte activé, essai 30 jours démarré (RM-81). AbonnementOrganisation
et AbonnementB2B sont deux abonnements distincts et cumulables.

Diagramme de séquence

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 45

Figure — Diagramme de séquence UCS03

Processus de base
- L'Organisation accède à la page de création (publique) ;
- Formulaire : raison sociale, type, identifiant légal (RM-43), contact référent (RM-47), pays,
langue préférée, email, mot de passe, consentement RGPD ;
- Vérification unicité identifiant légal (RM-43) ; [Alternatives 1, 2]
- Email de confirmation envoyé dans la langue préférée (RM-100) ;
- L'Organisation confirme son compte ; [Alternative 4]
- Essai 30 jours démarré (RM-81) ;
- À J+25 : offre bienvenue -20% (RM-85). À J+28 : alerte fin d'essai (RM-82). À J+30 :
suspension si pas d'abonnement (RM-83) ;
- Note : AbonnementB2B souscrit séparément depuis UCS12 → UCS03.2 ; Fin UCS03.

## Processus Alternatifs

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 46
- Alternative 1 — Champ manquant ou identifiant légal invalide : message d'erreur.
- Alternative 2 — Identifiant légal déjà utilisé au sein du type : message générique (RM-31).
- Alternative 4 — Lien expiré (> 24h) : nouveau lien proposé (RM-30).
- Alternative 5 — Souscription AbonnementOrganisation avant J+30 : accessible depuis
tableau de bord.

Règles métier associées
RM-30, RM-43, RM-47, RM-48, RM-80 à RM-85, RM-98, RM-100


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 47
UCS03.1 : Abonnement Institutionnel
## Champ Valeur
Identifiant UCS03.1
Acteur appelant
Ministère/Bailleur (Flux 0 hors plateforme) / Admin FORGES (création) /
## Gestionnaire(s) Institution (suivi)
## Objectif
Créer et gérer un contrat SaaS annuel avec un ministère ou une unité de
coordination bailleur. La demande est initiée hors plateforme.
Déclencheur Flux 0 : contact hors plateforme. Flux 1 : Admin FORGES crée le contrat.
Précondition Flux 0 : aucune. Flux 1 : être connecté Admin FORGES.
Postcondition Contrat actif, Gestionnaire(s) créé(s), facturation SaaS déclenchée.

Diagramme de séquence

Figure — Diagramme de séquence UCS03.1

Processus de base

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 48
- [Flux 0] Le ministère/bailleur contacte FORGES (formulaire contact ou email) ;
- L'Admin instruit le dossier et crée le contrat (statut=Brouillon, id=INST-AAAA-NNN) ;
- Après signature physique : l'Admin active le contrat ;
- Le système crée le(s) compte(s) Gestionnaire(s) (1 à 5 selon offre AbonnementOrganisation
## — RM-112) ;
- Facturation SaaS annuel déclenchée (RM-51) ;
- Le Gestionnaire enrôle les apprenants (individuel ou CSV — RM-59) ;
- Fees par certifié comptabilisés en temps réel, facturés mensuellement si cumul > seuil (RM-
## 52, RM-114) ;
- Rapports bailleurs générés en 1 clic (PDF/Excel) ; Fin UCS03.1.

## Processus Alternatifs
- Alternative 1 — CSV invalide : rapport d'erreurs ligne par ligne.
- Alternative 2 — Expiration J-60/J-30 : alertes automatiques (RM-56).
- Alternative 3 — Avenant en cours de contrat (RM-113) : Admin crée l'avenant, historique
conservé.
- Alternative 4 — Contrat expiré : accès tous les Gestionnaires suspendu (RM-57).

Règles métier associées
RM-50 à RM-59, RM-112, RM-113, RM-114, RM-100


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 49
UCS03.2 : Abonnement B2B
## Champ Valeur
Identifiant UCS03.2
Acteur appelant Organisation (tous types)
## Objectif
Permettre à toute Organisation de souscrire un AbonnementB2B annuel
multi-apprenants. Prérequis : AbonnementOrganisation actif ou en essai.
## Déclencheur
Le Responsable RH/Formation accède à la section Abonnement B2B
depuis UCS12
## Précondition
AbonnementOrganisation actif ou en essai (UCS03). AbonnementB2B
distinct et complémentaire.
Postcondition AbonnementB2B actif. Apprenants invitables depuis UCS12.1.

Diagramme de séquence

Figure — Diagramme de séquence UCS03.2

Processus de base
- Accès section Abonnement B2B depuis UCS12 ;
- Affichage des paliers disponibles : Starter, Business, Enterprise, Sur devis (RM-88) ;
- Sélection d'un palier ; [Alternative 1 : Sur devis → UCS13]
- Facture pro forma générée ;
- Paiement ; [Alternative 2]
- AbonnementB2B activé (Enterprise : 2 Premium/an — RM-89) ;

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 50
- Apprenants gérés depuis UCS12.1 ; Fin UCS03.2.

## Processus Alternatifs
- Alternative 1 — Palier Sur devis : contact Admin FORGES via UCS13 (RM-107).
- Alternative 2 — Paiement refusé : nouvelle tentative sous 48h.
- Alternative 3 — Plafond palier atteint en cours : alerte montée en palier (RM-69).
- Alternative 4 — Expiration J-45/J-15 : alertes automatiques (RM-66).
- Alternative 5 — AbonnementOrganisation expiré : accès UCS12 bloqué, UCS03.2
inaccessible (RM-83).

Règles métier associées
RM-60 à RM-69, RM-80, RM-83, RM-88, RM-89, RM-100


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 51
UCS04 : Gérer les Formations
## Champ Valeur
Identifiant UCS04
Acteur appelant Administrateur ou Responsable de formation
## Objectif
Créer, modifier, supprimer et consulter l'historique des formations internes.
Les formations partenaires passent par UCS17/UCS18 et reçoivent leur
type_formation et pilier_abonnement exclusivement lors de la validation
## (RM-127).
Déclencheur L'utilisateur accède au menu Formations
Précondition Être connecté en tant qu'Administrateur ou Responsable de formation.
## Postcondition
Formation créée, modifiée ou supprimée. inclus_abonnement calculé
automatiquement (RM-102).

Diagramme de séquence

Figure — Diagramme de séquence UCS04

Processus de base
- L'utilisateur accède au menu Formations ;

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 52
- Création interne : saisie type_formation (RM-86 — Standard|Premium|Sur devis),
mode_formation (RM-91), pilier_abonnement, langues ;
- Le système calcule inclus_abonnement automatiquement (RM-102) ;
- Formations Avec session : statut En attente de planification (RM-22, RM-23) ;
- Formations à la demande : statut Active dès création (RM-93) ;
- Action journalisée (MT-01) ; Fin UCS04.

## Processus Alternatifs
- Alternative 1 — Champ obligatoire manquant : création bloquée.
- Alternative 2 — Suppression avec paiements validés : archivage obligatoire (RM-11).
- Alternative 3 — Formation partenaire En attente de validation : lecture seule jusqu'à décision
## UCS18 (RM-127).
- Alternative 4 — Tentative de session sur formation À la demande : bloquée (RM-96).
- Alternative 5 — Modification pilier_abonnement : recalcul automatique inclus_abonnement
## (RM-102).

Règles métier associées
## RM-11, RM-12, RM-22, RM-86, RM-91, RM-93, RM-96, RM-102, RM-127, MT-01


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 53
UCS05 : Gérer les Sessions de Formation
## Champ Valeur
Identifiant UCS05
Acteur appelant Superviseur (planification/gestion) / Système scheduler (automatique)
## Objectif
Planifier, modifier, supprimer les sessions et maintenir leurs statuts
automatiquement — uniquement pour formations Avec session (RM-91)
## Déclencheur
Le Superviseur accède à la gestion des sessions, ou le scheduler se
déclenche à 00h00
Précondition Formation existante mode=Avec session. Superviseur ou Admin connecté.
Postcondition Sessions planifiées. Formation visible si session à venir (RM-22).

Diagramme de séquence

Figure — Diagramme de séquence UCS05

Processus de base
- Le Superviseur accède à la gestion des sessions pour une formation Avec session ;
- Saisie des 4 dates avec vérification cohérence (RM-16) et non-chevauchement (RM-17) ;
- Session créée (statut=Planifiée) ;
- Scheduler quotidien 00h00 : transitions automatiques selon les 4 dates (RM-20) ;
- Sessions Clôturées depuis > 90 jours : archivage automatique (RM-21) ; Fin UCS05.

## Processus Alternatifs

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 54
- Alternative 1 — Chevauchement détecté (RM-17) : création rejetée, sessions en conflit
affichées.
- Alternative 2 — Incohérence chronologique (RM-16) : système bloque et signale l'erreur.
- Alternative 3 — Capacité = 0 : création bloquée.
- Alternative 4 — Formation mode=À la demande : UCS05 non applicable (RM-96).

Règles métier associées
## RM-16, RM-17, RM-20, RM-21, RM-22, RM-91, RM-96, MT-01


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 55
UCS06 : Gérer les Vouchers
## Champ Valeur
Identifiant UCS06
Acteur appelant
Organisation (Flux A) / Agent Comptable (Flux B) / Superviseur (validation
## Flux B)
## Objectif
Créer et gérer deux types de vouchers : Organisation (Flux A) et
Promotionnel (Flux B). Le Voucher Apporteur est géré dans UCS19.
## Déclencheur
L'Organisation commande des vouchers depuis UCS12, ou l'Agent
Comptable crée un voucher promotionnel
## Précondition
Être connecté. Formation ciblée Active. Organisation :
AbonnementOrganisation actif ou en essai.
Postcondition Vouchers actifs et disponibles dans UCS07/UCS09.

Diagramme de séquence

Figure — Diagramme de séquence UCS06

Processus de base
- Flux A : l'Organisation sélectionne une formation, paie la facture pro forma, reçoit les codes
vouchers par email (RM-100). Codes générés en statut Actif (RM-41) ;
- Flux B : l'Agent Comptable crée un voucher promo (statut=Brouillon), le Superviseur valide
(statut=Actif — RM-39) ; Fin UCS06.

## Processus Alternatifs

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 56
- Alternative A1 — Paiement Organisation refusé : vouchers non générés, nouvelle tentative
sous 48h.
- Alternative B1 — Superviseur refuse : motif obligatoire, statut → Refusé, Agent Comptable
notifié.
- Alternative 2 — Expiration automatique scheduler : statut → Expiré.
- Alternative 3 — Quota épuisé (RM-40) : statut → Épuisé, code refusé lors d'utilisation.

Règles métier associées
## RM-37, RM-38, RM-39, RM-40, RM-41, RM-44, RM-45, RM-100


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 57
UCS07 : S'inscrire à une Session de Formation
## Champ Valeur
Identifiant UCS07
Acteur appelant Apprenant
## Objectif
Permettre à un apprenant de s'inscrire à une session. Bifurcation v4.7
(RM-140) : paiement direct pour formations Standard (et Premium hors
Retail), vérification Responsable uniquement pour formations Premium +
source Retail.
## Déclencheur
L'apprenant consulte le catalogue et clique sur S'inscrire (formation
mode=Avec session)
## Précondition
Être connecté en tant qu'Apprenant. Formation Avec session avec session
disponible (RM-22).
## Postcondition
Dossier créé. Selon RM-140 : Payé directement (Standard) ou En attente
de vérification (Premium + Retail).

Diagramme de séquence

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 58

Figure — Diagramme de séquence UCS07

Processus de base
- L'apprenant consulte le catalogue (badges 'Inclus abonnement' RM-102 et 'Premium') ;
- L'apprenant sélectionne une session et soumet son inscription ;
- Vérification places disponibles et unicité dossier (RM-15) ;
- Détermination fenêtre d'inscription : Normal / Gris / Exception (RM-18) ;
- Application RM-140 : type_formation=Premium ET source=Retail ?
- [NON — Standard ou Premium hors Retail] Flux paiement direct : paiement Mobile Money
déclenché, dossier → Payé, place réservée, Responsable notifié en information uniquement ;
- [OUI — Premium + Retail] Flux vérification : dossier → En attente de vérification,
Responsable notifié pour action (RM-19) ; suite dans UCS08 ; Fin UCS07.

## Processus Alternatifs
- Alternative 1 — Session complète : refus, liste d'attente si activée.
- Alternative 2 — Doublon inscription (RM-15) : blocage, redirection UCS11.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 59
- Alternative 3 — Paiement direct refusé (RM-08) : nouvelle tentative. Après 3 échecs : dossier
## → Annulé.
- Alternative 4 — Code voucher saisi : vérifie validité (RM-37, RM-38, RM-40, RM-143 pour
apporteur). Applique si valide.
- Alternative 5 — Formation mode=À la demande : redirection UCS14 (RM-91).
- Alternative 6 — Formation Standard éligible RM-102 + apprenant non abonné : proposition
souscription abonnement (UCS11.1) avant paiement.
- Alternative 7 — Document complémentaire non conforme (RM-49) : erreur format/taille
signalée.

Règles métier associées
RM-07, RM-08, RM-15, RM-18, RM-19, RM-22, RM-37, RM-49, RM-87, RM-88, RM-91, RM-100, RM-
## 102, RM-140, RM-143, RM-144


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 60
UCS08 : Traiter un Dossier (Premium + Retail uniquement)
## Champ Valeur
Identifiant UCS08
Acteur appelant
Responsable de formation (dossiers Premium + Retail uniquement — RM-
140) / Système scheduler (expiration)
## Objectif
Examiner et statuer sur les dossiers Premium + Retail en attente de
vérification. Périmètre v4.7 réduit — les dossiers Standard sont traités par
paiement direct (UCS07).
## Déclencheur
Notification d'un dossier Premium + Retail en attente, ou accès menu
Dossiers, ou scheduler expiration
## Précondition
Responsable connecté. Dossier en statut 'En attente de vérification'
(type_formation=Premium, source=Retail — RM-140).
Postcondition Dossier → Retenu (apprenant paie dans les 72h) ou Rejeté. Log généré.

Diagramme de séquence

Figure — Diagramme de séquence UCS08

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 61

Processus de base
- Le Responsable reçoit la notification de dossier Premium + Retail à vérifier ;
- Le Responsable consulte la liste filtrée (uniquement dossiers Premium + Retail En attente) ;
- Le Responsable examine le dossier et le document complémentaire si joint (RM-49) ;
- [RETENIR] Dossier → Retenu. Apprenant notifié : lien paiement + délai 72h (RM-07, RM-
100). Place réservée ;
- [REJETER] Motif obligatoire. Dossier → Rejeté. Apprenant notifié avec motif (RM-100). Place
libérée ;
- Scheduler : dossier Retenu sans paiement > 72h → Annulé automatiquement (RM-07).
Apprenant notifié ;
- Action journalisée (MT-01) ; Fin UCS08.

## Processus Alternatifs
- Alternative 1 — Dossier Standard reçu par erreur : système bloque (RM-140 — les dossiers
Standard ne passent pas par UCS08).
- Alternative 2 — Dossier déjà traité (statut ≠ En attente) : affichage lecture seule.
- Alternative 3 — Quota session atteint entre création et traitement : dérogation (RM-18) ou
rejet.
- Alternative 4 — Rejet dossier avec voucher Organisation (RM-45) : voucher réactivé
automatiquement.

Règles métier associées
## RM-05, RM-07, RM-19, RM-45, RM-49, RM-100, RM-140, MT-01


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 62
UCS09 : Gérer les Paiements
## Champ Valeur
Identifiant UCS09
Acteur appelant
## Apprenant (paiement) / Agent Comptable (réconciliation) / Système
## (relances)
## Objectif
Couvrir le cycle complet du paiement : déclenchement apprenant,
confirmation API, réconciliation Agent Comptable. Calcul commissions
partenaire et apporteur si applicable.
## Déclencheur
L'apprenant clique sur Payer depuis son dossier Retenu
(Premium+Retail), ou paiement direct déclenché (Standard — RM-140)
Précondition Dossier concerné. Pour Premium+Retail : statut Retenu dans délai 72h.
## Postcondition
Dossier → Payé. Commission partenaire (RM-129) et commission
apporteur (RM-145) calculées si applicable.

Diagramme de séquence

Figure — Diagramme de séquence UCS09

Processus de base
- L'apprenant accède au paiement (depuis dossier Retenu ou paiement direct UCS07) ;
- Le système affiche le montant (réduction -15% si abonné + formation Premium — RM-88) ;
- Paiement Mobile Money traité par le Module de Paiement ;
- Confirmation paiement ;
## 77. Dossier → Payé ;

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 63
- Si formation partenaire : calcul montant_reverse_partenaire = montant × (1 − commission%)
## (RM-129) ;
- Si code apporteur saisi : calcul CommissionApporteur = montant × taux_apporteur% (RM-
## 145) ;
- Journalise PAIEMENT_CONFIRME (MT-01). Apprenant notifié (RM-100) ; Fin UCS09.

## Processus Alternatifs
- Alternative 1 — Paiement refusé (RM-08) : message générique. Après 3 échecs : attente
manuelle.
- Alternative 2 — Délai 72h expiré (RM-07) : dossier → Annulé via scheduler.
- Alternative 3 — Voucher promotionnel (RM-42) : montant réduit.
- Alternative 4 — Paiement manuel virement par Agent Comptable : saisie référence, dossier
## → Payé.
- Alternative 5 — Timeout API 30s (RM-09) : vérification statut toutes 5min pendant 1h.

Règles métier associées
## RM-07, RM-08, RM-09, RM-41, RM-42, RM-88, RM-100, RM-129, RM-145, MT-01


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 64
UCS09.1 : Renouvellement Abonnement Automatique
## Champ Valeur
Identifiant UCS09.1
Acteur appelant
Système scheduler / Apprenant (Retail manuel) / Organisation (B2B/Org
manuel)
## Objectif
Gérer les renouvellements récurrents des abonnements Retail, B2B et
## Organisation
## Déclencheur
Scheduler quotidien 06h00 — J-1 avant date_fin abonnement avec
renouvellement_auto=true
Précondition Abonnement en statut Actif. Consentement auto enregistré (RM-75).
## Postcondition
Abonnement renouvelé ou suspendu. AccesFormationDemande mis à jour
## (RM-103, RM-111).

Diagramme de séquence

Figure — Diagramme de séquence UCS09.1

Processus de base
- Scheduler détecte abonnements arrivant à expiration J-1 ;
- Initie le prélèvement Mobile Money ;
- Succès : abonnement mis à jour (date_fin += période). AccesFormationDemande
source=Abonnement maintenus (RM-103). Confirmation envoyée (RM-100) ;
- Échec : grâce 48h (Retail — RM-73). Nouvelle tentative J+1 ;

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 65
- Toujours en échec : abonnement → Suspendu. AccesFormationDemande → Suspendu (RM-
## 103, RM-111) ;
- Fin UCS09.1.

## Processus Alternatifs
- Alternative 1 — Grâce Retail 48h (RM-73) : alerte apprenant, nouvelle tentative J+1.
- Alternative 2 — Toujours en échec après grâce : abonnement → Suspendu.
- Alternative 3 — renouvellement_auto=false : rappels J-15 et J-7, renouvellement manuel
requis.
- Alternative 4 — AbonnementOrganisation expiré sans resouscription : accès UCS12
suspendu (RM-83).

Règles métier associées
## RM-73, RM-75, RM-80, RM-83, RM-103, RM-109, RM-111, RM-100


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 66
UCS10 : Tableau de Bord et Rapports
## Champ Valeur
Identifiant UCS10
Acteur appelant
## Admin, Superviseur, Responsable, Agent Comptable, Partenaire (vue
limitée), Apporteur (vue limitée)
## Objectif
Vue consolidée en temps réel des activités et statistiques financières.
Vues dédiées Partenaire (RM-130), Apporteur (RM-148), reversements.
Déclencheur Connexion (affichage automatique) ou accès menu Tableau de Bord
Précondition Être connecté avec un profil ayant accès au tableau de bord.
Postcondition Tableau de bord affiché selon profil. Export PDF disponible.

Diagramme de séquence

Figure — Diagramme de séquence UCS10

Processus de base
- Connexion → tableau de bord affiché dans la langue préférée (RM-98) ;
- Données filtrées selon rôle : Admin (vue complète), Responsable désigné (formations
partenaires + délais), Agent Comptable (paiements + commissions + reversements),
Superviseur (TDB mensuel Apporteurs — RM-148), Partenaire (ses formations +
reversements nets — RM-130), Apporteur (ses commissions + reversements — RM-148) ;
- Export PDF/Excel disponible selon profil (< 10 secondes) ; Fin UCS10.


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 67
## Processus Alternatifs
- Alternative 1 — Aucune donnée : valeurs à zéro avec message explicatif.
- Alternative 2 — Perte de connexion : indicateur de déconnexion, données du dernier
rafraîchissement.
- Alternative 3 — Export PDF période sans données : rapport vide avec métadonnées.
- Alternative 4 — Agent Comptable : onglet dédié reversements Partenaires + Apporteurs (RM-
## 139, RM-148).

Règles métier associées
## RM-46, RM-98, RM-130, RM-139, RM-148, MT-01


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 68
UCS11 : Espace Apprenant
## Champ Valeur
Identifiant UCS11
Acteur appelant Apprenant
## Objectif
Consulter ses dossiers et paiements, annuler un dossier en attente,
télécharger ses attestations, accéder à ses formations à la demande
Déclencheur L'apprenant clique sur Mon Espace depuis le menu
Précondition Être connecté en tant qu'Apprenant.
Postcondition Actions exécutées selon conditions. Annulations et attestations tracées.

Diagramme de séquence

Figure — Diagramme de séquence UCS11

Processus de base
- L'apprenant accède à son espace personnel ;
- Affichage : dossiers (Standard directement Payés, Premium+Retail avec statuts vérification),
paiements, attestations, accès formations à la demande avec statuts RM-103 ;
- Annulation dossier En attente de vérification possible (RM-27) ;
- Téléchargement attestation si dossier Payé ET session Clôturée (RM-26) ;
- Accès formations à la demande actives (UCS14) ; Fin UCS11.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 69

## Processus Alternatifs
- Alternative 1 — Annulation dossier Payé ou Rejeté : action bloquée.
- Alternative 2 — Attestation non disponible (session non terminée) : lien grisé avec message
explicatif.
- Alternative 3 — Lien attestation expiré (> 24h) : nouveau lien proposé (PDF régénéré).
- Alternative 4 — Accès formation à la demande suspendu (RM-103) : badge 'Suspendu' +
proposition resouscription abonnement.

Règles métier associées
## RM-26, RM-27, RM-103, RM-111, MT-01, MT-02


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 70
UCS11.1 : Gestion Abonnement Retail
## Champ Valeur
Identifiant UCS11.1
Acteur appelant Apprenant
## Objectif
Permettre à un apprenant de souscrire, gérer, résilier et downgrader son
abonnement Retail mensuel
## Déclencheur
L'apprenant accède à la section Abonnement (depuis UCS11, UCS00
étape 16, ou UCS07 alternative 6)
Précondition Être connecté en tant qu'Apprenant.
## Postcondition
Abonnement souscrit/modifié/résilié. AccesFormationDemande mis à jour
## (RM-103, RM-105).

Diagramme de séquence

Figure — Diagramme de séquence UCS11.1


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 71
Processus de base
- Affichage offres Essentiel et Premium avec formations incluses selon RM-102 ;
- Souscription : premier prélèvement au prorata (RM-106), consentement auto (RM-75) ;
- Upgrade Essentiel → Premium (RM-79) : différentiel prorata, immédiat ;
- Downgrade Premium → Essentiel (RM-104) : planifié, effectif fin période ;
- Suspension (RM-76) : AccesFormationDemande source=Abonnement → Suspendu (RM-
## 105) ;
- Résiliation (RM-77) : accès maintenu jusqu'à fin période, AccesFormationDemande
→ Suspendu à expiration (RM-103) ; Fin UCS11.1.

## Processus Alternatifs
- Alternative 1 — Déjà abonné (RM-70) : upgrade si Essentiel, downgrade si Premium.
- Alternative 2 — Paiement initial refusé : souscription non activée.
- Alternative 3 — Downgrade : nb_formations_actives > 3 → alerte avant effectivité.
- Alternative 4 — Suspension : accès expirant pendant suspension non prolongés (RM-105).

Règles métier associées
RM-70 à RM-79, RM-87, RM-88, RM-100, RM-102, RM-103, RM-104, RM-105, RM-106


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 72
UCS12 : Espace Organisation
## Champ Valeur
Identifiant UCS12
Acteur appelant Organisation (contact référent connecté)
## Objectif
Gérer le compte Organisation, l'AbonnementOrganisation, commander
des vouchers, suivre les inscriptions des bénéficiaires. L'AbonnementB2B
est une option complémentaire souscrite depuis cette interface.
Déclencheur L'Organisation s'authentifie via UCS01
## Précondition
Compte Organisation activé (UCS03). AbonnementOrganisation en statut
Essai ou Actif (RM-80).
## Postcondition
Tableau de bord référent accessible. Double abonnement Org + B2B
cumulable.

Diagramme de séquence

Figure — Diagramme de séquence UCS12

Processus de base
- Connexion : vérification statut AbonnementOrganisation (RM-80) ;
- Affichage bandeau 'Essai — X jours restants' si applicable ;
- Navigation dans les sections : profil, vouchers (UCS06), inscriptions bénéficiaires,
abonnement, B2B (UCS03.2) ;
- Note : AbonnementOrganisation = accès plateforme. AbonnementB2B = formation en
masse. Deux abonnements indépendants et cumulables ; Fin UCS12.


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 73
## Processus Alternatifs
- Alternative 1 — Essai expiré sans abonnement (RM-83) : page souscription
AbonnementOrganisation.
- Alternative 2 — Souscription AbonnementB2B : section dédiée → UCS03.2.

Règles métier associées
## RM-44, RM-45, RM-80, RM-83, RM-84, RM-85, RM-88, RM-107, RM-108


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 74
UCS12.1 : Dashboard Abonnement B2B
## Champ Valeur
Identifiant UCS12.1
Acteur appelant Organisation (Responsable RH/Formation)
## Objectif
Piloter l'AbonnementB2B : apprenants, certifications, consommation palier,
montée et descente de palier
Déclencheur Le Responsable accède à la section Abonnement B2B depuis UCS12
## Précondition
AbonnementB2B actif (UCS03.2). Ouvert à tous types Organisation (RM-
## 88).
Postcondition Actions réalisées. Tableau de bord B2B mis à jour.

Diagramme de séquence

Figure — Diagramme de séquence UCS12.1

Processus de base
- Accès au dashboard B2B (nb_actifs, certifications, consommation palier, nb_premium
si Enterprise) ;
- Ajout apprenants (individuel ou CSV) : vérification plafond (RM-61) ;
- Montée en palier (RM-68) : facturation prorata, immédiate ;
- Descente de palier (RM-110) : vérification nb_actifs <= nb_max cible, planifiée au
renouvellement ;
- Désactivation apprenant : certifications conservées (RM-62) ;

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 75
- Export rapport (PDF/Excel) ; Fin UCS12.1.

## Processus Alternatifs
- Alternative 1 — Plafond palier atteint (RM-69) : alerte montée en palier.
- Alternative 2 — Descente de palier impossible : nb_actifs > nb_max cible → message avec
nb à désactiver.
- Alternative 3 — AbonnementB2B expiré : accès lecture seule.

Règles métier associées
RM-60 à RM-69, RM-88, RM-89, RM-100, RM-110, RM-111


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 76
UCS13 : Configuration Module Abonnement Admin
## Champ Valeur
Identifiant UCS13
Acteur appelant Administrateur FORGES
## Objectif
Configurer les offres Retail, paliers B2B, offres AbonnementOrganisation,
types de formations, paramètres Bot, abonnements Sur devis,
commissions partenaires et taux apporteurs
Déclencheur L'Administrateur accède au menu Configuration
Précondition Être connecté en tant qu'Administrateur.
Postcondition Paramètres mis à jour. Grille tarifaire et commissions configurées.

Diagramme de séquence

Figure — Diagramme de séquence UCS13

Processus de base
- Accès à la configuration centralisée ;
- Configuration offres AbonnementOrganisation (Basique/Pro/Enterprise, tarifs,
périmètre — RM-107, RM-108) ;
- Configuration offres Retail (inclus_abonnement recalculé — RM-102) ;
- Configuration paliers B2B (nb_premium_inclus=2 si Enterprise — RM-89) ;
- Configuration commission FORGES par partenaire (défaut 20% — RM-129) ;
- Configuration taux commission par apporteur (défaut 5% — RM-141) ;

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 77
- Configuration seuils minimum reversement (Partenaire défaut 50 000 XOF — RM-
138, Apporteur défaut 5 000 XOF — RM-147) ;
- Configuration paramètres Bot (délai refus upgrade — RM-120, seuils déclenchement
## — RM-116) ;
- [Flux Sur devis] Création manuelle AbonnementB2B avec paramètres négociés ;
- Consultation tableau de bord EnqueteCatalogue (trié par fréquence × volume — RM-
124) ; Fin UCS13.

## Processus Alternatifs
- Alternative 1 — Modification offres avec abonnés actifs : s'applique aux nouvelles
souscriptions.
- Alternative 2 — Flux Sur devis : négociation hors plateforme puis création manuelle.
- Alternative 3 — Traductions manquantes : liste consultable, priorité assignable.

Règles métier associées
RM-86, RM-89, RM-102, RM-107, RM-108, RM-109, RM-116, RM-120, RM-124, RM-129, RM-138,
## RM-141, RM-147, MT-01


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 78
UCS14 : Accéder à une Formation à la Demande
## Champ Valeur
Identifiant UCS14
Acteur appelant
Apprenant (Organisation finance via vouchers ou B2B — pas d'accès
direct Organisation)
## Objectif
Permettre à un apprenant d'accéder à une formation à la demande, de
l'acheter ou de la débloquer via son abonnement
## Déclencheur
L'apprenant consulte le catalogue et clique sur Accéder (formation
mode=À la demande)
## Précondition
Être connecté en tant qu'Apprenant. Formation mode=À la demande (RM-
## 91).
## Postcondition
AccesFormationDemande créé ou réactivé. Contenu accessible
immédiatement (RM-93).

Diagramme de séquence

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 79

Figure — Diagramme de séquence UCS14

Processus de base
- L'apprenant consulte le catalogue à la demande (badges Premium RM-90, Inclus
abonnement RM-102) ;
- Vérification AccesFormationDemande actif existant ;
- AccesFormationDemande Suspendu + abonnement resouscrit → réactivation
automatique (RM-103) ;
- Formation Standard + abonné actif + RM-102 satisfaite → accès immédiat sans
paiement (RM-94) ;
- Formation Premium → vérification quota Enterprise (RM-89), puis achat unitaire (-
15% si abonné — RM-88) ;
- AccesFormationDemande créé selon source (RM-92). Accès immédiat (RM-93).
Confirmation (RM-100) ; Fin UCS14.

## Processus Alternatifs
- Alternative 1 — Accès actif existant : redirection directe vers contenu.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 80
- Alternative 2 — AccesFormationDemande Suspendu (RM-103) + abonnement inactif :
proposition resouscription UCS11.1.
- Alternative 3 — Formation Standard sans abonnement : achat unitaire plein tarif.
- Alternative 4 — Paiement refusé : message d'erreur, nouvelle tentative (RM-08).
- Alternative 5 — Contenu langue préférée absent : fallback FR + bandeau informatif (RM-99).
- Alternative 6 — AccèsFormationDemande expiré (RM-92) : proposition renouvellement par
achat.

Règles métier associées
RM-87, RM-88, RM-89, RM-90, RM-91, RM-92, RM-93, RM-94, RM-95, RM-99, RM-100, RM-102,
## RM-103


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 81
UCS15 : Bot Conseiller Apprenant
## Champ Valeur
Identifiant UCS15
Acteur appelant Apprenant (déclenchement manuel ou automatique — RM-115)
## Objectif
Assister l'apprenant via 4 fonctions 100% règles métier : orientation
formations (questions fermées), suggestion upgrade, collecte feedback,
enquête catalogue
## Déclencheur
Clic sur bouton 'Conseiller' (widget flottant), ou déclenchement
automatique (RM-115)
Précondition Être connecté en tant qu'Apprenant.
## Postcondition
Session ConversationBot créée et tracée. FeedbackFormation et/ou
EnqueteCatalogue créés si applicable.

Diagramme de séquence

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 82

Figure — Diagramme de séquence UCS15

Processus de base
- Déclenchement bot (manuel ou automatique — RM-115) ;
- Chargement profil complet (type_apprenant, secteur, historique, abonnement) ;
- Évaluation règles fixes RM-116 pour déterminer flux prioritaire ;
- [Flux Orientation] Questions à choix fermés : objectif (liste), secteur (liste), niveau
(liste) → filtrage catalogue (RM-118) → max 5 formations présentées avec liens directs
## UCS07/UCS14 ;
- [Flux Upgrade] Condition RM-119 satisfaite → suggestion avec argumentaire basé
sur règles → acceptation (UCS11.1) ou refus enregistré (RM-120) ;
- [Flux Feedback] Session clôturée détectée (RM-121) → questionnaire fixe 5
questions (RM-122) → FeedbackFormation enregistré ;

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 83
- [Flux Enquête] 0 formation trouvée → formulaire 3 questions fermées (RM-123) →
EnqueteCatalogue enregistrée (RM-124) ; Fin UCS15.

## Processus Alternatifs
- Alternative 1 — Profil incomplet : invite à compléter avant orientation (RM-116).
- Alternative 2 — Suggestion upgrade déjà refusée < 7j (RM-120) : flux upgrade sauté.
- Alternative 3 — Feedback déjà collecté pour cette formation (RM-121) : flux feedback sauté.
- Alternative 4 — Abandon conversation : ConversationBot → Abandonnée. Reprise possible à
prochaine connexion.
- Alternative 5 — Résultats trouvés dans catalogue : flux enquête non déclenché (RM-123).

Règles métier associées
RM-115, RM-116, RM-118, RM-119, RM-120, RM-121, RM-122, RM-123, RM-124, RM-125, RM-98,
## MT-01


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 84
UCS16 : Bot Conseiller Organisation
## Champ Valeur
Identifiant UCS16
Acteur appelant
Organisation (Responsable RH/Formation — déclenchement manuel ou
automatique)
## Objectif
Assister l'Organisation via 4 fonctions règles métier : orientation formations
collectives, suggestion upgrade palier, collecte feedback programme,
enquête catalogue
## Déclencheur
Clic sur 'Conseiller' depuis UCS12, ou déclenchement automatique (RM-
116 : taux utilisation > 80%)
## Précondition
AbonnementOrganisation actif ou en essai. Être connecté en tant que
contact référent.
## Postcondition
Session ConversationBot créée (type=Organisation). Plan de formation
et/ou enquête enregistrés.

Diagramme de séquence

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 85

Figure — Diagramme de séquence UCS16

Processus de base
- Déclenchement bot depuis UCS12 ;
- Chargement profil Organisation (type, palier B2B, historique vouchers, formations
utilisées) ;
- Évaluation règles fixes RM-116 ;
- [Flux Orientation] Questions fermées : secteur équipes (liste), niveau (liste), volume
(liste) → plan de formation suggéré (formations + coût estimé + palier recommandé — RM-
## 118) ;
- [Flux Upgrade] Taux utilisation > 80% (RM-119) → suggestion montée palier avec
argumentaire → UCS03.2 si accepté, refus enregistré (RM-120) ;
- [Flux Enquête] 0 formation → formulaire 3 questions fermées + volume Organisation
## (RM-123, RM-124) ;
- [Flux Feedback] Vouchers > 80% utilisés + formations terminées (RM-121) →
questionnaire (RM-122) ; Fin UCS16.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 86

## Processus Alternatifs
- Alternative 1 — Suggestion upgrade déjà refusée < 7j (RM-120) : sauté.
- Alternative 2 — AbonnementB2B absent : bot propose d'abord la souscription (UCS03.2).
- Alternative 3 — Abandon : ConversationBot → Abandonnée.
- Alternative 4 — Volume estimé enquête = 0 : enquête enregistrée avec volume=1 et note
admin.

Règles métier associées
RM-115, RM-116, RM-118, RM-119, RM-120, RM-121, RM-122, RM-123, RM-124, RM-125, RM-98,
## MT-01


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 87
UCS17 : Espace Partenaire Fournisseur
## Champ Valeur
Identifiant UCS17
Acteur appelant
Partenaire Fournisseur (Flux A : invitation Admin / Flux B : auto-inscription
publique)
## Objectif
Permettre à un Partenaire Fournisseur d'accéder à son espace, soumettre
des formations, suivre les statuts de validation et consulter ses
reversements nets
## Déclencheur
Flux A : activation lien invitation (token 48h). Flux B : accès page publique
inscription partenaire.
## Précondition
Flux A : invitation Admin valide (RM-126). Flux B : aucune — page
publique.
## Postcondition
Compte Partenaire actif. Formations soumises En attente de validation.
Tableau de bord accessible (RM-130). type_formation assigné par
FORGES lors de la validation (RM-127).

Diagramme de séquence

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 88

Figure — Diagramme de séquence UCS17

Processus de base
- [Flux A] Admin crée le compte Partenaire (raison sociale, type, commission% — RM-
129), envoie invitation (token 48h) ; Partenaire active son compte ; statut → Actif ;
- [Flux B] Partenaire accède à la page publique, soumet ses informations ; statut → En
attente de vérification ; Admin approuve ; statut → Actif ; Partenaire notifié ;
- [Soumission formation] Partenaire remplit le formulaire RM-136 (21 champs — SANS
type_formation ni pilier_abonnement, assignés par FORGES lors validation) ;
- La plateforme crée la Formation (statut=En attente de validation — RM-127) et notifie
le Responsable désigné (RM-128) ;
- Partenaire suit le statut depuis son tableau de bord (RM-130) ;
- En cas de rejet : Partenaire corrige et resoumet (version incrémentée — RM-128) ;
- Partenaire consulte ses reversements nets mensuels (RM-129, RM-138) ; Fin
## UCS17.


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 89
## Processus Alternatifs
- Alternative 1 — Token invitation expiré (> 48h) : Admin régénère.
- Alternative 2 — Auto-inscription refusée : Partenaire notifié avec motif. Compte supprimé.
- Alternative 3 — Formation incomplète (champs obligatoires RM-136) : sauvegarde Brouillon
possible, soumission bloquée.
- Alternative 4 — Formation rejetée (RM-128) : motif + corrections reçus, correction et
resoumission possibles.
- Alternative 5 — Compte Partenaire suspendu (RM-133) : accès bloqué.

Règles métier associées
RM-126, RM-127, RM-128, RM-129, RM-130, RM-131, RM-132, RM-133, RM-136, RM-137, RM-138,
## MT-01


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 90
UCS18 : Validation Formation Partenaire
## Champ Valeur
Identifiant UCS18
Acteur appelant Responsable de formation désigné (partenaires_assignes — RM-128)
## Objectif
Examiner les formations soumises par les Partenaires, les valider ou
rejeter, ET assigner type_formation et pilier_abonnement (responsabilité
## FORGES — RM-127)
## Déclencheur
Notification de nouvelle formation partenaire à valider, ou accès menu
## Formations Partenaires
## Précondition
Être connecté en tant que Responsable de formation désigné pour ce
partenaire (RM-128).
## Postcondition
Formation → Active avec type_formation et pilier_abonnement assignés
par FORGES. Prix catalogue calculé automatiquement (RM-137).

Diagramme de séquence


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 91
Figure — Diagramme de séquence UCS18

Processus de base
- Le Responsable désigné reçoit la notification de soumission (RM-128) ;
- Le Responsable consulte la liste des formations En attente de validation ;
- Examen complet : contenu, prix coûtant proposé, objectifs, programme, modes,
historique versions ;
- [VALIDER] Le Responsable assigne type_formation (Standard|Premium|Sur devis) et
pilier_abonnement (RM-127). Valide le prix coûtant (ou négocie). Le système calcule
automatiquement le prix catalogue (RM-137). Formation → Active. Partenaire notifié (RM-
## 100) ;
- [REJETER] Motif obligatoire + corrections suggérées (optionnel). Formation →
Rejetée. Partenaire notifié (RM-128) ;
- [SUSPENDRE formation Active] Motif obligatoire. Formation → Suspendue.
Apprenants et Partenaire notifiés (RM-131) ;
- Action journalisée (MT-01) ; Fin UCS18.

## Processus Alternatifs
- Alternative 1 — Délai 5j dépassé sans traitement : alerte Admin + Responsable (RM-134).
- Alternative 2 — Délai 10j dépassé : escalade Admin pour réassignation (RM-134).
- Alternative 3 — Formation resoumise après rejet : historique versions disponible.
- Alternative 4 — Responsable non désigné pour ce partenaire : action bloquée, Admin doit
désigner.
- Alternative 5 — Prix coûtant proposé jugé incohérent : Responsable peut négocier (champ
commentaire) avant validation.

Règles métier associées
## RM-127, RM-128, RM-129, RM-131, RM-132, RM-134, RM-136, RM-137, RM-100, MT-01


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 92
UCS19 : Voucher Apporteur d'Affaires
## Champ Valeur
Identifiant UCS19
Acteur appelant
Apporteur d'Affaires (Individu ou Organisation — Profil B) / Admin
FORGES (création/approbation)
## Objectif
Gérer le cycle de vie complet du Voucher Apporteur d'Affaires : inscription,
attribution code, utilisation lors de transactions, calcul commissions,
reversements mensuels
## Déclencheur
Flux A : Admin crée le compte Apporteur. Flux B : Individu/Organisation
s'inscrit publiquement. Flux C : Apprenant utilise un code lors d'une
transaction.
## Précondition
Flux A : être connecté Admin. Flux B : page publique. Flux C : apprenant
connecté avec code apporteur à saisir.
## Postcondition
Compte Apporteur actif avec code UUID permanent.
CommissionsApporteur calculées et reversées mensuellement si cumul >
seuil (RM-147). Suivi Superviseur + Agent Comptable (RM-148).

Diagramme de séquence

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 93

Figure — Diagramme de séquence UCS19

Processus de base
- [Flux A — Création Admin] POST /admin/apporteurs {nom, type, email,
taux_commission%} → code UUID permanent généré (RM-142). Email envoyé à l'Apporteur
## (RM-100) ;
- [Flux B — Auto-inscription] L'Apporteur soumet sa demande publiquement. Admin
approuve et fixe le taux. Code UUID généré (RM-142). Apporteur notifié ;
- L'Apporteur partage son code librement (email, réseaux sociaux) ;
- [Flux C — Utilisation code] L'Apprenant saisit le code lors d'une inscription ou achat ;
- La plateforme vérifie : code Actif + type=Apporteur + non-cumul autre voucher (RM-
## 143, RM-144) ;
- Transaction confirmée : CommissionApporteur créée = montant_transaction × taux%
(RM-145). Statut : En attente ;

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 94
- Fin de mois (J+1) : agrégation commissions par apporteur (RM-146). Statut →
## Validée ;
- Si cumul >= seuil_minimum (RM-147) : Agent Comptable valide le reversement.
Apporteur notifié (RM-100). Journalise REVERSEMENT_APPORTEUR (MT-01) ;
- Superviseur consulte le tableau de bord mensuel apporteurs (RM-148) ; Fin UCS19.

## Processus Alternatifs
- Alternative 1 — Code apporteur invalide ou inactif (RM-143) : message d'erreur, transaction
continue sans code.
- Alternative 2 — Autre voucher déjà appliqué (RM-144) : code apporteur refusé. Exception :
réduction abonné -15% (RM-88) reste applicable.
- Alternative 3 — Cumul commissions < seuil (RM-147) : report au mois suivant.
- Alternative 4 — Clôture compte Apporteur : solde total reversé quel que soit le montant (RM-
## 147).
- Alternative 5 — Organisation Apporteuse : même flux que Individu. Code associé à
l'Organisation.

Règles métier associées
RM-141, RM-142, RM-143, RM-144, RM-145, RM-146, RM-147, RM-148, RM-88, RM-100, MT-01


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 95
UCS20 : Espace Apporteur d'Affaires
## Champ Valeur
Identifiant UCS20
Acteur appelant Apporteur d'Affaires (Individu ou Organisation connecté)
## Objectif
Permettre à un Apporteur d'Affaires d'accéder à son espace dédié :
consulter son code de parrainage, suivre ses commissions et l'historique
de ses reversements
Déclencheur L'Apporteur se connecte via UCS01 et accède à son espace
Précondition Avoir un compte Apporteur en statut Actif (UCS19 — RM-141).
## Postcondition
Tableau de bord Apporteur affiché. Code partageable accessible. Relevés
téléchargeables.

Diagramme de séquence

Figure — Diagramme de séquence UCS20

Processus de base
- L'Apporteur se connecte via UCS01 ;

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 96
- La plateforme affiche le tableau de bord Apporteur : code UUID permanent + QR
code + lien de parrainage copiable (RM-142) ;
- Statistiques affichées : nb transactions ce mois, CA généré ce mois, commission en
attente, cumul total perçu ;
- L'Apporteur consulte le détail des commissions par mois (liste transactions,
montant_base, taux, commission — RM-145) ;
- L'Apporteur consulte l'historique des reversements (date, montant, statut En attente |
Validé | Payé — RM-147) ;
- L'Apporteur peut exporter un relevé mensuel PDF ;
- [Automatique — fin de mois] Notification email lors de chaque reversement effectué
(RM-100, RM-148) ; Fin UCS20.

## Processus Alternatifs
- Alternative 1 — Aucune transaction ce mois : dashboard avec valeurs à zéro, message
'Partagez votre code pour générer vos premières commissions.'
- Alternative 2 — Cumul < seuil minimum (RM-147) : badge 'En cours d'accumulation —
reversement dès X XOF atteints'.
- Alternative 3 — Compte Apporteur suspendu par Admin : accès lecture seule, nouvelles
transactions bloquées.
- Alternative 4 — Organisation Apporteuse : même interface, données agrégées au niveau de
l'Organisation.

Règles métier associées
## RM-141, RM-142, RM-145, RM-146, RM-147, RM-148, RM-100, MT-01


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 97
## 11. Mécanismes Système Transversaux
Processus système actifs s'appliquant transversalement à l'ensemble des cas d'utilisation.

MT-01 : Journalisation des Actions
## Champ Valeur
Identifiant MT-01
Acteur appelant Système (écriture automatique) / Administrateur (consultation)
## Objectif
Tracer toutes les actions significatives pour garantir auditabilité, traçabilité
des responsabilités et détection d'anomalies
Déclencheur Toute action tracée dans UCS00 à UCS19
## Périmètre
Toutes actions liées à des données personnelles, financières, d'accès,
d'abonnement, de partenariat ou d'apporteur.

Diagramme de séquence

Figure — Diagramme de séquence MT-01 — Journalisation


Actions tracées par UCS (sélection non exhaustive)
UCS / Mécanisme Actions tracées (INFO sauf mention)
UCS00 COMPTE_CREE. Token activation généré.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 98
## UCS01
CONNEXION_REUSSIE. Échec connexion (WARNING > 3, ERROR
## > 5).
## UCS02
Création/désactivation/réactivation compte. Invitation Partenaire.
## Création Apporteur.
## UCS03/03.1/03.2
Création Organisation. Démarrage essai. Souscription abonnements.
Activation contrat.
## UCS04
Création/modification/archivage formation. Recalcul
inclus_abonnement.
UCS05 Création/modification session. Transitions statut automatiques.
## UCS07
INSCRIPTION_DIRECTE (Standard).
DOSSIER_CREE_EN_ATTENTE (Premium+Retail).
## UCS08
## DOSSIER_RETENU. DOSSIER_REJETE. DOSSIER_ANNULE
## (WARNING).
## UCS09
## PAIEMENT_CONFIRME. PAIEMENT_ECHOUE (ERROR).
## COMMISSION_PARTENAIRE_CALCULEE.
## COMMISSION_APPORTEUR_GENEREE.
## UCS09.1
## ABONNEMENT_RENOUVELE. ABONNEMENT_SUSPENDU
## (WARNING). ACCES_FORMATION_SUSPENDU (RM-103).
## UCS10 RAPPORT_PDF_GENERE. EXPORT_DONNEES.
UCS11 ATTESTATION_GENEREE. DOSSIER_ANNULE (volontaire).
## UCS15/UCS16
## CONVERSATION_BOT_DEBUT/FIN. FEEDBACK_COLLECTE.
## ENQUETE_CATALOGUE_CREEE.
## UPGRADE_SUGGERE/ACCEPTE/REFUSE (WARNING).
## UCS17
## PARTENAIRE_CREE. PARTENAIRE_APPROUVE.
## PARTENAIRE_SUSPENDU (WARNING).
## FORMATION_PARTENAIRE_SOUMISE.
## UCS18
## FORMATION_PARTENAIRE_VALIDEE.
## FORMATION_PARTENAIRE_REJETEE (WARNING).
## FORMATION_PARTENAIRE_SUSPENDUE (WARNING).
## VALIDATION_DELAI_DEPASSE (WARNING).
## UCS19
## APPORTEUR_CREE. COMMISSION_APPORTEUR_GENEREE.
## REVERSEMENT_APPORTEUR_EFFECTUE.
## REVERSEMENT_PARTENAIRE_EFFECTUE.
MT-02 Toute opération de chiffrement/déchiffrement en erreur (ERROR).

Règles de gestion des logs
## Règle Description
## Intégrité
Append-only. Aucune modification/suppression. Tentative → log ERROR.
Intégrité HMAC-SHA256 vérifiable.
## Rétention
Base active : 365 jours. Archivage froid : 5 ans minimum. Suppression
définitive après durée légale applicable.
## Accès
Lecture seule réservée à l'Administrateur. Filtres : période, acteur, niveau,
type d'action, entité.

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 99
Résistance à l'échec
Écriture log échoue → action source néanmoins exécutée. Alerte
CRITICAL déclenchée.
Anonymisation RGPD
Droit à l'oubli : champs PII anonymisés (hash irréversible). Structure de
l'entrée conservée pour l'audit.

MT-02 : Chiffrement des Données Échangées
## Champ Valeur
Identifiant MT-02
Acteur appelant Système uniquement (mécanisme entièrement automatique)
## Objectif
Garantir la confidentialité et l'intégrité de toutes les données en transit et
au repos. Conformité RGPD et PCI-DSS.
## Déclencheur
Toute communication client-serveur. Tout stockage de donnée sensible.
Toute génération de token.

Diagramme de séquence

Figure — Diagramme de séquence MT-02 — Chiffrement


Périmètre Technologie Règle appliquée
Données en transit
TLS 1.2 min (TLS 1.3
recommandé)
HTTPS obligatoire (301 permanent). HSTS activé
(max-age >= 1 an).

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 100
Mots de passe bcrypt coût 12
Jamais stockés en clair. Vérification par hash
uniquement.
Tokens de session JWT HS256/RS256
Access token 1h, refresh token 7j. Invalidation à
la déconnexion.
Données personnelles
## (PII)
AES-256-GCM Chiffrées au repos. Clé gérée par KMS séparé.
Données de paiement
## PCI-DSS — API
tierce
Aucune carte bancaire stockée localement.
Attestations PDF AES-256 + UUID
Stockées chiffrées. Lien téléchargement signé et
expirant (24h).
Données abonnement AES-256-GCM
Méthode Mobile Money chiffrée. Token géré par
API tierce.
Contenus vidéo à la
demande
HTTPS + URL signée
URL vidéo signée avec expiration. Pas de lien
direct permanent.
Logs HMAC-SHA256
Intégrité vérifiable à tout moment. Toute
modification détectable.
Données partenaires AES-256-GCM
Prix coûtant et commissions chiffrés. Accessible
Admin + Agent Comptable uniquement.
Données apporteurs AES-256-GCM
Taux commission et montants chiffrés.
## Accessible Admin + Agent Comptable +
Apporteur concerné.
ConversationBot AES-256-GCM
Historique conversations chiffré. Accessible
uniquement par l'utilisateur et l'Admin.


FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 101
- Index des Cas d'Utilisation

Identifiant Intitulé Acteur appelant Version / Statut
UCS00 S'inscrire sur la Plateforme Apprenant
v1.0 — enrichi v4.4
## (étape 16)
UCS01 Authentifier un Utilisateur
Tous les utilisateurs (+
## Partenaire, Apporteur
v4.6/v4.8)
v1.0 — enrichi v4.6
UCS02 Gérer les Comptes Utilisateurs Administrateur
v1.0 — enrichi v4.6
## (invitation
Partenaire), v4.8
(Apporteur)
UCS03 Gérer un Compte Organisation Organisation
v1.0 — enrichi v4.4
(note double
abonnement)
UCS03.1 Abonnement Institutionnel
Ministère/Bailleur + Admin +
## Gestionnaire(s)
v4.0 — enrichi v4.5
## (RM-112–114)
## UCS03.2
Abonnement B2B (tous types
## Organisation)
## Organisation —
Responsable RH/Formation
v4.0 — enrichi v4.5
## (RM-110)
UCS04 Gérer les Formations
Admin / Responsable de
formation
v1.0 — enrichi v4.6
(statut En attente
validation), v4.8
## (RM-127)
## UCS05
Gérer les Sessions de Formation
(Avec session)
## Superviseur / Système
scheduler
v1.0 — existant
## UCS06
Gérer les Vouchers Organisation
et Promotionnels
## Organisation / Agent
## Comptable / Superviseur
v1.0 — existant
## UCS07
S'inscrire à une Session de
Formation (Avec session)
## Apprenant
v1.0 — enrichi v4.7
(bifurcation RM-
## 140)
## UCS08
Traiter un Dossier (Premium +
Retail uniquement)
## Responsable / Système
scheduler
v1.0 — enrichi v4.7
(périmètre réduit
## RM-140)
UCS09 Gérer les Paiements
## Apprenant / Agent
## Comptable / Système
v1.0 — enrichi v4.8
## (commissions
partenaire +
apporteur)
## UCS09.1
## Renouvellement Abonnement
## Automatique
## Système / Apprenant /
## Organisation
v4.0 — enrichi v4.5
## (RM-109, RM-111)
UCS10 Tableau de Bord et Rapports
## Admin / Superviseur /
## Responsable / Agent
## Comptable / Partenaire /
## Apporteur
v1.0 — enrichi v4.8
## (vues Partenaire,
## Apporteur,
reversements)
UCS11 Espace Apprenant Apprenant
v1.0 — enrichi v4.5
## (RM-103, RM-105,
## RM-111)

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 102
UCS11.1 Gestion Abonnement Retail Apprenant
v4.0 — enrichi v4.5
## (RM-104, RM-105,
## RM-106)
UCS12 Espace Organisation Organisation
v1.0 — enrichi v4.4
(note double
abonnement)
UCS12.1 Dashboard Abonnement B2B Organisation — tous types
v4.0 — enrichi v4.5
## (RM-110, RM-111)
## UCS13
## Configuration Module
## Abonnement Admin
Administrateur FORGES
v4.0 — enrichi v4.8
## (commissions
partenaire, taux
apporteur, seuils)
## UCS14
Accéder à une Formation à la
## Demande
Apprenant uniquement
(Organisation via
vouchers/B2B)
v4.2 — enrichi v4.4
(Organisation
retirée), v4.5 (RM-
## 111)
## UCS15
## Bot Conseiller Apprenant —
100% règles métier
## Apprenant / Système
v4.5 — simplifié
v4.7 (LLM
supprimé,
questions fermées
## — RM-118, RM-
## 123)
## UCS16
## Bot Conseiller Organisation —
100% règles métier
## Organisation / Système
v4.5 — simplifié
v4.7
UCS17 Espace Partenaire Fournisseur
Partenaire Fournisseur (Flux
A invitation / Flux B auto-
inscription)
v4.6 — enrichi v4.8
(RM-127 type
formation
## FORGES, RM-136
formulaire)
UCS18 Validation Formation Partenaire
Responsable de formation
désigné
v4.6 — enrichi v4.8
## (assignation
type_formation par
## FORGES — RM-
## 127, RM-137)
UCS19 Voucher Apporteur d'Affaires Apporteur / Admin FORGES
v4.8 NOUVEAU —
RM-141 à RM-148
UCS20 Espace Apporteur d'Affaires Apporteur d'Affaires
v4.8 NOUVEAU —
tableau de bord
dédié
MT-01 Journalisation des Actions (Logs)
## Système (écriture) /
## Administrateur (consultation)
v1.0 — enrichi v4.8
## (actions
partenaires,
apporteurs,
commissions)
## MT-02
Chiffrement des Données
## Échangées
## Système (automatique)
v1.0 — enrichi v4.8
## (données
partenaires,
apporteurs,
conversations bot)

FORGES — Spécifications v4.8 — Confidentiel
Document Confidentiel — GIE FORGES AGRÉGATEUR 103
