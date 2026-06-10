ALTER TABLE "ConversationBot" ADD COLUMN "contexte" JSONB;

UPDATE "FeedbackFormation"
SET "commentaire_libre" = LEFT("commentaire", 500)
WHERE "commentaire_libre" IS NULL AND "commentaire" IS NOT NULL;

ALTER TABLE "FeedbackFormation" DROP COLUMN "commentaire";

CREATE UNIQUE INDEX "FeedbackFormation_apprenant_id_formation_id_key"
ON "FeedbackFormation"("apprenant_id", "formation_id");

CREATE UNIQUE INDEX "FeedbackFormation_organisation_id_formation_id_key"
ON "FeedbackFormation"("organisation_id", "formation_id");
