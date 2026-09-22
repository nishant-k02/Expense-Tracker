import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncDetectedSubscriptions } from "@/lib/subscriptions";

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncDetectedSubscriptions();
  return NextResponse.json({ ok: true });
}
