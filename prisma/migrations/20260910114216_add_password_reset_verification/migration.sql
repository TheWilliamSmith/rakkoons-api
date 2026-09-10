-- AlterTable
ALTER TABLE "verification_journeys" ADD COLUMN     "verified_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "verification_journeys_account_id_purpose_consumed_at_idx" ON "verification_journeys"("account_id", "purpose", "consumed_at");
