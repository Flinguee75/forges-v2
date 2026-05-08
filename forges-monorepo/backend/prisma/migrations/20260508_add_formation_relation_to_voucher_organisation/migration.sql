ALTER TABLE "VoucherOrganisation"
  ADD CONSTRAINT "VoucherOrganisation_formation_id_fkey"
  FOREIGN KEY ("formation_id") REFERENCES "Formation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
