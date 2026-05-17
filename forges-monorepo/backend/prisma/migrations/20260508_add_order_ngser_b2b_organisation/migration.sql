-- Migration: ajouter order_ngser sur AbonnementB2B et AbonnementOrganisation
-- Ces champs existent dans schema.prisma mais etaient absents des migrations

ALTER TABLE "AbonnementB2B"
  ADD COLUMN IF NOT EXISTS "order_ngser" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AbonnementB2B_order_ngser_key"
  ON "AbonnementB2B"("order_ngser");

ALTER TABLE "AbonnementOrganisation"
  ADD COLUMN IF NOT EXISTS "order_ngser" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AbonnementOrganisation_order_ngser_key"
  ON "AbonnementOrganisation"("order_ngser");

ALTER TABLE "AbonnementB2B"
  ADD COLUMN IF NOT EXISTS "transaction_id_ngser" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AbonnementB2B_transaction_id_ngser_key"
  ON "AbonnementB2B"("transaction_id_ngser");

ALTER TABLE "AbonnementOrganisation"
  ADD COLUMN IF NOT EXISTS "transaction_id_ngser" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AbonnementOrganisation_transaction_id_ngser_key"
  ON "AbonnementOrganisation"("transaction_id_ngser");
