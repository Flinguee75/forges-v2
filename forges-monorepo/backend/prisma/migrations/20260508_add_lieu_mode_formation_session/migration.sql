-- Ajout du champ lieu sur Formation (nullable, non bloquant)
ALTER TABLE "Formation" ADD COLUMN IF NOT EXISTS "lieu" TEXT;

-- Ajout du champ lieu sur Session (nullable, non bloquant)
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "lieu" TEXT;

-- Ajout des valeurs PRESENTIEL et EN_LIGNE à l'enum ModeFormation
ALTER TYPE "ModeFormation" ADD VALUE IF NOT EXISTS 'PRESENTIEL';
ALTER TYPE "ModeFormation" ADD VALUE IF NOT EXISTS 'EN_LIGNE';
