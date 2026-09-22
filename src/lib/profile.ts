import { prisma } from "@/lib/prisma";

const PROFILE_ID = "singleton";
const MAX_AVATAR_BYTES = 400_000; // ~400KB raw file, comfortable for an inline data URL

export async function getProfile() {
  return prisma.profile.findUnique({ where: { id: PROFILE_ID } });
}

export async function updateProfile(data: { name?: string | null; avatarDataUrl?: string | null }) {
  return prisma.profile.upsert({
    where: { id: PROFILE_ID },
    update: data,
    create: { id: PROFILE_ID, ...data },
  });
}

export function isValidAvatarDataUrl(value: string): boolean {
  const match = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/]+=*)$/.exec(value);
  if (!match) return false;
  // Rough size check from base64 length (each 4 chars ~= 3 bytes).
  const approxBytes = (match[2].length * 3) / 4;
  return approxBytes <= MAX_AVATAR_BYTES;
}
