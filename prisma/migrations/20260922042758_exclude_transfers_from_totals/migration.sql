-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "excludeFromTotals" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "plaidCategoryDetailed" TEXT;
