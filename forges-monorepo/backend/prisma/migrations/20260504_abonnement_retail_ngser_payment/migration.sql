-- Migration: AbonnementRetail NGSER payment fields
-- Connects retail subscription souscription to NGSER payment aggregator

ALTER TABLE "AbonnementRetail"
  ADD COLUMN IF NOT EXISTS "order_ngser"        TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "transaction_id_ngser" TEXT UNIQUE;

-- Abonnements créés avant cette migration restent ACTIF (rétrocompatibilité).
-- Les nouvelles souscriptions démarrent en EN_ATTENTE_PAIEMENT, passent à ACTIF après IPN SUCCESS.
