-- Migration: ajouter url_externe_chiffree sur Formation (champ present dans schema mais absent des migrations)
ALTER TABLE "Formation" ADD COLUMN IF NOT EXISTS "url_externe_chiffree" TEXT;
