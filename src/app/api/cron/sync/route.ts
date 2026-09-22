import { NextResponse } from "next/server";
import { syncAllItems } from "@/lib/plaid-sync";
import { syncDetectedSubscriptions, syncInvestmentSchedules, flagOverdueSubscriptionsInactive } from "@/lib/subscriptions";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncAllItems();
  await syncDetectedSubscriptions();
  await syncInvestmentSchedules();
  await flagOverdueSubscriptionsInactive();
  return NextResponse.json({ ok: true });
}
