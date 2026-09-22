import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, ctx: RouteContext<"/api/transactions/[id]">) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const categoryId: unknown = body?.categoryId;

  if (typeof categoryId !== "string") {
    return NextResponse.json({ error: "Missing categoryId" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  }

  // A manual recategorization means the user has reviewed this transaction and
  // confirmed it's real — clear any automatic "internal transfer" flag so it
  // counts toward totals under its new category.
  const transaction = await prisma.transaction.update({
    where: { id },
    data: { categoryId, categoryOverridden: true, isInternalTransfer: false },
  });

  return NextResponse.json({ transaction });
}
