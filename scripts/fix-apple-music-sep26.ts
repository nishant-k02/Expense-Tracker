/**
 * One-time fix: the Sep 26, 2026 Apple Music renewal was paid from the
 * Apple Account balance instead of the linked PNC card (verified live on
 * Apple ID's Payment & Shipping page — Apple draws from Apple Account
 * balance first on any purchase until it reaches $0). This was a one-time
 * exception for this cycle only; the record stays linked to PNC since
 * future renewals resume charging PNC normally. Safe to re-run.
 *
 * Run against production:
 *   vercel env pull .env.production.local --environment=production --yes
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.production.local | cut -d'=' -f2- | tr -d '"') \
 *     npx tsx scripts/fix-apple-music-sep26.ts
 *   rm .env.production.local
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

const NOTE =
  "Verified live on Apple ID Payment & Shipping page (Sept 26, 2026): the Sep 26 renewal charge ($6.99) was paid from the Apple Account balance ($842.29 available), not the linked PNC Virtual Wallet Visa card — Apple draws from Apple Account balance first on any purchase until it reaches $0. This was a one-time exception for this cycle only; the account stays linked to PNC since future renewals will resume charging PNC normally once relevant.";

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  const current = await prisma.subscription.findFirst({ where: { name: "Apple Music" } });
  if (!current) {
    console.error('No "Apple Music" subscription row found.');
    process.exit(1);
  }
  if (current.notes?.includes("Sept 26, 2026")) {
    console.log("Already applied — skipping.");
    await prisma.$disconnect();
    return;
  }

  const updated = await prisma.subscription.update({
    where: { id: current.id },
    data: {
      lastChargedDate: new Date("2026-09-26"),
      nextDueDate: new Date("2026-10-26"),
      notes: current.notes ? `${current.notes}\n\n${NOTE}` : NOTE,
    },
  });

  console.log({
    name: updated.name,
    accountId: updated.accountId,
    lastCharged: updated.lastChargedDate?.toISOString().slice(0, 10),
    nextDue: updated.nextDueDate?.toISOString().slice(0, 10),
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
