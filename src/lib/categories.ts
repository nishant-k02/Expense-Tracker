import { prisma } from "@/lib/prisma";

const CREDIT_CARD_PAYMENT_DETAILED = "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT";

let cache: Map<string, string> | null = null; // plaidPrimary -> Category.id
let uncategorizedId: string | null = null;
let creditCardPaymentId: string | null = null;

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
    if (category.name === "Credit Card Payments") {
      creditCardPaymentId = category.id;
    }
  }
}

export async function resolveCategoryId(
  plaidPrimary: string | null | undefined,
  plaidDetailed?: string | null
): Promise<string | null> {
  if (!cache) {
    await loadCache();
  }

  // A credit card bill payment isn't new spending — it settles debt for
  // purchases already counted when they posted on the card — so route it to
  // its own excluded category instead of lumping it in with real loan payments.
  if (plaidPrimary === "LOAN_PAYMENTS" && plaidDetailed === CREDIT_CARD_PAYMENT_DETAILED && creditCardPaymentId) {
    return creditCardPaymentId;
  }

  if (plaidPrimary && cache!.has(plaidPrimary)) {
    return cache!.get(plaidPrimary)!;
  }
  return uncategorizedId;
}
