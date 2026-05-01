-- CreateEnum
CREATE TYPE "StatutDevis" AS ENUM ('CREE', 'PAYE', 'ANNULE');

-- AlterTable
ALTER TABLE "Paiement" ADD COLUMN     "code_ngser" TEXT,
ADD COLUMN     "montant_initie" INTEGER,
ADD COLUMN     "ngser_payload_last" JSONB,
ADD COLUMN     "order_ngser" TEXT,
ADD COLUMN     "payment_token_ngser" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "reconciled_at" TIMESTAMP(3),
ADD COLUMN     "status_ngser" TEXT,
ADD COLUMN     "wallet_ngser" TEXT;

-- AlterTable
ALTER TABLE "Partenaire" ALTER COLUMN "commission_forges_pct" SET DEFAULT 30;

-- CreateTable
CREATE TABLE "devis" (
    "id" TEXT NOT NULL,
    "numero_devis" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "formation_id" TEXT NOT NULL,
    "session_id" TEXT,
    "nb_places" INTEGER NOT NULL,
    "tarif_unitaire_xof" INTEGER NOT NULL,
    "montant_total_xof" INTEGER NOT NULL,
    "statut" "StatutDevis" NOT NULL DEFAULT 'CREE',
    "notes_admin" TEXT,
    "paid_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devis_numero_devis_key" ON "devis"("numero_devis");

-- CreateIndex
CREATE INDEX "devis_organisation_id_idx" ON "devis"("organisation_id");

-- CreateIndex
CREATE INDEX "devis_formation_id_idx" ON "devis"("formation_id");

-- CreateIndex
CREATE INDEX "devis_session_id_idx" ON "devis"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_transaction_id_key" ON "Paiement"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_order_ngser_key" ON "Paiement"("order_ngser");

