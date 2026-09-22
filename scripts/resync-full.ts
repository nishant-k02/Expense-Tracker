// One-off maintenance script: resets every Item's Plaid sync cursor to null and
// re-runs a full sync. Useful after a categorization logic change (like this one)
// since it re-fetches personal_finance_category detail for already-synced
// transactions without creating duplicates (upserts are keyed on plaidTransactionId,
// and manually recategorized transactions are protected by categoryOverridden).
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { syncAllItems } = await import("../src/lib/plaid-sync");

  await prisma.item.updateMany({ data: { cursor: null } });
  console.log("Cleared sync cursors for all items. Re-syncing...");

  await syncAllItems();
  console.log("Full resync complete.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
