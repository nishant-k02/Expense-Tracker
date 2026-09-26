import { prisma } from "@/lib/prisma";
import { monthRange, isRealTransaction } from "@/lib/analytics";

export type MonthlyReportData = {
  monthLabel: string;
  start: Date;
  end: Date;
  isCurrentMonth: boolean;
  spend: number;
  income: number;
  net: number;
  categoryBreakdown: { name: string; total: number }[];
  spendByInstitution: { institutionName: string; spend: number }[];
  accountBalances: {
    name: string;
    mask: string | null;
    institutionName: string;
    balance: number | null;
  }[];
  transactions: {
    date: Date;
    description: string;
    accountName: string;
    categoryName: string;
    amount: number;
    isTransfer: boolean;
  }[];
};

/**
 * Reconstructs each account's balance as of a given cutoff, working
 * backwards from its live current balance. There's no stored historical
 * balance snapshot — only the live value Plaid last reported — so for a
 * past month this derives it from real transaction data: current balance
 * plus every transaction dated after the cutoff (Plaid convention: positive
 * = money out, so adding it back undoes that outflow; negative = inflow, so
 * adding it back undoes that inflow). For the current, still-in-progress
 * month this cutoff is "now", so the result is just the live balance.
 */
async function getAccountBalancesAsOf(cutoff: Date) {
  const accounts = await prisma.account.findMany({
    where: { hidden: false },
    select: {
      id: true,
      name: true,
      mask: true,
      currentBalance: true,
      item: { select: { institutionName: true } },
    },
    orderBy: { name: "asc" },
  });

  const results: MonthlyReportData["accountBalances"] = [];
  for (const account of accounts) {
    if (account.currentBalance === null) {
      results.push({ name: account.name, mask: account.mask, institutionName: account.item.institutionName, balance: null });
      continue;
    }
    const laterTransactions = await prisma.transaction.findMany({
      where: { accountId: account.id, date: { gt: cutoff } },
      select: { amount: true },
    });
    const adjustment = laterTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    results.push({
      name: account.name,
      mask: account.mask,
      institutionName: account.item.institutionName,
      balance: Number(account.currentBalance) + adjustment,
    });
  }
  return results;
}

export async function getMonthlyReportData(reference: Date): Promise<MonthlyReportData> {
  const { start, end } = monthRange(reference);
  const now = new Date();
  const isCurrentMonth = now >= start && now < end;
  // "Month end" for a past month is its last instant; for the current month
  // (not over yet) it's "now" — there's nothing after that to adjust for.
  const cutoff = isCurrentMonth ? now : new Date(end.getTime() - 1);

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(start);

  const rawTransactions = await prisma.transaction.findMany({
    where: { date: { gte: start, lt: end } },
    select: {
      date: true,
      name: true,
      merchantName: true,
      amount: true,
      isInternalTransfer: true,
      category: { select: { id: true, name: true, excludeFromTotals: true } },
      account: { select: { name: true, item: { select: { institutionName: true } } } },
    },
    orderBy: { date: "asc" },
  });

  let spend = 0;
  let income = 0;
  const categoryTotals = new Map<string, { name: string; total: number }>();
  const institutionTotals = new Map<string, { institutionName: string; spend: number }>();

  for (const tx of rawTransactions) {
    const amount = Number(tx.amount);
    if (isRealTransaction(tx)) {
      if (amount > 0) spend += amount;
      else income += -amount;

      if (amount > 0) {
        const key = tx.category?.id ?? "uncategorized";
        const name = tx.category?.name ?? "Uncategorized";
        const existing = categoryTotals.get(key);
        if (existing) existing.total += amount;
        else categoryTotals.set(key, { name, total: amount });

        const institutionName = tx.account.item.institutionName;
        const existingInst = institutionTotals.get(institutionName);
        if (existingInst) existingInst.spend += amount;
        else institutionTotals.set(institutionName, { institutionName, spend: amount });
      }
    }
  }

  const transactions = rawTransactions.map((tx) => ({
    date: tx.date,
    description: tx.merchantName ?? tx.name,
    accountName: tx.account.name,
    categoryName: tx.category?.name ?? "Uncategorized",
    amount: Number(tx.amount),
    isTransfer: tx.isInternalTransfer || Boolean(tx.category?.excludeFromTotals),
  }));

  const accountBalances = await getAccountBalancesAsOf(cutoff);

  return {
    monthLabel,
    start,
    end,
    isCurrentMonth,
    spend,
    income,
    net: income - spend,
    categoryBreakdown: Array.from(categoryTotals.values()).sort((a, b) => b.total - a.total),
    spendByInstitution: Array.from(institutionTotals.values()).sort((a, b) => b.spend - a.spend),
    accountBalances,
    transactions,
  };
}
