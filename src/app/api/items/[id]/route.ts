import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/items/[id]">) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const accessToken = decrypt(item.plaidAccessToken);
    await plaidClient.itemRemove({ access_token: accessToken });
  } catch (error) {
    console.error(`Failed to remove item ${id} from Plaid:`, error);
  }

  await prisma.item.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
