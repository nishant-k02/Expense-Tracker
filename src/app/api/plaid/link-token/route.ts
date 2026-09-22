import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { auth } from "@/lib/auth";
import { plaidClient, PLAID_CLIENT_USER_ID } from "@/lib/plaid";

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = await plaidClient.linkTokenCreate({
    client_name: "Expense Tracker",
    language: "en",
    country_codes: [CountryCode.Us],
    user: { client_user_id: PLAID_CLIENT_USER_ID },
    products: [Products.Transactions],
    webhook: process.env.PLAID_WEBHOOK_URL || undefined,
  });

  return NextResponse.json({ link_token: response.data.link_token });
}
