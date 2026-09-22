import { prisma } from "@/lib/prisma";

const MATCH_WINDOW_DAYS = 4;
const AMOUNT_EPSILON = 0.01;

/**
 * Finds transactions categorized as a transfer (TRANSFER_IN/TRANSFER_OUT) that
 * pair up as an equal-and-opposite amount in a *different* account within a
 * few days of each other — e.g. -$500 leaving Chase and +$500 landing in PNC.
 * That pairing is strong evidence it's money moving between the user's own
 * accounts rather than a payment to/from someone else (Zelle, Venmo, etc.),
 * which Plaid files under the same categories but is real income/spend.
 *
 * Also included: LOAN_PAYMENTS_CREDIT_CARD_PAYMENT. Plaid categorizes a card
 * payment asymmetrically — the paying (depository) side gets that detailed
 * category, but the receiving (credit) side is just filed as a generic
 * TRANSFER_IN. Without including both sides in one candidate pool, the
 * receiving side never finds its counterpart and stays miscounted as income.
 *
 * Matched transactions are flagged isInternalTransfer so dashboard totals
 * exclude them. Manually recategorized transactions (categoryOverridden) are
 * left untouched — the user's own classification wins.
 */
export async function detectInternalTransfers(): Promise<void> {
  const candidates = await prisma.transaction.findMany({
    where: {
      categoryOverridden: false,
      OR: [
        { plaidCategoryPrimary: { in: ["TRANSFER_IN", "TRANSFER_OUT"] } },
        { plaidCategoryDetailed: "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT" },
      ],
    },
    select: { id: true, amount: true, date: true, accountId: true },
    orderBy: { date: "asc" },
  });

  const matchedIds = new Set<string>();

  for (let i = 0; i < candidates.length; i++) {
    const a = candidates[i];
    if (matchedIds.has(a.id)) continue;
    const aAmount = Number(a.amount);

    for (let j = i + 1; j < candidates.length; j++) {
      const b = candidates[j];
      if (matchedIds.has(b.id) || b.accountId === a.accountId) continue;

      const dayDiff = Math.abs(a.date.getTime() - b.date.getTime()) / (1000 * 60 * 60 * 24);
      if (dayDiff > MATCH_WINDOW_DAYS) continue;

      const bAmount = Number(b.amount);
      if (Math.abs(aAmount + bAmount) > AMOUNT_EPSILON) continue;

      matchedIds.add(a.id);
      matchedIds.add(b.id);
      break;
    }
  }

  const unmatchedIds = candidates.filter((c) => !matchedIds.has(c.id)).map((c) => c.id);

  await prisma.$transaction([
    prisma.transaction.updateMany({
      where: { id: { in: Array.from(matchedIds) } },
      data: { isInternalTransfer: true },
    }),
    // Un-flag anything that was previously matched but no longer has a counterpart
    // (e.g. the matching transaction was removed by Plaid).
    prisma.transaction.updateMany({
      where: { id: { in: unmatchedIds } },
      data: { isInternalTransfer: false },
    }),
  ]);
}
