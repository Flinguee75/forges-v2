-- CreateEnum
CREATE TYPE "TypeApprenant" AS ENUM ('PROFESSIONNEL', 'APPRENANT');

-- CreateEnum
CREATE TYPE "Langue" AS ENUM ('FR', 'EN', 'ES', 'PT');

-- CreateEnum
CREATE TYPE "StatutUtilisateur" AS ENUM ('ACTIF', 'INACTIF', 'SUSPENDU');

-- CreateEnum
CREATE TYPE "RoleUtilisateur" AS ENUM ('ADMIN', 'SUPERVISEUR', 'RESPONSABLE', 'AGENT', 'APPRENANT', 'ORGANISATION', 'GESTIONNAIRE', 'PARTENAIRE', 'APPORTEUR');

-- CreateEnum
CREATE TYPE "TypeOrganisation" AS ENUM ('ENTREPRISE', 'ASSOCIATION', 'GOUVERNEMENT', 'UNIVERSITE', 'ONG', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutOrganisation" AS ENUM ('EN_ATTENTE', 'ACTIF', 'SUSPENDU', 'RESILIE');

-- CreateEnum
CREATE TYPE "TypeFormation" AS ENUM ('STANDARD', 'PREMIUM', 'SUR_DEVIS');

-- CreateEnum
CREATE TYPE "ModeFormation" AS ENUM ('AVEC_SESSION', 'A_LA_DEMANDE');

-- CreateEnum
CREATE TYPE "PilierAbonnement" AS ENUM ('RETAIL', 'B2B', 'INSTITUTIONNEL', 'TOUS');

-- CreateEnum
CREATE TYPE "StatutFormation" AS ENUM ('BROUILLON', 'EN_ATTENTE_PLANIFICATION', 'EN_ATTENTE_VALIDATION', 'ACTIVE', 'ARCHIVEE', 'REJETEE', 'SUSPENDUE');

-- CreateEnum
CREATE TYPE "StatutSession" AS ENUM ('PLANIFIEE', 'A_VENIR', 'INSCRIPTIONS_OUVERTES', 'EN_COURS', 'CLOTUREE', 'ARCHIVEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "StatutDossier" AS ENUM ('EN_ATTENTE_VERIFICATION', 'RETENU', 'PAYE_DIRECTEMENT', 'PAYE', 'REJETE', 'ANNULE');

-- CreateEnum
CREATE TYPE "SourceFinancement" AS ENUM ('RETAIL', 'B2B', 'INSTITUTIONNEL', 'ABONNEMENT', 'VOUCHER');

-- CreateEnum
CREATE TYPE "TypeFenetre" AS ENUM ('NORMAL', 'GRIS', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "MethodePaiement" AS ENUM ('MOBILE_MONEY', 'CARTE', 'VIREMENT', 'VOUCHER_ORG');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('EN_ATTENTE', 'CONFIRME', 'ECHEC', 'ECHOUE', 'ANNULE');

-- CreateEnum
CREATE TYPE "TypePartenaire" AS ENUM ('UNIVERSITE', 'ORGANISME', 'ENTREPRISE_CERTIFIANTE', 'ENTREPRISE_FORMATION', 'ONG', 'INSTITUTION', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutPartenaire" AS ENUM ('INVITE', 'EN_ATTENTE_VERIFICATION', 'ACTIF', 'SUSPENDU', 'RESILIE');

-- CreateEnum
CREATE TYPE "ModeInscriptionPartenaire" AS ENUM ('INVITATION', 'INVITATION_ADMIN', 'AUTO_INSCRIPTION');

-- CreateEnum
CREATE TYPE "StatutValidationPartenaire" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'VALIDE', 'REJETEE', 'REJETE', 'SUSPENDUE');

-- CreateEnum
CREATE TYPE "TypeApporteur" AS ENUM ('INDIVIDU', 'ORGANISATION');

-- CreateEnum
CREATE TYPE "StatutApporteur" AS ENUM ('ACTIF', 'SUSPENDU', 'RESILIE');

-- CreateEnum
CREATE TYPE "TypeVoucherApporteur" AS ENUM ('APPORT', 'PROMOTIONNEL');

-- CreateEnum
CREATE TYPE "TypeValeurVoucher" AS ENUM ('MONTANT', 'POURCENTAGE');

-- CreateEnum
CREATE TYPE "StatutVoucherApporteur" AS ENUM ('BROUILLON', 'ACTIF', 'SUSPENDU', 'REFUSE', 'EXPIRE', 'EPUISE');

-- CreateEnum
CREATE TYPE "StatutCommissionApporteur" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'REVERSEE', 'BLOQUEE');

-- CreateEnum
CREATE TYPE "StatutCommissionPartenaire" AS ENUM ('EN_ATTENTE', 'REVERSE', 'BLOQUEE');

-- CreateEnum
CREATE TYPE "OffreRetail" AS ENUM ('ESSENTIEL', 'PREMIUM');

-- CreateEnum
CREATE TYPE "PalierB2B" AS ENUM ('STARTER', 'BUSINESS', 'ENTERPRISE', 'SUR_DEVIS');

-- CreateEnum
CREATE TYPE "OffreOrganisation" AS ENUM ('BASIQUE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "StatutAbonnement" AS ENUM ('ACTIF', 'GRACE', 'SUSPENDU', 'EN_RESILIATION', 'EXPIRE', 'RESILIE', 'ESSAI');

-- CreateEnum
CREATE TYPE "StatutContrat" AS ENUM ('ACTIF', 'EXPIRE', 'RESILIE');

-- CreateEnum
CREATE TYPE "TypeUtilisateurBot" AS ENUM ('APPRENANT', 'ORGANISATION');

-- CreateEnum
CREATE TYPE "FluxBot" AS ENUM ('ORIENTATION', 'UPGRADE', 'FEEDBACK', 'ENQUETE', 'IDLE', 'COMPLETION_PROFIL');

-- CreateEnum
CREATE TYPE "StatutConversation" AS ENUM ('ACTIVE', 'EN_COURS', 'TERMINEE', 'ABANDONNEE');

-- CreateEnum
CREATE TYPE "DomaineEnquete" AS ENUM ('IT', 'FINANCE', 'SANTE', 'DROIT', 'MANAGEMENT', 'IA', 'CYBERSECURITE', 'AUTRE');

-- CreateEnum
CREATE TYPE "NiveauEnquete" AS ENUM ('DEBUTANT', 'INTERMEDIAIRE', 'AVANCE', 'EXPERT');

-- CreateEnum
CREATE TYPE "VolumeEnquete" AS ENUM ('V1_5', 'V6_20', 'V21_50', 'V51_PLUS');

-- CreateEnum
CREATE TYPE "StatutEnquete" AS ENUM ('NOUVEAU', 'TRAITE', 'IGNORE');

-- CreateEnum
CREATE TYPE "CanalFeedback" AS ENUM ('BOT', 'MANUEL');

-- CreateTable
CREATE TABLE "Apprenant" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenoms" TEXT NOT NULL,
    "type_apprenant" TEXT NOT NULL,
    "secteur_activite" TEXT,
    "niveau_etude" TEXT,
    "pays_residence" TEXT NOT NULL,
    "pays_nationalite" TEXT NOT NULL,
    "langue_preferee" TEXT NOT NULL DEFAULT 'FR',
    "role" "RoleUtilisateur" NOT NULL DEFAULT 'APPRENANT',
    "statut" TEXT NOT NULL DEFAULT 'INACTIF',
    "consentement_rgpd" BOOLEAN NOT NULL DEFAULT false,
    "consentement_timestamp" TIMESTAMP(3),
    "consentement_version_cgu" TEXT,
    "token_confirmation" TEXT,
    "token_expiration" TIMESTAMP(3),
    "suspension_count" INTEGER NOT NULL DEFAULT 0,
    "last_suspension_at" TIMESTAMP(3),
    "upgrade_refus_count" INTEGER NOT NULL DEFAULT 0,
    "last_upgrade_refus_at" TIMESTAMP(3),
    "organisation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Apprenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "raison_sociale" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sous_types" TEXT[],
    "identifiant_legal" TEXT,
    "contact_referent" TEXT NOT NULL,
    "pays" TEXT NOT NULL,
    "langue_preferee" TEXT NOT NULL DEFAULT 'FR',
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "token_confirmation" TEXT,
    "token_expiration" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "abonnement_org_id" TEXT,
    "abonnement_b2b_id" TEXT,
    "apporteur_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_fin_essai" TIMESTAMP(3),

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "description_courte" VARCHAR(500) NOT NULL,
    "description_longue" TEXT,
    "duree_jours" INTEGER NOT NULL,
    "cout_catalogue" INTEGER NOT NULL,
    "responsable_id" TEXT NOT NULL,
    "type_formation" TEXT NOT NULL,
    "mode_formation" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "inclus_abonnement" BOOLEAN NOT NULL DEFAULT false,
    "pilier_abonnement" TEXT,
    "duree_acces_jours" INTEGER NOT NULL DEFAULT 365,
    "prix_coutant" INTEGER,
    "prerequis" TEXT,
    "objectifs_pedagogiques" TEXT[],
    "certification_delivree" BOOLEAN NOT NULL DEFAULT false,
    "public_cible" TEXT,
    "partenaire_id" TEXT,
    "langues_disponibles" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccesFormationDemande" (
    "id" TEXT NOT NULL,
    "apprenant_id" TEXT NOT NULL,
    "formation_id" TEXT NOT NULL,
    "source_financement" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "date_activation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_expiration" TIMESTAMP(3) NOT NULL,
    "progression" INTEGER NOT NULL DEFAULT 0,
    "last_access_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccesFormationDemande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "formation_id" TEXT NOT NULL,
    "date_ouverture" TIMESTAMP(3) NOT NULL,
    "date_cloture" TIMESTAMP(3) NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "capacite" INTEGER NOT NULL,
    "nb_inscrits" INTEGER NOT NULL DEFAULT 0,
    "places_restantes" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'PLANIFIEE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL,
    "apprenant_id" TEXT NOT NULL,
    "formation_id" TEXT NOT NULL,
    "session_id" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE_VERIFICATION',
    "source_financement" TEXT NOT NULL,
    "type_fenetre" "TypeFenetre" NOT NULL DEFAULT 'NORMAL',
    "voucher_code" TEXT,
    "code_apporteur" TEXT,
    "montant_remise" INTEGER NOT NULL DEFAULT 0,
    "motif_refus" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "voucher_organisation_id" TEXT,

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "dossier_id" TEXT NOT NULL,
    "montant_catalogue" INTEGER NOT NULL,
    "montant_final" INTEGER,
    "methode" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "transaction_id" TEXT,
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "reduction_appliquee" INTEGER NOT NULL DEFAULT 0,
    "commission_partenaire_pct" DOUBLE PRECISION,
    "montant_reverse_partenaire" INTEGER,
    "code_apporteur_id" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partenaire" (
    "id" TEXT NOT NULL,
    "raison_sociale" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pays" TEXT NOT NULL,
    "email_principal" TEXT NOT NULL,
    "password_hash" TEXT,
    "commission_forges_pct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE_VERIFICATION',
    "mode_inscription" TEXT NOT NULL,
    "token_invitation" TEXT,
    "token_invitation_expiration" TIMESTAMP(3),
    "responsable_designe_id" TEXT,
    "seuil_reversement_personnalise" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partenaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormationPartenaire" (
    "id" TEXT NOT NULL,
    "formation_id" TEXT NOT NULL,
    "partenaire_id" TEXT NOT NULL,
    "responsable_validateur_id" TEXT,
    "statut_validation" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "prix_coutant_soumis" INTEGER NOT NULL,
    "prix_coutant_valide" INTEGER,
    "commentaire_responsable" TEXT,
    "corrections_suggeres" TEXT,
    "date_soumission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_validation" TIMESTAMP(3),
    "type_formation_assigne" TEXT,
    "pilier_abonnement_assigne" TEXT,
    "inclus_abonnement" BOOLEAN NOT NULL DEFAULT false,
    "duree_mois" INTEGER,

    CONSTRAINT "FormationPartenaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionPartenaireAbonnement" (
    "id" TEXT NOT NULL,
    "partenaire_id" TEXT NOT NULL,
    "formation_id" TEXT NOT NULL,
    "nb_apprenants_actifs" INTEGER NOT NULL,
    "montant_reverse" INTEGER NOT NULL,
    "mois_reference" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "reverse_par" TEXT,
    "reverse_le" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionPartenaireAbonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apporteur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "telephone" TEXT,
    "pays" TEXT,
    "code_apporteur" TEXT NOT NULL,
    "taux_commission_pct" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "organisation_id" TEXT,
    "date_inscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cumul_commissions_dues" INTEGER NOT NULL DEFAULT 0,
    "cumul_commissions_versees" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Apporteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherApporteur" (
    "id" TEXT NOT NULL,
    "apporteur_id" TEXT,
    "code" TEXT NOT NULL,
    "formation_id" TEXT,
    "organisation_id" TEXT,
    "type" "TypeVoucherApporteur" NOT NULL DEFAULT 'APPORT',
    "valeur" INTEGER,
    "type_valeur" "TypeValeurVoucher",
    "quota_max" INTEGER NOT NULL DEFAULT 1,
    "quota_utilise" INTEGER NOT NULL DEFAULT 0,
    "date_expiration" TIMESTAMP(3),
    "cree_par" TEXT,
    "valide_par" TEXT,
    "valide_le" TIMESTAMP(3),
    "motif_refus" TEXT,
    "statut" "StatutVoucherApporteur" NOT NULL DEFAULT 'ACTIF',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nb_utilisations" INTEGER NOT NULL DEFAULT 0,
    "date_derniere_utilisation" TIMESTAMP(3),

    CONSTRAINT "VoucherApporteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherOrganisation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "formation_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'ORGANISATION',
    "valeur" INTEGER,
    "type_valeur" TEXT,
    "quota_max" INTEGER NOT NULL DEFAULT 1,
    "quota_utilise" INTEGER NOT NULL DEFAULT 0,
    "date_expiration" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nb_utilisations" INTEGER NOT NULL DEFAULT 0,
    "date_derniere_utilisation" TIMESTAMP(3),

    CONSTRAINT "VoucherOrganisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionApporteur" (
    "id" TEXT NOT NULL,
    "apporteur_id" TEXT NOT NULL,
    "paiement_id" TEXT NOT NULL,
    "dossier_id" TEXT,
    "montant_base" INTEGER,
    "montant_base_xof" INTEGER,
    "taux_commission_pct" DOUBLE PRECISION NOT NULL,
    "montant_commission" INTEGER,
    "montant_commission_xof" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_generation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mois_facturation" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "reverse_par" TEXT,
    "reverse_le" TIMESTAMP(3),

    CONSTRAINT "CommissionApporteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbonnementRetail" (
    "id" TEXT NOT NULL,
    "apprenant_id" TEXT NOT NULL,
    "offre" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "montant_mensuel" INTEGER NOT NULL,
    "methode_paiement" TEXT,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "consentement_auto" BOOLEAN NOT NULL DEFAULT true,
    "consentement_timestamp" TIMESTAMP(3),
    "renouvellement_auto" BOOLEAN NOT NULL DEFAULT true,
    "nb_formations_actives" INTEGER NOT NULL DEFAULT 0,
    "downgrade_planifie" TEXT,
    "date_grace" TIMESTAMP(3),
    "date_suspension" TIMESTAMP(3),
    "montant_premier_mois" INTEGER,
    "prorata_premier_mois" INTEGER,
    "suspension_count" INTEGER NOT NULL DEFAULT 0,
    "last_suspension_at" TIMESTAMP(3),

    CONSTRAINT "AbonnementRetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbonnementB2B" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "palier" TEXT NOT NULL,
    "nb_max" INTEGER NOT NULL,
    "nb_actifs" INTEGER NOT NULL DEFAULT 0,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "prix_annuel" INTEGER NOT NULL,
    "premium_inclus_par_an" INTEGER,
    "premium_consommes" INTEGER NOT NULL DEFAULT 0,
    "date_renouvellement" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "compteur_premium_used" INTEGER NOT NULL DEFAULT 0,
    "compteur_premium_reset_at" TIMESTAMP(3),
    "descente_planifiee" BOOLEAN NOT NULL DEFAULT false,
    "palier_descente_cible" TEXT,

    CONSTRAINT "AbonnementB2B_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbonnementOrganisation" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "offre" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "montant_annuel" INTEGER NOT NULL,
    "perimetre_fonctionnel" TEXT[],
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "renouvellement_auto" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AbonnementOrganisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratInstitutionnel" (
    "id" TEXT NOT NULL,
    "numero_contrat" TEXT NOT NULL,
    "institution_nom" TEXT NOT NULL,
    "programme_id" TEXT NOT NULL,
    "bailleur" TEXT,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "montant_saas_annuel" INTEGER NOT NULL,
    "fee_par_certifie" INTEGER NOT NULL,
    "seuil_facturation_fees" INTEGER NOT NULL DEFAULT 25000,
    "cumul_fees_reportes" INTEGER NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "gestionnaires_ids" TEXT[],
    "avenants" JSONB[],

    CONSTRAINT "ContratInstitutionnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationBot" (
    "id" TEXT NOT NULL,
    "utilisateur_id" TEXT,
    "apprenant_id" TEXT,
    "organisation_id" TEXT,
    "type_utilisateur" TEXT NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_fin" TIMESTAMP(3),
    "flux_actif" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ACTIVE',
    "historique" JSONB,
    "historique_json" JSONB,
    "dernier_refus_upgrade_le" TIMESTAMP(3),
    "nb_refus_upgrade" INTEGER NOT NULL DEFAULT 0,
    "actions_declenchees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "langue" TEXT NOT NULL DEFAULT 'FR',
    "refus_upgrade_dates" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],

    CONSTRAINT "ConversationBot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnqueteCatalogue" (
    "id" TEXT NOT NULL,
    "utilisateur_id" TEXT,
    "type_utilisateur" TEXT,
    "session_bot_id" TEXT,
    "source_type" TEXT,
    "source_id" TEXT,
    "domaine" TEXT NOT NULL,
    "niveau" TEXT,
    "niveau_cible" TEXT,
    "volume" TEXT,
    "volume_estime" TEXT,
    "frequence" INTEGER NOT NULL DEFAULT 1,
    "frequence_demande" INTEGER NOT NULL DEFAULT 1,
    "statut" TEXT NOT NULL DEFAULT 'NOUVEAU',
    "commentaire_admin" TEXT,
    "date_saisie" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnqueteCatalogue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackFormation" (
    "id" TEXT NOT NULL,
    "apprenant_id" TEXT,
    "organisation_id" TEXT,
    "formation_id" TEXT NOT NULL,
    "session_id" TEXT,
    "date_saisie" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canal" TEXT NOT NULL DEFAULT 'BOT',
    "note_globale" INTEGER NOT NULL,
    "note_contenu" INTEGER,
    "note_formateur" INTEGER,
    "commentaire" TEXT,
    "commentaire_libre" VARCHAR(500),
    "session_bot_id" TEXT,
    "recommande" BOOLEAN NOT NULL,

    CONSTRAINT "FeedbackFormation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionPartenaire" (
    "id" TEXT NOT NULL,
    "paiement_id" TEXT NOT NULL,
    "partenaire_id" TEXT NOT NULL,
    "formation_id" TEXT NOT NULL,
    "montant_catalogue" INTEGER NOT NULL,
    "commission_forges_pct" DOUBLE PRECISION NOT NULL,
    "montant_reverse" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "reverse_le" TIMESTAMP(3),
    "reverse_par" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionPartenaire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Apprenant_email_key" ON "Apprenant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_email_key" ON "Organisation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_identifiant_legal_type_key" ON "Organisation"("identifiant_legal", "type");

-- CreateIndex
CREATE INDEX "AccesFormationDemande_apprenant_id_statut_idx" ON "AccesFormationDemande"("apprenant_id", "statut");

-- CreateIndex
CREATE INDEX "AccesFormationDemande_formation_id_idx" ON "AccesFormationDemande"("formation_id");

-- CreateIndex
CREATE INDEX "AccesFormationDemande_date_expiration_idx" ON "AccesFormationDemande"("date_expiration");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_dossier_id_key" ON "Paiement"("dossier_id");

-- CreateIndex
CREATE UNIQUE INDEX "Partenaire_email_principal_key" ON "Partenaire"("email_principal");

-- CreateIndex
CREATE UNIQUE INDEX "FormationPartenaire_formation_id_key" ON "FormationPartenaire"("formation_id");

-- CreateIndex
CREATE INDEX "CommissionPartenaireAbonnement_partenaire_id_statut_idx" ON "CommissionPartenaireAbonnement"("partenaire_id", "statut");

-- CreateIndex
CREATE INDEX "CommissionPartenaireAbonnement_mois_reference_idx" ON "CommissionPartenaireAbonnement"("mois_reference");

-- CreateIndex
CREATE UNIQUE INDEX "Apporteur_email_key" ON "Apporteur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Apporteur_code_apporteur_key" ON "Apporteur"("code_apporteur");

-- CreateIndex
CREATE UNIQUE INDEX "VoucherApporteur_apporteur_id_key" ON "VoucherApporteur"("apporteur_id");

-- CreateIndex
CREATE UNIQUE INDEX "VoucherApporteur_code_key" ON "VoucherApporteur"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VoucherOrganisation_code_key" ON "VoucherOrganisation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionApporteur_paiement_id_key" ON "CommissionApporteur"("paiement_id");

-- CreateIndex
CREATE UNIQUE INDEX "AbonnementRetail_apprenant_id_key" ON "AbonnementRetail"("apprenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "AbonnementOrganisation_organisation_id_key" ON "AbonnementOrganisation"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "ContratInstitutionnel_numero_contrat_key" ON "ContratInstitutionnel"("numero_contrat");

-- CreateIndex
CREATE UNIQUE INDEX "ContratInstitutionnel_programme_id_key" ON "ContratInstitutionnel"("programme_id");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionPartenaire_paiement_id_key" ON "CommissionPartenaire"("paiement_id");

-- AddForeignKey
ALTER TABLE "Apprenant" ADD CONSTRAINT "Apprenant_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_abonnement_org_id_fkey" FOREIGN KEY ("abonnement_org_id") REFERENCES "AbonnementOrganisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_abonnement_b2b_id_fkey" FOREIGN KEY ("abonnement_b2b_id") REFERENCES "AbonnementB2B"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_apporteur_id_fkey" FOREIGN KEY ("apporteur_id") REFERENCES "Apporteur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formation" ADD CONSTRAINT "Formation_partenaire_id_fkey" FOREIGN KEY ("partenaire_id") REFERENCES "Partenaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesFormationDemande" ADD CONSTRAINT "AccesFormationDemande_apprenant_id_fkey" FOREIGN KEY ("apprenant_id") REFERENCES "Apprenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesFormationDemande" ADD CONSTRAINT "AccesFormationDemande_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "Formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_apprenant_id_fkey" FOREIGN KEY ("apprenant_id") REFERENCES "Apprenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_voucher_organisation_id_fkey" FOREIGN KEY ("voucher_organisation_id") REFERENCES "VoucherOrganisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "Dossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_code_apporteur_id_fkey" FOREIGN KEY ("code_apporteur_id") REFERENCES "VoucherApporteur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormationPartenaire" ADD CONSTRAINT "FormationPartenaire_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormationPartenaire" ADD CONSTRAINT "FormationPartenaire_partenaire_id_fkey" FOREIGN KEY ("partenaire_id") REFERENCES "Partenaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPartenaireAbonnement" ADD CONSTRAINT "CommissionPartenaireAbonnement_partenaire_id_fkey" FOREIGN KEY ("partenaire_id") REFERENCES "Partenaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPartenaireAbonnement" ADD CONSTRAINT "CommissionPartenaireAbonnement_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "FormationPartenaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherApporteur" ADD CONSTRAINT "VoucherApporteur_apporteur_id_fkey" FOREIGN KEY ("apporteur_id") REFERENCES "Apporteur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherApporteur" ADD CONSTRAINT "VoucherApporteur_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "Formation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionApporteur" ADD CONSTRAINT "CommissionApporteur_apporteur_id_fkey" FOREIGN KEY ("apporteur_id") REFERENCES "Apporteur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionApporteur" ADD CONSTRAINT "CommissionApporteur_paiement_id_fkey" FOREIGN KEY ("paiement_id") REFERENCES "Paiement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbonnementRetail" ADD CONSTRAINT "AbonnementRetail_apprenant_id_fkey" FOREIGN KEY ("apprenant_id") REFERENCES "Apprenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbonnementB2B" ADD CONSTRAINT "AbonnementB2B_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbonnementOrganisation" ADD CONSTRAINT "AbonnementOrganisation_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationBot" ADD CONSTRAINT "ConversationBot_apprenant_id_fkey" FOREIGN KEY ("apprenant_id") REFERENCES "Apprenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackFormation" ADD CONSTRAINT "FeedbackFormation_apprenant_id_fkey" FOREIGN KEY ("apprenant_id") REFERENCES "Apprenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackFormation" ADD CONSTRAINT "FeedbackFormation_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackFormation" ADD CONSTRAINT "FeedbackFormation_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPartenaire" ADD CONSTRAINT "CommissionPartenaire_paiement_id_fkey" FOREIGN KEY ("paiement_id") REFERENCES "Paiement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPartenaire" ADD CONSTRAINT "CommissionPartenaire_partenaire_id_fkey" FOREIGN KEY ("partenaire_id") REFERENCES "Partenaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPartenaire" ADD CONSTRAINT "CommissionPartenaire_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

