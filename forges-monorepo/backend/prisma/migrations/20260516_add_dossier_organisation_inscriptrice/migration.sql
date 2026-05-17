-- Add organisation ownership for B2B dossiers initiated from the organisation space.
ALTER TABLE "Dossier" ADD COLUMN "organisation_inscriptrice_id" TEXT;

ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_organisation_inscriptrice_id_fkey"
  FOREIGN KEY ("organisation_inscriptrice_id") REFERENCES "Organisation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
