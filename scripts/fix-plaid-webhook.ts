/**
 * One-time fix: updates the webhook URL on every already-linked Plaid Item
 * to the current deployment's domain. Necessary after a domain change,
 * since the webhook URL is baked into an Item at link time (via
 * link-token's `webhook` field) and never updates on its own afterward —
 * changing PLAID_WEBHOOK_URL only affects Items linked after the change.
 *
 * Run against production (never prints or stores the pulled secrets):
 *   vercel env pull .env.production.local --environment=production --yes
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.production.local | cut -d'=' -f2- | tr -d '"') \
 *     npx tsx scripts/fix-plaid-webhook.ts
 *   rm .env.production.local
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

async function main() {
  const webhookUrl = process.env.PLAID_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("PLAID_WEBHOOK_URL is not set in the environment this script is running under.");
    process.exit(1);
  }

  const { prisma } = await import("../src/lib/prisma");
  const { plaidClient } = await import("../src/lib/plaid");
  const { decrypt } = await import("../src/lib/crypto");

  const items = await prisma.item.findMany({ select: { id: true, institutionName: true, plaidAccessToken: true } });
  console.log(`Updating webhook to ${webhookUrl} for ${items.length} item(s)...`);

  for (const item of items) {
    const accessToken = decrypt(item.plaidAccessToken);
    try {
      await plaidClient.itemWebhookUpdate({ access_token: accessToken, webhook: webhookUrl });
      console.log(`OK: ${item.institutionName}`);
    } catch (error) {
      const isAxiosError = (e: unknown): e is { response?: { data?: unknown } } =>
        typeof e === "object" && e !== null && "response" in e;
      const detail = isAxiosError(error) ? JSON.stringify(error.response?.data) : error instanceof Error ? error.message : error;
      console.error(`FAILED: ${item.institutionName}`, detail);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
