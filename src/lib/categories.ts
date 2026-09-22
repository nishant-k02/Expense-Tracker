import { prisma } from "@/lib/prisma";

let cache: Map<string, string> | null = null; // plaidPrimary -> Category.id
let uncategorizedId: string | null = null;

async function loadCache() {
  const categories = await prisma.category.findMany();
  cache = new Map();
  for (const category of categories) {
    if (category.plaidPrimary) {
      cache.set(category.plaidPrimary, category.id);
    }
    if (category.name === "Uncategorized") {
      uncategorizedId = category.id;
    }
  }
}

export async function resolveCategoryId(plaidPrimary: string | null | undefined): Promise<string | null> {
  if (!cache) {
    await loadCache();
  }
  if (plaidPrimary && cache!.has(plaidPrimary)) {
    return cache!.get(plaidPrimary)!;
  }
  return uncategorizedId;
}
