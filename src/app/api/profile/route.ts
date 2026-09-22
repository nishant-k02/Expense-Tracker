import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isValidAvatarDataUrl, updateProfile } from "@/lib/profile";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const data: { name?: string | null; avatarDataUrl?: string | null } = {};

  if ("name" in body) {
    const name = body.name;
    if (name !== null && typeof name !== "string") {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    data.name = typeof name === "string" ? name.trim().slice(0, 100) || null : null;
  }

  if ("avatarDataUrl" in body) {
    const avatarDataUrl = body.avatarDataUrl;
    if (avatarDataUrl === null) {
      data.avatarDataUrl = null;
    } else if (typeof avatarDataUrl !== "string" || !isValidAvatarDataUrl(avatarDataUrl)) {
      return NextResponse.json({ error: "Invalid avatar image (must be PNG/JPEG/WebP/GIF under ~400KB)" }, { status: 400 });
    } else {
      data.avatarDataUrl = avatarDataUrl;
    }
  }

  const profile = await updateProfile(data);
  return NextResponse.json({ profile });
}
