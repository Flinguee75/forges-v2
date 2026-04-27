**_GIE FORGES AGRÉGATEUR_**

**_MAPPING UCS → ENDPOINTS → DTOs_**

**_20 cas d'utilisation · 60+ endpoints · Validation Zod/class-validator · Specs v4.8_**

**_Ce document est le contrat d'interface entre les specs fonctionnelles v4.8 et le code. Chaque endpoint est associé à son UCS, son rôle RBAC, son DTO de validation et ses règles métier (RMs). À utiliser comme référence directe pour la génération de code._**

**_UCS00 - S'inscrire sur la Plateforme · Acteur : Apprenant (public) · RMs : RM-28,29,30,31,32,33,48,98,100,102_**

**_Endpoints API_**

**_Méth._**

**_Route_**

**_Rôle requis_**

**_Description_**

**_POST_**

**_/api/apprenants/register_**

**_Public_**

**_Création compte + envoi email confirmation_**

**_GET_**

**_/api/apprenants/confirm/:token_**

**_Public_**

**_Activation compte via token UUID (24h)_**

**_POST_**

**_/api/apprenants/resend-confirmation_**

**_Public_**

**_Renvoi email si token expiré_**

**_DTOs & Validation_**

**_DTO_**

**_Champ / Règle_**

**_RM_**

**_RegisterApprenantDto_**

**_email: string (unique, insensible casse)_**

**_RM-28_**

**_RegisterApprenantDto_**

**_password: string (min 8 car., 1 maj., 1 chiffre)_**

**_MT-02_**

**_RegisterApprenantDto_**

**_type_apprenant: enum PROFESSIONNEL|APPRENANT_**

**_RM-34_**

**_RegisterApprenantDto_**

**_secteur_activite: string? (requis si PROFESSIONNEL)_**

**_RM-35_**

**_RegisterApprenantDto_**

**_niveau_etude: string? (requis si APPRENANT)_**

**_RM-36_**

**_RegisterApprenantDto_**

**_pays_residence: string ISO 3166-1_**

**_RM-48_**

**_RegisterApprenantDto_**

**_pays_nationalite: string ISO 3166-1_**

**_RM-48_**

**_RegisterApprenantDto_**

**_langue_preferee: enum FR|EN|ES|PT (défaut FR)_**

**_RM-98_**

**_RegisterApprenantDto_**

**_consentement_rgpd: boolean (requis=true)_**

**_RM-33_**

**_UCS01 - Authentifier un Utilisateur · Acteur : Tous (9 rôles) · RMs : RM-98, MT-01, MT-02_**

**_Endpoints API_**

**_Méth._**

**_Route_**

**_Rôle requis_**

**_Description_**

**_POST_**

**_/api/auth/login_**

**_Public_**

**_Login → JWT access 1h + refresh 7j_**

**_POST_**

**_/api/auth/refresh_**

**_Public_**

**_Renouvellement access token_**

**_POST_**

**_/api/auth/logout_**

**_Auth_**

**_Révocation token (blacklist Redis)_**

**_POST_**

**_/api/auth/forgot-password_**

**_Public_**

**_Envoi email reset_**

**_POST_**

**_/api/auth/reset-password_**

**_Public_**

**_Changement mdp via token_**

**_DTOs & Validation_**

**_DTO_**

**_Champ / Règle_**

**_RM_**

**_LoginDto_**

**_email: string_**

**_LoginDto_**

**_password: string_**

**_MT-02_**

**_RefreshDto_**

**_refreshToken: string (JWT valide)_**

**_ResetPasswordDto_**

**_token: string_**

**_ResetPasswordDto_**

**_newPassword: string (min 8, 1 maj., 1 chiffre)_**

**_MT-02_**

**_UCS02 - Gérer les Comptes Utilisateurs · Acteur : Administrateur · RMs : RM-126, RM-141, MT-01_**

**_Endpoints API_**

**_Méth._**

**_Route_**

**_Rôle requis_**

**_Description_**

**_POST_**

**_/api/admin/users_**

**_ADMIN_**

**_Création compte backoffice_**

**_PUT_**

**_/api/admin/users/:id/status_**

**_ADMIN_**

**_Activer/Désactiver compte_**

**_POST_**

**_/api/admin/partenaires_**

**_ADMIN_**

**_Invitation Partenaire Flux A (RM-126)_**

**_POST_**

**_/api/admin/apporteurs_**

**_ADMIN_**

**_Création Apporteur + code UUID (RM-141)_**

**_DTOs & Validation_**

**_DTO_**

**_Champ / Règle_**

**_RM_**

**_CreateUserDto_**

**_email: string, role: enum (9 rôles)_**

**_UpdateUserStatusDto_**

**_statut: enum ACTIF|INACTIF|SUSPENDU_**

**_InvitePartenaireDto_**

**_email: string, raison_sociale: string_**

**_RM-126_**

**_CreateApporteurDto_**

**_nom: string, email: string, type: INDIVIDU|ORGANISATION, taux_commission_pct: number_**

**_RM-141_**

**_UCS03/03.1/03.2 - Compte Organisation + Abonnements · Acteur : Organisation / Admin · RMs : RM-43,80→85,104→114_**

**_Endpoints API_**

**_Méth._**

**_Route_**

**_Rôle requis_**

**_Description_**

**_POST_**

**_/api/organisations/register_**

**_Public_**

**_Création Organisation (essai 30j RM-81)_**

**_GET_**

**_/api/organisations/confirm/:token_**

**_Public_**

**_Activation Organisation_**

**_POST_**

**_/api/abonnements/organisation/souscrire_**

**_ORGANISATION_**

**_Souscription Basique/Pro/Enterprise_**

**_POST_**

**_/api/abonnements/b2b/souscrire_**

**_ORGANISATION_**

**_Souscription B2B (paliers RM-104→114)_**

**_POST_**

**_/api/admin/contrats-institutionnels_**

**_ADMIN_**

**_Création contrat institutionnel_**

**_DTOs & Validation_**

**_DTO_**

**_Champ / Règle_**

**_RM_**

**_RegisterOrganisationDto_**

**_raison_sociale, type_organisation, identifiant_legal (unique/type RM-43)_**

**_RM-43_**

**_RegisterOrganisationDto_**

**_contact_referent, email_referent, pays, langue_preferee_**

**_RM-47,48_**

**_SouscrireAbonnementOrgDto_**

**_offre: enum BASIQUE|PRO|ENTERPRISE_**

**_RM-80→85_**

**_SouscrireAbonnementB2BDto_**

**_palier: enum STARTER|BUSINESS|ENTERPRISE|SUR_DEVIS, nb_max: number_**

**_RM-104→114_**

**_UCS04 - Gérer les Formations · Acteur : Admin / Responsable · RMs : RM-86, RM-102, RM-127_**

**_Endpoints API_**

**_Méth._**

**_Route_**

**_Rôle requis_**

**_Description_**

**_POST_**

**_/api/backoffice/formations_**

**_ADMIN|RESPONSABLE_**

**_Création formation (sans type_formation)_**

**_PUT_**

**_/api/backoffice/formations/:id_**

**_ADMIN|RESPONSABLE_**

**_Modification formation_**

**_PUT_**

**_/api/responsable/formations/:id/valider_**

**_RESPONSABLE_**

**_Assignation type_formation (RM-127)_**

**_DELETE_**

**_/api/backoffice/formations/:id_**

**_ADMIN_**

**_Archivage formation_**

**_GET_**

**_/api/catalogue_**

**_Public_**

**_Catalogue public (RM-20,21)_**

**_GET_**

**_/api/catalogue/:id_**

**_Public_**

**_Détail formation + sessions disponibles_**

**_DTOs & Validation_**

**_DTO_**

**_Champ / Règle_**

**_RM_**

**_CreateFormationDto_**

**_titre, description, tarif (centimes XOF), duree (heures)_**

**_CreateFormationDto_**

**_mode_formation: enum AVEC_SESSION|A_LA_DEMANDE_**

**_CreateFormationDto_**

**_pilier_abonnement: enum RETAIL|B2B|INSTITUTIONNEL|TOUS_**

**_RM-102_**

**_CreateFormationDto_**

**_ABSENT: type_formation (assigné FORGES seulement)_**

**_RM-86_**

**_AssignerTypeFormationDto_**

**_type_formation: enum STANDARD|PREMIUM|SUR_DEVIS_**

**_RM-127_**

**_UCS05 - Gérer les Sessions · Acteur : Superviseur / Système · RMs : RM-16,17,18,25_**

**_Endpoints API_**

**_Méth._**

**_Route_**

**_Rôle requis_**

**_Description_**

**_POST_**

**_/api/backoffice/sessions_**

**_SUPERVISEUR_**

**_Création session_**

**_PUT_**

**_/api/backoffice/sessions/:id_**

**_SUPERVISEUR_**

**_Modification session_**

**_POST_**

**_/api/backoffice/sessions/bulk_**

**_SUPERVISEUR_**

**_Planification annuelle (RM-25)_**

**_GET_**

**_/api/formations/:id/sessions_**

**_Auth_**

**_Sessions disponibles pour une formation_**

**_GET_**

**_/api/dossiers/prioritaires_**

**_RESPONSABLE_**

**_Dossiers GRIS/EXCEPTION (RM-18)_**

**_DTOs & Validation_**

**_DTO_**

**_Champ / Règle_**

**_RM_**

**_CreateSessionDto_**

**_formation_id: string (uuid)_**

**_CreateSessionDto_**

**_capacite: number (> 0)_**

**_CreateSessionDto_**

**_date_ouverture ≤ date_cloture ≤ date_debut ≤ date_fin_**

**_RM-16_**

**_CreateSessionDto_**

**_Validation non-chevauchement → SessionService.checkOverlap()_**

**_RM-17_**

**_UCS06 - Gérer les Vouchers · Acteur : Organisation / Agent / Superviseur · RMs : RM-37→45_**

**_Endpoints API_**

**_Méth._**

**_Route_**

**_Rôle requis_**

**_Description_**

**_POST_**

**_/api/backoffice/vouchers_**

**_AGENT_**

**_Création voucher Promotionnel (Flux B) - statut BROUILLON_**

**_PUT_**

**_/api/superviseur/vouchers/:id/valider_**

**_SUPERVISEUR_**

**_Activation voucher Promo (RM-39)_**

**_GET_**

**_/api/organisations/:id/vouchers_**

**_ORGANISATION_**

**_Liste vouchers Organisation_**

**_GET_**

**_/api/vouchers/:code/check_**

**_Auth_**

**_Vérification validité voucher_**

**_DTOs & Validation_**

**_DTO_**

**_Champ / Règle_**

**_RM_**

**_CreateVoucherPromoDto_**

**_formation_id, valeur, type_valeur: MONTANT|POURCENTAGE_**

**_RM-37_**

**_CreateVoucherPromoDto_**

**_quota_max: number, date_expiration: Date_**

**_RM-40_**

**_VoucherOrgDto_**

**_Généré automatiquement après paiement Organisation (RM-41)_**

**_RM-41_**

**_UCS07 - S'inscrire à une Session · Acteur : Apprenant · RMs : RM-01,02,15,18,140,143,144_**

**_Endpoints API_**

**_Méth._**

**_Route_**

**_Rôle requis_**

**_Description_**

**_POST_**

**_/api/sessions/:id/inscrire_**

**_APPRENANT_**

**_Inscription → bifurcation RM-140_**

**_GET_**

**_/api/apprenant/dossiers_**

**_APPRENANT_**

**_Mes inscriptions + statuts_**

**_DELETE_**

**_/api/apprenant/dossiers/:id_**

**_APPRENANT_**

**_Annulation volontaire (RM-27)_**

**_DTOs & Validation_**

**_DTO_**

**_Champ / Règle_**

**_RM_**

**_InscriptionDto_**

**_source_financement: enum RETAIL|B2B|INSTITUTIONNEL|ABONNEMENT|VOUCHER_**

**_InscriptionDto_**

**_voucher_code: string? (uuid) - exclusif avec code_apporteur_**

**_RM-144_**

**_InscriptionDto_**

**_code_apporteur: string? (uuid) - exclusif avec voucher_code_**

**_RM-143,144_**

**_Résultat_**

**_statut PAYE_DIRECTEMENT si Standard OU source≠Retail_**

**_RM-140_**

**_Résultat_**

**_statut EN_ATTENTE_VERIFICATION si Premium ET source=Retail_**

**_RM-140_**

**_UCS08 - Traiter les Dossiers · Acteur : Responsable désigné · RMs : RM-03→15,57_**

**_Endpoints API_**

**_Méth._**

**_Route_**

**_Rôle requis_**

**_Description_**

**_GET_**

**_/api/backoffice/dossiers_**

**_RESPONSABLE_**

**_Liste dossiers + filtres_**

**_GET_**

**_/api/backoffice/dossiers/prioritaires_**

**_RESPONSABLE_**

**_GRIS/EXCEPTION (RM-18)_**

**_PUT_**

**_/api/backoffice/dossiers/:id/decision_**

**_RESPONSABLE_**

**_RETENU ou REJETE (motif obligatoire si rejet)_**

**_DTOs & Validation_**

**_DTO_**

**_Champ / Règle_**

**_RM_**

**_DecisionDossierDto_**

**_statut: enum RETENU|REJETE_**

**_DecisionDossierDto_**

**_motif_refus: string (obligatoire si REJETE)_**

**_RM-57_**

**_Règle_**

**_RETENU → irréversible (RM-05) → déclenche délai paiement 72h (RM-07)_**

**_RM-05,07_**

**_UCS09 - Gérer les Paiements · Acteur : Apprenant / Agent Comptable / Système · RMs : RM-07,08,129,139,145_**

**_Endpoints API_**

**_Méth._**

**_Route_**

**_Rôle requis_**

**_Description_**

**_POST_**

**_/api/paiements/initier_**

**_APPRENANT|ORGANISATION_**

**_Initiation paiement (72h timer)_**

**_POST_**

**_/api/webhooks/paiement_**

**_Système_**

**_Confirmation agrégateur → dossier PAYE_**

**_GET_**

**_/api/backoffice/paiements_**

**_AGENT_**

**_Suivi paiements + reversements_**

**_POST_**

**_/api/backoffice/reversements/partenaire/:id_**

**_AGENT_**

**_Reversement partenaire (seuil 50 000 XOF)_**

**_DTOs & Validation_**

**_DTO_**

**_Champ / Règle_**

**_RM_**

**_InitierPaiementDto_**

**_dossier_id: string, methode: enum MOBILE_MONEY|CARTE|VIREMENT|VOUCHER_ORG_**

**_WebhookPaiementDto_**

**_status: SUCCESS|FAILED, transaction_id: string, ref: string_**

**_Règle_**

**_Max 3 tentatives (RM-08) · expires_at = created_at + 72h (RM-07)_**

**_RM-07,08_**

**_Règle_**

**_Commission partenaire = montant × (1 - commission_forges/100) (RM-129)_**

**_RM-129_**

**_UCS10 - Tableaux de Bord & Rapports · Acteur : Tous rôles (filtré) · RMs : RM-46,130,139,148_**

**_Endpoints API_**

**_Méth._**

**_Route_**

**_Rôle requis_**

**_Description_**

**_GET_**

**_/api/dashboard_**

**_Auth_**

**_KPIs filtrés par rôle JWT (switch 9 cas)_**

**_GET_**

**_/api/dashboard/export/pdf_**

**_Auth_**

**_Export PDF < 10s (RM-46)_**

**_GET_**

**_/api/dashboard/export/excel_**

**_Auth_**

**_Export Excel_**

**_DTOs & Validation_**

**_DTO_**

**_Champ / Règle_**

**_RM_**

**_Réponse Admin_**

**_nb_utilisateurs, nb_formations, nb_inscriptions, ca_total, abonnements_actifs_**

**_Réponse Agent_**

**_paiements_en_attente, reversements_partenaire, commissions_apporteur_**

**_Réponse Partenaire_**

**_formations_actives, reversements_nets (JAMAIS commission_forges_pct)_**

**_RM-130_**

**_Réponse Apporteur_**

**_commissions_en_attente, historique_reversements_**

**_RM-148_**

**_UCS11 / UCS12 - Espace Apprenant / Espace Organisation · Acteur : Apprenant / Organisation · RMs : RM-26,27,102,103_**

**_Endpoints API_**

**_Méth._**

**_Route_**

**_Rôle requis_**

**_Description_**

**_GET_**

**_/api/apprenant/dossiers_**

**_APPRENANT_**

**_Mes inscriptions_**

**_GET_**

**_/api/apprenant/attestations/:id_**

**_APPRENANT_**

**_PDF si dossier PAYE + session CLOTUREE (RM-26)_**

**_GET_**

**_/api/apprenant/formations-demande_**

**_APPRENANT_**

**_Accès formations à la demande actives_**

**_GET_**

**_/api/organisation/beneficiaires_**

**_ORGANISATION_**

**_Liste dossiers B2B_**

**_POST_**

**_/api/organisation/import-csv_**

**_ORGANISATION_**

**_Import bénéficiaires en masse_**

**_GET_**

**_/api/organisation/rapport-pdf_**

**_ORGANISATION_**

**_Rapport bailleur PDF < 10s_**

**_DTOs & Validation_**

**_DTO_**

**_Champ / Règle_**

**_RM_**

**_ImportCSVDto_**

**_file: multipart/form-data (csv, max 5Mo RM-49)_**

**_RM-49_**

**_Règle attestation_**

**_Lien PDF signé 24h (RM-26) · Condition: dossier.statut=PAYE ET session.statut=CLOTUREE_**

**_RM-26_**

**_UCS15/UCS16 - Bot Conseiller · Acteur : Apprenant / Organisation · RMs : RM-115→125_**

**_Endpoints API_**

**_Méth._**

**_Route_**

**_Rôle requis_**

**_Description_**

**_POST_**

**_/api/bot/session_**

**_Auth_**

**_Démarrage session bot + détermination flux_**

**_POST_**

**_/api/bot/session/:id/repondre_**

**_Auth_**

**_Réponse à une question fermée_**

**_GET_**

**_/api/bot/session/:id_**

**_Auth_**

**_État courant du flux bot_**

**_DTOs & Validation_**

**_DTO_**

**_Champ / Règle_**

**_RM_**

**_BotReponseDto_**

**_choix: string (réponse fermée obligatoire - JAMAIS texte libre)_**

**_RM-118_**

**_Flux bot_**

**_ORIENTATION | UPGRADE | FEEDBACK | ENQUETE | IDLE | COMPLETION_PROFIL_**

**_EnqueteDto_**

**_domaine: enum (liste fermée), niveau: enum, volume_estime: enum (RM-123)_**

**_RM-123_**

**_UCS17/UCS18 - Partenaires Fournisseurs · Acteur : Partenaire / Responsable · RMs : RM-126→138_**

**_Endpoints API_**

**_Méth._**

**_Route_**

**_Rôle requis_**

**_Description_**

**_POST_**

**_/api/partenaires/:id/formations_**

**_PARTENAIRE_**

**_Soumission formation (21 champs, SANS type_formation)_**

**_PUT_**

**_/api/responsable/formations/:id/valider_**

**_RESPONSABLE_**

**_Validation + assignation type (RM-127)_**

**_PUT_**

**_/api/responsable/formations/:id/rejeter_**

**_RESPONSABLE_**

**_Rejet avec motif + corrections (RM-128)_**

**_GET_**

**_/api/partenaire/formations_**

**_PARTENAIRE_**

**_Mes formations + reversements nets_**

**_GET_**

**_/api/partenaire/commissions_**

**_PARTENAIRE_**

**_Historique reversements (JAMAIS commission_forges_pct)_**

**_DTOs & Validation_**

**_DTO_**

**_Champ / Règle_**

**_RM_**

**_SoumettreFormationPartenaireDto_**

**_21 champs dont titre, description, tarif_propose, duree_**

**_RM-136_**

**_SoumettreFormationPartenaireDto_**

**_ABSENT: type_formation (interdit côté Partenaire)_**

**_RM-136_**

**_ValiderFormationDto_**

**_type_formation: STANDARD|PREMIUM|SUR_DEVIS, prix_coutant_valide: number_**

**_RM-127_**

**_RejeterFormationDto_**

**_motif_rejet: string (obligatoire), corrections_suggerees: string_**

**_RM-128_**

**_UCS19/UCS20 - Apporteurs d'Affaires · Acteur : Apporteur / Admin / Superviseur · RMs : RM-141→148_**

**_Endpoints API_**

**_Méth._**

**_Route_**

**_Rôle requis_**

**_Description_**

**_GET_**

**_/api/vouchers/apporteur/:code/check_**

**_Public_**

**_Vérification code apporteur (RM-143)_**

**_GET_**

**_/api/apporteur/commissions_**

**_APPORTEUR_**

**_Dashboard commissions + solde (RM-148)_**

**_GET_**

**_/api/apporteur/commissions/export/pdf_**

**_APPORTEUR_**

**_Relevé mensuel PDF_**

**_GET_**

**_/api/backoffice/apporteurs_**

**_ADMIN|SUPERVISEUR_**

**_Gestion apporteurs + reversements_**

**_DTOs & Validation_**

**_DTO_**

**_Champ / Règle_**

**_RM_**

**_Règle code_**

**_code_apporteur = UUID v4 permanent (RM-141,142) - JAMAIS modifiable_**

**_RM-142_**

**_Règle cumul_**

**_code_apporteur + voucher_code = INTERDIT (RM-144)_**

**_RM-144_**

**_Règle seuil_**

**_Reversement déclenché si cumul ≥ 5 000 XOF (RM-147)_**

**_RM-147_**

**_Règle commission_**

**_montant_commission = montant_paiement × taux_apporteur/100 (RM-145)_**

**_RM-145_**

**_MOD-15 - Abonnements Retail · Acteur : Apprenant · RMs : RM-50→103_**

**_Endpoints API_**

**_Méth._**

**_Route_**

**_Rôle requis_**

**_Description_**

**_POST_**

**_/api/abonnements/retail/souscrire_**

**_APPRENANT_**

**_Souscription Essentiel ou Premium_**

**_PUT_**

**_/api/abonnements/retail/downgrade_**

**_APPRENANT_**

**_Downgrade planifié fin de période (RM-66→79)_**

**_GET_**

**_/api/abonnements/retail/statut_**

**_APPRENANT_**

**_Statut abonnement courant_**

**_DTOs & Validation_**

**_DTO_**

**_Champ / Règle_**

**_RM_**

**_SouscrireRetailDto_**

**_offre: enum ESSENTIEL|PREMIUM_**

**_RM-50→65_**

**_DowngradeDto_**

**_offre_cible: enum ESSENTIEL (depuis PREMIUM)_**

**_RM-66→79_**

**_Règle réduction_**

**_Abonné actif → -15% sur tarif catalogue (RM-88)_**

**_RM-88_**

**_Règle inclus_**

**_inclus_abonnement=true → accès direct sans paiement supplémentaire (RM-102)_**

**_RM-102_**

**_MATRICE RBAC RAPIDE - Qui peut appeler quoi ?_**

**_Endpoint_**

**_Rôle(s) requis_**

**_UCS_**

**_POST /api/apprenants/register_**

**_Public_**

**_UCS00_**

**_POST /api/auth/login_**

**_Public_**

**_UCS01_**

**_POST /api/admin/users_**

**_ADMIN_**

**_UCS02_**

**_POST /api/admin/partenaires_**

**_ADMIN_**

**_UCS02_**

**_POST /api/admin/apporteurs_**

**_ADMIN_**

**_UCS02_**

**_POST /api/backoffice/formations_**

**_ADMIN | RESPONSABLE_**

**_UCS04_**

**_PUT /api/responsable/formations/:id/valider_**

**_RESPONSABLE (désigné)_**

**_UCS04/UCS18_**

**_POST /api/backoffice/sessions_**

**_SUPERVISEUR_**

**_UCS05_**

**_POST /api/backoffice/vouchers_**

**_AGENT_**

**_UCS06_**

**_PUT /api/superviseur/vouchers/:id/valider_**

**_SUPERVISEUR_**

**_UCS06_**

**_POST /api/sessions/:id/inscrire_**

**_APPRENANT_**

**_UCS07_**

**_PUT /api/backoffice/dossiers/:id/decision_**

**_RESPONSABLE (désigné)_**

**_UCS08_**

**_POST /api/paiements/initier_**

**_APPRENANT | ORGANISATION_**

**_UCS09_**

**_POST /api/webhooks/paiement_**

**_Système (webhook)_**

**_UCS09_**

**_GET /api/dashboard_**

**_Tous (filtré par rôle JWT)_**

**_UCS10_**

**_GET /api/apprenant/attestations/:id_**

**_APPRENANT_**

**_UCS11_**

**_GET /api/organisation/rapport-pdf_**

**_ORGANISATION_**

**_UCS12_**

**_POST /api/bot/session_**

**_APPRENANT | ORGANISATION_**

**_UCS15/16_**

**_POST /api/partenaires/:id/formations_**

**_PARTENAIRE_**

**_UCS17_**

**_GET /api/vouchers/apporteur/:code/check_**

**_Public_**

**_UCS19_**

**_GET /api/apporteur/commissions_**

**_APPORTEUR_**

**_UCS20_**

**_POST /api/abonnements/retail/souscrire_**

**_APPRENANT_**

**_MOD-15_**