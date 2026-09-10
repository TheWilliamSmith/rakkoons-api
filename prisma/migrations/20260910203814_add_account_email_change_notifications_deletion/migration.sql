-- AlterEnum
ALTER TYPE "verification_purpose" ADD VALUE 'EMAIL_CHANGE';

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "deletion_scheduled_at" TIMESTAMP(3),
ADD COLUMN     "notifies_product" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifies_reminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifies_security" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pending_email" CITEXT;

-- CreateIndex
CREATE INDEX "accounts_deletion_scheduled_at_idx" ON "accounts"("deletion_scheduled_at");
