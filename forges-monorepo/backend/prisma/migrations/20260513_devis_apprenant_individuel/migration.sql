-- AlterTable
ALTER TABLE "devis"
  ALTER COLUMN "organisation_id" DROP NOT NULL,
  ADD COLUMN "destinataire_nom" TEXT,
  ADD COLUMN "destinataire_email" TEXT,
  ADD COLUMN "destinataire_organisation" TEXT;
