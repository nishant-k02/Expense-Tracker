import { NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { syncTransactionsForItem } from "@/lib/plaid-sync";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const publicToken: unknown = body?.public_token;
  const institutionId: unknown = body?.institution?.institution_id;
  const institutionName: unknown = body?.institution?.name;

  if (typeof publicToken !== "string") {
    return NextResponse.json({ error: "Missing public_token" }, { status: 400 });
  }

  const exchange = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
  const { access_token: accessToken, item_id: plaidItemId } = exchange.data;

  const item = await prisma.item.create({
    data: {
      plaidItemId,
      plaidAccessToken: encrypt(accessToken),
      institutionId: typeof institutionId === "string" ? institutionId : "unknown",
      institutionName: typeof institutionName === "string" ? institutionName : "Unknown institution",
    },
  });

  const accounts = await plaidClient.accountsGet({ access_token: accessToken });
  for (const account of accounts.data.accounts) {
    await prisma.account.upsert({
      where: { plaidAccountId: account.account_id },
      update: {},
      create: {
        itemId: item.id,
        plaidAccountId: account.account_id,
        name: account.name,
        officialName: account.official_name,
        mask: account.mask,
        type: account.type,
        subtype: account.subtype,
        currentBalance: account.balances.current,
        availableBalance: account.balances.available,
        isoCurrencyCode: account.balances.iso_currency_code ?? "USD",
      },
    });
  }

  // Populate initial transaction history in the background; don't block the response on it.
  after(() =>
    syncTransactionsForItem(item.id).catch((error) => {
      console.error(`Initial sync failed for item ${item.id}:`, error);
    })
  );

  return NextResponse.json({ ok: true });
}
