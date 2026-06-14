-- Migration: add competences_acquises, outils, chapitres to Formation
ALTER TABLE "Formation" ADD COLUMN IF NOT EXISTS "competences_acquises" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Formation" ADD COLUMN IF NOT EXISTS "outils" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Formation" ADD COLUMN IF NOT EXISTS "chapitres" JSONB;
