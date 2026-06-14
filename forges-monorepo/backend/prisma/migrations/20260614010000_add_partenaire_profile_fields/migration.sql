-- Add editable profile fields to Partenaire
ALTER TABLE "Partenaire" ADD COLUMN "site_web"    TEXT;
ALTER TABLE "Partenaire" ADD COLUMN "telephone"   TEXT;
ALTER TABLE "Partenaire" ADD COLUMN "description" TEXT;
