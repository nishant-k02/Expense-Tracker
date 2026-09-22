import { prisma } from "@/lib/prisma";

export function monthRange(reference: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));
  return { start, end };
}

// Credit card bill payments (Category.excludeFromTotals) and transactions
// matched as transfers between the user's own accounts (isInternalTransfer,
// see src/lib/transfer-matching.ts) aren't real income or spending — they're
// excluded here so they don't inflate or double-count the totals below.
function isRealTransaction(tx: {
  isInternalTransfer: boolean;
  category: { excludeFromTotals: boolean } | null;
}): boolean {
  return !tx.isInternalTransfer && !tx.category?.excludeFromTotals;
}

export async function getMonthlySummary(reference: Date = new Date()) {
  const { start, end } = monthRange(reference);
  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: start, lt: end } },
    select: { amount: true, isInternalTransfer: true, category: { select: { excludeFromTotals: true } } },
  });

  let spend = 0;
  let income = 0;
  for (const tx of transactions) {
    if (!isRealTransaction(tx)) continue;
    const amount = Number(tx.amount);
    if (amount > 0) spend += amount;
    else income += -amount;
  }
  return { spend, income, net: income - spend };
}

export async function getCategoryBreakdown(reference: Date = new Date()) {
  const { start, end } = monthRange(reference);
  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: start, lt: end }, amount: { gt: 0 } },
    select: {
      amount: true,
      isInternalTransfer: true,
      category: { select: { id: true, name: true, excludeFromTotals: true } },
    },
  });

  const totals = new Map<string, { name: string; total: number }>();
  for (const tx of transactions) {
    if (!isRealTransaction(tx)) continue;
    const key = tx.category?.id ?? "uncategorized";
    const name = tx.category?.name ?? "Uncategorized";
    const existing = totals.get(key);
    const amount = Number(tx.amount);
    if (existing) {
      existing.total += amount;
    } else {
      totals.set(key, { name, total: amount });
    }
  }

  return Array.from(totals.values()).sort((a, b) => b.total - a.total);
}

export async function getSpendByInstitution(reference: Date = new Date()) {
  const { start, end } = monthRange(reference);
  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: start, lt: end }, amount: { gt: 0 } },
    select: {
      amount: true,
      isInternalTransfer: true,
      category: { select: { excludeFromTotals: true } },
      account: { select: { item: { select: { id: true, institutionName: true } } } },
    },
  });

  const totals = new Map<string, { institutionName: string; spend: number }>();
  for (const tx of transactions) {
    if (!isRealTransaction(tx)) continue;
    const item = tx.account.item;
    const existing = totals.get(item.id);
    const amount = Number(tx.amount);
    if (existing) {
      existing.spend += amount;
    } else {
      totals.set(item.id, { institutionName: item.institutionName, spend: amount });
    }
  }

  return Array.from(totals.values()).sort((a, b) => b.spend - a.spend);
}

export async function getMonthlyTrend(monthsBack = 6) {
  const now = new Date();
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const { start, end } = monthRange(ref);
    const label = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(start);
    months.push({ label, start, end });
  }

  const earliest = months[0].start;
  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: earliest } },
    select: {
      amount: true,
      date: true,
      isInternalTransfer: true,
      category: { select: { excludeFromTotals: true } },
    },
  });

  return months.map(({ label, start, end }) => {
    let spend = 0;
    let income = 0;
    for (const tx of transactions) {
      if (tx.date >= start && tx.date < end && isRealTransaction(tx)) {
        const amount = Number(tx.amount);
        if (amount > 0) spend += amount;
        else income += -amount;
      }
    }
    return { label, spend, income };
  });
}
