/**
 * One-time backfill: sets `merchantName` on existing Subscription rows that
 * predate the column (derived from `detectionKey`, or "Robinhood" for the
 * investment row), then runs a sync so the new merchantName-driven
 * categorization immediately catches up on any transactions that posted
 * after the last manual fix instead of waiting for the next natural page
 * load or cron run. Idempotent — safe to re-run.
 *
 * Run against production:
 *   vercel env pull .env.production.local --environment=production --yes
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.production.local | cut -d'=' -f2- | tr -d '"') \
 *     npx tsx scripts/backfill-subscription-merchant-name.ts
 *   rm .env.production.local
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  const rows = await prisma.subscription.findMany();
  for (const row of rows) {
    if (row.merchantName) continue;
    let merchantName: string | null = null;
    if (row.detectionKey) {
      merchantName = row.detectionKey.split("::")[0];
    } else if (row.type === "investment" && row.name.toLowerCase().includes("robinhood")) {
      merchantName = "Robinhood";
    }
    if (!merchantName) {
      console.log(`SKIP (no source to derive merchantName): ${row.name}`);
      continue;
    }
    await prisma.subscription.update({ where: { id: row.id }, data: { merchantName } });
    console.log(`Set merchantName="${merchantName}" for "${row.name}"`);
  }

  const { syncDetectedSubscriptions, syncInvestmentSchedules, flagOverdueSubscriptionsInactive } = await import(
    "../src/lib/subscriptions"
  );
  console.log("\nRunning sync to catch up categorization on any transactions posted since the last manual fix...");
  await syncDetectedSubscriptions();
  await syncInvestmentSchedules();
  await flagOverdueSubscriptionsInactive();
  console.log("Done.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
