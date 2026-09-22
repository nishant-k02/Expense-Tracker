import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name: unknown = body?.name;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const subscription = await prisma.subscription.create({
    data: {
      name: name.trim(),
      billingEmail: typeof body.billingEmail === "string" ? body.billingEmail.trim() || null : null,
      amount: typeof body.amount === "number" ? body.amount : null,
      currency: typeof body.currency === "string" ? body.currency : "USD",
      frequency: typeof body.frequency === "string" ? body.frequency : "unknown",
      nextDueDate: typeof body.nextDueDate === "string" && body.nextDueDate ? new Date(body.nextDueDate) : null,
      accountId: typeof body.accountId === "string" && body.accountId ? body.accountId : null,
      categoryName: typeof body.categoryName === "string" ? body.categoryName : null,
      notes: typeof body.notes === "string" ? body.notes : null,
      type: body.type === "investment" ? "investment" : "subscription",
      source: "manual",
      overridden: true,
    },
  });

  return NextResponse.json({ subscription });
}
