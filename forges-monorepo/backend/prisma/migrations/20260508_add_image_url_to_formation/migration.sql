-- Migration: add image_url to Formation
ALTER TABLE "Formation" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
