import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, ctx: RouteContext<"/api/subscriptions/[id]">) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));

  const data: Record<string, unknown> = { overridden: true };

  if ("name" in body && typeof body.name === "string") data.name = body.name.trim();
  if ("billingEmail" in body) data.billingEmail = typeof body.billingEmail === "string" ? body.billingEmail.trim() || null : null;
  if ("amount" in body) data.amount = typeof body.amount === "number" ? body.amount : null;
  if ("currency" in body && typeof body.currency === "string") data.currency = body.currency;
  if ("frequency" in body && typeof body.frequency === "string") data.frequency = body.frequency;
  if ("nextDueDate" in body) data.nextDueDate = typeof body.nextDueDate === "string" && body.nextDueDate ? new Date(body.nextDueDate) : null;
  if ("accountId" in body) data.accountId = typeof body.accountId === "string" && body.accountId ? body.accountId : null;
  if ("categoryName" in body) data.categoryName = typeof body.categoryName === "string" ? body.categoryName : null;
  if ("isActive" in body && typeof body.isActive === "boolean") data.isActive = body.isActive;
  if ("notes" in body) data.notes = typeof body.notes === "string" ? body.notes : null;
  if ("type" in body) data.type = body.type === "investment" ? "investment" : "subscription";

  const subscription = await prisma.subscription.update({ where: { id }, data });
  return NextResponse.json({ subscription });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/subscriptions/[id]">) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  await prisma.subscription.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
