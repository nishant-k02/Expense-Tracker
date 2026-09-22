import { NextResponse } from "next/server";
import { syncAllItems } from "@/lib/plaid-sync";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncAllItems();
  return NextResponse.json({ ok: true });
}
