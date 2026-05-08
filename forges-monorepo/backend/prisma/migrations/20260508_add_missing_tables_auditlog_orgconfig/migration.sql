-- Migration: tables manquantes AuditLog et OrganisationConfig

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"        TEXT NOT NULL,
  "level"     TEXT NOT NULL,
  "action"    TEXT NOT NULL,
  "metadata"  JSONB,
  "hmac"      TEXT,
  "user_id"   TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_action_idx"    ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
CREATE INDEX IF NOT EXISTS "AuditLog_level_idx"     ON "AuditLog"("level");

CREATE TABLE IF NOT EXISTS "OrganisationConfig" (
  "id"                    TEXT NOT NULL,
  "organisation_id"       TEXT NOT NULL,
  "commission_forges_pct" INTEGER,
  "seuil_reversement_xof" INTEGER,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganisationConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganisationConfig_organisation_id_key"
  ON "OrganisationConfig"("organisation_id");

ALTER TABLE "OrganisationConfig"
  ADD CONSTRAINT "OrganisationConfig_organisation_id_fkey"
  FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;
