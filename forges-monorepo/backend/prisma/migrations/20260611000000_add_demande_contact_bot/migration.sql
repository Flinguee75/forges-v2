-- CreateTable
CREATE TABLE "DemandeContactBot" (
    "id" TEXT NOT NULL,
    "utilisateur_id" TEXT NOT NULL,
    "type_utilisateur" TEXT NOT NULL,
    "organisation_id" TEXT,
    "session_bot_id" TEXT,
    "motif" TEXT NOT NULL,
    "commentaire" VARCHAR(500),
    "statut" TEXT NOT NULL DEFAULT 'NOUVELLE',
    "date_saisie" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandeContactBot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemandeContactBot_organisation_id_idx" ON "DemandeContactBot"("organisation_id");

-- CreateIndex
CREATE INDEX "DemandeContactBot_statut_idx" ON "DemandeContactBot"("statut");

-- CreateIndex
CREATE INDEX "DemandeContactBot_date_saisie_idx" ON "DemandeContactBot"("date_saisie");

-- AddForeignKey
ALTER TABLE "DemandeContactBot" ADD CONSTRAINT "DemandeContactBot_organisation_id_fkey"
    FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
