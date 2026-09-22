import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncAllItems, syncTransactionsForItem } from "@/lib/plaid-sync";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const itemId: unknown = body?.itemId;

  try {
    if (typeof itemId === "string") {
      await syncTransactionsForItem(itemId);
    } else {
      await syncAllItems();
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
