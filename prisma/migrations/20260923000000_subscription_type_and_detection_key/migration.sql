-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'subscription';
ALTER TABLE "Subscription" ADD COLUMN "detectionKey" TEXT;

-- DropIndex
DROP INDEX "Subscription_accountId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_accountId_detectionKey_key" ON "Subscription"("accountId", "detectionKey");
