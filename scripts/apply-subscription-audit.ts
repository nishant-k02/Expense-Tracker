/**
 * One-time data fix: applies the verified subscription/investment audit
 * (Sept 22-23, 2026) to whichever database DATABASE_URL points at. Safe to
 * re-run — every step matches by name/amount and is idempotent.
 *
 * Run against production (never prints or stores the pulled secrets):
 *   vercel env pull .env.production.local --environment=production --yes
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.production.local | cut -d'=' -f2- | tr -d '"') \
 *     npx tsx scripts/apply-subscription-audit.ts
 *   rm .env.production.local
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

const AUDIT_DATE = "Sept 22-23, 2026";
const SK_EMAIL = "nishantsk2002@gmail.com";
const US_EMAIL = "nishantkhandhar.us@gmail.com";

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { syncDetectedSubscriptions } = await import("../src/lib/subscriptions");

  // Ensure the raw auto-detected candidates exist first (same as a normal
  // page load), so the corrections below have something to match against on
  // a completely fresh database.
  await syncDetectedSubscriptions();

  async function fixSubscription(
    where: { nameContains?: string; nameStartsWith?: string },
    data: Record<string, unknown>
  ) {
    const rows = await prisma.subscription.findMany({
      where: where.nameContains
        ? { name: { contains: where.nameContains, mode: "insensitive" } }
        : { name: { startsWith: where.nameStartsWith } },
    });
    for (const row of rows) {
      await prisma.subscription.update({ where: { id: row.id }, data });
    }
    return rows.length;
  }

  // Apple splits into two distinct subscriptions by amount — handle each
  // detected cluster separately rather than a blanket "apple" match.
  const appleRows = await prisma.subscription.findMany({ where: { name: { startsWith: "Apple" } } });
  for (const row of appleRows) {
    const amt = row.amount ? Number(row.amount) : 0;
    if (amt >= 6 && amt < 8) {
      await prisma.subscription.update({
        where: { id: row.id },
        data: {
          name: "Apple Music",
          amount: 6.99,
          frequency: "monthly",
          nextDueDate: new Date("2026-09-26"),
          billingEmail: SK_EMAIL,
          isActive: true,
          overridden: true,
          notes: `Verified live on Apple ID Subscriptions page (Student plan) — ${AUDIT_DATE} audit.`,
        },
      });
    } else if (amt >= 9 && amt < 11) {
      await prisma.subscription.update({
        where: { id: row.id },
        data: {
          name: "iCloud+",
          amount: 9.99,
          frequency: "monthly",
          nextDueDate: new Date("2026-10-22"),
          billingEmail: SK_EMAIL,
          isActive: true,
          overridden: true,
          notes: `Verified live on Apple ID Subscriptions page (2TB storage) — ${AUDIT_DATE} audit.`,
        },
      });
    }
  }

  await fixSubscription(
    { nameContains: "resum" },
    {
      name: "Resume Worded Pro",
      amount: 39.6,
      frequency: "quarterly",
      nextDueDate: new Date("2026-10-24"),
      billingEmail: SK_EMAIL,
      isActive: true,
      overridden: true,
      notes: `Verified live on Resume Worded account billing page (Quarterly plan, incl. tax) — ${AUDIT_DATE} audit. Bank descriptor: PADDLE.NET* RESUMEWRDE.`,
    }
  );

  await fixSubscription(
    { nameContains: "anthropic" },
    {
      name: "Claude Pro",
      amount: 23,
      frequency: "monthly",
      nextDueDate: new Date("2026-10-12"),
      billingEmail: SK_EMAIL,
      isActive: true,
      overridden: true,
      notes: `Verified live on claude.ai/settings/billing: Pro plan, Monthly, $23.00 — auto-renews Oct 12, 2026 — ${AUDIT_DATE} audit.`,
    }
  );

  const awsNote = `Verified live in AWS Console: $0.00 current billing period usage, Basic (free) Support plan — no active subscription as of ${AUDIT_DATE} audit. This charge was a past incidental amount, not a recurring subscription.`;
  await fixSubscription(
    { nameContains: "amazon web services" },
    { isActive: false, overridden: true, billingEmail: SK_EMAIL, notes: awsNote }
  );

  await fixSubscription(
    { nameContains: "google cloud" },
    {
      isActive: false,
      overridden: true,
      billingEmail: SK_EMAIL,
      notes: `Verified live in Google Cloud Console: $0.00 forecasted cost, no active billing — ${AUDIT_DATE} audit. Historical incidental charge only.`,
    }
  );

  await fixSubscription(
    { nameContains: "youtube" },
    {
      isActive: false,
      overridden: true,
      billingEmail: SK_EMAIL,
      notes: `Verified live on Google Account Subscriptions page: YouTube Premium (Family) shows as Inactive — ${AUDIT_DATE} audit.`,
    }
  );

  await fixSubscription(
    { nameContains: "rocketride" },
    {
      isActive: false,
      overridden: true,
      billingEmail: US_EMAIL,
      notes: `Verified live on RocketRide billing page: "No active subscriptions" — token-based usage billing, not a recurring subscription — ${AUDIT_DATE} audit. This $5 bank charge was a one-time token purchase.`,
    }
  );

  // Google One — not auto-detected from bank data (different card on file), so
  // it never has a detectionKey collision risk. Create only if missing.
  const existingGoogleOne = await prisma.subscription.findFirst({ where: { name: "Google One" } });
  if (!existingGoogleOne) {
    await prisma.subscription.create({
      data: {
        name: "Google One",
        amount: 4.99,
        frequency: "monthly",
        nextDueDate: new Date("2027-07-26"),
        billingEmail: SK_EMAIL,
        categoryName: "Subscriptions",
        isActive: true,
        source: "manual",
        overridden: true,
        notes: `Verified live on Google Account Subscriptions page (Google AI Plus, 400GB) — ${AUDIT_DATE} audit. Paid via a Discover card ending 6403, not the tracked Discover account (ends 6405) — left unlinked.`,
      },
    });
  }

  // Robinhood recurring investment, linked to the PNC "Spend" account if present.
  const existingRobinhood = await prisma.subscription.findFirst({ where: { name: { contains: "Robinhood" } } });
  if (!existingRobinhood) {
    const spendAccount = await prisma.account.findFirst({ where: { mask: "5916" } });
    await prisma.subscription.create({
      data: {
        name: "Robinhood — S&P 500 (VOO)",
        amount: 100,
        frequency: "monthly",
        nextDueDate: new Date("2026-10-19"),
        lastChargedDate: new Date("2026-08-21"),
        billingEmail: US_EMAIL,
        accountId: spendAccount?.id ?? null,
        categoryName: "Investments",
        isActive: true,
        type: "investment",
        source: "manual",
        overridden: true,
        notes: `Verified live in Robinhood's Recurring Investments page — ${AUDIT_DATE} audit. Automatic monthly buy of Vanguard S&P 500 ETF (VOO), Individual account. Funding source verified on Robinhood's Transfers > Linked accounts page: "Spend" Checking ...5916 (PNC). Recurring Investment — not a subscription; excluded from subscription cost totals.`,
      },
    });
  } else if (!existingRobinhood.lastChargedDate) {
    // Backfill lastChargedDate on a row created before this field was set —
    // without it, syncInvestmentSchedules() treats it as never-charged and
    // recomputes nextDueDate from a 30-day approximation instead of the
    // verified date, drifting it by a day or two.
    await prisma.subscription.update({
      where: { id: existingRobinhood.id },
      data: { nextDueDate: new Date("2026-10-19"), lastChargedDate: new Date("2026-08-21") },
    });
  }

  // Clean up any stale duplicate rows the old name-keyed sync may have left
  // behind before the detectionKey fix (same bug fixed in PR #2).
  await prisma.subscription.deleteMany({
    where: {
      name: { in: ["Apple ($9.99)", "Apple ($6.97)", "Resumewrde", "Anthropic"] },
      overridden: false,
    },
  });

  // Recategorize the underlying transactions so the dashboard's spend-by-
  // category chart reflects Subscriptions vs Recurring Investments too.
  const subscriptionsCategory = await prisma.category.findUnique({ where: { name: "Subscriptions" } });
  const investmentsCategory = await prisma.category.findUnique({ where: { name: "Recurring Investments" } });

  if (subscriptionsCategory) {
    const subResult = await prisma.transaction.updateMany({
      where: { merchantName: { in: ["Apple", "Resumewrde", "Anthropic"] } },
      data: { categoryId: subscriptionsCategory.id, categoryOverridden: true },
    });
    console.log(`Recategorized ${subResult.count} transactions -> Subscriptions.`);
  } else {
    console.log('WARNING: "Subscriptions" category not found — run `pnpm db:seed` first.');
  }

  if (investmentsCategory) {
    const invResult = await prisma.transaction.updateMany({
      where: { merchantName: "Robinhood", amount: 100 },
      data: { categoryId: investmentsCategory.id, categoryOverridden: true },
    });
    console.log(`Recategorized ${invResult.count} transactions -> Recurring Investments.`);
  } else {
    console.log('WARNING: "Recurring Investments" category not found — run `pnpm db:seed` first.');
  }

  console.log("\nFinal subscription state:");
  const rows = await prisma.subscription.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
  for (const r of rows) {
    console.log({
      name: r.name,
      type: r.type,
      amount: r.amount?.toString(),
      frequency: r.frequency,
      isActive: r.isActive,
      billingEmail: r.billingEmail,
    });
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
