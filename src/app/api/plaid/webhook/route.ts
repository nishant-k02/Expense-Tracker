import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import { syncTransactionsForItem } from "@/lib/plaid-sync";

const MAX_TOKEN_AGE_SECONDS = 5 * 60;

async function verifyWebhook(rawBody: string, signedJwt: string): Promise<boolean> {
  const protectedHeader = decodeProtectedHeader(signedJwt);
  if (protectedHeader.alg !== "ES256" || !protectedHeader.kid) {
    return false;
  }

  const keyResponse = await plaidClient.webhookVerificationKeyGet({ key_id: protectedHeader.kid });
  const jwk = keyResponse.data.key;

  const key = await importJWK(
    { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, use: jwk.use, alg: jwk.alg, kid: jwk.kid },
    "ES256"
  );

  const { payload } = await jwtVerify(signedJwt, key, { algorithms: ["ES256"] });

  const iat = payload.iat;
  if (typeof iat !== "number" || Date.now() / 1000 - iat > MAX_TOKEN_AGE_SECONDS) {
    return false;
  }

  const expectedHash = payload.request_body_sha256;
  if (typeof expectedHash !== "string") {
    return false;
  }
  const actualHash = createHash("sha256").update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expectedHash, "hex");
  const actualBuf = Buffer.from(actualHash, "hex");
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return false;
  }

  return true;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signedJwt = request.headers.get("plaid-verification");

  if (!signedJwt) {
    return NextResponse.json({ error: "Missing Plaid-Verification header" }, { status: 400 });
  }

  let verified = false;
  try {
    verified = await verifyWebhook(rawBody, signedJwt);
  } catch (error) {
    console.error("Webhook verification error:", error);
  }

  if (!verified) {
    return NextResponse.json({ error: "Verification failed" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as {
    webhook_type?: string;
    webhook_code?: string;
    item_id?: string;
  };

  if (!payload.item_id) {
    return NextResponse.json({ ok: true });
  }

  const item = await prisma.item.findUnique({ where: { plaidItemId: payload.item_id } });
  if (!item) {
    return NextResponse.json({ ok: true });
  }

  if (payload.webhook_type === "TRANSACTIONS" && payload.webhook_code === "SYNC_UPDATES_AVAILABLE") {
    await syncTransactionsForItem(item.id);
  } else if (
    payload.webhook_type === "ITEM" &&
    (payload.webhook_code === "ITEM_LOGIN_REQUIRED" || payload.webhook_code === "PENDING_EXPIRATION")
  ) {
    await prisma.item.update({
      where: { id: item.id },
      data: { status: "error", error: payload.webhook_code },
    });
  }

  return NextResponse.json({ ok: true });
}
